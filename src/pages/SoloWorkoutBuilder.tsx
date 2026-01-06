import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { 
  ChevronLeft, Plus, Target, Dumbbell, Heart, Timer, Sparkles,
  MoreHorizontal, Trash2, GripVertical, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DAY_TEMPLATES, getTasksForDay } from "@/lib/weekTemplates";

interface Task {
  id: string;
  sort_order: number;
  task_type: string;
  label: string;
  target_type: string;
  target_value: number | null;
  shot_type: string;
  shots_expected: number | null;
  is_required: boolean;
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

const QUICK_TEMPLATES = [
  { id: 'high_volume_shooting', label: '🎯 High Volume', description: '100+ shots' },
  { id: 'quick_skills', label: '⚡ Quick Skills', description: '15 min' },
  { id: 'conditioning_day', label: '🏋️ Conditioning', description: 'Strength focus' },
  { id: 'recovery_day', label: '💆 Recovery', description: 'Light & easy' },
  { id: 'balanced_day', label: '⚖️ Balanced', description: 'Mix of everything' },
];

export default function SoloWorkoutBuilder() {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = useState<Date>(new Date(dateParam));
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  // Fetch player
  const { data: player, isLoading } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, owner_user_id')
        .eq('id', playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = DAY_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setTitle(template.title);
    const templateTasks = getTasksForDay(templateId);
    
    setTasks(templateTasks.map((task, index) => ({
      id: `new-${Date.now()}-${index}`,
      sort_order: index,
      task_type: task.type,
      label: task.label,
      target_type: task.minutes ? 'minutes' : task.reps ? 'reps' : 'none',
      target_value: task.minutes || task.reps || null,
      shot_type: 'none',
      shots_expected: task.shots || null,
      is_required: task.isRequired || false,
    })));
  };

  const addTask = () => {
    const newTask: Task = {
      id: `new-${Date.now()}`,
      sort_order: tasks.length,
      task_type: 'shooting',
      label: '',
      target_type: 'none',
      target_value: null,
      shot_type: 'none',
      shots_expected: null,
      is_required: true,
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!player) throw new Error("Player not found");
      if (tasks.length === 0) throw new Error("Add at least one task");

      // Create practice card
      const { data: card, error: cardError } = await supabase
        .from('personal_practice_cards')
        .insert({
          player_id: playerId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          title: title || `Workout - ${format(selectedDate, 'MMM d')}`,
          tier: 'rep',
          mode: 'normal',
        })
        .select()
        .single();

      if (cardError) throw cardError;

      // Create tasks
      const taskInserts = tasks.map((task, index) => ({
        personal_practice_card_id: card.id,
        sort_order: index,
        task_type: task.task_type,
        label: task.label,
        target_type: task.target_type,
        target_value: task.target_value,
        shot_type: task.shot_type,
        shots_expected: task.shots_expected,
        is_required: task.is_required,
      }));

      const { error: tasksError } = await supabase
        .from('personal_practice_tasks')
        .insert(taskInserts);

      if (tasksError) throw tasksError;

      return card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solo-dashboard', playerId] });
      toast.success("Workout created!");
      navigate(`/solo/dashboard/${playerId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-5 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate(`/solo/planning/${playerId}`)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">New Workout</h1>
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <button className="text-sm text-primary font-medium">
                    {format(selectedDate, 'EEEE, MMM d')}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) setSelectedDate(date);
                      setShowCalendar(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="px-5 py-6 space-y-6">
          {/* Quick Templates */}
          {tasks.length === 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Start with a template
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {QUICK_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className="flex-shrink-0 bg-card border border-border rounded-xl px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{template.label}</p>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <Label className="text-sm font-medium">Workout Title</Label>
            <Input
              className="mt-2"
              placeholder="e.g., Morning Shooting Session"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">Tasks</Label>
              <Button variant="ghost" size="sm" onClick={addTask}>
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-muted-foreground mt-2">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <Input
                          placeholder="Task name (e.g., Wrist shots)"
                          value={task.label}
                          onChange={(e) => updateTask(task.id, { label: e.target.value })}
                        />
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Select
                            value={task.task_type}
                            onValueChange={(v) => updateTask(task.id, { task_type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(taskTypeLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    {taskTypeIcons[key]}
                                    {label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {task.task_type === 'shooting' && (
                            <Input
                              type="number"
                              placeholder="Shots"
                              value={task.shots_expected || ''}
                              onChange={(e) => updateTask(task.id, { 
                                shots_expected: e.target.value ? parseInt(e.target.value) : null 
                              })}
                            />
                          )}

                          {task.task_type !== 'shooting' && (
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="Value"
                                value={task.target_value || ''}
                                onChange={(e) => updateTask(task.id, { 
                                  target_value: e.target.value ? parseInt(e.target.value) : null 
                                })}
                                className="flex-1"
                              />
                              <Select
                                value={task.target_type}
                                onValueChange={(v) => updateTask(task.id, { target_type: v })}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  <SelectItem value="reps">reps</SelectItem>
                                  <SelectItem value="minutes">min</SelectItem>
                                  <SelectItem value="seconds">sec</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => removeTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {tasks.length === 0 && (
                <button
                  onClick={addTask}
                  className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/50 transition-colors"
                >
                  <Plus className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Add your first task</p>
                </button>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 pb-8">
            <Button
              className="w-full"
              size="lg"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || tasks.length === 0}
            >
              {saveMutation.isPending ? "Saving..." : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Save Workout
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
