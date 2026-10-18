import { ArrowUpRight, CalendarDays, Target } from "lucide-react";

function WeekPreview() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-white/10 bg-background/70 p-3 md:p-4"
    >
      <div className="mb-4 hidden items-center justify-between md:flex text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span>A week with a plan</span>
        <CalendarDays className="h-3.5 w-3.5" />
      </div>
      <div className="mb-2 grid grid-cols-5 md:mb-3 gap-2 text-center text-[10px] text-muted-foreground">
        {["M", "T", "W", "T", "F"].map((day, i) => (
          <span
            key={i}
            className={`rounded-md py-1.5 ${i === 0 ? "bg-primary text-white" : "bg-white/5"}`}
          >
            {day}
          </span>
        ))}
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="flex-1">Shooting & stickhandling</span>
          <span className="text-muted-foreground">Mon</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="flex-1">Movement & mobility</span>
          <span className="text-muted-foreground">Wed</span>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          <span className="flex-1">Game-day prep</span>
          <span className="text-muted-foreground">Fri</span>
        </div>
      </div>
    </div>
  );
}
function ShotsPreview() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-white/10 bg-background/70 p-3 md:p-4"
    >
      <div className="mb-4 hidden items-center justify-between md:flex text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span>A little team competition</span>
        <Target className="h-3.5 w-3.5" />
      </div>
      <div className="space-y-3">
        {[
          { name: "Alex", total: 240, width: "88%" },
          { name: "Sam", total: 180, width: "66%" },
          { name: "Jamie", total: 125, width: "46%" },
        ].map((player, i) => (
          <div
            key={player.name}
            className={`${i === 2 ? "hidden md:flex" : "flex"} items-center gap-3 text-xs`}
          >
            <span className="w-3 text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex justify-between">
                <span>{player.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {player.total} shots
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${i === 0 ? "bg-primary" : "bg-white/25"}`}
                  style={{ width: player.width }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrainingChoice({
  teamName,
  onProgram,
  onChallenge,
  onLater,
}: {
  teamName: string;
  onProgram: () => void;
  onChallenge: () => void;
  onLater: () => void;
}) {
  return (
    <section
      aria-labelledby="training-choice-title"
      className="mx-auto max-w-4xl space-y-5 md:space-y-7 animate-fade-up"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 break-words text-xs font-semibold uppercase tracking-widest text-primary">
          Let’s get {teamName.trim()} started
        </p>
        <h1
          id="training-choice-title"
          className="font-display text-2xl font-black tracking-tight sm:text-4xl"
        >
          What would help your team this week?
        </h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Start with one. You can add more anytime.
        </p>
      </div>
      <div className="grid items-stretch gap-4 md:grid-cols-2">
        {[
          {
            id: "program",
            title: "Start a program",
            description: "Give players a clear plan between practices.",
            action: "Plan my first week",
            detail: "Ready-made weeks. Yours to customize.",
            onClick: onProgram,
            preview: <WeekPreview />,
          },
          {
            id: "challenge",
            title: "Start a shooting challenge",
            description: "Pick the dates. See who puts in the reps.",
            action: "Start my challenge",
            detail: "One goal. Every shot counts.",
            onClick: onChallenge,
            preview: <ShotsPreview />,
          },
        ].map((choice) => (
          <button
            key={choice.id}
            type="button"
            onClick={choice.onClick}
            aria-labelledby={`${choice.id}-title`}
            aria-describedby={`${choice.id}-description`}
            className="group flex w-full flex-col gap-3 md:gap-5 rounded-2xl border border-white/10 bg-gradient-to-b from-card to-background p-4 text-left transition-[border-color,box-shadow] hover:border-primary/60 hover:shadow-[0_0_32px_hsl(var(--primary)/0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:p-6"
          >
            <div>
              <h2
                id={`${choice.id}-title`}
                className="font-display text-xl font-bold sm:text-2xl"
              >
                {choice.title}
              </h2>
              <p
                id={`${choice.id}-description`}
                className="mt-2 text-sm text-muted-foreground"
              >
                {choice.description}
              </p>
            </div>
            <div className="mt-auto">
              <span className="mb-2 block text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Sample preview
              </span>
              {choice.preview}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div>
                <span aria-hidden="true" className="block text-sm font-bold">
                  {choice.action}
                </span>
                <span className="mt-1 hidden text-xs text-muted-foreground md:block">
                  {choice.detail}
                </span>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="text-center">
        <button
          type="button"
          onClick={onLater}
          className="min-h-11 rounded-md px-3 text-xs text-muted-foreground underline decoration-white/20 underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          I’ll set up training later
        </button>
      </div>
    </section>
  );
}
