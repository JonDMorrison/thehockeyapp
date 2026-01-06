import { Target, Scale, Heart, Trophy, Zap, Dumbbell } from "lucide-react";

// Week theme templates - visual cards for quick selection
export const WEEK_THEMES = [
  {
    id: "shooting_focus",
    title: "Shooting Focus",
    icon: "Target",
    description: "High volume shots all week",
    color: "bg-orange-500",
    gradient: "from-orange-500 to-amber-500",
    defaultDays: 5,
  },
  {
    id: "balanced",
    title: "Balanced Week",
    icon: "Scale",
    description: "Mix of shooting, mobility & prep",
    color: "bg-blue-500",
    gradient: "from-blue-500 to-cyan-500",
    tag: "Most Popular",
    defaultDays: 5,
  },
  {
    id: "recovery",
    title: "Recovery Week",
    icon: "Heart",
    description: "Light days with stretching focus",
    color: "bg-green-500",
    gradient: "from-green-500 to-emerald-500",
    defaultDays: 4,
  },
  {
    id: "game_week",
    title: "Game Week",
    icon: "Trophy",
    description: "Build up to game day",
    color: "bg-purple-500",
    gradient: "from-purple-500 to-violet-500",
    defaultDays: 4,
  },
] as const;

export type WeekThemeId = typeof WEEK_THEMES[number]["id"];

// Pre-built task library - ready to use with a single tap
export interface TaskTemplate {
  id: string;
  label: string;
  type: "shooting" | "conditioning" | "mobility" | "recovery" | "prep" | "other";
  icon: string;
  shots?: number;
  minutes?: number;
  reps?: number;
  isRequired?: boolean;
  description?: string; // How to do the exercise
}

export const TASK_LIBRARY: TaskTemplate[] = [
  // Shooting
  { 
    id: "wrist_shots", 
    label: "Wrist shots", 
    type: "shooting", 
    icon: "🎯", 
    shots: 50, 
    isRequired: true,
    description: "Focus on quick release from your front foot. Keep your bottom hand loose and snap through the puck. Aim for corners."
  },
  { 
    id: "snap_shots", 
    label: "Snap shots", 
    type: "shooting", 
    icon: "⚡", 
    shots: 30,
    description: "Quick, powerful shots with minimal wind-up. Load your stick by pressing down just behind the puck, then snap through."
  },
  { 
    id: "backhand", 
    label: "Backhand practice", 
    type: "shooting", 
    icon: "🏒", 
    shots: 25,
    description: "Cup the puck on your backhand, roll your wrists over as you release. Start close to the net and work back."
  },
  { 
    id: "slap_shots", 
    label: "Slap shots", 
    type: "shooting", 
    icon: "💥", 
    shots: 20,
    description: "Wind up at shoulder height, strike the ice 2-3 inches behind the puck. Follow through low for power."
  },
  { 
    id: "one_timers", 
    label: "One-timers", 
    type: "shooting", 
    icon: "🔥", 
    shots: 15,
    description: "Pass to yourself off a wall or rebounder. Focus on timing - open your blade to receive, then snap through in one motion."
  },
  { 
    id: "quick_release", 
    label: "Quick release drills", 
    type: "shooting", 
    icon: "⏱️", 
    shots: 25,
    description: "Practice shooting the instant you receive the puck. No extra touches - catch and release in under 1 second."
  },
  
  // Prep (stickhandling, skating, etc.)
  { 
    id: "toe_drags", 
    label: "Toe drags", 
    type: "prep", 
    icon: "🦶", 
    reps: 20,
    description: "Pull the puck towards your body using the toe of your blade. Practice both sides - forehand and backhand toe drags."
  },
  { 
    id: "figure_8", 
    label: "Figure 8 drills", 
    type: "prep", 
    icon: "♾️", 
    minutes: 5,
    description: "Move the puck in a figure 8 pattern around two objects. Keep your head up and soft hands. Speed up as you improve."
  },
  { 
    id: "puck_control", 
    label: "Puck control circuit", 
    type: "prep", 
    icon: "🎮", 
    minutes: 10,
    description: "Combine toe drags, figure 8s, and quick hands. Move through cones or objects while maintaining puck control."
  },
  
  // Conditioning
  { 
    id: "wall_sits", 
    label: "Wall sits", 
    type: "conditioning", 
    icon: "🏋️", 
    reps: 3,
    description: "Back flat against wall, thighs parallel to floor. Hold for 30-60 seconds each rep. Builds skating endurance."
  },
  { 
    id: "squats", 
    label: "Squats", 
    type: "conditioning", 
    icon: "🦵", 
    reps: 20,
    description: "Feet shoulder-width apart. Lower until thighs are parallel, keep chest up. Builds leg power for skating."
  },
  { 
    id: "lunges", 
    label: "Lunges", 
    type: "conditioning", 
    icon: "🚀", 
    reps: 15,
    description: "Step forward, lower back knee toward ground. Alternate legs. Great for skating stride power."
  },
  { 
    id: "planks", 
    label: "Planks", 
    type: "conditioning", 
    icon: "💪", 
    minutes: 2,
    description: "Hold a straight line from head to heels. Engage your core. Essential for shot power and balance on ice."
  },
  
  // Mobility
  { 
    id: "dynamic_stretch", 
    label: "Dynamic stretching", 
    type: "mobility", 
    icon: "🧘", 
    minutes: 5, 
    isRequired: true,
    description: "Leg swings, arm circles, hip rotations. Move through full range of motion to warm up muscles before training."
  },
  { 
    id: "foam_rolling", 
    label: "Foam rolling", 
    type: "mobility", 
    icon: "💆", 
    minutes: 10,
    description: "Roll slowly over quads, hamstrings, IT band, and back. Pause on tight spots. Helps recovery and prevents injury."
  },
  { 
    id: "hip_openers", 
    label: "Hip openers", 
    type: "mobility", 
    icon: "🦋", 
    minutes: 5,
    description: "Pigeon pose, frog stretch, and 90/90 stretch. Hold each for 30 seconds. Critical for skating mobility."
  },
  
  // Recovery / Mental (using "other" type)
  { 
    id: "visualization", 
    label: "Game visualization", 
    type: "other", 
    icon: "🧠", 
    minutes: 5,
    description: "Close your eyes and picture yourself in game situations. See yourself making plays, scoring goals, and winning battles."
  },
  { 
    id: "breathing", 
    label: "Breathing exercises", 
    type: "other", 
    icon: "🌬️", 
    minutes: 3,
    description: "Box breathing: inhale 4 seconds, hold 4, exhale 4, hold 4. Calms nerves and improves focus before games."
  },
];

