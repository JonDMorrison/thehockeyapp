import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  EyeOff,
  HeartPulse,
  Library,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";
import { BETA_MODE } from "@/core/constants";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { FeatureBuilder } from "@/components/marketing/features";
import heroOutdoorTraining from "@/assets/brand/hero-outdoor-training.jpg";
import drivewayPlayer from "@/assets/brand/driveway-wrist-shot.jpg";
import coachPlanning from "@/assets/brand/coach-planning.jpg";
import familyProgress from "@/assets/brand/family-progress.jpg";
import teamCelebration from "@/assets/brand/team-celebration.jpg";

const VIDEO_POSTER = "https://i.ytimg.com/vi/iHHmFJ17m58/maxresdefault.jpg";

const workflow = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Set the weekly standard",
    description: "Build or copy a balanced plan in minutes.",
  },
  {
    number: "02",
    icon: Target,
    title: "Players train at home",
    description: "Every player sees a simple daily checklist.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "See what is working",
    description: "Follow participation without public rankings.",
  },
] as const;

const includedFeatures = [
  {
    icon: Sparkles,
    title: "Smart weekly plans",
    description: "Start from a balanced suggestion, then make it yours.",
  },
  {
    icon: CalendarCheck2,
    title: "Schedule-aware training",
    description: "Fit the workload around practices and games.",
  },
  {
    icon: Play,
    title: "Skill videos in the drill",
    description: "Short Hockey Canada tips appear where players need them.",
  },
  {
    icon: Library,
    title: "Reusable team templates",
    description: "Copy a strong week instead of rebuilding it.",
  },
  {
    icon: WifiOff,
    title: "Reliable at the rink",
    description: "Keep the day moving when the connection is weak.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    description: "Invite-only teams and role-based access protect players.",
  },
] as const;

const developmentAreas = [
  { icon: Target, label: "Shooting", detail: "Wrist, snap, slap, backhand and quick release" },
  { icon: Trophy, label: "Puck skills", detail: "Hands, control, toe drags and coordination" },
  { icon: Dumbbell, label: "Strength", detail: "Age-appropriate power and athletic movement" },
  { icon: HeartPulse, label: "Mobility", detail: "Recovery, flexibility and healthy routines" },
] as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
      {children}
    </p>
  );
}

function FeaturePoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-6 text-white/64 sm:text-base">
      <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/12 text-success">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function AssociationPreview({ compact = false }: { compact?: boolean }) {
  const teams = [
    { name: "U13 A1", status: "Plan live", value: 86, active: true },
    { name: "U15 A2", status: "Plan live", value: 74, active: true },
    { name: "U11 C1", status: "Needs a plan", value: 38, active: false },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f14] shadow-[0_32px_90px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-4 sm:px-5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Association HQ</p>
          <p className="mt-1 font-display text-lg font-black uppercase text-white">Abbotsford Hawks</p>
        </div>
        <span className="rounded-md bg-success/10 px-2.5 py-1.5 text-[9px] font-black uppercase text-success">
          Season live
        </span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/[0.08] border-b border-white/[0.08]">
        {[["12", "Teams"], ["10", "Plans live"], ["74%", "Active"]].map(([value, label]) => (
          <div key={label} className="px-2 py-4 text-center sm:px-4">
            <p className="font-display text-2xl font-black text-white sm:text-3xl">{value}</p>
            <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-white/38 sm:text-[9px]">{label}</p>
          </div>
        ))}
      </div>

      <div className={`divide-y divide-white/[0.07] ${compact ? "px-4" : "px-4 sm:px-5"}`}>
        {teams.map((team) => (
          <div key={team.name} className="py-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-sm font-black uppercase text-white">{team.name}</span>
              <span className={`text-[9px] font-black uppercase ${team.active ? "text-success" : "text-white/38"}`}>
                {team.status}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div className={`h-full rounded-full ${team.active ? "bg-primary" : "bg-white/20"}`} style={{ width: `${team.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/[0.06] p-3 sm:mx-5 sm:mb-5">
          <Zap className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-[11px] font-semibold text-white/62">Two teams need help publishing this week.</p>
          <ChevronRight className="ml-auto h-4 w-4 text-white/28" />
        </div>
      )}
    </div>
  );
}

function PlayerWorkoutPreview() {
  const tasks = [
    { label: "Quick hands warm-up", target: "5 min", done: true },
    { label: "Quick release drills", target: "25 shots", done: false, active: true },
    { label: "Backhand accuracy", target: "20 shots", done: false },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f14] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3.5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">Today · Development day</p>
          <p className="mt-1 text-base font-black text-white">Alex&apos;s workout</p>
        </div>
        <span className="font-display text-2xl font-black text-primary">40%</span>
      </div>

      <div className="space-y-2.5 p-3.5 sm:p-4">
        {tasks.map((task) => (
          <div key={task.label} className={`rounded-xl border px-3 py-3 ${task.active ? "border-primary/35 bg-primary/[0.055]" : "border-white/[0.07] bg-white/[0.025]"}`}>
            <div className="flex items-center gap-3">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${task.done ? "bg-success text-white" : "border-2 border-white/15 text-white/25"}`}>
                {task.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : task.active ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs font-bold ${task.done ? "text-white/35 line-through" : "text-white"}`}>{task.label}</p>
                <p className="mt-0.5 text-[9px] text-white/32">{task.target}</p>
              </div>
              {task.active && <span className="text-[8px] font-black uppercase tracking-wide text-primary">Up next</span>}
            </div>

            {task.active && (
              <div className="mt-3 grid overflow-hidden rounded-lg border border-white/[0.08] bg-black sm:grid-cols-[0.46fr_0.54fr]">
                <div className="relative aspect-video overflow-hidden sm:aspect-auto sm:min-h-28">
                  <img src={VIDEO_POSTER} alt="Hockey Canada quick release video lesson" className="h-full w-full object-cover opacity-72" width="1280" height="720" loading="lazy" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                  <span className="pointer-events-none absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(223,47,54,0.45)]">
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </span>
                </div>
                <div className="flex flex-col justify-center p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-black uppercase tracking-[0.14em] text-primary">60-second tip</span>
                    <EyeOff className="h-3 w-3 text-white/25" />
                  </div>
                  <p className="mt-1.5 text-[11px] font-black leading-4 text-white">Shoot quickly with Marie-Philip Poulin</p>
                  <p className="mt-1 text-[8px] font-semibold text-white/32">Hockey Canada · Optional</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FamilyPreview() {
  const days = [true, true, true, true, false, false, false];
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c0f14] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.5)] sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Family view</p>
          <p className="mt-1 font-display text-xl font-black uppercase text-white">Alex&apos;s week</p>
        </div>
        <span className="rounded-md bg-success/10 px-2.5 py-1.5 text-[10px] font-black text-success">On track</span>
      </div>
      <div className="mt-6 flex items-end justify-between border-y border-white/[0.08] py-5">
        <div>
          <p className="font-display text-5xl font-black text-white">4/5</p>
          <p className="mt-1 text-xs text-white/38">sessions complete</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-black text-primary">7</p>
          <p className="text-[9px] uppercase tracking-wide text-white/35">day streak</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-2">
        {days.map((done, index) => (
          <div key={index} className="text-center">
            <div className={`mx-auto grid aspect-square place-items-center rounded-md text-[10px] font-bold ${done ? "bg-primary text-white" : "bg-white/[0.06] text-white/25"}`}>
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </div>
            <p className="mt-1.5 text-[8px] uppercase text-white/28">{"MTWTFSS"[index]}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2.5 rounded-lg bg-white/[0.035] p-3 text-[11px] text-white/48">
        <ShieldCheck className="h-4 w-4 shrink-0 text-success" />
        Progress is shared only with guardians and authorized team staff.
      </div>
    </div>
  );
}

export default function Features() {
  const [showGetStarted, setShowGetStarted] = useState(false);

  return (
    <div className="marketing-performance min-h-screen bg-background">
      <Helmet>
        <title>Features — Off-Ice Development for Every Hockey Team</title>
        <meta name="description" content="Weekly plans, player workouts, Hockey Canada skill videos, team participation and association-wide progress in one private hockey development app." />
        <meta property="og:title" content="The Hockey App Features — One Development System for Every Team" />
        <meta property="og:description" content="Give coaches a simple weekly plan, players clear work at home, and association leaders one view of participation and progress." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.hockeyapp.ca/features" />
        <meta property="og:image" content="https://www.hockeyapp.ca/SitePreview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://www.hockeyapp.ca/features" />
      </Helmet>

      <MarketingNav />

      <main>
        <section className="performance-grid relative overflow-hidden border-b border-white/[0.06] pt-16">
          <img src={heroOutdoorTraining} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-38" loading="eager" decoding="async" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#090a0e_0%,rgba(9,10,14,0.97)_43%,rgba(9,10,14,0.7)_72%,rgba(9,10,14,0.54)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0e] via-transparent to-[#090a0e]/45" />
          <div className="absolute right-[12%] top-[14%] h-80 w-80 rounded-full bg-primary/12 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.03fr_0.97fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
            <div>
              <SectionEyebrow>One development system · Every team</SectionEyebrow>
              <h1 className="max-w-3xl font-display text-5xl font-black uppercase leading-[0.94] tracking-[-0.035em] text-white sm:text-6xl lg:text-[70px]">
                Off-ice training <span className="text-primary">delivers on-ice results.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-7 text-white/66 sm:text-xl">
                Coaches assign a clear week. Players train at home. Your association sees participation and progress in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 rounded-md px-8 font-black uppercase tracking-wide shadow-[0_12px_34px_rgba(223,47,54,0.28)]" onClick={() => setShowGetStarted(true)}>
                  Start a free team pilot <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-md border-white/15 bg-white/[0.03] px-8 hover:bg-white/[0.07]" asChild>
                  <Link to="/demo">See how it works</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-white/40">
                {BETA_MODE ? "Free during beta · No credit card" : "Start with a 7-day free trial"}
              </p>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-white/52">
                {["Private team spaces", "Built for every age", "Ready in minutes"].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[510px] lg:mr-0">
              <div className="absolute -inset-10 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative rounded-[26px] border border-white/10 bg-black/35 p-2 shadow-[0_40px_120px_rgba(0,0,0,0.58)] backdrop-blur-sm sm:p-3">
                <div className="flex items-center justify-between px-3 py-2.5 sm:px-4">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
                    <span className="h-2.5 w-2.5 rounded-full bg-white/18" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/30">Association view · This week</span>
                </div>
                <AssociationPreview />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/[0.06] bg-[#0b0d11] py-14 sm:py-18 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid border-y border-white/[0.08] md:grid-cols-3 md:divide-x md:divide-white/[0.08]">
              {workflow.map((step) => (
                <article key={step.number} className="group border-b border-white/[0.08] py-7 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-black tracking-[0.22em] text-primary">{step.number}</span>
                    <step.icon className="h-5 w-5 text-white/30 transition-colors group-hover:text-primary" />
                  </div>
                  <h2 className="mt-7 font-display text-2xl font-black uppercase leading-tight text-white">{step.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/48">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/[0.06] bg-[#111319] py-16 sm:py-20 lg:py-24" id="coaches">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.93fr_1.07fr] lg:gap-20 lg:px-8">
            <div className="relative mx-auto w-full max-w-[340px]">
              <div className="absolute -left-12 top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              <PhoneMockup showGlow={false} className="relative w-full">
                <FeatureBuilder />
              </PhoneMockup>
              <div className="absolute -bottom-4 -right-3 hidden w-48 rounded-xl border border-white/10 bg-[#0c0f14]/95 p-4 shadow-2xl backdrop-blur md:block lg:-right-16">
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-primary">Ready to publish</p>
                <p className="mt-1.5 text-sm font-black text-white">5 days · 18 players</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Balanced workload</div>
              </div>
            </div>

            <div>
              <SectionEyebrow>For coaches</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.94] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                Build the week. <span className="text-primary">Skip the busywork.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-7 text-white/60">
                Turn a development goal into a clear weekly plan without adding hours to a coach&apos;s workload.
              </p>
              <ul className="mt-7 space-y-3">
                <FeaturePoint>Start from smart suggestions or a proven template.</FeaturePoint>
                <FeaturePoint>Balance shooting, skills, strength and recovery.</FeaturePoint>
                <FeaturePoint>Publish once and every family sees the plan.</FeaturePoint>
              </ul>
            </div>
          </div>
        </section>

        <section className="performance-grid border-b border-white/[0.06] py-16 sm:py-20 lg:py-24" id="players">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:px-8">
            <div>
              <SectionEyebrow>For players</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.94] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                Open the app. <span className="text-primary">Know what to do.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-7 text-white/60">
                A fast daily checklist gives players ownership—without spreadsheets, parent math or guesswork.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  [Clock3, "Short, focused sessions"],
                  [Play, "Skill tips inside matching drills"],
                  [Trophy, "Streaks and milestones for effort"],
                ].map(([Icon, label]) => {
                  const ItemIcon = Icon as typeof Clock3;
                  return (
                    <div key={label as string} className="flex items-center gap-3 border-b border-white/[0.08] pb-3 text-sm font-bold text-white/68">
                      <ItemIcon className="h-4 w-4 text-primary" /> {label as string}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black p-3 sm:p-5">
              <img src={drivewayPlayer} alt="A young hockey player practicing shots at home" className="absolute inset-0 h-full w-full object-cover opacity-30" loading="lazy" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88),rgba(0,0,0,0.48))]" />
              <div className="relative ml-auto w-full max-w-[470px]">
                <PlayerWorkoutPreview />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/[0.06] bg-[#0b0d11] py-16 sm:py-20 lg:py-24" id="visibility">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <SectionEyebrow>For associations and families</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                See the right progress. <span className="text-white/38">Protect the player.</span>
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-7 text-white/58">
                Leaders see program adoption. Coaches see their roster. Families see their player. Nothing becomes public.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111319] p-4 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/12 text-primary"><Users className="h-5 w-5" /></span>
                  <div>
                    <p className="font-display text-lg font-black uppercase text-white">Association oversight</p>
                    <p className="text-xs text-white/38">Support teams before a week goes quiet.</p>
                  </div>
                </div>
                <AssociationPreview compact />
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111319] p-4 sm:p-6">
                <img src={familyProgress} alt="A hockey family reviewing a player's progress" className="absolute inset-0 h-full w-full object-cover opacity-16" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111319] via-[#111319]/92 to-[#111319]/64" />
                <div className="relative mb-5 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/12 text-primary"><ShieldCheck className="h-5 w-5" /></span>
                  <div>
                    <p className="font-display text-lg font-black uppercase text-white">Family visibility</p>
                    <p className="text-xs text-white/38">Encourage the habit without running the workout.</p>
                  </div>
                </div>
                <div className="relative"><FamilyPreview /></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/[0.06] bg-[#111319] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.06fr_0.94fr] lg:gap-20 lg:px-8">
            <div className="relative min-h-[430px] overflow-hidden rounded-2xl border border-white/10 bg-black">
              <img src={coachPlanning} alt="A coach planning a complete hockey development week" className="absolute inset-0 h-full w-full object-cover opacity-72" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/32 to-black/10" />
              <div className="absolute inset-x-4 bottom-4 grid grid-cols-2 gap-2 sm:inset-x-6 sm:bottom-6 sm:grid-cols-4">
                {developmentAreas.map((area) => (
                  <div key={area.label} className="rounded-lg border border-white/10 bg-black/68 p-3 backdrop-blur-md">
                    <area.icon className="h-4 w-4 text-primary" />
                    <p className="mt-3 font-display text-sm font-black uppercase text-white">{area.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionEyebrow>Complete player development</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.94] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                More than a <span className="text-primary">shot counter.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-7 text-white/60">
                Keep shooting targets, then build the complete week around the player.
              </p>
              <div className="mt-7 border-t border-white/[0.08]">
                {developmentAreas.map((area) => (
                  <div key={area.label} className="flex items-center gap-3 border-b border-white/[0.08] py-3.5">
                    <area.icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-display text-sm font-black uppercase text-white sm:text-base">{area.label}</span>
                    <span className="ml-auto hidden text-right text-xs text-white/34 sm:block">{area.detail}</span>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="performance-grid border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <SectionEyebrow>Everything teams need</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.035em] text-white sm:text-5xl">
                Less administration. <span className="text-primary">More development.</span>
              </h2>
            </div>
            <div className="mt-10 grid border-l border-t border-white/[0.08] sm:grid-cols-2 lg:grid-cols-3">
              {includedFeatures.map((feature) => (
                <article key={feature.title} className="group min-h-48 border-b border-r border-white/[0.08] p-5 transition-colors hover:bg-white/[0.025] sm:p-6">
                  <feature.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-8 font-display text-xl font-black uppercase text-white">{feature.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-white/45">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-16 sm:py-20 lg:py-28">
          <img src={teamCelebration} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[67%_center] opacity-52" loading="lazy" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,10,14,0.99)_0%,rgba(9,10,14,0.9)_48%,rgba(9,10,14,0.5)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0e] via-transparent to-[#090a0e]/64" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <SectionEyebrow>Start with one team</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
                Build a program families can see—and players can feel.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-7 text-white/58">
                Pilot the full system with one team, then scale what works across your association.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 rounded-md px-9 font-black uppercase tracking-wide" onClick={() => setShowGetStarted(true)}>
                  Start a free team pilot <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-md border-white/15 bg-white/[0.03] px-9" asChild>
                  <Link to="/contact">Plan an association rollout</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
}
