import { useTranslation } from 'react-i18next';
import React from "react";
import { motion } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Target,
  Dumbbell,
  Heart,
  Timer,
  Zap,
  Eye,
  Repeat,
  Footprints,
  Snowflake,
} from "lucide-react";

interface ExerciseData {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  categoryKey: string;
}

interface ChallengeDayBuilderProps {
  selectedExercises: string[];
  onToggleExercise: (id: string) => void;
}

const exerciseData: ExerciseData[] = [
  // Shooting
  { id: "wrist_shots", labelKey: "practice.exerciseWristShots", icon: Target, categoryKey: "practice.categoryShooting" },
  { id: "snap_shots", labelKey: "practice.exerciseSnapShots", icon: Zap, categoryKey: "practice.categoryShooting" },
  { id: "slap_shots", labelKey: "practice.exerciseSlapShots", icon: Target, categoryKey: "practice.categoryShooting" },
  { id: "backhand_shots", labelKey: "practice.exerciseBackhandShots", icon: Target, categoryKey: "practice.categoryShooting" },

  // Stickhandling
  { id: "basic_puck_control", labelKey: "practice.exerciseBasicPuckControl", icon: Repeat, categoryKey: "practice.categoryStickhandling" },
  { id: "figure_8s", labelKey: "practice.exerciseFigure8s", icon: Repeat, categoryKey: "practice.categoryStickhandling" },
  { id: "toe_drags", labelKey: "practice.exerciseToedrags", icon: Repeat, categoryKey: "practice.categoryStickhandling" },
  { id: "quick_hands", labelKey: "practice.exerciseQuickHandsDrill", icon: Zap, categoryKey: "practice.categoryStickhandling" },

  // Conditioning
  { id: "sprints", labelKey: "practice.exerciseSprints", icon: Footprints, categoryKey: "practice.categoryConditioning" },
  { id: "ladder_drills", labelKey: "practice.exerciseLadderDrills", icon: Footprints, categoryKey: "practice.categoryConditioning" },
  { id: "box_jumps", labelKey: "practice.exerciseBoxJumps", icon: Dumbbell, categoryKey: "practice.categoryConditioning" },
  { id: "burpees", labelKey: "practice.exerciseBurpees", icon: Dumbbell, categoryKey: "practice.categoryConditioning" },

  // Flexibility & Recovery
  { id: "dynamic_stretching", labelKey: "practice.exerciseDynamicStretching", icon: Heart, categoryKey: "practice.categoryFlexibility" },
  { id: "static_stretching", labelKey: "practice.exerciseStaticStretching", icon: Heart, categoryKey: "practice.categoryFlexibility" },
  { id: "foam_rolling", labelKey: "practice.exerciseFoamRolling", icon: Heart, categoryKey: "practice.categoryFlexibility" },

  // Hockey IQ
  { id: "video_study", labelKey: "practice.exerciseVideoStudy", icon: Eye, categoryKey: "practice.categoryHockeyIQ" },
  { id: "visualization", labelKey: "practice.exerciseVisualization", icon: Eye, categoryKey: "practice.categoryHockeyIQ" },

  // Off-Ice Skills
  { id: "ball_hockey", labelKey: "practice.exerciseBallHockey", icon: Snowflake, categoryKey: "practice.categoryOffIce" },
  { id: "passing_wall", labelKey: "practice.exercisePassingWall", icon: Target, categoryKey: "practice.categoryOffIce" },
  { id: "reaction_drills", labelKey: "practice.exerciseReactionDrills", icon: Timer, categoryKey: "practice.categoryOffIce" },
];

// Exported interface for translated exercises (used by ThirtyDayChallengeWizard)
export interface Exercise {
  id: string;
  label: string;
  icon: React.ElementType;
  category: string;
}

export const ChallengeDayBuilder: React.FC<ChallengeDayBuilderProps> = ({
  selectedExercises,
  onToggleExercise,
}) => {
  const { t } = useTranslation();

  const exercises = exerciseData.map(e => ({
    id: e.id,
    label: t(e.labelKey),
    icon: e.icon,
    category: t(e.categoryKey),
  }));

  const categories = [...new Set(exercises.map((e) => e.category))];

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryExercises = exercises.filter((e) => e.category === category);
        return (
          <div key={category}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h4>
            <div className="grid grid-cols-2 gap-2">
              {categoryExercises.map((exercise) => {
                const isSelected = selectedExercises.includes(exercise.id);
                const Icon = exercise.icon;
                return (
                  <motion.button
                    key={exercise.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onToggleExercise(exercise.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{exercise.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Export exercises as a hook-friendly getter for ThirtyDayChallengeWizard
export { exerciseData };
export type { Exercise };
