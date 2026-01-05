import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, Target, Zap, Users, Award, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateGoal } from '@/hooks/useTeamGoal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface GoalCreatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  rosterCount?: number;
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

export function GoalCreatorSheet({ open, onOpenChange, teamId, rosterCount = 10 }: GoalCreatorSheetProps) {
  const { user } = useAuth();
  const createGoal = useCreateGoal();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<'shots' | 'sessions' | 'participation' | 'badges'>('shots');
  const [targetValue, setTargetValue] = useState('');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const [showLeaderboard, setShowLeaderboard] = useState(true);

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

  const handleSubmit = async () => {
    if (!name.trim() || !targetValue || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    const dateRange = getDateRange();

    try {
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
      });

      toast.success('Team goal created!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create goal');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setGoalType('shots');
    setTargetValue('');
    setTimeframe('week');
    setStartDate(new Date());
    setEndDate(addDays(new Date(), 7));
    setShowLeaderboard(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Set a Team Goal
          </SheetTitle>
          <SheetDescription>
            Create a goal for your team to work towards together
          </SheetDescription>
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

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={createGoal.isPending || !name.trim() || !targetValue}
          >
            {createGoal.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Create Team Goal
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
