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

interface Exercise {
  id: string;
  label: string;
  icon: React.ElementType;
  category: string;
}

interface ChallengeDayBuilderProps {
  selectedExercises: string[];
  onToggleExercise: (id: string) => void;
}

const exercises: Exercise[] = [
  // Shooting
  { id: "wrist_shots", label: "Wrist Shots", icon: Target, category: "Shooting" },
  { id: "snap_shots", label: "Snap Shots", icon: Zap, category: "Shooting" },
  { id: "slap_shots", label: "Slap Shots", icon: Target, category: "Shooting" },
  { id: "backhand_shots", label: "Backhand Shots", icon: Target, category: "Shooting" },
  
  // Stickhandling
  { id: "basic_puck_control", label: "Basic Puck Control", icon: Repeat, category: "Stickhandling" },
  { id: "figure_8s", label: "Figure 8s", icon: Repeat, category: "Stickhandling" },
  { id: "toe_drags", label: "Toe Drags", icon: Repeat, category: "Stickhandling" },
  { id: "quick_hands", label: "Quick Hands Drill", icon: Zap, category: "Stickhandling" },
  
  // Conditioning
  { id: "sprints", label: "Sprints", icon: Footprints, category: "Conditioning" },
  { id: "ladder_drills", label: "Ladder Drills", icon: Footprints, category: "Conditioning" },
  { id: "box_jumps", label: "Box Jumps", icon: Dumbbell, category: "Conditioning" },
  { id: "burpees", label: "Burpees", icon: Dumbbell, category: "Conditioning" },
  
  // Flexibility & Recovery
  { id: "dynamic_stretching", label: "Dynamic Stretching", icon: Heart, category: "Flexibility" },
  { id: "static_stretching", label: "Static Stretching", icon: Heart, category: "Flexibility" },
  { id: "foam_rolling", label: "Foam Rolling", icon: Heart, category: "Flexibility" },
  
  // Hockey IQ
  { id: "video_study", label: "Video Study (15 min)", icon: Eye, category: "Hockey IQ" },
  { id: "visualization", label: "Visualization", icon: Eye, category: "Hockey IQ" },
  
  // Off-Ice Skills
  { id: "ball_hockey", label: "Ball Hockey", icon: Snowflake, category: "Off-Ice" },
  { id: "passing_wall", label: "Passing (Wall)", icon: Target, category: "Off-Ice" },
  { id: "reaction_drills", label: "Reaction Drills", icon: Timer, category: "Off-Ice" },
];

const categories = [...new Set(exercises.map((e) => e.category))];

export const ChallengeDayBuilder: React.FC<ChallengeDayBuilderProps> = ({
  selectedExercises,
  onToggleExercise,
}) => {
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

export { exercises };
export type { Exercise };
