import { Check } from "lucide-react";

export function FirstChallengeSteps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <nav aria-label="First challenge setup">
      <ol className="grid grid-cols-3 gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs sm:text-sm">
        {["Name team", "Pick dates", "Invite families"].map((label, i) => (
          <li
            key={label}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`flex items-center gap-2 ${step >= i + 1 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step >= i + 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {step > i + 1 ? (
                <Check className="h-3 w-3" aria-hidden="true" />
              ) : (
                i + 1
              )}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </nav>
  );
}
