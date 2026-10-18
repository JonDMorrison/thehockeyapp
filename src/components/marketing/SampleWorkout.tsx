import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, RotateCcw, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setSelectedRole } from "./GetStartedModal";

const drills = [
  { name: "Quick hands warm-up", target: "1 minute", tip: "Move the puck side to side in a clear space. Keep your head up and start slowly." },
  { name: "Wrist shots", target: "10 shots", tip: "Use a safe shooting area and a suitable backstop. Look at your target, shift your weight, and follow through." },
  { name: "Cool down", target: "1 minute", tip: "Take a relaxed walk and gently loosen your shoulders. Finish feeling good." },
];

export function SampleWorkout() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [view, setView] = useState<"player" | "coach" | "parent">("player");
  const allDone = completed.length === drills.length;
  const percent = Math.round(completed.length / drills.length * 100);
  const start = (role: "coach" | "solo") => {
    setSelectedRole(role);
    navigate("/auth?mode=signup");
  };

  return (
    <section id="sample-workout" aria-labelledby="sample-workout-heading" className="scroll-mt-20 border-y border-border bg-card/60 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold text-primary">Interactive sample · No account needed</p>
        <h2 id="sample-workout-heading" className="mt-2 text-2xl font-bold sm:text-4xl">Your first small win starts here.</h2>
        <p className="mt-3 text-muted-foreground">Check off the sample, then switch to a coach or parent view.</p>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Sample perspective">
          {(["player", "coach", "parent"] as const).map((role) => (
            <Button key={role} variant={view === role ? "default" : "outline"} aria-pressed={view === role} onClick={() => setView(role)} className="min-h-11 capitalize">{role} view</Button>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-border bg-background p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Sample team · Sample player</p>
              <h3 className="mt-1 text-xl font-bold">A little better today</h3>
              <p className="mt-1 text-sm text-muted-foreground">About 5 minutes · Stick, puck or ball, safe shooting space</p>
            </div>
            <Target className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <p role="status" className="mt-5 font-semibold">{completed.length} of {drills.length} exercises complete · {percent}%</p>
          <div role="progressbar" aria-label="Sample workout progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
          {view === "player" ? (
            <>
              <p className="mt-5 text-sm text-muted-foreground">For this demo, tap each exercise to try the checklist. During a real workout, check it off after you finish.</p>
              <div className="mt-4 space-y-3">
                {drills.map((drill) => {
                  const done = completed.includes(drill.name);
                  return (
                    <div key={drill.name} className="rounded-xl border border-border p-3">
                      <button type="button" aria-pressed={done} disabled={finished} className="flex min-h-12 w-full items-center gap-3 text-left disabled:opacity-70" onClick={() => setCompleted((current) => done ? current.filter((name) => name !== drill.name) : [...current, drill.name])}>
                        <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-success bg-success text-white" : "border-muted-foreground"}`}>{done && <Check className="h-4 w-4" />}</span>
                        <span className="min-w-0 flex-1 font-semibold">{drill.name}</span>
                        <span className="text-sm text-muted-foreground">{drill.target}</span>
                      </button>
                      <details className="mt-1 text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3">How to do it</summary><p className="pb-2 leading-6">{drill.tip}</p></details>
                    </div>
                  );
                })}
              </div>
              {!finished && <>
                <Button className="mt-5 min-h-12 w-full" disabled={!allDone} onClick={() => setFinished(true)}>Finish sample session</Button>
                <p className="mt-2 text-sm text-muted-foreground">{allDone ? "Ready to finish. Nice work!" : "Check off all 3 exercises to finish the sample."}</p>
              </>}
            </>
          ) : (
            <div className="mt-5 rounded-xl bg-muted/50 p-4">
              <h4 className="font-semibold">{view === "coach" ? "Know who needs a hand" : "Celebrate the effort"}</h4>
              <p className="mt-2 text-muted-foreground">{finished ? "Sample player finished today’s session. A great moment for a little encouragement." : `${completed.length} of 3 exercises checked off. The session is ${allDone ? "ready to finish" : "still in progress"}.`}</p>
              <p className="mt-3 text-sm text-muted-foreground">{view === "coach" ? "In your team workspace, assign a session and see your roster’s participation." : "Your child follows the plan. You can see their progress from the same family account."}</p>
              <Button className="mt-4 min-h-11" variant="outline" onClick={() => setView("player")}>Back to sample checklist</Button>
            </div>
          )}
          {finished && <div role="status" className="mt-5 rounded-xl border border-success/40 bg-success/10 p-4">
            <Trophy aria-hidden="true" className="mb-2 h-8 w-8 text-success" />
            <h3 className="text-xl font-bold">Small session. Big high-five!</h3>
            <p className="mt-2 text-muted-foreground">You finished the sample. A real account keeps your sessions and progress together.</p>
          </div>}
          <Button variant="ghost" className="mt-4 min-h-11" onClick={() => { setCompleted([]); setFinished(false); setView("player"); }}><RotateCcw className="mr-2 h-4 w-4" />Reset sample</Button>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="min-h-12" onClick={() => start("coach")}>Use this with my team</Button>
          <Button variant="outline" className="min-h-12" onClick={() => start("solo")}>Start for my child</Button>
          <Button variant="ghost" className="min-h-12" asChild><Link to="/join">I have a team code</Link></Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Sample progress resets on reload. Free for the hockey community. One adult account can coach a team and manage a child.</p>
      </div>
    </section>
  );
}
