import { Check, ChevronRight } from "lucide-react";

export function SetupProgress({
  step,
  labels = ["Team", "Training", "Invite"],
}: {
  step: number;
  labels?: readonly string[];
}) {
  return (
    <nav aria-label="Team setup progress" className="mx-auto w-full max-w-lg">
      <ol className="flex items-center justify-between gap-2 border-b border-white/10 pb-4 text-xs sm:text-sm">
        {labels.map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
            className="flex items-center gap-2"
          >
            {index > 0 && (
              <ChevronRight
                aria-hidden="true"
                className="mr-1 h-3 w-3 text-muted-foreground/50 sm:mr-3"
              />
            )}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${step > index + 1 ? "bg-primary/15 text-primary" : step === index + 1 ? "bg-primary text-white" : "border border-white/15 text-muted-foreground"}`}
            >
              {step > index + 1 ? (
                <Check aria-hidden="true" className="h-3 w-3" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={
                step === index + 1
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }
            >
              {label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
