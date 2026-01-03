import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  CheckCircle,
  Shield,
  Heart,
  Zap,
  Target,
  Users,
  Lock,
  Wifi,
  ArrowRight,
  EyeOff,
  UserCheck,
  Calendar,
  Clock,
} from "lucide-react";
import mockupToday from "@/assets/mockup-today-checklist.png";
import mockupLockscreen from "@/assets/mockup-lockscreen-checkoff.png";
import mockupPrivacy from "@/assets/mockup-privacy-trust.png";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-success/5 rounded-full blur-3xl" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Clock className="w-4 h-4" />
                5 minutes a day builds champions
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                Build better hockey habits —{" "}
                <span className="text-primary">without the chaos</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Daily training routines that fit real life. Automatic game-day prep. 
                Parent-friendly tracking that works offline — in garages and driveways.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" className="text-base px-8" asChild>
                  <Link to="/demo">
                    See how it works
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base px-8" asChild>
                  <Link to="/auth">Start free trial</Link>
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-6">
                Free for coaches. No credit card required.
              </p>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-transparent rounded-[2rem] blur-2xl" />
                <img
                  src={mockupToday}
                  alt="Today's Practice app screen showing a simple daily checklist"
                  className="relative w-72 lg:w-80 rounded-3xl shadow-2xl"
                />
                {/* Overlay badge */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-lg border border-border/50">
                  <span className="text-sm font-semibold text-foreground">
                    ✓ 3 of 5 complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10">
            Youth hockey doesn't need more pressure.
          </h2>
          
          <div className="space-y-5 text-lg text-muted-foreground max-w-2xl mx-auto">
            <p>Parents want structure — without the daily arguments.</p>
            <p>Coaches want prepared players — without the admin overhead.</p>
            <p className="font-medium text-foreground pt-2">
              Most training apps add rankings, streaks, and comparison stress.
            </p>
            <p className="text-2xl font-bold text-primary pt-4">
              We built the opposite.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                A calm system that works in real hockey life
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                No complicated setup. No pressure tactics. Just simple daily habits 
                that fit between school, practice, and family time.
              </p>

              <div className="space-y-5">
                {[
                  { icon: CheckCircle, text: "Daily practice cards — clear, coach-approved routines" },
                  { icon: Target, text: "One-tap checklists — done in under 10 seconds" },
                  { icon: Calendar, text: "Automatic game-day mode — syncs with TeamSnap" },
                  { icon: UserCheck, text: "Parent-controlled — you decide what's visible" },
                  { icon: Wifi, text: "Works offline — in garages, driveways, and rinks" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 relative flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-muted/50 to-transparent rounded-[2rem] blur-xl" />
                <img
                  src={mockupLockscreen}
                  alt="Quick checkoff widget for fast task completion"
                  className="relative w-72 lg:w-80 rounded-3xl shadow-xl"
                />
                {/* Saved offline badge */}
                <div className="absolute top-6 right-2 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-border/50 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-success" />
                  <span className="text-xs font-medium">Saved offline</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              What families actually experience
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real results from real hockey families — without the stress.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
            {[
              {
                icon: Heart,
                title: "Better habits",
                description: "5 minutes daily adds up to lasting skills.",
              },
              {
                icon: Target,
                title: "More shots taken",
                description: "Track reps without obsessing over stats.",
              },
              {
                icon: Zap,
                title: "Game-day ready",
                description: "Auto-switch to hydration and mental prep.",
              },
              {
                icon: Users,
                title: "Less friction",
                description: "Parents and coaches see the same plan.",
              },
              {
                icon: Shield,
                title: "Zero pressure",
                description: "No rankings. No comparisons. No stress.",
              },
            ].map((outcome, i) => (
              <div
                key={i}
                className="bg-background rounded-2xl p-6 shadow-sm border border-border/50 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <outcome.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{outcome.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{outcome.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety & Privacy Section - PROMINENT */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-semibold mb-6">
                <Shield className="w-4 h-4" />
                Privacy-First Design
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Built for kids. Designed for trust.
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We're parents too. This app was designed from day one to protect 
                your child's privacy — not exploit it.
              </p>

              <div className="space-y-5">
                {[
                  { icon: UserCheck, text: "Parent-owned accounts — you're always in control" },
                  { icon: EyeOff, text: "No public profiles — nothing is shared publicly" },
                  { icon: Shield, text: "No leaderboards — we don't rank kids against each other" },
                  { icon: Users, text: "No social features — zero comparison pressure" },
                  { icon: Lock, text: "Coach visibility controls — you decide what coaches see" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-5 h-5 text-success" />
                    </div>
                    <span className="text-lg leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-success/10 to-transparent rounded-[2rem] blur-xl" />
                <img
                  src={mockupPrivacy}
                  alt="Privacy settings screen showing parent controls"
                  className="relative w-72 lg:w-80 rounded-3xl shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Watch how coaches build weekly plans and how families use daily checklists — 
            all in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-8" asChild>
              <Link to="/demo">
                Watch the demo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" asChild>
              <Link to="/auth">Start free trial</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Free for coaches. Family plans start at $5/month.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Home;
