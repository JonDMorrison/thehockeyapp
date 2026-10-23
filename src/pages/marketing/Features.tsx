import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Library,
  Play,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  setSelectedRole,
  type SelectedRole,
} from "@/components/marketing/GetStartedModal";
import drivewayPlayer from "@/assets/brand/driveway-wrist-shot-v2.jpg";
import familyProgress from "@/assets/brand/family-progress.jpg";

function SampleWeek() {
  return (
    <div
      aria-label="Sample weekly plan"
      className="space-y-2 rounded-2xl border border-border bg-background p-4"
    >
      <p className="mb-3 text-xs text-muted-foreground">Sample weekly plan</p>
      {[
        ["Mon", "Puck skills"],
        ["Wed", "Shooting"],
        ["Fri", "Strength & mobility"],
      ].map(([day, activity]) => (
        <div
          key={day}
          className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-3"
        >
          <span className="w-8 shrink-0 text-xs text-muted-foreground">
            {day}
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">{activity}</span>
          <CalendarCheck2
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-primary"
          />
        </div>
      ))}
    </div>
  );
}
function SampleStandings() {
  return (
    <div
      aria-label="Sample shooting leaderboard"
      className="rounded-2xl border border-border bg-background p-4"
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Sample shooting leaderboard
      </p>
      <ol className="space-y-3">
        {[
          ["Alex", 200],
          ["Sam", 150],
          ["Mia", 100],
        ].map(([name, shots], i) => (
          <li key={name}>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-5 text-xs text-muted-foreground">
                #{i + 1}
              </span>
              <span className="flex-1 font-medium">{name}</span>
              <span className="tabular-nums">{shots} shots</span>
            </div>
            <div
              aria-hidden="true"
              className="ml-7 mt-2 h-1.5 rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${Number(shots) / 2}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
function SampleProgress() {
  return (
    <div
      aria-label="Sample workout progress"
      className="rounded-2xl border border-border bg-background p-4"
    >
      <p className="mb-3 text-xs text-muted-foreground">
        Sample workout progress
      </p>
      {[
        ["Alex", 4],
        ["Sam", 3],
        ["Mia", 2],
      ].map(([name, complete]) => (
        <div key={name} className="mb-3 last:mb-0">
          <div className="mb-2 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-muted-foreground">
              {complete} of 5 workouts
            </span>
          </div>
          <div aria-hidden="true" className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={`h-3 rounded-sm ${i < Number(complete) ? "bg-primary/70" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Features() {
  const navigate = useNavigate();
  const start = (role: SelectedRole) => {
    setSelectedRole(role);
    navigate("/auth?mode=signup");
  };
  return (
    <div className="marketing-performance min-h-screen bg-background">
      <MarketingNav />
      <main>
        <section
          aria-labelledby="features-heading"
          className="border-b border-border pb-14 pt-28 sm:pb-20 sm:pt-36"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-9 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <h1
                id="features-heading"
                className="font-display text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl"
              >
                A clear plan.
                <br />
                <span className="text-primary">Real progress.</span>
              </h1>
              <p className="mt-5 max-w-md text-lg leading-7 text-muted-foreground">
                Plan workouts, run challenges, and cheer on every player.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="min-h-12"
                  onClick={() => start("coach")}
                >
                  Set up your team
                  <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12"
                >
                  <Link to="/demo">Try the demo</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Free. No credit card.
              </p>
              <div
                aria-label="Explore features"
                className="mt-6 flex flex-wrap gap-x-5 text-sm"
              >
                <a
                  href="#coaches"
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  For coaches
                </a>
                <a
                  href="#visibility"
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  For parents
                </a>
                <a
                  href="#included"
                  className="inline-flex min-h-11 items-center underline underline-offset-4"
                >
                  What’s included
                </a>
              </div>
            </div>
            <figure className="overflow-hidden rounded-3xl border border-border bg-card">
              <img
                src={drivewayPlayer}
                alt="A young hockey player practising shots in the driveway"
                loading="eager"
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-3 p-5">
                <span>
                  <span className="block text-xs text-muted-foreground">
                    Sample player week
                  </span>
                  <span className="mt-1 block font-semibold">
                    3 of 4 workouts complete
                  </span>
                </span>
                <div aria-hidden="true" className="flex gap-2">
                  {[true, true, true, false].map((done, i) => (
                    <span
                      key={i}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${done ? "bg-primary/15 text-rose-300" : "bg-muted text-muted-foreground"}`}
                    >
                      {done ? <Check className="h-4 w-4" /> : "—"}
                    </span>
                  ))}
                </div>
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          id="coaches"
          aria-labelledby="coach-features-heading"
          className="scroll-mt-20 border-b border-border py-14 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              For coaches
            </p>
            <h2
              id="coach-features-heading"
              className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Less admin. More hockey.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
              A program, a single workout, or a shooting challenge. You choose.
            </p>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {[
                {
                  title: "Plan your way.",
                  description: "Start with a template or build your own.",
                  preview: <SampleWeek />,
                  action: "Set up your team",
                },
                {
                  title: "Make shots count.",
                  description:
                    "Your dates. Team-only standings. Everyone can take part.",
                  preview: <SampleStandings />,
                  action: "Try a shooting challenge",
                  href: "/demo#shooting-challenge",
                },
                {
                  title: "See who’s training.",
                  description: "Workouts and shot totals, together.",
                  preview: <SampleProgress />,
                  action: "Explore the demo",
                  href: "/demo#sample-workout",
                },
              ].map((feature) => (
                <article
                  key={feature.title}
                  aria-label={feature.title}
                  className="flex min-w-0 flex-col rounded-3xl border border-border bg-card p-5 sm:p-6"
                >
                  <h3 className="font-display text-2xl font-bold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                  <div className="mt-auto">{feature.preview}</div>
                  {feature.href ? (
                    <Link
                      to={feature.href}
                      className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"
                    >
                      {feature.action}
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"
                      onClick={() => start("coach")}
                    >
                      {feature.action}
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="visibility"
          aria-labelledby="parent-features-heading"
          className="scroll-mt-20 border-b border-border bg-card/30 py-14 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                For parents
              </p>
              <h2
                id="parent-features-heading"
                className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Small wins. In plain sight.
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                Know today’s plan. Log shots. Celebrate the effort.
              </p>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <figure className="overflow-hidden rounded-3xl border border-border bg-card">
                <img
                  src={familyProgress}
                  alt="A parent and young player checking their progress together"
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="flex flex-wrap gap-x-5 gap-y-2 p-5 text-sm">
                  <span className="flex items-center gap-2">
                    <ShieldCheck
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                    />
                    Family-managed profiles
                  </span>
                  <span className="flex items-center gap-2">
                    <Users
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                    />
                    Private team
                  </span>
                </figcaption>
              </figure>
              <div
                id="players"
                className="flex scroll-mt-20 flex-col rounded-3xl border border-border bg-card p-5 sm:p-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Today’s workout</h3>
                  <span className="text-xs text-muted-foreground">
                    Sample player view
                  </span>
                </div>
                <p className="mb-4 mt-2 text-xs text-muted-foreground">
                  2 of 3 exercises complete
                </p>
                <ul className="space-y-3">
                  {[
                    ["Quick hands", "5 min", true],
                    ["Wrist shots", "25 shots", true],
                    ["Cool down", "5 min", false],
                  ].map(([label, target, done]) => (
                    <li
                      key={String(label)}
                      className="flex items-center gap-3 rounded-xl bg-background p-3"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-primary/15 text-rose-300" : "border border-muted-foreground/40"}`}
                      >
                        {done && <Check className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium">
                        {label}
                        <span className="sr-only">
                          {done ? ", complete" : ", next"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {target}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-primary/10 p-4">
                  <span className="flex items-center gap-2 text-sm">
                    <Target
                      aria-hidden="true"
                      className="h-4 w-4 text-primary"
                    />
                    Shooting challenge
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-rose-300">
                    75 shots
                  </span>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-6">
                  <Button className="min-h-12" onClick={() => start("solo")}>
                    Start for my child
                    <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                  </Button>
                  <Link
                    to="/join"
                    className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                  >
                    Join your team
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="included"
          aria-labelledby="included-heading"
          className="scroll-mt-20 border-b border-border py-14 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2
              id="included-heading"
              className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              The useful extras. Included.
            </h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Library, label: "Reusable templates" },
                { icon: CalendarCheck2, label: "Practice & game schedules" },
                { icon: Play, label: "Skill videos in the drill" },
                { icon: Trophy, label: "Shooting, skills & strength" },
                { icon: ShieldCheck, label: "Invite-only teams" },
                { icon: Users, label: "Shared coach access" },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="features-start-heading"
          className="py-14 sm:py-20"
        >
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2
              id="features-start-heading"
              className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Start with your team.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Free for coaches and families.
            </p>
            <Button
              size="lg"
              className="mt-6 min-h-12"
              onClick={() => start("coach")}
            >
              Set up your team free
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
            </Button>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
              <Link
                to="/contact"
                className="inline-flex min-h-11 items-center underline underline-offset-4"
              >
                Plan an association rollout
              </Link>
              <button
                className="min-h-11 text-muted-foreground underline underline-offset-4"
                onClick={() => start("association")}
              >
                Set up an association
              </button>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
