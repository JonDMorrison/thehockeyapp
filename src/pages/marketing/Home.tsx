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
  WifiOff,
  ArrowRight,
  Eye,
  UserCheck,
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Build better hockey habits —{" "}
                <span className="text-primary">without the chaos</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0">
                Simple daily training, automatic game-day prep, and parent-friendly 
                tracking — built for youth hockey.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" asChild>
                  <Link to="/demo">
                    See how it works
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth">Book a demo</Link>
                </Button>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <img
                  src={mockupToday}
                  alt="Today's Practice app screen showing simple checklist"
                  className="w-72 lg:w-80 rounded-3xl shadow-elevated"
                />
                {/* Overlay badge */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-border">
                  <span className="text-sm font-medium text-foreground">
                    Today's Practice • 3 of 5 complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 lg:py-28 bg-muted/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8">
            Youth hockey doesn't need more pressure.
          </h2>
          
          <div className="space-y-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            <p>Parents want structure without arguments.</p>
            <p>Coaches want preparation without admin work.</p>
            <p className="font-medium text-foreground">
              Most apps add rankings, streaks, and stress.
            </p>
            <p className="text-xl font-semibold text-primary">
              We built the opposite.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl font-bold mb-8">
                A calm system that works in real hockey life
              </h2>

              <div className="space-y-5">
                {[
                  { icon: CheckCircle, text: "Daily practice cards" },
                  { icon: Target, text: "One-tap checklists" },
                  { icon: Zap, text: "Automatic game-day prep" },
                  { icon: UserCheck, text: "Parent-controlled tracking" },
                  { icon: WifiOff, text: "Works offline in garages and driveways" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 relative flex justify-center">
              <div className="relative">
                <img
                  src={mockupLockscreen}
                  alt="Lock screen quick checkoff interface"
                  className="w-72 lg:w-80 rounded-3xl shadow-elevated"
                />
                {/* Saved offline badge */}
                <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg border border-border flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-success" />
                  <span className="text-xs font-medium">Saved offline</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes Section */}
      <section className="py-20 lg:py-28 bg-muted/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              What this means for your team
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
            {[
              {
                icon: Heart,
                title: "Better habits",
                description: "Small daily actions add up to lasting improvement.",
              },
              {
                icon: Target,
                title: "More shots",
                description: "Track volume without obsessing over numbers.",
              },
              {
                icon: Zap,
                title: "Game-day ready",
                description: "Automatic prep routines when games are detected.",
              },
              {
                icon: Users,
                title: "Parent-coach alignment",
                description: "Everyone sees the same plan, no miscommunication.",
              },
              {
                icon: Shield,
                title: "Safety by design",
                description: "No public data, no comparisons, no pressure.",
              },
            ].map((outcome, i) => (
              <div
                key={i}
                className="bg-background rounded-2xl p-6 shadow-subtle text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <outcome.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{outcome.title}</h3>
                <p className="text-sm text-muted-foreground">{outcome.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety & Privacy Section - PROMINENT */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-6">
                <Lock className="w-4 h-4" />
                Privacy First
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold mb-8">
                Built for kids. Designed for trust.
              </h2>

              <div className="space-y-5">
                {[
                  { icon: UserCheck, text: "Parent-owned accounts" },
                  { icon: Eye, text: "No public profiles" },
                  { icon: Shield, text: "No leaderboards" },
                  { icon: Users, text: "No comparisons between kids" },
                  { icon: Lock, text: "Coaches only see what parents allow" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-success" />
                    </div>
                    <span className="text-lg">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              <img
                src={mockupPrivacy}
                alt="Privacy-focused app interface"
                className="w-72 lg:w-80 rounded-3xl shadow-elevated"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 lg:py-28 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            See the demo
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Experience how coaches and parents use the app together to build 
            consistent training habits.
          </p>
          <Button size="lg" asChild>
            <Link to="/demo">
              Try the demo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Home;
