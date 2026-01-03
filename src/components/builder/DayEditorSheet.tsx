import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AppCard } from "@/components/app/AppCard";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Target,
  Dumbbell,
  Timer,
  Heart,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";

export interface PlanTask {
  id?: string;
  sort_order: number;
  task_type: string;
  label: string;
  target_type: string;
  target_value: number | null;
  shot_type: string;
  shots_expected: number | null;
  is_required: boolean;
}

export interface DayData {
  date: string;
  title: string;
  notes: string;
  tasks: PlanTask[];
}

interface DayEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: DayData;
  dayLabel: string;
  onSave: (day: DayData) => void;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  shooting: <Target className="w-4 h-4" />,
  conditioning: <Dumbbell className="w-4 h-4" />,
  mobility: <Heart className="w-4 h-4" />,
  recovery: <Timer className="w-4 h-4" />,
  prep: <Sparkles className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

const taskTypeLabels: Record<string, string> = {
  shooting: "Shooting",
  conditioning: "Conditioning",
  mobility: "Mobility",
  recovery: "Recovery",
  prep: "Prep",
  other: "Other",
};

export const DayEditorSheet: React.FC<DayEditorSheetProps> = ({
  open,
  onOpenChange,
  day,
  dayLabel,
  onSave,
}) => {
  const [title, setTitle] = useState(day.title);
  const [notes, setNotes] = useState(day.notes);
  const [tasks, setTasks] = useState<PlanTask[]>(day.tasks);

  useEffect(() => {
    setTitle(day.title);
    setNotes(day.notes);
    setTasks(day.tasks);
  }, [day]);

  const addTask = () => {
    setTasks([
      ...tasks,
      {
        sort_order: tasks.length,
        task_type: "shooting",
        label: "",
        target_type: "none",
        target_value: null,
        shot_type: "none",
        shots_expected: null,
        is_required: true,
      },
    ]);
  };

  const updateTask = (index: number, updates: Partial<PlanTask>) => {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
    );
  };

  const removeTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const moveTask = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === tasks.length - 1)
    ) {
      return;
    }

    const newTasks = [...tasks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]];
    setTasks(newTasks);
  };

  const handleSave = () => {
    onSave({
      ...day,
      title,
      notes,
      tasks: tasks.map((t, i) => ({ ...t, sort_order: i })),
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{dayLabel}</SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Day Settings */}
          <div className="space-y-4">
            <div>
              <Label>Day Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Focus on shooting"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this day..."
                className="mt-1.5"
                rows={2}
              />
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Tasks ({tasks.length})</h3>
              <Button variant="ghost" size="sm" onClick={addTask}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-3">
              {tasks.map((task, index) => (
                <AppCard key={index} className="p-3">
                  <div className="flex gap-2">
                    {/* Reorder */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        onClick={() => moveTask(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        onClick={() => moveTask(index, "down")}
                        disabled={index === tasks.length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Task Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <Select
                          value={task.task_type}
                          onValueChange={(v) => updateTask(index, { task_type: v })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(taskTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  {taskTypeIcons[value]}
                                  {label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeTask(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>

                      <Input
                        value={task.label}
                        onChange={(e) => updateTask(index, { label: e.target.value })}
                        placeholder="Task description"
                      />

                      <div className="flex gap-2 flex-wrap">
                        <Select
                          value={task.target_type}
                          onValueChange={(v) => updateTask(index, { target_type: v })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="Target" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="reps">Reps</SelectItem>
                            <SelectItem value="seconds">Seconds</SelectItem>
                            <SelectItem value="minutes">Minutes</SelectItem>
                          </SelectContent>
                        </Select>

                        {task.target_type !== "none" && (
                          <Input
                            type="number"
                            value={task.target_value || ""}
                            onChange={(e) =>
                              updateTask(index, {
                                target_value: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            placeholder="Value"
                            className="w-20"
                          />
                        )}

                        {task.task_type === "shooting" && (
                          <>
                            <Select
                              value={task.shot_type}
                              onValueChange={(v) => updateTask(index, { shot_type: v })}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue placeholder="Shot" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Any</SelectItem>
                                <SelectItem value="wrist">Wrist</SelectItem>
                                <SelectItem value="snap">Snap</SelectItem>
                                <SelectItem value="slap">Slap</SelectItem>
                                <SelectItem value="backhand">Backhand</SelectItem>
                                <SelectItem value="mixed">Mixed</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              value={task.shots_expected || ""}
                              onChange={(e) =>
                                updateTask(index, {
                                  shots_expected: e.target.value ? parseInt(e.target.value) : null,
                                })
                              }
                              placeholder="Shots"
                              className="w-20"
                            />
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          checked={task.is_required}
                          onCheckedChange={(v) => updateTask(index, { is_required: v })}
                        />
                        <span className="text-sm text-text-muted">Required</span>
                      </div>
                    </div>
                  </div>
                </AppCard>
              ))}

              {tasks.length === 0 && (
                <p className="text-center text-text-muted py-4">
                  No tasks yet. Add some!
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              Save Day
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
