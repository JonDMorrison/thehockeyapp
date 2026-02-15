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
import { FeatureRewards } from "@/components/marketing/features/FeatureRewards";
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
  Star,
  Flame,
  Gift,
  MessageCircle,
  Gamepad2,
  BarChart3,
  Heart,
  DollarSign,
} from "lucide-react";
import hockeyPlayerBasement from "@/assets/hockey-player-basement.jpg";
import founderHomeImg from "@/assets/placeholder-founder-home.jpg";

const Home: React.FC = () => {
  const [showGetStarted, setShowGetStarted] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative pt-16 bg-[hsl(0,0%,98%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-20 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05] text-foreground">
                The off-ice accountability system{" "}
                <span className="text-primary">
                  for hockey families.
                </span>
              </h1>

              <p className="text-xl text-text-secondary font-medium mb-4 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Clear weekly plans kids follow independently — so parents stop nagging, coaches stay aligned, and real progress happens.
              </p>

              <p className="text-sm text-text-muted mb-8 max-w-xl mx-auto lg:mx-0">
                Parents start with a 7-day free trial. Teams can cover families.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                  onClick={() => setShowGetStarted(true)}
                >
                  Get Started For Free
                </Button>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <PhoneMockup 
                  showGlow={false}
                  className="w-72 lg:w-80"
                >
                  <MarketingAppPreview />
                </PhoneMockup>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-10 text-foreground">
              You shouldn't have to be the enforcer.
            </h2>
            
            <div className="space-y-5 text-lg text-text-secondary max-w-2xl mx-auto">
              <p>Your child's coach assigns off-ice work. Your child knows they should do it.</p>
              <p>But every night, you're the one reminding, pushing, arguing.</p>
              <p>It creates tension at home — and it doesn't have to.</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary pt-4">
                We built the structure so you don't have to.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three roles. One clear system. Everyone knows what's expected.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line - visible on desktop */}
            <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  step: "01",
                  role: "Parent",
                  title: "Stay in control",
                  description: "You own the account. You see everything your child is assigned and completing. You decide what's shared with the coach. Full visibility, zero guesswork.",
                },
                {
                  step: "02",
                  role: "Player",
                  title: "Own the routine",
                  description: "Your child opens the app, sees today's tasks, and checks them off. It takes minutes. They build consistency on their own — no reminders needed.",
                },
                {
                  step: "03",
                  role: "Coach",
                  title: "Assign and track",
                  description: "Coaches create simple weekly task cards in minutes. They see who's participating without rankings or pressure. Everyone stays aligned.",
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

      {/* Team Goals Feature Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Target className="w-4 h-4" />
                Team Goals
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Build shared accountability.{" "}
                <span className="text-primary">
                  Raise the standard together.
                </span>
              </h2>
              
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Set a collective target — 10,000 team shots this month, 500 workouts completed — and watch the team rise to meet it. Every player's effort counts. When the team commits, the culture shifts.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Trophy, text: "Coaches set team-wide goals with clear targets" },
                  { icon: Users, text: "Every player's effort contributes to the team standard" },
                  { icon: Gift, text: "Optional rewards when the team hits the mark" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-base">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              {/* Goal thermometer visual */}
              <div className="bg-card rounded-2xl p-8 shadow-subtle border border-border max-w-sm w-full">
                <div className="text-center mb-6">
                  <p className="text-sm font-medium text-text-muted mb-1">Team Goal</p>
                  <h3 className="text-xl font-bold text-foreground">10,000 Shots Challenge</h3>
                </div>
                
                {/* Thermometer */}
                <div className="relative h-48 w-16 mx-auto mb-6">
                  <div className="absolute inset-0 bg-muted rounded-full" />
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-primary rounded-full transition-all duration-1000"
                    style={{ height: '75%' }}
                  />
                  <div className="absolute -right-12 top-0 text-xs text-text-muted">10K</div>
                  <div className="absolute -right-12 top-1/4 text-xs text-text-muted">7.5K</div>
                  <div className="absolute -right-12 top-1/2 text-xs text-text-muted">5K</div>
                  <div className="absolute -right-12 bottom-0 text-xs text-text-muted">0</div>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">7,524</p>
                  <p className="text-sm text-text-muted">shots so far</p>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">75% — almost there</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Consistency & Recognition Section (was Streaks & Badges) */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative flex justify-center">
              <PhoneMockup className="w-72 lg:w-80">
                <FeatureRewards />
              </PhoneMockup>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Flame className="w-4 h-4" />
                Consistency & Recognition
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Consistency builds{" "}
                <span className="text-primary">
                  confidence.
                </span>
              </h2>
              
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Players build streaks by showing up day after day. They earn badges for milestones like completing a full week or hitting 100 shots. No public rankings. No comparisons. Just personal progress they can feel proud of.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Flame, label: "Daily Streaks", desc: "Track consecutive days" },
                  { icon: Trophy, label: "Milestone Badges", desc: "Recognize real effort" },
                  { icon: CheckCircle, label: "Personal Progress", desc: "No public comparisons" },
                  { icon: Target, label: "Visible Growth", desc: "Kids see their own gains" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="p-4 rounded-xl bg-card border border-border"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Day Mode Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[hsl(213,100%,25%)]/10 text-[hsl(213,100%,25%)] px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Calendar className="w-4 h-4" />
                Game Day Mode
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Game day?{" "}
                <span className="text-[hsl(213,100%,25%)]">
                  Smart rest.
                </span>
              </h2>
              
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                The app detects game days from your synced calendar or a coach toggle. Players get lighter tasks or full rest, so they're fresh when it matters. Load management built into the routine.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Calendar, text: "Auto-detects games from your team calendar" },
                  { icon: Zap, text: "Lighter preparation before games, recovery after" },
                  { icon: CheckCircle, text: "Coaches can toggle game day manually anytime" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[hsl(213,100%,25%)]/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-[hsl(213,100%,25%)]" />
                    </div>
                    <span className="text-base">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              {/* Game day card visual */}
              <div className="bg-[hsl(213,100%,25%)] rounded-2xl p-8 shadow-subtle max-w-sm w-full text-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-lg">Game Day</span>
                  </div>
                  <span className="text-2xl">🏒</span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-sm text-white/80 mb-1">Today's Focus</p>
                    <p className="font-semibold text-lg">Rest & Mental Prep</p>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-sm text-white/80 mb-2">Light Tasks Only</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                        <span className="text-sm">Visualization (5 min)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                        <span className="text-sm">Light stretching</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-white/80 text-sm">vs. Thunderbirds @ 6:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Encouragement Section (was Team Cheers) */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative flex justify-center">
              {/* Cheers visual */}
              <div className="bg-card rounded-2xl p-6 shadow-subtle border border-border max-w-sm w-full">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">Team Encouragement</h3>
                </div>
                
                <div className="space-y-3">
                  {[
                    { from: "Coach Mike", to: "Tyler", message: "Strong week, Tyler. Keep showing up.", time: "2h ago" },
                    { from: "Jake", to: "Emma", message: "Nice consistency this week.", time: "4h ago" },
                    { from: "Sarah", to: "You", message: "Way to hit your milestone.", time: "1d ago" },
                  ].map((cheer, i) => (
                    <div 
                      key={i}
                      className="p-3 rounded-xl bg-muted/50 border border-border"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-primary">{cheer.from} → {cheer.to}</p>
                        <p className="text-xs text-text-muted">{cheer.time}</p>
                      </div>
                      <p className="text-sm">{cheer.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
                <MessageCircle className="w-4 h-4" />
                Team Culture
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Positive culture,{" "}
                <span className="text-primary">
                  built in.
                </span>
              </h2>
              
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Teammates and coaches can send quick encouragement — a note for completing a workout, a word for hitting a milestone. It builds connection without pressure or public comparison.
              </p>

              <div className="flex flex-wrap gap-3">
                {["Great work this week", "Keep it going", "Strong effort", "Nice consistency"].map((cheer, i) => (
                  <span 
                    key={i}
                    className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    {cheer}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Clarity Section (was AI Summaries) */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[hsl(213,100%,25%)]/10 text-[hsl(213,100%,25%)] px-3 py-1 rounded-full text-sm font-medium mb-6">
                <BarChart3 className="w-4 h-4" />
                Weekly Summaries
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Know when to encourage.{" "}
                <span className="text-[hsl(213,100%,25%)]">
                  Know when to ease up.
                </span>
              </h2>
              
              <p className="text-lg text-text-secondary mb-8 leading-relaxed">
                Every week, parents and coaches receive a clear summary for each player. See what was completed, where consistency was strong, and where to adjust. No spreadsheets. No guessing.
              </p>

              <div className="space-y-4">
                {[
                  { icon: BarChart3, text: "Clear completion rates and consistency data" },
                  { icon: Target, text: "Suggested focus areas for the coming week" },
                  { icon: Sparkles, text: "Personalized insights generated automatically" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[hsl(213,100%,25%)]/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-[hsl(213,100%,25%)]" />
                    </div>
                    <span className="text-base">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              {/* Summary card visual */}
              <div className="bg-card rounded-2xl p-6 shadow-subtle border border-border max-w-sm w-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[hsl(213,100%,25%)] flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Tyler's Week</p>
                    <p className="text-xs text-text-muted">Weekly Summary</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm leading-relaxed text-text-secondary">
                      "Tyler had a <span className="font-semibold text-foreground">strong week</span> — completed 6 of 7 workouts and hit a personal best with 247 shots. Stickhandling consistency improved. Consider adding more skating drills next week."
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-success/5">
                      <p className="text-lg font-bold text-success">86%</p>
                      <p className="text-xs text-text-muted">Completion</p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/5">
                      <p className="text-lg font-bold text-primary">12</p>
                      <p className="text-xs text-text-muted">Day Streak</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[hsl(213,100%,25%)]/5">
                      <p className="text-lg font-bold text-[hsl(213,100%,25%)]">247</p>
                      <p className="text-xs text-text-muted">Shots</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              Built for how hockey families actually live
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Practical features that fit into busy schedules.
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
                description: "Syncs with team calendars. Adjusts training load around games and rest days.",
              },
              {
                icon: Sparkles,
                title: "Smart workout creation",
                description: "Tell it your focus and time available. Get a balanced week built automatically.",
              },
              {
                icon: Trophy,
                title: "Milestone recognition",
                description: "Effort-based rewards for consistency. No leaderboards or comparisons — just personal progress.",
              },
              {
                icon: Shield,
                title: "Parent-controlled",
                description: "Parents own accounts and decide what coaches can see. Your child's data stays private.",
              },
              {
                icon: User,
                title: "Solo mode",
                description: "Train independently without a team. Build custom programs or use smart suggestions.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group rounded-xl p-6 transition-all duration-200 bg-card border border-border shadow-subtle hover:shadow-medium"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 text-foreground">
                Built by hockey parents, for hockey families.
              </h2>

              <div className="space-y-4">
                {[
                  { icon: Zap, text: "Daily checkoffs in under 30 seconds" },
                  { icon: Target, text: "Clear tasks — your child knows exactly what to do" },
                  { icon: CheckCircle, text: "Real accountability — without the arguments" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
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
              <div className="relative rounded-2xl overflow-hidden shadow-subtle">
                <img 
                  src={hockeyPlayerBasement} 
                  alt="Hockey player practicing in basement"
                  className="w-full max-w-lg h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Anchor Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-6">
              <DollarSign className="w-4 h-4" />
              Simple Pricing
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Less than one private lesson.
            </h2>
            <p className="text-lg text-text-secondary mb-8 max-w-xl mx-auto">
              For $15/month, your child gets:
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto mb-8">
              {[
                "Structured weekly training",
                "Built-in accountability",
                "Progress tracking",
                "Full parent visibility",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-left">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-sm text-text-muted">
              Get started free. Teams can cover families. Otherwise parents can upgrade after a 7-day trial.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative flex justify-center">
              <div className="rounded-2xl overflow-hidden shadow-subtle max-w-md w-full">
                <img
                  src={founderHomeImg}
                  alt="Jon Morrison coaching youth hockey players"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                Built by a Coach.{" "}
                <span className="text-primary">Designed for Families.</span>
              </h2>

              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                  The Hockey App wasn't created by a tech company guessing at hockey culture.
                </p>
                <p>
                  It was built by a former BCHL player, minor hockey coach, and father of three daughters in the game.
                </p>
                <p>
                  After years of seeing the same pattern — parents nagging, players resisting, coaches frustrated — one thing became clear:
                </p>
                <p className="text-lg font-semibold text-foreground">
                  Families don't need more pressure. They need structure.
                </p>
                <p>
                  The Hockey App creates that structure — so kids take ownership, parents stay aligned, and coaches gain visibility without chasing players.
                </p>
              </div>

              <div className="mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 transition-colors rounded-xl"
                  asChild
                >
                  <Link to="/about">
                    Learn More About Jon
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              Start building consistent habits at home.
            </h2>
            <p className="text-lg text-text-secondary mb-10 max-w-2xl mx-auto">
              Give your child the structure to train on their own. See the difference in one week.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                onClick={() => setShowGetStarted(true)}
              >
                Get Started For Free
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 transition-colors rounded-xl"
                asChild
              >
                <Link to="/demo">
                  See How It Works
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {/* GetStarted Modal */}
      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
};

export default Home;
