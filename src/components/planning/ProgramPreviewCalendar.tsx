import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Target, Dumbbell, Heart, Timer, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Task {
  task_type: string;
  label: string;
  target_type: string;
  target_value: number | null;
  shot_type: string;
  shots_expected: number | null;
  is_required: boolean;
}

interface Day {
  date: string;
  title: string;
  notes?: string;
  estimated_minutes: number;
  tasks: Task[];
}

interface Week {
  weekNumber: number;
  startDate: string;
  days: Day[];
}

interface ProgramPreviewCalendarProps {
  weeks: Week[];
  startDate: Date;
}

const taskTypeIcons: Record<string, React.ReactNode> = {
  shooting: <Target className="w-3 h-3" />,
  conditioning: <Dumbbell className="w-3 h-3" />,
  mobility: <Heart className="w-3 h-3" />,
  recovery: <Timer className="w-3 h-3" />,
  prep: <Sparkles className="w-3 h-3" />,
  other: <Clock className="w-3 h-3" />,
};

const taskTypeColors: Record<string, string> = {
  shooting: "bg-orange-500",
  conditioning: "bg-red-500",
  mobility: "bg-green-500",
  recovery: "bg-blue-500",
  prep: "bg-purple-500",
  other: "bg-gray-500",
};

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const ProgramPreviewCalendar: React.FC<ProgramPreviewCalendarProps> = ({
  weeks,
  startDate,
}) => {
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);

  const currentWeek = weeks[currentWeekIndex];

  const handlePrevWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
      setSelectedDay(null);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < weeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
      setSelectedDay(null);
    }
  };

  // Get day of week index (0-6, Mon-Sun)
  const getDayIndex = (dateStr: string) => {
    const date = parseISO(dateStr);
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to 6, shift others
  };

  // Build a 7-day grid with days from the current week
  const weekGrid = dayNames.map((_, i) => {
    return currentWeek.days.find((d) => getDayIndex(d.date) === i) || null;
  });

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevWeek}
          disabled={currentWeekIndex === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="text-center">
          <p className="font-semibold">Week {currentWeek.weekNumber}</p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(currentWeek.startDate), "MMM d")} - {format(parseISO(currentWeek.days[currentWeek.days.length - 1]?.date || currentWeek.startDate), "MMM d")}
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextWeek}
          disabled={currentWeekIndex === weeks.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Week Dots */}
      <div className="flex justify-center gap-1.5">
        {weeks.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentWeekIndex(i);
              setSelectedDay(null);
            }}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i === currentWeekIndex
                ? "bg-purple-500 w-4"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Day headers */}
        {dayNames.map((name) => (
          <div key={name} className="text-center text-xs text-muted-foreground font-medium py-1">
            {name}
          </div>
        ))}
        
        {/* Day cells */}
        {weekGrid.map((day, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => day && setSelectedDay(selectedDay?.date === day.date ? null : day)}
            className={cn(
              "aspect-square rounded-xl flex flex-col items-center justify-center p-1 border transition-all",
              day
                ? selectedDay?.date === day.date
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-border bg-card hover:border-purple-500/50"
                : "border-transparent bg-muted/30"
            )}
          >
            {day ? (
              <>
                <span className="text-xs font-medium">{format(parseISO(day.date), "d")}</span>
                <div className="flex gap-0.5 mt-1">
                  {Object.entries(
                    day.tasks.reduce((acc, task) => {
                      acc[task.task_type] = (acc[task.task_type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).slice(0, 3).map(([type]) => (
                    <div
                      key={type}
                      className={cn("w-1.5 h-1.5 rounded-full", taskTypeColors[type] || "bg-gray-500")}
                    />
                  ))}
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Rest</span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Selected Day Details */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-card border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedDay.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(selectedDay.date), "EEEE, MMM d")} • ~{selectedDay.estimated_minutes} min
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                  {selectedDay.tasks.length} tasks
                </span>
              </div>

              {selectedDay.notes && (
                <p className="text-sm text-muted-foreground italic">{selectedDay.notes}</p>
              )}

              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {selectedDay.tasks.map((task, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className={cn("p-1 rounded", taskTypeColors[task.task_type] || "bg-gray-500")}>
                      {taskTypeIcons[task.task_type]}
                    </div>
                    <span className="flex-1 truncate">{task.label}</span>
                    {task.shots_expected && (
                      <span className="text-xs text-muted-foreground">{task.shots_expected} shots</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-lg font-bold text-purple-500">{weeks.length}</p>
          <p className="text-xs text-muted-foreground">Weeks</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-lg font-bold text-purple-500">
            {weeks.reduce((acc, w) => acc + w.days.length, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-muted/50">
          <p className="text-lg font-bold text-purple-500">
            {weeks.reduce((acc, w) => acc + w.days.reduce((a, d) => a + (d.tasks.filter(t => t.shots_expected).reduce((s, t) => s + (t.shots_expected || 0), 0)), 0), 0)}
          </p>
          <p className="text-xs text-muted-foreground">Total Shots</p>
        </div>
      </div>
    </div>
  );
};
