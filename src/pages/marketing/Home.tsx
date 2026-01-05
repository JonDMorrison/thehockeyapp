import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
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
  Play,
} from "lucide-react";
import mockupToday from "@/assets/mockup-today-checklist.png";
import mockupLockscreen from "@/assets/mockup-lockscreen-checkoff.png";
import mockupPrivacy from "@/assets/mockup-privacy-trust.png";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-[hsl(var(--gradient-end))]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-[hsl(var(--gradient-mid))]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />

          {/* Floating shapes */}
          <div className="absolute top-32 right-1/4 w-4 h-4 rounded-full bg-primary/20 animate-gentle-bounce" />
          <div className="absolute top-64 left-1/4 w-6 h-6 rounded-lg bg-[hsl(var(--gradient-end))]/20 animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-32 right-1/3 w-3 h-3 rounded-full bg-[hsl(var(--gradient-mid))]/20 animate-gentle-bounce" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left column - Text */}
            <div className="text-center lg:text-left">
              {/* Floating badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-soft mb-8">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium text-foreground">Youth Hockey Training Platform</span>
              </div>
              
              {/* Gradient headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
                Build better{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                  hockey habits
                </span>
              </h1>

              <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Simple daily routines. Automatic game-day prep. Parent-friendly tracking 
                that works offline — in garages and driveways.
              </p>

              {/* Dual CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="text-base px-8 bg-gradient-to-r from-primary to-[hsl(var(--gradient-end))] hover:scale-105 transition-transform shadow-glow text-white border-0"
                  asChild
                >
                  <Link to="/auth">
                    <Users className="w-5 h-5 mr-2" />
                    I'm a Coach — Get Started
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base px-8 border-2 border-gray-300 dark:border-gray-700 hover:border-primary hover:scale-105 transition-all"
                  asChild
                >
                  <Link to="/join">
                    <Play className="w-5 h-5 mr-2" />
                    I'm a Player — Join Team
                  </Link>
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-6">
                Free for coaches. No credit card required.
              </p>
            </div>

            {/* Right column - Phone mockup */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <PhoneMockup 
                  imageSrc={mockupToday} 
                  imageAlt="Today's Practice app screen showing a simple daily checklist"
                  showGlow
                  glowColor="primary"
                  className="w-72 lg:w-80"
                />
                
                {/* Floating badge */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-depth border border-gray-200/50 dark:border-gray-700/50">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    3 of 5 complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-gray-950 dark:via-blue-950/10 dark:to-gray-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-gray-200/50 dark:border-gray-700/50 shadow-soft">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-10">
              Youth hockey doesn't need more pressure.
            </h2>
            
            <div className="space-y-5 text-lg text-muted-foreground max-w-2xl mx-auto">
              <p>Parents want structure — without the daily arguments.</p>
              <p>Coaches want prepared players — without the admin overhead.</p>
              <p className="font-medium text-foreground pt-2">
                Most training apps add rankings, streaks, and comparison stress.
              </p>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent pt-4">
                We built the opposite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                A calm system that works in real hockey life
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                No complicated setup. No pressure tactics. Just simple daily habits 
                that fit between school, practice, and family time.
              </p>

              <div className="space-y-4">
                {[
                  { icon: CheckCircle, text: "Daily practice cards — clear, coach-approved routines" },
                  { icon: Target, text: "One-tap checklists — done in under 10 seconds" },
                  { icon: Calendar, text: "Automatic game-day mode — syncs with TeamSnap" },
                  { icon: UserCheck, text: "Parent-controlled — you decide what's visible" },
                  { icon: Wifi, text: "Works offline — in garages, driveways, and rinks" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 border border-gray-200/50 dark:border-gray-700/50 hover:-translate-y-1 transition-transform cursor-default"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg leading-relaxed pt-2">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 relative flex justify-center">
              <div className="relative">
                <PhoneMockup 
                  imageSrc={mockupLockscreen} 
                  imageAlt="Quick checkoff widget for fast task completion"
                  showGlow
                  glowColor="muted"
                  className="w-72 lg:w-80"
                />
                
                {/* Saved offline badge */}
                <div className="absolute top-12 -right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-depth border border-gray-200/50 dark:border-gray-700/50 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Saved offline</span>
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
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              What families actually experience
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real results from real hockey families — without the stress.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              {
                icon: Heart,
                title: "Better habits",
                description: "5 minutes daily adds up to lasting skills.",
                gradient: true,
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
                gradient: true,
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
                gradient: true,
              },
            ].map((outcome, i) => (
              <div
                key={i}
                className={`group relative rounded-2xl p-6 text-center transition-all duration-300 ${
                  outcome.gradient
                    ? "bg-gradient-to-br from-primary to-[hsl(var(--gradient-end))] text-white hover:scale-105 shadow-depth"
                    : "bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-700/50 shadow-soft hover:shadow-depth hover:-translate-y-1"
                }`}
              >
                {outcome.gradient && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl" />
                )}
                <div className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  outcome.gradient 
                    ? "bg-white/20 backdrop-blur-sm" 
                    : "bg-primary/10"
                }`}>
                  <outcome.icon className={`w-7 h-7 ${outcome.gradient ? "text-white" : "text-primary"}`} />
                </div>
                <h3 className={`relative z-10 text-lg font-semibold mb-2 ${outcome.gradient ? "" : "text-foreground"}`}>
                  {outcome.title}
                </h3>
                <p className={`relative z-10 text-sm leading-relaxed ${outcome.gradient ? "text-white/90" : "text-muted-foreground"}`}>
                  {outcome.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety & Privacy Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-semibold mb-8">
                <Shield className="w-4 h-4" />
                Privacy-First Design
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Built for kids. Designed for trust.
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                We're parents too. This app was designed from day one to protect 
                your child's privacy — not exploit it.
              </p>

              <div className="space-y-4">
                {[
                  { icon: UserCheck, text: "Parent-owned accounts — you're always in control" },
                  { icon: EyeOff, text: "No public profiles — nothing is shared publicly" },
                  { icon: Shield, text: "No leaderboards — we don't rank kids against each other" },
                  { icon: Users, text: "No social features — zero comparison pressure" },
                  { icon: Lock, text: "Coach visibility controls — you decide what coaches see" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-start gap-4 p-4 rounded-2xl hover:-translate-y-1 transition-transform cursor-default"
                  >
                    <div className="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-success" />
                    </div>
                    <span className="text-lg leading-relaxed pt-2">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              <PhoneMockup 
                imageSrc={mockupPrivacy} 
                imageAlt="Privacy settings screen showing parent controls"
                showGlow
                glowColor="success"
                className="w-72 lg:w-80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-[hsl(var(--gradient-mid))]/10 to-[hsl(var(--gradient-end))]/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[hsl(var(--gradient-end))]/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-gray-200/50 dark:border-gray-700/50 shadow-soft">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Ready to see it in action?
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Watch how coaches build weekly plans and how families use daily checklists — 
              all in under 2 minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-base px-8 bg-gradient-to-r from-primary to-[hsl(var(--gradient-end))] hover:scale-105 transition-transform shadow-glow text-white border-0"
                asChild
              >
                <Link to="/demo">
                  Watch the demo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 border-2 border-gray-300 dark:border-gray-700 hover:border-primary hover:scale-105 transition-all"
                asChild
              >
                <Link to="/auth">Start free trial</Link>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-8">
              Free for coaches. Family plans start at $5/month.
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Home;
