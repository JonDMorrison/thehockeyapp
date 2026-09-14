import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { BETA_MODE } from "@/core/constants";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { MarketingAppPreview } from "@/components/marketing/MarketingAppPreview";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
import { MarketingSkillVideoShowcase } from "@/components/marketing/MarketingSkillVideoShowcase";
import familyNexlevel from "@/assets/family-nexlevel-optimized.png";
import heroHomeTraining from "@/assets/brand/hero-vancouver-home-training.jpg";
import drivewayPlayer from "@/assets/brand/driveway-wrist-shot.jpg";
import teamHuddle from "@/assets/brand/team-huddle.jpg";
import coachPlanning from "@/assets/brand/coach-planning.jpg";
import toeDragDetail from "@/assets/brand/toe-drag-detail.jpg";
import soloGarageTraining from "@/assets/brand/solo-garage-training.jpg";
import familyProgress from "@/assets/brand/family-progress.jpg";
import teamCelebration from "@/assets/brand/team-celebration.jpg";

type RoleKey = "association" | "coach" | "player" | "family";

const workflowSteps = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Coach assigns",
    description: "Publish a focused week from a template in minutes.",
  },
  {
    number: "02",
    icon: Target,
    title: "Player trains",
    description: "Open the app, see today’s work, and check it off.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Program improves",
    description: "See adoption early and help the teams that need it.",
  },
] as const;

const roleOptions: Array<{
  key: RoleKey;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}> = [
  {
    key: "association",
    label: "Association",
    eyebrow: "Association HQ",
    title: "See which teams need support.",
    description: "Track rollout, weekly-plan coverage, and participation without exposing private player detail.",
    image: teamHuddle,
    imageAlt: "Youth hockey players and coaches gathered in a team huddle",
  },
  {
    key: "coach",
    label: "Coach",
    eyebrow: "Coach workspace",
    title: "Run the week without chasing it.",
    description: "Assign work once, then see what is live, what is complete, and what needs attention.",
    image: coachPlanning,
    imageAlt: "A hockey coach reviewing the weekly plan at rink-side",
  },
  {
    key: "player",
    label: "Player",
    eyebrow: "Today’s session",
    title: "Know exactly what to do next.",
    description: "A fast daily checklist keeps training clear, rewarding, and easy to finish independently.",
    image: toeDragDetail,
    imageAlt: "A player practicing off-ice stickhandling with a puck",
  },
  {
    key: "family",
    label: "Family",
    eyebrow: "Family view",
    title: "Support progress without policing it.",
    description: "See weekly consistency and celebrate the work while the player owns the routine.",
    image: familyProgress,
    imageAlt: "A parent and young player reviewing training progress together",
  },
];

const developmentAreas = [
  { icon: Target, label: "Shooting" },
  { icon: Trophy, label: "Puck skills" },
  { icon: Dumbbell, label: "Strength" },
  { icon: HeartPulse, label: "Mobility & recovery" },
] as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
      {children}
    </p>
  );
}