// Day templates - pre-built day combinations
export interface DayTemplate {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  taskIds: string[];
  estimatedMinutes: number;
  color: string;
}

export const DAY_TEMPLATES: DayTemplate[] = [
  {
    id: "high_volume_shooting",
    title: "High Volume Shooting",
    subtitle: "100+ shots",
    icon: "🎯",
    taskIds: ["dynamic_stretch", "wrist_shots", "snap_shots", "backhand", "quick_release"],
    estimatedMinutes: 25,
    color: "bg-orange-500",
  },
  {
    id: "quick_skills",
    title: "Quick Skills",
    subtitle: "15 min session",
    icon: "⚡",
    taskIds: ["dynamic_stretch", "wrist_shots", "toe_drags"],
    estimatedMinutes: 15,
    color: "bg-yellow-500",
  },
  {
    id: "conditioning_day",
    title: "Conditioning",
    subtitle: "Strength focus",
    icon: "🏋️",
    taskIds: ["dynamic_stretch", "wall_sits", "squats", "lunges", "planks"],
    estimatedMinutes: 20,
    color: "bg-red-500",
  },
  {
    id: "recovery_day",
    title: "Recovery",
    subtitle: "Light & easy",
    icon: "💆",
    taskIds: ["foam_rolling", "hip_openers", "breathing"],
    estimatedMinutes: 18,
    color: "bg-green-500",
  },
  {
    id: "balanced_day",
    title: "Balanced Day",
    subtitle: "A bit of everything",
    icon: "⚖️",
    taskIds: ["dynamic_stretch", "wrist_shots", "puck_control", "squats"],
    estimatedMinutes: 20,
    color: "bg-blue-500",
  },
  {
    id: "game_prep",
    title: "Game Prep",
    subtitle: "Mental & physical",
    icon: "🏆",
    taskIds: ["visualization", "dynamic_stretch", "quick_release"],
    estimatedMinutes: 15,
    color: "bg-purple-500",
  },
  {
    id: "rest_day",
    title: "Rest Day",
    subtitle: "No training",
    icon: "😴",
    taskIds: [],
    estimatedMinutes: 0,
    color: "bg-slate-400",
  },
];

// Theme to day schedule mapping
export const THEME_SCHEDULES: Record<WeekThemeId, string[]> = {
  shooting_focus: [
    "high_volume_shooting",
    "quick_skills",
    "high_volume_shooting",
    "balanced_day",
    "high_volume_shooting",
  ],
  balanced: [
    "balanced_day",
    "conditioning_day",
    "quick_skills",
    "recovery_day",
    "high_volume_shooting",
  ],
  recovery: [
    "recovery_day",
    "quick_skills",
    "recovery_day",
    "balanced_day",
  ],
  game_week: [
    "balanced_day",
    "conditioning_day",
    "quick_skills",
    "game_prep",
  ],
};

// Helper to get tasks for a day template
export function getTasksForDay(dayTemplateId: string): TaskTemplate[] {
  const dayTemplate = DAY_TEMPLATES.find(d => d.id === dayTemplateId);
  if (!dayTemplate) return [];
  
  return dayTemplate.taskIds
    .map(taskId => TASK_LIBRARY.find(t => t.id === taskId))
    .filter((t): t is TaskTemplate => t !== undefined);
}

// Helper to generate a week from a theme
export function generateWeekFromTheme(themeId: WeekThemeId) {
  const schedule = THEME_SCHEDULES[themeId];
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  return schedule.map((dayTemplateId, index) => {
    const dayTemplate = DAY_TEMPLATES.find(d => d.id === dayTemplateId)!;
    return {
      dayIndex: index,
      dayName: dayNames[index],
      template: dayTemplate,
      tasks: getTasksForDay(dayTemplateId),
    };
  });
}
