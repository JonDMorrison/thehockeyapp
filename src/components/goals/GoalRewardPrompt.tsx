import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Medal, 
  Pizza, 
  Star, 
  Gift, 
  Gamepad2, 
  PartyPopper,
  Pencil,
  Target,
  ArrowRight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RewardOption {
  id: string;
  label: string;
  emoji: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const rewardOptions: RewardOption[] = [
  {
    id: "badges",
    label: "Badge Hunt",
    emoji: "🏅",
    icon: Medal,
    description: "Earn special badges as you progress",
    color: "from-amber-500 to-yellow-500",
  },
  {
    id: "scrimmage",
    label: "Scrimmage Game",
    emoji: "🏒",
    icon: Gamepad2,
    description: "Fun game at the end of practice",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "pizza",
    label: "Pizza Party",
    emoji: "🍕",
    icon: Pizza,
    description: "Team pizza when goal is reached",
    color: "from-red-500 to-orange-500",
  },
  {
    id: "trophy",
    label: "Team Trophy",
    emoji: "🏆",
    icon: Trophy,
    description: "Display trophy for the team",
    color: "from-yellow-500 to-amber-600",
  },
  {
    id: "stars",
    label: "Star Stickers",
    emoji: "⭐",
    icon: Star,
    description: "Players earn stars on their gear",
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "surprise",
    label: "Mystery Prize",
    emoji: "🎁",
    icon: Gift,
    description: "Surprise reward to be revealed",
    color: "from-emerald-500 to-teal-500",
  },
];

interface GoalRewardPromptProps {
  onSetGoal: (rewardType: string, customReward?: string) => void;
  onSkip: () => void;
  context?: "workout" | "week" | "program";
}

export const GoalRewardPrompt: React.FC<GoalRewardPromptProps> = ({
  onSetGoal,
  onSkip,
  context = "program",
}) => {
  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customReward, setCustomReward] = useState("");

  const contextText = {
    workout: "this workout",
    week: "this week",
    program: "this program",
  };

  const handleContinue = () => {
    if (selectedReward === "custom") {
      onSetGoal("custom", customReward);
    } else if (selectedReward) {
      const reward = rewardOptions.find(r => r.id === selectedReward);
      onSetGoal(selectedReward, reward?.label);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-2">
          <PartyPopper className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold">Set a Goal Reward</h3>
        <p className="text-sm text-muted-foreground">
          What will the team earn when they complete {contextText[context]}?
        </p>
      </div>

      {/* Reward Options Grid */}
      <div className="grid grid-cols-2 gap-3">
        {rewardOptions.map((option) => {
          const isSelected = selectedReward === option.id;
          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedReward(option.id);
                setShowCustom(false);
              }}
              className={cn(
                "relative p-4 rounded-xl text-left transition-all border-2",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50 bg-card"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{option.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {option.description}
                  </p>
                </div>
              </div>
              {isSelected && (
                <motion.div
                  layoutId="reward-check"
                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                >
                  <Target className="w-3 h-3 text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Custom Option */}
      <div className="space-y-3">
        <button
          onClick={() => {
            setShowCustom(true);
            setSelectedReward("custom");
          }}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
            selectedReward === "custom"
              ? "border-primary bg-primary/5"
              : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
          )}
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Pencil className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm">Create Your Own</p>
            <p className="text-xs text-muted-foreground">
              Set a custom reward for your team
            </p>
          </div>
        </button>

        <AnimatePresence>
          {showCustom && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 pt-2">
                <Label htmlFor="custom-reward" className="text-sm">
                  Describe the reward
                </Label>
                <Input
                  id="custom-reward"
                  placeholder="e.g., Extra scrimmage time, Team outing, New equipment..."
                  value={customReward}
                  onChange={(e) => setCustomReward(e.target.value)}
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={onSkip}
        >
          Skip for now
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={handleContinue}
          disabled={!selectedReward || (selectedReward === "custom" && !customReward.trim())}
        >
          Set Goal
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// Compact inline version for quick prompts
interface QuickGoalPromptProps {
  onSetGoal: () => void;
  onDismiss: () => void;
}

export const QuickGoalPrompt: React.FC<QuickGoalPromptProps> = ({
  onSetGoal,
  onDismiss,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Add a team reward?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Motivate players with a goal to work towards
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={onDismiss} className="flex-1">
          Not now
        </Button>
        <Button size="sm" onClick={onSetGoal} className="flex-1 gap-1.5">
          <Target className="w-3.5 h-3.5" />
          Set Goal
        </Button>
      </div>
    </motion.div>
  );
};

// Inline reward selector for forms
interface InlineRewardSelectorProps {
  selectedReward: string | null;
  customReward: string | null;
  onSelect: (rewardType: string | null, description: string | null) => void;
}

export const InlineRewardSelector: React.FC<InlineRewardSelectorProps> = ({
  selectedReward,
  customReward,
  onSelect,
}) => {
  const [showCustomInput, setShowCustomInput] = useState(selectedReward === 'custom');
  const [customValue, setCustomValue] = useState(customReward || '');

  const handleSelect = (id: string) => {
    if (id === 'custom') {
      setShowCustomInput(true);
      onSelect('custom', customValue || null);
    } else {
      setShowCustomInput(false);
      const reward = rewardOptions.find(r => r.id === id);
      onSelect(id, reward?.label || null);
    }
  };

  const handleClear = () => {
    setShowCustomInput(false);
    setCustomValue('');
    onSelect(null, null);
  };

  return (
    <div className="space-y-3">
      {/* Reward Options Grid */}
      <div className="grid grid-cols-3 gap-2">
        {rewardOptions.map((option) => {
          const isSelected = selectedReward === option.id;
          return (
            <motion.button
              key={option.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "relative p-3 rounded-lg text-center transition-all border-2",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50 bg-card"
              )}
            >
              <span className="text-xl block mb-1">{option.emoji}</span>
              <p className="font-medium text-xs truncate">{option.label}</p>
              {isSelected && (
                <motion.div
                  layoutId="inline-reward-check"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                >
                  <Target className="w-2.5 h-2.5 text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Custom Option */}
      <button
        type="button"
        onClick={() => handleSelect('custom')}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
          selectedReward === 'custom'
            ? "border-primary bg-primary/5"
            : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"
        )}
      >
        <Pencil className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-sm">Custom reward</span>
      </button>

      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Input
              placeholder="e.g., Extra scrimmage time, Team outing..."
              value={customValue}
              onChange={(e) => {
                setCustomValue(e.target.value);
                onSelect('custom', e.target.value || null);
              }}
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear selection */}
      {selectedReward && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear selection
        </button>
      )}
    </div>
  );
};
