import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { MarketingAppPreview } from "@/components/marketing/MarketingAppPreview";
import { MarketingMilestonePreview } from "@/components/marketing/MarketingMilestonePreview";
import { MarketingAIPreview } from "@/components/marketing/MarketingAIPreview";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
import {
  CheckCircle,
  Shield,
  Zap,
  Target,
  Users,
  Wifi,
  ArrowRight,
  Trophy,
  ClipboardCheck,
  Sparkles,
  Calendar,
  User,
  ChevronRight,
} from "lucide-react";
import hockeyPlayerBasement from "@/assets/hockey-player-basement.jpg";

const Home: React.FC = () => {
  const [showGetStarted, setShowGetStarted] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-[hsl(var(--gradient-end))]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-[hsl(var(--gradient-mid))]/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
          
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />

          <div className="absolute top-32 right-1/4 w-4 h-4 rounded-full bg-primary/20 animate-gentle-bounce" />
          <div className="absolute top-64 left-1/4 w-6 h-6 rounded-lg bg-[hsl(var(--gradient-end))]/20 animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-32 right-1/3 w-3 h-3 rounded-full bg-[hsl(var(--gradient-mid))]/20 animate-gentle-bounce" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
                Off-ice training{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                  that gets done
                </span>
              </h1>

              <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Simple exercises. Quick checkoffs. Real accountability. 
                For teams or players training on their own.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="text-base px-10 bg-primary hover:bg-primary/90 transition-colors shadow-soft text-white"
                  onClick={() => setShowGetStarted(true)}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Get Started Free
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-6">
                Free for coaches, players, and families.
              </p>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <PhoneMockup 
                  showGlow
                  glowColor="purple"
                  className="w-72 lg:w-80"
                >
                  <MarketingAIPreview />
                </PhoneMockup>
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
              Hockey training should be fun, not a fight.
            </h2>
            
            <div className="space-y-5 text-lg text-muted-foreground max-w-2xl mx-auto">
              <p>Coaches know what players need to do at home.</p>
              <p>Players know they should be doing it.</p>
              <p>Parents get tired of nagging.</p>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent pt-4">
                We built a better way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three roles. One simple flow. Everyone stays on the same page.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line - visible on desktop */}
            <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  step: "01",
                  role: "Coach",
                  title: "Assign the work",
                  description: "Create weekly task cards in minutes. Stickhandling reps, shooting drills, fitness work — whatever the team needs. AI helps if you want it.",
                },
                {
                  step: "02",
                  role: "Player",
                  title: "Get it done",
                  description: "Players see today's tasks on their phone. One tap to check off. Works offline in the garage or basement. Earn badges along the way.",
                },
                {
                  step: "03",
                  role: "Parent",
                  title: "Stay in the loop",
                  description: "Parents own the account and see everything. Control what's shared with coaches. No rankings, no pressure — just progress.",
                },
              ].map((item, i) => (
                <div key={i} className="relative text-center md:text-left">
                  <div className="mb-6 relative">
                    <span className="text-6xl lg:text-7xl font-bold text-muted-foreground/20">
                      {item.step}
                    </span>
                    {/* Dot connector on the line */}
                    <div className="hidden md:block absolute top-1/2 left-1/2 md:left-8 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40" />
                  </div>
                  
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                    {item.role}
                  </span>
                  
                  <h3 className="text-2xl font-bold mt-2 mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Built for how hockey families actually live
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple features that fit into busy schedules.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Wifi,
                title: "Works offline",
                description: "Garages, basements, rinks with no signal — tasks sync when you're back online.",
              },
              {
                icon: Calendar,
                title: "Knows your schedule",
                description: "Syncs with team calendars. Lighter workouts before games, rest days when needed.",
              },
              {
                icon: Sparkles,
                title: "AI-built workouts",
                description: "Tell it your focus and time available. Get a balanced week in seconds.",
              },
              {
                icon: Trophy,
                title: "Badges & milestones",
                description: "Simple rewards for consistency. No leaderboards or comparisons — just personal progress.",
              },
              {
                icon: Shield,
                title: "Parent-controlled",
                description: "Parents own accounts and decide what coaches can see. Kids' data stays private.",
              },
              {
                icon: User,
                title: "Solo mode",
                description: "Train on your own without a team. Build custom programs or use AI suggestions.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-2xl p-6 transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-700/50 shadow-soft hover:shadow-depth hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                The work happens where they train.
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Basement. Garage. Driveway. The app goes where players practice — 
                online or off.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Zap, text: "Quick daily checkoffs — under 30 seconds" },
                  { icon: Target, text: "Clear tasks — players know exactly what to do" },
                  { icon: CheckCircle, text: "Real accountability — coaches see who's putting in the work" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/60 dark:bg-gray-900/60 border border-gray-200/50 dark:border-gray-700/50"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-base leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 relative flex justify-center">
              <div className="relative rounded-3xl overflow-hidden shadow-depth">
                <img 
                  src={hockeyPlayerBasement} 
                  alt="Hockey player practicing in basement"
                  className="w-full max-w-lg h-auto object-cover"
                />
                <div className="absolute -inset-8 -z-10 bg-primary/10 blur-3xl rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Trust Section */}
      <section className="py-16 lg:py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-muted-foreground">
            Built by hockey parents, for hockey families.
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/30" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-gray-200/50 dark:border-gray-700/50 shadow-soft">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Start building better habits today.
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Free for coaches, players, and families. Set up in minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-base px-10 bg-primary hover:bg-primary/90 transition-colors shadow-soft text-white"
                onClick={() => setShowGetStarted(true)}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started Free
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 border-2 border-gray-300 dark:border-gray-700 hover:border-primary transition-colors"
                asChild
              >
                <Link to="/demo">
                  See How It Works
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-8">
              No credit card. No commitment.
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />

      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
};

export default Home;
