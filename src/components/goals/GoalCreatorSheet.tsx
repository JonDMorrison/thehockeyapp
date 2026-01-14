import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { CalendarIcon, Target, Zap, Users, Award, Loader2, Gift, Sparkles, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateGoal, useUpdateGoal, TeamGoal } from '@/hooks/useTeamGoal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { InlineRewardSelector } from './GoalRewardPrompt';
import { SmartGoalSuggestions, GoalSuggestion } from './SmartGoalSuggestions';
import { motion, AnimatePresence } from 'framer-motion';

interface GoalCreatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  rosterCount?: number;
  editGoal?: TeamGoal | null;
  prefilled?: Partial<{
    name: string;
    goalType: string;
    targetValue: number;
    timeframe: string;
  }> | null;
  teamStats?: {
    avgShotsPerWeek?: number;
    avgSessionsPerWeek?: number;
    playerCount: number;
    lastGoalAchieved?: boolean;
  } | null;
}

const goalTypes = [
  { value: 'shots', label: 'Total Shots', icon: Target, description: 'Team shoots X total shots' },
  { value: 'sessions', label: 'Sessions Completed', icon: Zap, description: 'Team completes X sessions' },
  { value: 'participation', label: 'Participation Rate', icon: Users, description: 'X% of team participates' },
  { value: 'badges', label: 'Badges Earned', icon: Award, description: 'Team earns X badges' },
] as const;

const timeframes = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Dates' },
] as const;

