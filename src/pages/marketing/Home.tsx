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

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-32 relative">
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
                  <MarketingAppPreview />
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
                We built a better way to train at home.
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
                  title: "Do the work",
                  description: "Players see today's tasks on their phone. Tap to check off, earn badges, and track streaks. It feels like a game — fun, quick, and gives a real sense of accomplishment.",
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

      {/* Team Goals Feature Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/50 dark:from-amber-950/10 dark:via-gray-950 dark:to-orange-950/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Target className="w-4 h-4" />
                Team Goals
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Chase goals together.{" "}
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  Celebrate as a team.
                </span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Set a collective target — 10,000 team shots this month, 500 workouts completed — and watch the thermometer rise as everyone contributes. When you hit the goal, everyone wins.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Trophy, text: "Coaches set team-wide goals with optional rewards" },
                  { icon: Users, text: "Every player's effort counts toward the target" },
                  { icon: Gift, text: "Hit the goal? Pizza party, skip a drill, coach wears a costume" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-amber-200/50 dark:border-amber-800/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-base">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              {/* Goal thermometer visual */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-depth border border-gray-200/50 dark:border-gray-700/50 max-w-sm w-full">
                <div className="text-center mb-6">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Team Goal</p>
                  <h3 className="text-xl font-bold">10,000 Shots Challenge</h3>
                </div>
                
                {/* Thermometer */}
                <div className="relative h-48 w-16 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full" />
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-500 to-orange-400 rounded-full transition-all duration-1000"
                    style={{ height: '75%' }}
                  />
                  <div className="absolute -right-12 top-0 text-xs text-muted-foreground">10K</div>
                  <div className="absolute -right-12 top-1/4 text-xs text-muted-foreground">7.5K</div>
                  <div className="absolute -right-12 top-1/2 text-xs text-muted-foreground">5K</div>
                  <div className="absolute -right-12 bottom-0 text-xs text-muted-foreground">0</div>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">7,524</p>
                  <p className="text-sm text-muted-foreground">shots so far</p>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex items-center justify-center gap-2">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Reward: Pizza Party! 🍕</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Streaks & Celebrations Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative flex justify-center">
              <PhoneMockup className="w-72 lg:w-80">
                <FeatureRewards />
              </PhoneMockup>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Flame className="w-4 h-4" />
                Streaks & Badges
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Keep the fire burning.{" "}
                <span className="text-orange-500">🔥</span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Players earn streaks for consecutive training days. Hit 7 days? Confetti explodes. Earn badges for milestones like "100 Shots" or "Perfect Week." It turns training into a game they actually want to play.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "🔥", label: "Fire Streaks", desc: "Track consecutive days" },
                  { icon: "🏆", label: "Badges", desc: "Unlock achievements" },
                  { icon: "🎉", label: "Celebrations", desc: "Confetti & rewards" },
                  { icon: "📊", label: "Progress", desc: "Visual milestone tracking" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="p-4 rounded-xl bg-white/60 dark:bg-gray-900/60 border border-gray-200/50 dark:border-gray-700/50"
                  >
                    <span className="text-2xl mb-2 block">{item.icon}</span>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Day Mode Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/50 dark:from-blue-950/10 dark:via-gray-950 dark:to-indigo-950/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <Gamepad2 className="w-4 h-4" />
                Game Day Mode
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Game day?{" "}
                <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                  Rest up.
                </span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                The app knows when it's game day — from your synced calendar or a quick coach toggle. Players get lighter tasks or rest, so they're fresh when it counts. Smart training that adapts to your schedule.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Calendar, text: "Auto-detects games from team calendar" },
                  { icon: Zap, text: "Lighter workouts before games, rest after" },
                  { icon: CheckCircle, text: "Coaches can toggle game day manually" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-blue-200/50 dark:border-blue-800/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-base">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              {/* Game day card visual */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 shadow-depth max-w-sm w-full text-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5" />
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
                    <p className="text-sm text-white/80 mb-2">Quick Tasks</p>
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

      {/* Team Cheers Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1 relative flex justify-center">
              {/* Cheers visual */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-depth border border-gray-200/50 dark:border-gray-700/50 max-w-sm w-full">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <h3 className="font-bold">Team Cheers</h3>
                </div>
                
                <div className="space-y-3">
                  {[
                    { from: "Coach Mike", to: "Tyler", message: "Great hustle this week! 💪", time: "2h ago" },
                    { from: "Jake", to: "Emma", message: "Nice streak! Keep it up! 🔥", time: "4h ago" },
                    { from: "Sarah", to: "You", message: "Way to hit 100 shots! 🎯", time: "1d ago" },
                  ].map((cheer, i) => (
                    <div 
                      key={i}
                      className="p-3 rounded-xl bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 border border-pink-200/50 dark:border-pink-800/30"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-pink-600 dark:text-pink-400">{cheer.from} → {cheer.to}</p>
                        <p className="text-xs text-muted-foreground">{cheer.time}</p>
                      </div>
                      <p className="text-sm">{cheer.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <MessageCircle className="w-4 h-4" />
                Team Cheers
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Teammates cheer{" "}
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  each other on.
                </span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Players can send quick encouragement to teammates — a fist bump for completing a workout, a shoutout for hitting a streak. Build team culture even when you're not at the rink.
              </p>

              <div className="flex flex-wrap gap-3">
                {["💪 Great work!", "🔥 Keep it up!", "⭐ You rock!", "🎯 Nice shot!"].map((cheer, i) => (
                  <span 
                    key={i}
                    className="px-4 py-2 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 text-sm font-medium"
                  >
                    {cheer}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Weekly Summaries Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/50 dark:from-purple-950/10 dark:via-gray-950 dark:to-indigo-950/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full text-sm font-medium mb-6">
                <BarChart3 className="w-4 h-4" />
                AI Summaries
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Weekly insights,{" "}
                <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
                  automatically.
                </span>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Every week, coaches get AI-generated summaries for each player. See who's crushing it, who might need encouragement, and where to focus next. No spreadsheets, no manual tracking.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Sparkles, text: "Personalized summaries for each player" },
                  { icon: BarChart3, text: "Completion rates and streak data" },
                  { icon: Target, text: "Suggested focus areas for next week" },
                ].map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/80 dark:bg-gray-900/60 border border-purple-200/50 dark:border-purple-800/30"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-base">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              {/* Summary card visual */}
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-depth border border-gray-200/50 dark:border-gray-700/50 max-w-sm w-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Tyler's Week</p>
                    <p className="text-xs text-muted-foreground">AI Summary</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                    <p className="text-sm leading-relaxed">
                      "Tyler had an <span className="font-semibold text-purple-600 dark:text-purple-400">excellent week</span> — completed 6/7 workouts and hit a new personal best with 247 shots. His stickhandling consistency improved. Consider adding more skating drills next week."
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <p className="text-lg font-bold text-green-600">86%</p>
                      <p className="text-xs text-muted-foreground">Completion</p>
                    </div>
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                      <p className="text-lg font-bold text-orange-600">12</p>
                      <p className="text-xs text-muted-foreground">Day Streak</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <p className="text-lg font-bold text-blue-600">247</p>
                      <p className="text-xs text-muted-foreground">Shots</p>
                    </div>
                  </div>
                </div>
              </div>
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
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8">
                Built by hockey parents, for hockey families.
              </h2>

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">
              From Our Family to Yours
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We use it with our own kids every week.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-soft">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-foreground mb-4">
                "Finally, something that actually gets my kid practicing without me nagging."
              </p>
              <p className="text-sm text-muted-foreground">— Hockey Parent</p>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-soft">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-foreground mb-4">
                "My players are doing more off-ice work than ever. The accountability is huge."
              </p>
              <p className="text-sm text-muted-foreground">— U14 Coach</p>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-soft">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-foreground mb-4">
                "My daughter loves checking off tasks. It's become part of her routine."
              </p>
              <p className="text-sm text-muted-foreground">— Hockey Mom</p>
            </div>
          </div>
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

      {/* GetStarted Modal */}
      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
};

export default Home;
