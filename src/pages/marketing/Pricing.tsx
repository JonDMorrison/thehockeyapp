import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
import {
  Check,
  X,
  ArrowRight,
  Shield,
  Clock,
  CreditCard,
  Users,
} from "lucide-react";

/* ── Comparison table: TWO columns only ── */
const comparisonRows: { feature: string; parent: boolean | string; team: boolean | string }[] = [
  { feature: "Price", parent: "$15/mo", team: "$500/yr" },
  { feature: "Free trial", parent: "7 days", team: "—" },
  { feature: "Coverage", parent: "One family", team: "Up to 24 players" },
  { feature: "Full workout history", parent: true, team: true },
  { feature: "Structured programs", parent: true, team: true },
  { feature: "Development snapshot", parent: true, team: true },
  { feature: "AI weekly summaries", parent: true, team: true },
  { feature: "Export reports", parent: true, team: true },
  { feature: "Player limit", parent: "Your children", team: "24 roster spots" },
];

/* ── FAQ ── */
const faqs = [
  {
    q: "Do coaches need to pay?",
    a: "No. Coaches can create a team, assign workouts, and track participation at no cost. Coaching tools are always free.",
  },
  {
    q: "Do parents pay if the team has a plan?",
    a: "No. If your team's coach has purchased a Team Plan, every family on that roster gets full Pro access — no individual subscription needed.",
  },
  {
    q: "What happens after the 7-day trial?",
    a: "You'll be billed $15/month. You can cancel anytime from your account settings — no questions asked, no lock-in.",
  },
  {
    q: "What if I cancel?",
    a: "You keep full access until the end of your billing period. After that, you'll still be able to see daily tasks, but Pro features like full history and AI summaries will be limited.",
  },
  {
    q: "What if I'm paying individually AND my team buys a plan?",
    a: "We'll let you know on your Settings page. You can cancel your individual subscription since you're already covered by the team — no double charging required.",
  },
];

const Pricing: React.FC = () => {
  const [showGetStarted, setShowGetStarted] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 bg-[hsl(0,0%,98%)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-foreground">
            Two plans. No surprises.
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto font-medium">
            Coaches use The Hockey App free. Parents and teams choose the plan that fits.
          </p>
        </div>
      </section>

      {/* Pricing Cards — TWO plans only */}
      <section className="pb-20 bg-[hsl(0,0%,98%)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Parent Pro */}
            <div className="bg-card rounded-2xl border-2 border-primary shadow-medium p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                  For Families
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary mb-1">Parent Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-foreground">$15</span>
                  <span className="text-text-muted">/month</span>
                </div>
                <p className="text-sm text-text-muted mt-2">
                  7-day free trial · Cancel anytime
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Full workout history — unlimited",
                  "Structured training programs",
                  "Development snapshot",
                  "AI weekly summaries",
                  "Export reports",
                  "One account covers all your children",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-secondary">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className="w-full bg-primary hover:bg-[hsl(22,85%,40%)] text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                onClick={() => setShowGetStarted(true)}
              >
                Start 7-Day Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-text-muted text-center mt-3">
                Credit card required · Cancel anytime
              </p>
            </div>

            {/* Team Plan */}
            <div className="bg-card rounded-2xl border border-border shadow-subtle p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-foreground text-background text-xs font-semibold px-4 py-1.5 rounded-full">
                  Best Value
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">Team Plan</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-foreground">$500</span>
                  <span className="text-text-muted">/year</span>
                </div>
                <p className="text-sm text-text-muted mt-2">
                  One purchase covers your entire roster.
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Covers up to 24 players",
                  "Every family gets full Pro access",
                  "Coach purchaser gets Pro access too",
                  "Saves families $2,500+ collectively",
                  "No per-family charges",
                  "Annual billing — no surprises",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-secondary">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant="outline"
                className="w-full border-2 border-foreground text-foreground hover:bg-muted/50 rounded-xl"
                onClick={() => setShowGetStarted(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                Buy Team Plan
              </Button>
              <p className="text-xs text-text-muted text-center mt-3">
                Annual billing · No trial
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Anchor */}
      <section className="py-16 bg-[hsl(0,0%,96%)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card rounded-2xl border border-border shadow-subtle p-8 md:p-10">
            <p className="text-sm font-medium text-primary mb-3 uppercase tracking-wide">
              Put it in perspective
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Less than one private lesson.
            </h2>
            <p className="text-text-secondary text-lg leading-relaxed max-w-xl mx-auto">
              A single private skating lesson costs $80–$150. For $15/month, your child gets daily structured training, accountability, and progress tracking — every single day.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table — TWO columns */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-10">
            Compare plans
          </h2>

          <div className="bg-card rounded-2xl border border-border shadow-subtle overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-border">
              <div className="p-4 sm:p-5">
                <span className="text-sm font-medium text-text-muted">Feature</span>
              </div>
              <div className="p-4 sm:p-5 text-center border-l border-border bg-primary/5">
                <span className="text-sm font-semibold text-primary">Parent Pro</span>
              </div>
              <div className="p-4 sm:p-5 text-center border-l border-border">
                <span className="text-sm font-semibold text-foreground">Team Plan</span>
              </div>
            </div>

            {/* Rows */}
            {comparisonRows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 ${i < comparisonRows.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="p-4 sm:p-5 flex items-center">
                  <span className="text-sm text-text-secondary">{row.feature}</span>
                </div>
                <div className="p-4 sm:p-5 flex items-center justify-center border-l border-border bg-primary/5">
                  {row.parent === true ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : row.parent === false ? (
                    <X className="w-5 h-5 text-text-disabled" />
                  ) : (
                    <span className="text-xs font-medium text-primary">{row.parent}</span>
                  )}
                </div>
                <div className="p-4 sm:p-5 flex items-center justify-center border-l border-border">
                  {row.team === true ? (
                    <Check className="w-5 h-5 text-foreground" />
                  ) : row.team === false ? (
                    <X className="w-5 h-5 text-text-disabled" />
                  ) : (
                    <span className="text-xs font-medium text-foreground">{row.team}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started — coaches & free access */}
      <section className="py-16 bg-[hsl(0,0%,96%)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Not ready to pay? No problem.
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed max-w-xl mx-auto mb-8">
            You can always use The Hockey App without a paid plan.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Users,
                title: "Coaches",
                desc: "Create your team, assign workouts, and track participation — always free.",
              },
              {
                icon: Shield,
                title: "Parents",
                desc: "Join a team, see daily tasks, and check off workouts. Pro features require a subscription.",
              },
              {
                icon: CreditCard,
                title: "Team-covered families",
                desc: "If your coach bought a Team Plan, you get full Pro access at no extra cost.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border shadow-subtle p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: "7-day free trial",
                desc: "Try Parent Pro for a full week. See the difference before you commit.",
              },
              {
                icon: CreditCard,
                title: "Cancel anytime",
                desc: "No contracts. No lock-in. Cancel from your account settings in seconds.",
              },
              {
                icon: Shield,
                title: "Privacy first",
                desc: "Your child's data stays private. No social feeds. No public comparison.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border shadow-subtle p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[hsl(0,0%,96%)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-10">
            Common questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 sm:p-6">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card rounded-2xl border border-border shadow-subtle p-8 md:p-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Try one week of structured training.
            </h2>
            <p className="text-lg text-text-secondary mb-8 max-w-xl mx-auto">
              See the difference consistency makes. No risk.
            </p>
            <Button
              size="lg"
              className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
              onClick={() => setShowGetStarted(true)}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
};

export default Pricing;
