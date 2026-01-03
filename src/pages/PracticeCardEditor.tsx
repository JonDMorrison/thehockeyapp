import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { SkeletonCard } from "@/components/app/Skeleton";
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
import { toast } from "@/components/app/Toast";
import { format, parseISO } from "date-fns";
import {
  ChevronLeft,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  Send,
  Lock,
  Unlock,
  Target,
  Dumbbell,
  Timer,
  Heart,
  Sparkles,
  MoreHorizontal,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { AIAssistSheet } from "@/components/builder/AIAssistSheet";

interface PracticeTask {
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

const tierOptions = [
  { value: "rec", label: "Rec" },
  { value: "rep", label: "Rep" },
  { value: "elite", label: "Elite" },
];

const PracticeCardEditor: React.FC = () => {
  const { id, cardId } = useParams<{ id: string; cardId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const isEditing = !!cardId;
  const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  // Form state
  const [tier, setTier] = useState("rep");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState<PracticeTask[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showAIAssist, setShowAIAssist] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch existing card if editing
  const { data: existingCard, isLoading: cardLoading } = useQuery({
    queryKey: ["practice-card", cardId],
    queryFn: async () => {
      const { data: cardData, error: cardError } = await supabase
        .from("practice_cards")
        .select("*")
        .eq("id", cardId)
        .single();

      if (cardError) throw cardError;

      const { data: tasksData, error: tasksError } = await supabase
        .from("practice_tasks")
        .select("*")
        .eq("practice_card_id", cardId)
        .order("sort_order");

      if (tasksError) throw tasksError;

      return { ...cardData, tasks: tasksData };
    },
    enabled: !!user && !!cardId,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingCard) {
      setTier(existingCard.tier);
      setTitle(existingCard.title || "");
      setNotes(existingCard.notes || "");
      setIsPublished(!!existingCard.published_at);
      setIsLocked(!!existingCard.locked);
      setTasks(
        existingCard.tasks.map((t: any) => ({
          id: t.id,
          sort_order: t.sort_order,
          task_type: t.task_type,
          label: t.label,
          target_type: t.target_type,
          target_value: t.target_value,
          shot_type: t.shot_type,
          shots_expected: t.shots_expected,
          is_required: t.is_required,
        }))
      );
    }
  }, [existingCard]);

  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (isLocked && isEditing) {
        throw new Error("Card is locked and cannot be edited");
      }

      let practiceCardId = cardId;

      if (isEditing) {
        // Update existing card
        const { error: updateError } = await supabase
          .from("practice_cards")
          .update({
            tier,
            title: title || null,
            notes: notes || null,
            published_at: publish ? new Date().toISOString() : isPublished ? existingCard?.published_at : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", cardId);

        if (updateError) throw updateError;

        // Delete old tasks and re-insert
        await supabase.from("practice_tasks").delete().eq("practice_card_id", cardId);
      } else {
        // Create new card
        const { data: newCard, error: createError } = await supabase
          .from("practice_cards")
          .insert({
            team_id: id,
            date: dateParam,
            tier,
            title: title || null,
            notes: notes || null,
            created_by_user_id: user!.id,
            published_at: publish ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (createError) throw createError;
        practiceCardId = newCard.id;
      }

      // Insert tasks
      if (tasks.length > 0) {
        const tasksToInsert = tasks.map((task, index) => ({
          practice_card_id: practiceCardId,
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
          .from("practice_tasks")
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      return { practiceCardId, published: publish };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["practice-cards", id] });
      queryClient.invalidateQueries({ queryKey: ["practice-card", cardId] });
      
      if (result.published) {
        toast.success("Published!", "Parents can now see this practice card.");
      } else {
        toast.success("Saved", "Practice card saved as draft.");
      }
      
      navigate(`/teams/${id}/practice`);
    },
    onError: (error: Error) => {
      toast.error("Failed to save", error.message);
    },
  });

  // Lock mutation
  const lockMutation = useMutation({
    mutationFn: async (lock: boolean) => {
      const { error } = await supabase
        .from("practice_cards")
        .update({ locked: lock, updated_at: new Date().toISOString() })
        .eq("id", cardId);

      if (error) throw error;
    },
    onSuccess: (_, lock) => {
      setIsLocked(lock);
      queryClient.invalidateQueries({ queryKey: ["practice-card", cardId] });
      toast.success(lock ? "Card locked" : "Card unlocked");
    },
    onError: (error: Error) => {
      toast.error("Failed to update", error.message);
    },
  });

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

  const updateTask = (index: number, updates: Partial<PracticeTask>) => {
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

  const cardDate = parseISO(isEditing && existingCard ? existingCard.date : dateParam);

  const handleAIDraftApply = (data: any) => {
    // Apply AI-generated data to the form
    if (data.title) setTitle(data.title);
    if (data.notes) setNotes(data.notes);
    if (data.tier) setTier(data.tier);
    if (data.tasks && Array.isArray(data.tasks)) {
      setTasks(
        data.tasks.map((t: any, idx: number) => ({
          sort_order: idx,
          task_type: t.task_type || "other",
          label: t.label || "",
          target_type: t.target_type || "none",
          target_value: t.target_value,
          shot_type: t.shot_type || "none",
          shots_expected: t.shots_expected,
          is_required: t.is_required !== false,
        }))
      );
    }
    toast.success("Draft applied", "Review and edit before publishing.");
  };

  if (cardLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/teams/${id}/practice`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">
                {isEditing ? "Edit Card" : "New Card"}
              </h1>
              <p className="text-xs text-text-muted">
                {format(cardDate, "EEEE, MMM d")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => lockMutation.mutate(!isLocked)}
                disabled={lockMutation.isPending}
              >
                {isLocked ? (
                  <Lock className="w-4 h-4 text-warning" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowAIAssist(true)}
              disabled={isLocked}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>
      }
    >
      <PageContainer>
        {isLocked && (
          <AppCard variant="muted" className="border-warning/30 bg-warning-muted">
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-warning" />
              <span>This card is locked. Unlock to make changes.</span>
            </div>
          </AppCard>
        )}

        {existingCard?.mode === "game_day" && (
          <AppCard variant="muted" className="border-team-primary/30 bg-team-primary/5">
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-team-primary flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-team-primary">Game Day Prep Card</p>
                <p className="text-text-muted mt-1">
                  Keep tasks light and focused on readiness. Avoid conditioning-heavy exercises.
                </p>
              </div>
            </div>
          </AppCard>
        )}

        {/* Card Settings */}
        <AppCard>
          <AppCardTitle className="text-base mb-4">Card Settings</AppCardTitle>
          
          <div className="space-y-4">
            <div>
              <Label>Tier</Label>
              <Select value={tier} onValueChange={setTier} disabled={isLocked}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tierOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Focus on wrist shots"
                className="mt-1.5"
                disabled={isLocked}
              />
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for parents..."
                className="mt-1.5"
                rows={2}
                disabled={isLocked}
              />
            </div>
          </div>
        </AppCard>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-secondary">
              Tasks ({tasks.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={addTask}
              disabled={isLocked}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </div>

          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <AppCard key={index} className="relative">
                  <div className="flex gap-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1 pt-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        onClick={() => moveTask(index, "up")}
                        disabled={index === 0 || isLocked}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6"
                        onClick={() => moveTask(index, "down")}
                        disabled={index === tasks.length - 1 || isLocked}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Task content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={task.task_type}
                            onValueChange={(v) => updateTask(index, { task_type: v })}
                            disabled={isLocked}
                          >
                            <SelectTrigger>
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
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeTask(index)}
                          disabled={isLocked}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>

                      <Input
                        value={task.label}
                        onChange={(e) => updateTask(index, { label: e.target.value })}
                        placeholder="Task description..."
                        disabled={isLocked}
                      />

                      <div className="flex gap-2">
                        <Select
                          value={task.target_type}
                          onValueChange={(v) => updateTask(index, { target_type: v })}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Target" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No target</SelectItem>
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
                            className="w-24"
                            disabled={isLocked}
                          />
                        )}
                      </div>

                      {task.task_type === "shooting" && (
                        <div className="flex gap-2">
                          <Select
                            value={task.shot_type}
                            onValueChange={(v) => updateTask(index, { shot_type: v })}
                            disabled={isLocked}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Shot type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Any type</SelectItem>
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
                            placeholder="Expected shots"
                            className="w-32"
                            disabled={isLocked}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </AppCard>
              ))}
            </div>
          ) : (
            <AppCard
              className="border-dashed border-2 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={addTask}
            >
              <div className="text-center py-4">
                <Plus className="w-8 h-8 mx-auto text-text-muted mb-2" />
                <p className="text-sm text-text-muted">Add your first task</p>
              </div>
            </AppCard>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => saveMutation.mutate(false)}
            disabled={saveMutation.isPending || isLocked}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            className="flex-1"
            onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending || isLocked || tasks.length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            {isPublished ? "Update" : "Publish"}
          </Button>
        </div>
      </PageContainer>
      
      {/* AI Assist Sheet */}
      <AIAssistSheet
        open={showAIAssist}
        onOpenChange={setShowAIAssist}
        teamId={id!}
        mode="day_card"
        date={dateParam}
        onApply={handleAIDraftApply}
      />
    </AppShell>
  );
};

export default PracticeCardEditor;
