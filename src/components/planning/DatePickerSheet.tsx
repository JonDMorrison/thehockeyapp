import React, { useState } from "react";
import { format, addDays, startOfToday, isSameDay } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarPlus, ArrowRight } from "lucide-react";

interface DatePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDate: (date: Date) => void;
  existingDates?: string[]; // ISO date strings of days with existing workouts
}

export const DatePickerSheet: React.FC<DatePickerSheetProps> = ({
  open,
  onOpenChange,
  onSelectDate,
  existingDates = [],
}) => {
  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);

  const handleConfirm = () => {
    if (selectedDate) {
      onSelectDate(selectedDate);
      onOpenChange(false);
    }
  };

  // Quick date options
  const quickDates = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: addDays(today, 1) },
    { label: "Day After", date: addDays(today, 2) },
  ];

  // Check if a date has an existing workout
  const hasWorkout = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return existingDates.includes(dateStr);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-emerald-500" />
            Pick a Date
          </SheetTitle>
          <SheetDescription>
            Select a date to add or edit a workout
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Quick Picks */}
          <div className="flex gap-2">
            {quickDates.map(({ label, date }) => (
              <Button
                key={label}
                variant={selectedDate && isSameDay(selectedDate, date) ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedDate(date)}
              >
                {label}
                {hasWorkout(date) && (
                  <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < today}
              modifiers={{
                hasWorkout: (date) => hasWorkout(date),
              }}
              modifiersClassNames={{
                hasWorkout: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-emerald-500",
              }}
              className="rounded-lg border"
            />
          </div>

          {/* Selected date indicator */}
          {selectedDate && (
            <div className="text-center text-sm text-muted-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
              {hasWorkout(selectedDate) && (
                <span className="text-amber-600 ml-2">(has workout)</span>
              )}
            </div>
          )}

          {/* Confirm Button */}
          <Button
            size="lg"
            className="w-full rounded-xl"
            onClick={handleConfirm}
            disabled={!selectedDate}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
