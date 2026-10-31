import { createContext, useContext } from 'react';
import type { WorkoutStep } from '@/lib/guidedWorkout';
export const WorkoutGuideContext = createContext<{
  activeId: string | undefined;
  steps: WorkoutStep[];
  select: (id: string) => void;
  advance: (id: string) => void;
} | null>(null);
export const useWorkoutGuide = () => useContext(WorkoutGuideContext);
