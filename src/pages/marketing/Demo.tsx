import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { AppleButton } from "@/components/ui/apple-button";
import {
  ArrowRight,
  Users,
  UserCircle,
  ClipboardList,
  CheckCircle,
  Trophy,
  WifiOff,
  TrendingUp,
  Shield,
  Lock,
  Eye,
  Sparkles,
  Play,
  Dumbbell,
} from "lucide-react";
import demoCoachDashboard from "@/assets/demo-coach-dashboard.png";
import demoPlayerToday from "@/assets/demo-player-today.png";

const Demo: React.FC = () => {
  const [activeView, setActiveView] = useState<"coach" | "player">("coach");

  const coachFeatures = [
    { icon: ClipboardList, text: "Assign simple tasks", description: "Create dryland assignments in minutes" },
    { icon: TrendingUp, text: "See who's completing", description: "Team dashboard shows participation" },
    { icon: Trophy, text: "Reward consistency", description: "Badges motivate without pressure" },
    { icon: Users, text: "Whole team visibility", description: "Track completion at a glance" },
  ];

  const playerFeatures = [
    { icon: CheckCircle, text: "Clear daily tasks", description: "Know exactly what to do today" },
    { icon: Play, text: "One-tap completion", description: "Check off tasks in seconds" },
    { icon: Trophy, text: "Earn fun rewards", description: "Badges celebrate consistency" },
    { icon: WifiOff, text: "Works offline", description: "No internet needed" },
  ];

  const privacyFeatures = [
    { icon: Eye, title: "Nothing is public", description: "All data stays within your team" },
    { icon: Users, title: "No comparisons", description: "Kids aren't ranked against each other" },
    { icon: Shield, title: "Parent-controlled", description: "You decide what coaches see" },
    { icon: Lock, title: "Built for families", description: "Privacy by design, not afterthought" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-success/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                               linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Floating badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft mb-6">
            <Dumbbell className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Dryland Training Demo</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
              Simple for everyone.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Coaches assign dryland tasks. Kids check them off with fun rewards. Parents stay in control.
          </p>

          {/* View Switcher */}
          <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft">
            <button
              onClick={() => setActiveView("coach")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeView === "coach"
                  ? "bg-gradient-to-r from-primary to-[hsl(221,70%,60%)] text-white shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Coach View
            </button>
            <button
              onClick={() => setActiveView("player")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                activeView === "player"
                  ? "bg-gradient-to-r from-success to-[hsl(160,60%,40%)] text-white shadow-[0_0_40px_-10px_hsl(var(--success)/0.3)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCircle className="w-4 h-4" />
              Player View
            </button>
          </div>
        </div>
      </section>

      {/* Coach View Section */}
      <section className={`py-20 lg:py-28 transition-opacity duration-500 ${activeView === "coach" ? "opacity-100" : "hidden"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(221,70%,60%)] flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">Coach Dashboard</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
                  Assign tasks. See results.
                </span>
              </h2>

              {/* Features in glass card */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-soft p-6 mb-8">
                <ul className="space-y-4">
                  {coachFeatures.map((item, i) => (
                    <li key={i} className="flex items-start gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{item.text}</span>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quote card */}
              <div className="glass-strong rounded-2xl p-6">
                <p className="text-xl font-semibold">
                  <span className="bg-gradient-to-r from-primary to-[hsl(221,70%,60%)] bg-clip-text text-transparent">
                    "Finally, I can see who's putting in the work."
                  </span>
                </p>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="flex justify-center">
              <PhoneMockup imageSrc={demoCoachDashboard} showGlow glowColor="primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Player View Section */}
      <section className={`py-20 lg:py-28 bg-gradient-to-b from-transparent via-success/5 to-transparent transition-opacity duration-500 ${activeView === "player" ? "opacity-100" : "hidden"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Phone Mockup */}
            <div className="flex justify-center lg:order-1 order-2">
              <PhoneMockup imageSrc={demoPlayerToday} showGlow glowColor="success" />
            </div>

            {/* Content */}
            <div className="lg:order-2 order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-success to-[hsl(160,60%,40%)] flex items-center justify-center">
                  <UserCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">Player Experience</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-success via-[hsl(152,50%,45%)] to-[hsl(160,60%,40%)] bg-clip-text text-transparent">
                  Simple tasks. Fun rewards.
                </span>
              </h2>

              {/* Features in glass card */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-soft p-6 mb-8">
                <ul className="space-y-4">
                  {playerFeatures.map((item, i) => (
                    <li key={i} className="flex items-start gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/10 to-success/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <item.icon className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{item.text}</span>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quote card */}
              <div className="glass-strong rounded-2xl p-6">
                <p className="text-xl font-semibold">
                  <span className="bg-gradient-to-r from-success to-[hsl(160,60%,40%)] bg-clip-text text-transparent">
                    "My kids actually want to do their dryland now."
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft mb-6">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Total Parent Control</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
                Parents are always in charge.
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {privacyFeatures.map((item, i) => (
              <div 
                key={i} 
                className="group bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-soft p-6 hover:shadow-depth hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 lg:py-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Glass card */}
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-depth p-10 md:p-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Get Started Today</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
                Ready to simplify dryland?
              </span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Free for coaches. No credit card required. Set up your team in minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AppleButton size="lg" asChild>
                {(
                  <Link to="/auth">
                    <Users className="w-5 h-5" />
                    I'm a Coach
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </AppleButton>
              <AppleButton variant="outline" size="lg" asChild>
                {(
                  <Link to="/join">
                    <UserCircle className="w-5 h-5" />
                    I'm a Player
                  </Link>
                )}
              </AppleButton>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Demo;
