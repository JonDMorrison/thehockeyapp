import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  ArrowRight,
  Users,
  UserCircle,
  LayoutDashboard,
  Calendar,
  Zap,
  Link2,
  CheckCircle,
  Smartphone,
  WifiOff,
  TrendingUp,
  Shield,
  Lock,
  Eye,
  MessageSquareOff,
} from "lucide-react";
import demoCoachDashboard from "@/assets/demo-coach-dashboard.png";
import demoPlayerToday from "@/assets/demo-player-today.png";

const Demo: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero / Intro */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            One system. Two simple experiences.
          </h1>
          <p className="text-xl text-muted-foreground">
            Built for coaches. Trusted by parents.
          </p>
        </div>
      </section>

      {/* Coach View Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                Coach View
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                What coaches see
              </h2>

              <ul className="space-y-4 mb-8">
                {[
                  { icon: LayoutDashboard, text: "Coach Dashboard" },
                  { icon: Calendar, text: "Today control center" },
                  { icon: TrendingUp, text: "Participation snapshot" },
                  { icon: Zap, text: "Auto game-day detection" },
                  { icon: Link2, text: "TeamSnap sync" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg">{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-lg font-semibold text-primary">
                  "Less chasing. Better preparation."
                </p>
              </div>
            </div>

            {/* Mockup */}
            <div className="relative flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-3xl opacity-50" />
                <img
                  src={demoCoachDashboard}
                  alt="Coach dashboard showing Today status, Game Day badge, and Publish button"
                  className="relative w-72 lg:w-80 rounded-3xl shadow-elevated"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parent / Player View Section */}
      <section className="py-20 lg:py-28 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Mockup */}
            <div className="relative flex justify-center lg:order-1 order-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-transparent rounded-3xl blur-3xl opacity-50" />
                <img
                  src={demoPlayerToday}
                  alt="Player Today screen with simple tasks, no rankings or comments"
                  className="relative w-72 lg:w-80 rounded-3xl shadow-elevated"
                />
              </div>
            </div>

            {/* Content */}
            <div className="lg:order-2 order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
                <UserCircle className="w-4 h-4" />
                Parent / Player View
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                What families see
              </h2>

              <ul className="space-y-4 mb-8">
                {[
                  { icon: CheckCircle, text: "Clear daily checklist" },
                  { icon: Smartphone, text: "One-tap completion" },
                  { icon: WifiOff, text: "Offline support" },
                  { icon: TrendingUp, text: "Calm progress tracking" },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-success" />
                    </div>
                    <span className="text-lg">{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-lg font-semibold text-success">
                  "No nagging. Just habits."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Reminder Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Privacy First
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-10">
            Everything here is private.
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: Eye, text: "Nothing is public" },
              { icon: Users, text: "Nothing compares kids" },
              { icon: Zap, text: "Nothing pressures streaks" },
              { icon: Lock, text: "This is intentional" },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-muted/50 border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to see it in action?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Get a personalized walkthrough for your team or association.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">
              Book a demo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Demo;
