import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock3,
  RotateCcw,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setSelectedRole } from "./GetStartedModal";

function Standings({ shots }: { shots: number }) {
  const players = [
    { name: "Alex", shots: 200, mine: false },
    { name: "Sam", shots: 150, mine: false },
    { name: "Your player", shots, mine: true },
  ].sort((a, b) => b.shots - a.shots || Number(b.mine) - Number(a.mine));
  const max = Math.max(200, shots);
  return (
    <ol className="mt-5 space-y-4" aria-label="Sample shooting standings">
      {players.map((p) => {
        const rank =
          p.shots > 0
            ? players.filter((other) => other.shots > p.shots).length + 1
            : null;
        return (
          <li
            key={p.name}
            className={`rounded-lg p-3 ${p.mine ? "bg-primary/10" : "bg-white/[0.03]"}`}
          >
            <div className="flex items-center gap-3 text-sm">
              <span
                className={`w-6 shrink-0 font-bold tabular-nums ${rank === 1 ? "text-primary" : "text-muted-foreground"}`}
              >
                {rank ? `#${rank}` : "—"}
              </span>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-bold tabular-nums">
                {p.shots.toLocaleString()}{" "}
                <span className="font-normal text-muted-foreground">shots</span>
              </span>
            </div>
            <div
              aria-hidden="true"
              className="ml-9 mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${p.mine ? "bg-primary" : "bg-white/25"}`}
                style={{ width: `${(p.shots / max) * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ShootingChallengeTeaser() {
  return (
    <section
      aria-labelledby="shooting-preview-heading"
      className="relative overflow-hidden border-b border-white/10 bg-[#111319] py-14 sm:py-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-9 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            A quick win for your team
          </p>
          <h2
            id="shooting-preview-heading"
            className="mt-4 font-display text-4xl font-black uppercase leading-[0.98] tracking-tight sm:text-5xl"
          >
            Extra shots.
            <br />
            <span className="text-primary">A little friendly competition.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-white/65">
            Pick the dates. Invite your team. See who takes the most shots—with
            private standings and a high-five for every player putting in the
            work.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/75">
            <li className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="h-4 w-4 text-primary" />
              Your dates
            </li>
            <li className="flex items-center gap-2">
              <Target aria-hidden="true" className="h-4 w-4 text-primary" />
              Simple shot logging
            </li>
            <li className="flex items-center gap-2">
              <Users aria-hidden="true" className="h-4 w-4 text-primary" />
              Team-only standings
            </li>
          </ul>
          <Button asChild size="lg" className="mt-7 min-h-12 font-bold">
            <Link to="/demo#shooting-challenge">
              Try a shooting challenge
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-3 text-xs text-white/55">
            Interactive sample · No account or credit card needed
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-background p-5 shadow-2xl sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Fictional team · 7-day sample
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold">
                The extra-reps challenge
              </h3>
            </div>
            <Trophy
              aria-hidden="true"
              className="h-9 w-9 shrink-0 text-primary"
            />
          </div>
          <Standings shots={100} />
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Can your player catch Alex? Try it in the demo.
          </p>
        </div>
      </div>
    </section>
  );
}

export function SampleShootingChallenge() {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<"player" | "coach" | "parent">("coach");
  const [input, setInput] = useState("0");
  const [saved, setSaved] = useState(0);
  const [notice, setNotice] = useState("");
  const valid = /^\d+$/.test(input) && Number(input) <= 10000;
  const rank = saved > 0 ? 1 + Number(200 > saved) + Number(150 > saved) : null;
  const save = () => {
    if (!valid) return;
    const shots = Number(input);
    setSaved(shots);
    const nextRank =
      shots > 0 ? 1 + Number(200 > shots) + Number(150 > shots) : null;
    const tied = shots === 200 || shots === 150;
    setNotice(
      shots === 0
        ? "Daily total reset to 0 sample shots."
        : `${shots.toLocaleString()} sample shots saved. ${tied ? `Shared #${nextRank}—nice work!` : nextRank === 1 ? "You’re in first place. High-five!" : "You’re on the board. Every rep counts!"}`,
    );
  };
  const reset = () => {
    setDays(7);
    setStarted(false);
    setView("coach");
    setInput("0");
    setSaved(0);
    setNotice("");
    requestAnimationFrame(() =>
      document
        .getElementById("shooting-challenge")
        ?.scrollIntoView({ block: "start" }),
    );
  };
  const startReal = () => {
    setSelectedRole("coach");
    navigate(
      `/auth?mode=signup&redirect=${encodeURIComponent(`/onboarding/coach?shootingDays=${days}`)}`,
    );
  };
  return (
    <section
      id="shooting-challenge"
      aria-labelledby="sample-shooting-heading"
      className="scroll-mt-20 border-y border-primary/20 bg-primary/[0.03] px-4 py-10 sm:py-14"
    >
      <div className="mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
            Interactive shooting challenge · No account needed
          </p>
          <h2
            id="sample-shooting-heading"
            className="mt-3 font-display text-3xl font-black uppercase leading-tight sm:text-4xl"
          >
            Pick the days. Take the shots.
            <br />
            <span className="text-primary">Climb the team standings.</span>
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Try both sides: set it up as a coach, then log a few sample shots as
            a player.
          </p>
        </div>
        <div className="mt-7 grid items-start gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-background p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary"
              >
                {started ? <Check className="h-5 w-5" /> : "1"}
              </span>
              <div>
                <h3 className="font-bold">Coach picks the challenge length</h3>
                <p className="text-xs text-muted-foreground">
                  Custom dates are available for your real team.
                </p>
              </div>
            </div>
            <fieldset disabled={started}>
              <legend className="mb-3 text-sm font-semibold">
                How long will your team shoot?
              </legend>
              <div className="flex flex-wrap gap-2">
                {[7, 14, 30].map((n) => (
                  <Button
                    type="button"
                    key={n}
                    variant={n === days ? "default" : "outline"}
                    aria-pressed={n === days}
                    onClick={() => setDays(n)}
                  >
                    {n} days
                  </Button>
                ))}
              </div>
            </fieldset>
            <p className="mt-4 text-sm text-muted-foreground">
              {days}-day sample · Most shots wins · Ties share a place
            </p>
            {!started ? (
              <>
                <Button
                  className="mt-6 min-h-12 w-full font-bold"
                  onClick={() => {
                    setStarted(true);
                    setView("player");
                    setNotice(
                      "Sample challenge started. Give your player a few shots!",
                    );
                  }}
                >
                  Start sample challenge
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  Fictional players and totals. Nothing is published or sent.
                </p>
              </>
            ) : (
              <>
                <div
                  role="group"
                  aria-label="Shooting challenge perspective"
                  className="mt-6 flex flex-wrap gap-2"
                >
                  {(["player", "coach", "parent"] as const).map((role) => (
                    <Button
                      key={role}
                      variant={view === role ? "default" : "outline"}
                      aria-pressed={view === role}
                      onClick={() => setView(role)}
                      className="capitalize"
                    >
                      {role} view
                    </Button>
                  ))}
                </div>
                {view === "player" ? (
                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      2. Your player adds today’s shots
                    </p>
                    <div className="mt-4">
                      <Label htmlFor="sample-shot-total">
                        Sample daily shot total
                      </Label>
                      <Input
                        id="sample-shot-total"
                        className="mt-2 h-16 text-3xl font-bold tabular-nums"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={10000}
                        step={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        aria-describedby="sample-shot-help"
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      {[25, 50, 100].map((n) => (
                        <Button
                          key={n}
                          type="button"
                          variant="outline"
                          disabled={!valid || Number(input) + n > 10000}
                          onClick={() => setInput(String(Number(input) + n))}
                        >
                          +{n}
                        </Button>
                      ))}
                    </div>
                    <p
                      id="sample-shot-help"
                      className="mt-3 text-xs leading-5 text-muted-foreground"
                    >
                      Save the full daily total, not an additional amount. Whole
                      numbers from 0 to 10,000. Saving again replaces this
                      sample total.
                    </p>
                    <Button
                      className="mt-5 min-h-12 w-full font-bold"
                      disabled={!valid}
                      onClick={save}
                    >
                      Save sample shots
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-border bg-card p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {view === "coach" ? "Coach view" : "Parent view"}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-bold">
                      {view === "coach"
                        ? "The whole team, in one place."
                        : "Cheer on the effort."}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {view === "coach"
                        ? `Your player has ${saved.toLocaleString()} sample shots. The team has ${(350 + saved).toLocaleString()} shots altogether.`
                        : `Your player put in ${saved.toLocaleString()} sample shots. ${saved > 0 ? "A little progress is worth a high-five." : "Their next small win starts with the first few reps."}`}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 min-h-11"
                      onClick={() => setView("player")}
                    >
                      Back to shot logging
                    </Button>
                  </div>
                )}
              </>
            )}
            <p
              role="status"
              className={`mt-4 min-h-6 text-sm font-semibold ${saved > 0 ? "text-primary" : "text-muted-foreground"}`}
            >
              {notice}
            </p>
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-background p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <Trophy aria-hidden="true" className="h-7 w-7 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Fictional team · Example teammate totals
                  </p>
                  <h3 className="font-display text-xl font-bold">
                    3. See the standings change
                  </h3>
                </div>
              </div>
              <Standings shots={saved} />
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                {rank === 1
                  ? "Your player is setting the pace. Keep cheering for the whole team."
                  : "Alex and Sam have a sample head start. Add shots to catch them."}{" "}
                Real standings stay inside your invite-only team.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-5">
              <h3 className="font-display text-xl font-bold">
                Bring the challenge to your team.
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start with a {days}-day challenge. Create your coach account,
                name your team, then invite families.
              </p>
              <Button
                className="mt-4 min-h-12 w-full font-bold"
                onClick={startReal}
              >
                Create my team’s challenge
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">
                Free for the hockey community · No credit card
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-xs leading-5 text-muted-foreground">
            This is a local sample. Your real challenge starts fresh; these
            players and shots do not carry over.
          </p>
          <Button variant="ghost" onClick={reset}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Reset shooting sample
          </Button>
        </div>
      </div>
    </section>
  );
}