export function GoalCreatorSheet({ open, onOpenChange, teamId, rosterCount = 10, editGoal, prefilled, teamStats }: GoalCreatorSheetProps) {
  const { user } = useAuth();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  
  const [step, setStep] = useState<'suggestions' | 'form'>('suggestions');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<'shots' | 'sessions' | 'participation' | 'badges'>('shots');
  const [targetValue, setTargetValue] = useState('');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [rewardType, setRewardType] = useState<string | null>(null);
  const [rewardDescription, setRewardDescription] = useState<string | null>(null);

  const isEditing = !!editGoal;

  // Populate form when editing or prefilled
  useEffect(() => {
    if (editGoal && open) {
      setStep('form');
      setName(editGoal.name);
      setDescription(editGoal.description || '');
      setGoalType(editGoal.goal_type);
      setTargetValue(editGoal.target_value.toString());
      setTimeframe(editGoal.timeframe);
      setStartDate(parseISO(editGoal.start_date));
      setEndDate(parseISO(editGoal.end_date));
      setShowLeaderboard(editGoal.show_leaderboard);
      setRewardType(editGoal.reward_type);
      setRewardDescription(editGoal.reward_description);
    } else if (prefilled && open) {
      setStep('form');
      if (prefilled.name) setName(prefilled.name);
      if (prefilled.goalType) setGoalType(prefilled.goalType as typeof goalType);
      if (prefilled.targetValue) setTargetValue(prefilled.targetValue.toString());
      if (prefilled.timeframe) setTimeframe(prefilled.timeframe as typeof timeframe);
    } else if (open && !editGoal && !prefilled) {
      // Show suggestions first for new goals
      setStep(teamStats ? 'suggestions' : 'form');
    } else if (!open) {
      resetForm();
    }
  }, [editGoal, prefilled, open, teamStats]);

  const getDateRange = () => {
    const today = new Date();
    if (timeframe === 'week') {
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    }
    if (timeframe === 'month') {
      return { start: startOfMonth(today), end: endOfMonth(today) };
    }
    return { start: startDate, end: endDate };
  };

  const getSuggestedTarget = () => {
    switch (goalType) {
      case 'shots': return rosterCount * 100;
      case 'sessions': return rosterCount * 5;
      case 'participation': return 80;
      case 'badges': return Math.ceil(rosterCount / 2);
      default: return 100;
    }
  };

  const handleSuggestionSelect = (suggestion: GoalSuggestion) => {
    setName(suggestion.name);
    setGoalType(suggestion.goalType);
    setTargetValue(suggestion.targetValue.toString());
    setTimeframe(suggestion.timeframe);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !targetValue || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    const dateRange = getDateRange();

    try {
      if (isEditing) {
        await updateGoal.mutateAsync({
          id: editGoal.id,
          name: name.trim(),
          description: description.trim() || null,
          goal_type: goalType,
          target_value: parseInt(targetValue),
          timeframe,
          start_date: format(dateRange.start, 'yyyy-MM-dd'),
          end_date: format(dateRange.end, 'yyyy-MM-dd'),
          show_leaderboard: showLeaderboard,
          reward_type: rewardType,
          reward_description: rewardDescription,
        });
        toast.success('Goal updated!');
      } else {
        await createGoal.mutateAsync({
          team_id: teamId,
          name: name.trim(),
          description: description.trim() || null,
          goal_type: goalType,
          target_value: parseInt(targetValue),
          timeframe,
          start_date: format(dateRange.start, 'yyyy-MM-dd'),
          end_date: format(dateRange.end, 'yyyy-MM-dd'),
          show_leaderboard: showLeaderboard,
          created_by_user_id: user.id,
          reward_type: rewardType,
          reward_description: rewardDescription,
        });
        toast.success('Team goal created!');
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(isEditing ? 'Failed to update goal' : 'Failed to create goal');
    }
  };

  const resetForm = () => {
    setStep('suggestions');
    setName('');
    setDescription('');
    setGoalType('shots');
    setTargetValue('');
    setTimeframe('week');
    setStartDate(new Date());
    setEndDate(addDays(new Date(), 7));
    setShowLeaderboard(true);
    setRewardType(null);
    setRewardDescription(null);
  };

  const isPending = createGoal.isPending || updateGoal.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {step === 'suggestions' && teamStats && !isEditing ? (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Smart Goal Suggestions
                </SheetTitle>
                <SheetDescription>
                  Pick a suggested goal or create your own
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <SmartGoalSuggestions
                  teamStats={teamStats}
                  onSelectSuggestion={handleSuggestionSelect}
                  hideHeader
                />

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep('form')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Create Custom Goal
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-2">
                  {teamStats && !isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -ml-2"
                      onClick={() => setStep('suggestions')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  )}
                  <div>
                    <SheetTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      {isEditing ? 'Edit Team Goal' : 'Set a Team Goal'}
                    </SheetTitle>
                    <SheetDescription>
                      {isEditing ? 'Update your team goal and reward' : 'Create a goal for your team to work towards together'}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Goal Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Goal Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., January Shot Challenge"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Goal Type */}
                <div className="space-y-3">
                  <Label>Goal Type *</Label>
                  <RadioGroup value={goalType} onValueChange={(v) => setGoalType(v as typeof goalType)}>
                    <div className="grid grid-cols-2 gap-3">
                      {goalTypes.map((type) => (
                        <label
                          key={type.value}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                            goalType === type.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50'
                          )}
                        >
                          <RadioGroupItem value={type.value} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm">{type.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Target Value */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="target">Target {goalType === 'participation' ? 'Percentage' : 'Number'} *</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 text-xs text-muted-foreground"
                      onClick={() => setTargetValue(getSuggestedTarget().toString())}
                    >
                      Suggest: {getSuggestedTarget()}
                    </Button>
                  </div>
                  <Input
                    id="target"
                    type="number"
                    min="1"
                    placeholder={`e.g., ${getSuggestedTarget()}`}
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>

                {/* Timeframe */}
                <div className="space-y-3">
                  <Label>Timeframe *</Label>
                  <RadioGroup value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
                    <div className="flex gap-2">
                      {timeframes.map((tf) => (
                        <label
                          key={tf.value}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all text-sm',
                            timeframe === tf.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/50'
                          )}
                        >
                          <RadioGroupItem value={tf.value} className="sr-only" />
                          {tf.label}
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Custom Date Pickers */}
                {timeframe === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(startDate, 'MMM d, yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(d) => d && setStartDate(d)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(endDate, 'MMM d, yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(d) => d && setEndDate(d)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add some motivation or context..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Show Leaderboard Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <Label htmlFor="leaderboard" className="font-medium">Show Top Contributors</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Players will see who's contributing most to the goal
                    </p>
                  </div>
                  <Switch
                    id="leaderboard"
                    checked={showLeaderboard}
                    onCheckedChange={setShowLeaderboard}
                  />
                </div>

                {/* Goal Reward */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-primary" />
                    <Label className="font-medium">Goal Reward (optional)</Label>
                  </div>
                  <InlineRewardSelector
                    selectedReward={rewardType}
                    customReward={rewardDescription}
                    onSelect={(type, description) => {
                      setRewardType(type);
                      setRewardDescription(description);
                    }}
                  />
                </div>

                {/* Submit */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={isPending || !name.trim() || !targetValue}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEditing ? 'Saving...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      {isEditing ? 'Save Changes' : 'Create Team Goal'}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