function AssociationPreview() {
  const teams = [
    { name: "U13 A1", status: "Plan live", value: 82, tone: "text-success" },
    { name: "U15 A2", status: "Plan live", value: 71, tone: "text-success" },
    { name: "U11 C1", status: "Plan needed", value: 46, tone: "text-white/45" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111319] shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Sample workspace</p>
          <p className="mt-1 font-display text-lg font-black uppercase text-white">Abbotsford Hawks</p>
        </div>
        <span className="rounded-md bg-success/10 px-2 py-1 text-[9px] font-black uppercase text-success">
          Season live
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
        {[["12", "Teams"], ["74%", "Active"], ["10", "Weeks live"]].map(([value, label]) => (
          <div key={label} className="px-3 py-4 text-center">
            <p className="font-display text-2xl font-black text-white">{value}</p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/40">{label}</p>
          </div>
        ))}
      </div>
      <div className="divide-y divide-white/10 px-5">
        {teams.map((team) => (
          <div key={team.name} className="py-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-black uppercase text-white">{team.name}</span>
              <span className={`text-[9px] font-black uppercase ${team.tone}`}>{team.status}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary" style={{ width: `${team.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111319] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Monday · Practice day</p>
          <p className="mt-1 font-display text-lg font-black uppercase text-white">This week</p>
        </div>
        <span className="text-xs font-bold text-white/55">18 players</span>
      </div>
      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-primary">Needs attention</p>
            <p className="mt-1 text-sm font-bold text-white">Thursday has no workout</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/[0.04] p-4">
          <p className="font-display text-3xl font-black text-white">14</p>
          <p className="text-[10px] uppercase text-white/45">Active today</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-4">
          <p className="font-display text-3xl font-black text-primary">78%</p>
          <p className="text-[10px] uppercase text-white/45">Week complete</p>
        </div>
      </div>
      <div className="mt-3 flex h-12 items-center justify-center rounded-lg bg-primary text-sm font-black uppercase text-white">
        Assign this week
      </div>
    </div>
  );
}

function PlayerPreview() {
  return (
    <div className="mx-auto max-w-[280px]">
      <PhoneMockup showGlow={false} className="w-full">
        <MarketingAppPreview />
      </PhoneMockup>
    </div>
  );
}

function FamilyPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111319] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Alex’s week</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="font-display text-5xl font-black text-white">4/5</p>
          <p className="mt-1 text-xs text-white/45">sessions complete</p>
        </div>
        <span className="rounded-md bg-success/10 px-2.5 py-1.5 text-xs font-bold text-success">On track</span>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-2">
        {[true, true, true, true, false, false, false].map((done, index) => (
          <div key={index} className="text-center">
            <div className={`mx-auto flex aspect-square items-center justify-center rounded-md ${done ? "bg-primary text-white" : "bg-white/[0.06] text-white/30"}`}>
              {done ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <p className="mt-1.5 text-[9px] uppercase text-white/35">{"MTWTFSS"[index]}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">🔥</div>
        <div>
          <p className="text-sm font-bold text-white">7-day streak</p>
          <p className="text-xs text-white/45">Best week this month</p>
        </div>
      </div>
    </div>
  );
}

function RolePreview({ role }: { role: RoleKey }) {
  if (role === "association") return <AssociationPreview />;
  if (role === "coach") return <CoachPreview />;
  if (role === "player") return <PlayerPreview />;
  return <FamilyPreview />;
}

export default function Home() {
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [activeRole, setActiveRole] = useState<RoleKey>("association");
  const role = roleOptions.find((option) => option.key === activeRole) ?? roleOptions[0];

  return (
    <div className="marketing-performance min-h-screen bg-background">
      <Helmet>
        <title>The Hockey App — Off-Ice Development for Hockey Associations</title>
        <meta
          name="description"
          content="Give every coach a simple weekly plan, every player clear work at home, and your association one view of participation and progress."
        />
        <meta property="og:title" content="The Hockey App — Off-Ice Development for Hockey Associations" />
        <meta property="og:description" content="Build better players across every team with simple weekly plans and visible association-wide progress." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.hockeyapp.ca/" />
        <meta property="og:image" content="https://www.hockeyapp.ca/SitePreview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="The Hockey App — Off-Ice Development for Hockey Associations" />
        <meta name="twitter:description" content="Build better players across every team with simple weekly plans and visible association-wide progress." />
        <meta name="twitter:image" content="https://www.hockeyapp.ca/SitePreview.png" />
        <link rel="canonical" href="https://www.hockeyapp.ca/" />
      </Helmet>

      <MarketingNav />

      <main>
        {/* 1. Hero */}
        <section className="performance-grid relative overflow-hidden border-b border-white/[0.06] pt-16">
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
              <SectionEyebrow>Off-ice development for every team</SectionEyebrow>
              <h1 className="max-w-3xl font-display text-5xl font-black uppercase leading-[0.94] tracking-[-0.035em] text-white sm:text-6xl lg:text-[72px]">
                Off-ice training <span className="text-primary">delivers on-ice results.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-7 text-white/68 sm:text-xl">
                Give every coach a simple weekly plan, every player clear work at home, and your association one view of participation and progress.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 rounded-md px-8 font-black uppercase tracking-wide shadow-[0_12px_34px_rgba(223,47,54,0.28)]" onClick={() => setShowGetStarted(true)}>
                  Start a free team pilot
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-md border-white/15 bg-white/[0.03] px-8 hover:bg-white/[0.07]" asChild>
                  <Link to="/demo">See the product</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-white/42">
                {BETA_MODE ? "Free during beta · No credit card" : "Start with a 7-day free trial"}
              </p>
              <div className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-4">
                {[["One standard", "Every team"], ["Minutes", "To publish a week"], ["Private", "Role-based access"]].map(([value, label]) => (
                  <div key={value} className="px-3 first:pl-0 sm:px-5 sm:first:pl-0">
                    <p className="font-display text-sm font-black uppercase text-white sm:text-base">{value}</p>
                    <p className="mt-1 text-[10px] text-white/40 sm:text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[330px] lg:mr-0">
              <div className="absolute -inset-10 rounded-full bg-primary/10 blur-3xl" />
              <PhoneMockup showGlow={false} className="relative w-full">
                <MarketingAppPreview />
              </PhoneMockup>
            </div>
          </div>
        </section>

        {/* 2. Product loop */}
        <section className="border-b border-white/[0.06] bg-[#0b0d11] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <SectionEyebrow>The development loop</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.035em] sm:text-5xl">
                Set the standard once. <span className="text-white/42">Keep every team moving.</span>
              </h2>
            </div>
            <div className="mt-12 grid border-y border-white/10 md:grid-cols-3 md:divide-x md:divide-white/10">
              {workflowSteps.map((step) => (
                <article key={step.number} className="group relative border-b border-white/10 py-7 last:border-b-0 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-black tracking-[0.22em] text-primary">{step.number}</span>
                    <step.icon className="h-5 w-5 text-white/35 transition-colors group-hover:text-primary" />
                  </div>
                  <h3 className="mt-8 font-display text-2xl font-black uppercase text-white">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-white/52">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <MarketingSkillVideoShowcase />

        {/* 3. Player development */}
        <section className="border-b border-white/[0.06] bg-[#111319] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
              <img
                src={drivewayPlayer}
                alt="A young hockey player practicing shots in the driveway"
                className="aspect-[4/3] w-full object-cover opacity-90"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 rounded-xl border border-white/10 bg-black/65 p-4 backdrop-blur-md sm:inset-x-6 sm:bottom-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Player progress</p>
                  <p className="mt-1 font-display text-2xl font-black uppercase text-white">4 of 5 sessions</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-black text-white">7</p>
                  <p className="text-[9px] uppercase text-white/45">day streak</p>
                </div>
              </div>
            </div>
            <div>
              <SectionEyebrow>Player development</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.94] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                Show families the work behind <span className="text-primary">better hockey.</span>
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-7 text-white/62">
                One weekly plan across every team. Players know what to do, and families can see progress between practices.
              </p>
              <Link to="/features" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-black uppercase tracking-wide text-white hover:text-primary">
                Explore the association experience <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 4. Role-based tour */}
        <section className="performance-grid border-b border-white/[0.06] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <SectionEyebrow>For associations, coaches, players & families</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.95] tracking-[-0.035em] sm:text-5xl">
                One shared program. <span className="text-white/42">A clear view for every role.</span>
              </h2>
            </div>

            <div className="mt-10 flex gap-2 overflow-x-auto border-b border-white/10 pb-3" role="tablist" aria-label="Product views">
              {roleOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={activeRole === option.key}
                  aria-controls="role-preview"
                  onClick={() => setActiveRole(option.key)}
                  className={`min-h-11 shrink-0 rounded-md px-4 text-xs font-black uppercase tracking-wide transition-colors ${
                    activeRole === option.key ? "bg-primary text-white" : "bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div id="role-preview" role="tabpanel" className="mt-10 grid min-h-[430px] items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
              <div>
                <SectionEyebrow>{role.eyebrow}</SectionEyebrow>
                <h3 className="font-display text-4xl font-black uppercase leading-[0.96] tracking-[-0.03em] text-white sm:text-5xl">{role.title}</h3>
                <p className="mt-5 max-w-md text-lg leading-7 text-white/58">{role.description}</p>
                <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-white/72">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Privacy and permissions built into every view
                </div>
              </div>
              <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d11] shadow-[0_28px_80px_rgba(0,0,0,0.48)]">
                <div className="grid md:grid-cols-[0.72fr_1.28fr]">
                  <div className="relative min-h-[190px] overflow-hidden md:min-h-[430px]">
                    <img
                      key={role.key}
                      src={role.image}
                      alt={role.imageAlt}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/18 to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#0b0d11]" />
                    <div className="absolute bottom-4 left-4 rounded-md border border-white/12 bg-black/60 px-3 py-2 backdrop-blur-md">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">Built for real hockey weeks</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 sm:p-6">
                    <div className="w-full"><RolePreview role={activeRole} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Complete development */}
        <section className="border-b border-white/[0.06] bg-[#0b0d11] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-20 lg:px-8">
            <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-black">
              <img
                src={soloGarageTraining}
                alt="A young hockey player completing an off-ice stickhandling session at home"
                className="absolute inset-0 h-full w-full object-cover object-[center_34%] opacity-85"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <SectionEyebrow>Complete development</SectionEyebrow>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.94] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                More than a <span className="text-primary">shot counter.</span>
              </h2>
              <p className="mt-6 max-w-md text-lg leading-7 text-white/60">
                Keep the fast targets and satisfying check-offs. Add the rest of the player’s week.
              </p>
              </div>
            </div>
            <div className="border-t border-white/10">
              {developmentAreas.map((area, index) => (
                <div key={area.label} className="flex min-h-20 items-center gap-4 border-b border-white/10">
                  <span className="font-display text-xs font-black text-white/25">0{index + 1}</span>
                  <area.icon className="h-5 w-5 text-primary" />
                  <span className="font-display text-xl font-black uppercase text-white sm:text-2xl">{area.label}</span>
                  <CheckCircle2 className="ml-auto h-5 w-5 text-success" />
                </div>
              ))}
              <div className="mt-5 flex items-center gap-3 text-sm text-white/52">
                <CalendarCheck2 className="h-4 w-4 text-primary" />
                Workload adapts around games and practices.
              </div>
            </div>
          </div>
        </section>

        {/* 6. Founder and trust */}
        <section className="relative overflow-hidden border-b border-white/[0.06] bg-[#111319] py-16 sm:py-20 lg:py-24">
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-8">
            <div className="relative mx-auto max-w-[330px] self-end">
              <div className="absolute inset-x-5 bottom-2 h-24 rounded-full bg-black/55 blur-2xl" />
              <img src={familyNexlevel} alt="Founder Jon Morrison with his three hockey-playing daughters" className="relative w-full" loading="lazy" />
            </div>
            <div>
              <SectionEyebrow>Built inside a hockey family</SectionEyebrow>
              <blockquote className="max-w-3xl font-display text-3xl font-black uppercase leading-[1.03] tracking-[-0.025em] text-white sm:text-4xl lg:text-5xl">
                “I built the system I needed as a coach—and the one I wanted as a parent.”
              </blockquote>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/58">
                The Hockey App gives players ownership, coaches visibility, and families a healthier way to support the work.
              </p>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/70">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Private by design</span>
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Built for youth teams</span>
                <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Simple enough to use daily</span>
              </div>
              <Button variant="outline" className="mt-8 min-h-11 rounded-md border-white/15 bg-transparent" asChild>
                <Link to="/about">Meet the founder <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 7. Final CTA */}
        <section className="performance-grid relative overflow-hidden py-16 sm:py-20 lg:py-28">
          <img src={teamCelebration} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-[68%_center] opacity-55" loading="lazy" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,10,14,0.98)_0%,rgba(9,10,14,0.9)_45%,rgba(9,10,14,0.52)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0e] via-transparent to-[#090a0e]/60" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <SectionEyebrow>Start with one team</SectionEyebrow>
            <h2 className="font-display text-4xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Build the program players want to be part of.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-7 text-white/60">
              Pilot the full system with one team, then scale what works across your association.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 rounded-md px-9 font-black uppercase tracking-wide" onClick={() => setShowGetStarted(true)}>
                Start a free team pilot <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-md border-white/15 bg-white/[0.03] px-9" asChild>
                <Link to="/contact">Plan an association rollout</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
}
