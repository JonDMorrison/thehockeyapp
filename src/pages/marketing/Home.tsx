import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ClipboardCheck,
  ShieldCheck,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { MarketingAppPreview } from "@/components/marketing/MarketingAppPreview";
import { setSelectedRole } from "@/components/marketing/GetStartedModal";
import { ShootingChallengeTeaser } from "@/components/marketing/SampleShootingChallenge";
import { MarketingSkillVideoShowcase } from "@/components/marketing/MarketingSkillVideoShowcase";
import heroHomeTraining from "@/assets/brand/hero-vancouver-home-training.jpg";
import coachPlanning from "@/assets/brand/coach-planning.jpg";
import familyProgress from "@/assets/brand/family-progress.jpg";
import founderCoaching from "@/assets/brand/founder-jon-coaching.jpg";
import teamCelebration from "@/assets/brand/team-celebration.jpg";

function WeekPreview({ family = false }: { family?: boolean }) {
  return (
    <div
      aria-label={family ? "Sample player progress" : "Sample weekly plan"}
      className="rounded-2xl border border-border bg-background/80 p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{family ? "Sample player progress" : "Sample weekly plan"}</span>
        {family ? (
          <span className="font-semibold text-rose-300">4 of 5 complete</span>
        ) : (
          <CalendarCheck2 aria-hidden="true" className="h-4 w-4 text-primary" />
        )}
      </div>
      {family ? (
        <div className="grid grid-cols-5 gap-2" aria-hidden="true">
          {["M", "T", "W", "T", "F"].map((day, i) => (
            <div key={i} className="text-center">
              <span
                className={`flex aspect-square items-center justify-center rounded-xl ${i < 4 ? "bg-primary/15 text-rose-300" : "bg-muted text-muted-foreground"}`}
              >
                {i < 4 ? <Check className="h-5 w-5" /> : "—"}
              </span>
              <span className="mt-2 block text-[10px] text-muted-foreground">
                {day}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {[
            ["Mon", "Puck skills"],
            ["Wed", "Shooting"],
            ["Fri", "Strength & mobility"],
          ].map(([day, activity]) => (
            <div
              key={day}
              className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2"
            >
              <span className="w-8 text-xs text-muted-foreground">{day}</span>
              <span className="flex-1 text-sm font-medium">{activity}</span>
              <Check aria-hidden="true" className="h-4 w-4 text-rose-300" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const startCoachSetup = () => {
    setSelectedRole("coach");
    navigate("/auth?mode=signup");
  };
  const startFamilySetup = () => {
    setSelectedRole("solo");
    navigate("/auth?mode=signup");
  };
  return (
    <div className="marketing-performance min-h-screen bg-background">
      <MarketingNav />
      <main>
        {/* 1. Hero */}
        <section
          aria-label="Welcome to The Hockey App"
          className="performance-grid relative overflow-hidden border-b border-white/[0.06] pt-16"
        >
          <img
            src={heroHomeTraining}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[62%_center] opacity-50"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#090a0e_0%,rgba(9,10,14,0.96)_38%,rgba(9,10,14,0.68)_68%,rgba(9,10,14,0.46)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#090a0e_0%,transparent_38%,rgba(9,10,14,0.2)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_72%_20%,hsl(var(--primary)/0.18),transparent_36%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
            <div>
              <h1 className="max-w-3xl font-display text-5xl font-black leading-[1.02] tracking-[-0.035em] text-white sm:text-6xl lg:text-[72px]">
                Better hockey.
                <br />
                <span className="text-primary">Starts at home.</span>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-7 text-white/70 sm:text-xl">
                Workouts and shooting challenges that keep your team moving.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="min-h-12 rounded-md px-7 font-bold"
                  onClick={startCoachSetup}
                >
                  Set up your team
                  <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="min-h-12 rounded-md border-white/15 bg-white/[0.03] px-7 hover:bg-white/[0.07]"
                  asChild
                >
                  <Link to="/demo#sample-workout">Try the demo</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-white/70">
                Free. No credit card.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-[330px] lg:mr-0">
              <div className="absolute -inset-10 rounded-full bg-primary/10 blur-3xl" />
              <PhoneMockup showGlow={false} className="relative w-full">
                <MarketingAppPreview />
              </PhoneMockup>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="home-people-heading"
          className="border-b border-border py-14 sm:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2
              id="home-people-heading"
              className="mb-8 font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              One team. Everyone involved.
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  label: "For coaches",
                  title: "Plan the week.",
                  text: "Pick workouts. Invite families. See who’s training.",
                  image: coachPlanning,
                  alt: "A hockey coach planning at the rink",
                  family: false,
                },
                {
                  label: "For parents",
                  title: "Know what’s next.",
                  text: "Today’s workout, shot totals, and small wins—all in one place.",
                  image: familyProgress,
                  alt: "A parent and player reviewing training progress",
                  family: true,
                },
              ].map((card) => (
                <article
                  key={card.label}
                  aria-label={card.label}
                  className="flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card"
                >
                  <div className="relative">
                    <img
                      src={card.image}
                      alt={card.alt}
                      loading="lazy"
                      className="aspect-[2/1] w-full object-cover"
                    />
                    <span className="absolute bottom-4 left-5 rounded-full border border-white/15 bg-black/75 px-3 py-1.5 text-xs font-semibold text-white">
                      {card.label}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-7">
                    <h3 className="font-display text-3xl font-bold tracking-tight">
                      {card.title}
                    </h3>
                    <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">
                      {card.text}
                    </p>
                    <WeekPreview family={card.family} />
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                      <Button
                        className="min-h-12"
                        onClick={
                          card.family ? startFamilySetup : startCoachSetup
                        }
                      >
                        {card.family
                          ? "Start for my child"
                          : "Set up your team"}
                        <ArrowRight
                          aria-hidden="true"
                          className="ml-2 h-4 w-4"
                        />
                      </Button>
                      {card.family && (
                        <Link
                          className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                          to="/join"
                        >
                          Join your team
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <ol
              aria-label="Team setup in three steps"
              className="mt-8 grid gap-3 sm:grid-cols-3"
            >
              {[
                {
                  icon: ClipboardCheck,
                  title: "Choose a plan",
                  detail: "A workout or a challenge.",
                },
                {
                  icon: Users,
                  title: "Invite families",
                  detail: "One link brings everyone in.",
                },
                {
                  icon: BarChart3,
                  title: "Watch progress",
                  detail: "Every workout. Every shot.",
                },
              ].map((step, i) => (
                <li
                  key={step.title}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-muted/20 p-4 sm:p-5"
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <step.icon aria-hidden="true" className="h-5 w-5" />
                    <span className="absolute -right-1 -top-1 rounded-full bg-card px-1.5 text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <ShootingChallengeTeaser />
        <MarketingSkillVideoShowcase compact />

        <section
          aria-label="Built by a coach and parent"
          className="border-b border-border py-14 sm:py-16"
        >
          <div className="mx-auto grid max-w-6xl items-center gap-7 px-4 sm:px-6 md:grid-cols-[0.7fr_1.3fr] lg:gap-12 lg:px-8">
            <img
              src={founderCoaching}
              alt="Jon Morrison coaching youth hockey from the bench"
              loading="lazy"
              className="aspect-[3/2] w-full rounded-2xl object-cover"
            />
            <div>
              <blockquote className="font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
                “I built the system I needed as a coach—and the one I wanted as
                a parent.”
              </blockquote>
              <p className="mt-4 text-sm text-muted-foreground">
                Jon Morrison · Coach, parent & founder
              </p>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-4 w-4 text-primary"
                  />
                  Private teams
                </span>
                <span className="flex items-center gap-2">
                  <Users aria-hidden="true" className="h-4 w-4 text-primary" />
                  Family-managed profiles
                </span>
              </div>
              <Link
                to="/about"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"
              >
                Meet Jon
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="home-start-heading"
          className="relative isolate overflow-hidden py-16 sm:py-20"
        >
          <img
            src={teamCelebration}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_40%]"
          />
          <div className="absolute inset-0 -z-10 bg-black/80" />
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2
              id="home-start-heading"
              className="font-display text-4xl font-bold tracking-tight sm:text-5xl"
            >
              Bring your team.
            </h2>
            <p className="mt-3 text-base text-white/70">
              Free for coaches and families.
            </p>
            <Button
              size="lg"
              className="mt-6 min-h-12 px-7 font-bold"
              onClick={startCoachSetup}
            >
              Set up your team free
              <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-6 text-sm text-white/60">
              Run an association?{" "}
              <Link
                to="/contact"
                className="inline-flex min-h-11 items-center text-white underline underline-offset-4"
              >
                Plan an association rollout
              </Link>
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
