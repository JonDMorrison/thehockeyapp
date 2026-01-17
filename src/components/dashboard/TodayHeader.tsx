import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TodayHeaderProps {
  teamName: string;
  seasonLabel?: string | null;
  date: string;
  mode: "normal" | "game_day";
  gameDay: {
    enabled: boolean;
    event_time: string | null;
    opponent: string | null;
  };
  onUpdateTeamName?: (newName: string) => Promise<void>;
  isUpdating?: boolean;
}

export const TodayHeader: React.FC<TodayHeaderProps> = ({
  teamName,
  seasonLabel,
  date,
  mode,
  gameDay,
  onUpdateTeamName,
  isUpdating = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateObj = new Date(date);
  const formattedDate = format(dateObj, "EEE, MMM d").toUpperCase();

  const isGameDay = mode === "game_day" || gameDay.enabled;

  // Format game time if available
  const gameTime = gameDay.event_time 
    ? format(new Date(gameDay.event_time), "h:mm a")
    : null;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync editedName with teamName when it changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditedName(teamName);
    }
  }, [teamName, isEditing]);

  const handleSave = async () => {
    const trimmedName = editedName.trim();
    if (!trimmedName || trimmedName === teamName) {
      setIsEditing(false);
      setEditedName(teamName);
      return;
    }

    if (onUpdateTeamName) {
      await onUpdateTeamName(trimmedName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(teamName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className="space-y-1">
      {/* Date and Day Type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider text-text-muted">
            TODAY — {formattedDate}
          </span>
        </div>
        
        {/* Day Type Pill */}
        {isGameDay ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
            Game Day
            {gameTime && <span className="text-destructive/70">· {gameTime}</span>}
            {gameDay.opponent && <span className="text-destructive/70">vs {gameDay.opponent}</span>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Practice Day
          </span>
        )}
      </div>
      
      {/* Team Name - Editable */}
      <div className="flex items-baseline gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              ref={inputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-lg font-bold h-9 max-w-[240px]"
              disabled={isUpdating}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSave}
              disabled={isUpdating || !editedName.trim()}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4 text-success" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h1 className="text-lg font-bold text-foreground">{teamName}</h1>
            {seasonLabel && (
              <span className="text-sm text-text-muted">· {seasonLabel}</span>
            )}
            {onUpdateTeamName && (
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                aria-label="Edit team name"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
