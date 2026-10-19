import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PlanTask } from "@/components/builder/DayEditorSheet";

export function ProgramActivity({
  task,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  task: PlanTask;
  index: number;
  count: number;
  onChange: (change: Partial<PlanTask>) => void;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
}) {
  const types = {
    shooting: "Shooting",
    conditioning: "Conditioning",
    mobility: "Mobility",
    recovery: "Recovery",
    prep: "Preparation",
    other: "Other",
  };
  const number = index + 1;
  const fieldClass =
    "min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Activity {number} ·{" "}
          {types[task.task_type as keyof typeof types] || "Training"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove activity ${number}`}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <Input
        aria-label={`Activity ${number}`}
        value={task.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="e.g. Wrist shots at the corners"
        className="min-h-12 text-base"
      />
      <div className="flex flex-wrap gap-3">
        {task.task_type === "shooting" && (
          <div>
            <Label htmlFor={`activity-shots-${number}`}>Shots</Label>
            <Input
              id={`activity-shots-${number}`}
              aria-label={`Shots for activity ${number}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className="mt-1 h-11 w-28"
              value={task.shots_expected ?? ""}
              onChange={(e) =>
                onChange({
                  shots_expected:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
        )}
        {task.target_type !== "none" && (
          <div>
            <Label htmlFor={`activity-target-${number}`}>
              {task.target_type === "minutes"
                ? "Minutes"
                : task.target_type === "seconds"
                  ? "Seconds"
                  : "Reps"}
            </Label>
            <Input
              id={`activity-target-${number}`}
              aria-label={`Target for activity ${number}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className="mt-1 h-11 w-28"
              value={task.target_value ?? ""}
              onChange={(e) =>
                onChange({
                  target_value:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
        )}
      </div>
      <details>
        <summary className="cursor-pointer py-2 text-xs text-muted-foreground">
          Activity settings
        </summary>
        <div className="space-y-3 pt-2">
          <label className="block text-xs">
            Activity type
            <select
              className={`${fieldClass} mt-1`}
              value={task.task_type}
              onChange={(e) => onChange({ task_type: e.target.value })}
            >
              {Object.entries(types).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            Training target
            <select
              className={`${fieldClass} mt-1`}
              value={task.target_type}
              onChange={(e) => onChange({ target_type: e.target.value })}
            >
              {["none", "reps", "seconds", "minutes"].map((type) => (
                <option key={type} value={type}>
                  {type === "none" ? "No additional target" : type}
                </option>
              ))}
            </select>
          </label>
          {task.task_type === "shooting" && (
            <label className="block text-xs">
              Shot type
              <select
                className={`${fieldClass} mt-1`}
                value={task.shot_type}
                onChange={(e) => onChange({ shot_type: e.target.value })}
              >
                {["none", "wrist", "snap", "slap", "backhand", "mixed"].map(
                  (type) => (
                    <option key={type} value={type}>
                      {type === "none" ? "Any shot" : type}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          <div className="flex items-center gap-3">
            <Switch
              id={`required-activity-${number}`}
              checked={task.is_required}
              onCheckedChange={(value) => onChange({ is_required: value })}
            />
            <Label htmlFor={`required-activity-${number}`}>
              Required activity
            </Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={index === 0}
              onClick={() => onMove("up")}
            >
              <ArrowUp aria-hidden="true" className="h-4 w-4" />
              Move up
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={index === count - 1}
              onClick={() => onMove("down")}
            >
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
              Move down
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}
