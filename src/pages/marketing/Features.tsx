import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  ClipboardList,
  Zap,
  Calendar,
  Users,
  Shield,
  Target,
  Smartphone,
  WifiOff,
  Sparkles,
  Trophy,
  Bell,
  Lock,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import mockupCoach from "@/assets/mockup-coach-dashboard.png";
import mockupPlayer from "@/assets/mockup-player-checklist.png";

const Features: React.FC = () => {
  const features = [
    {
      icon: ClipboardList,
      title: "Daily Practice Cards",
      description:
        "Simple, focused checklists for each day. Shooting, mobility, conditioning—all customized to your team's level.",
      details: [
        "Coach sets the training plan",
        "Players see clear daily tasks",
        "15-20 minute sessions",
        "Works for Rec, Rep, or Elite",
      ],
    },
    {
      icon: Zap,
      title: "Game Day Mode",
      description:
        "When games are detected, training automatically switches to pre-game prep. Light work, mental focus, hydration.",
      details: [
        "Auto-detects from TeamSnap",
        "Light pre-game routines",
        "Mental preparation tasks",
        "Manual override available",
      ],
    },
    {
      icon: Calendar,
      title: "Schedule Sync",
      description:
        "Connect your TeamSnap calendar. Games and practices sync automatically. No double entry.",
      details: [
        "One-time iCal setup",
        "Games trigger Game Day mode",
        "Practice reminders",
        "Works on mobile",
      ],
    },
    {
      icon: Users,
      title: "Team Management",
      description:
        "Invite parents with a link. Track which players have completed training. See team-wide progress.",
      details: [
        "Easy invite links",
        "Multi-child support",
        "Role-based access",
        "Roster management",
      ],
    },
    {
      icon: Shield,
      title: "Privacy First",
      description:
        "No public leaderboards. No comparing kids. Parents control visibility. We take child safety seriously.",
      details: [
        "No public profiles",
        "No child comparisons",
        "Parent-controlled data",
        "COPPA compliant design",
      ],
    },
    {
      icon: Trophy,
      title: "Badges & Motivation",
      description:
        "Celebrate consistency, not competition. Earn badges for showing up, not for outperforming others.",
      details: [
        "Personal achievement badges",
        "Consistency rewards",
        "Private to player/parent",
        "No rankings or leaderboards",
      ],
    },
  ];

  const additionalFeatures = [
    { icon: WifiOff, label: "Offline Support", description: "Works without internet. Syncs when back online." },
    { icon: Smartphone, label: "Mobile First", description: "Designed for phones. Fast and easy to use." },
    { icon: Target, label: "Tier Scaling", description: "Tasks auto-adjust for Rec, Rep, or Elite levels." },
    { icon: Sparkles, label: "AI Assist", description: "Generate training plans with one click." },
    { icon: Bell, label: "Notifications", description: "Gentle reminders, never pushy." },
    { icon: Lock, label: "Secure", description: "Enterprise-grade security for family data." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Features built for hockey families
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Everything coaches need to run effective training programs. 
              Everything parents need to support their players.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth">
                  Start Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/demo">Try the Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  i % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">{feature.title}</h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.details.map((detail, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className={`flex justify-center ${
                    i % 2 === 1 ? "lg:order-1" : ""
                  }`}
                >
                  <div className="bg-gradient-to-br from-muted to-muted/50 rounded-3xl p-8 w-full max-w-sm">
                    <img
                      src={i % 2 === 0 ? mockupPlayer : mockupCoach}
                      alt={feature.title}
                      className="w-full rounded-2xl shadow-elevated"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">And so much more</h2>
            <p className="text-muted-foreground">
              Every detail designed to make training easier for families.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, i) => (
              <div
                key={i}
                className="bg-background border border-border rounded-2xl p-6 hover:shadow-medium transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Coaches / For Parents */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-background rounded-2xl p-8 shadow-subtle">
              <h3 className="text-2xl font-bold mb-4">For Coaches</h3>
              <ul className="space-y-3">
                {[
                  "Create training plans in minutes",
                  "Sync with your TeamSnap schedule",
                  "See who's completing training",
                  "Adjust for Rec, Rep, or Elite",
                  "AI-assisted workout generation",
                  "Free for unlimited teams",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background rounded-2xl p-8 shadow-subtle">
              <h3 className="text-2xl font-bold mb-4">For Parents</h3>
              <ul className="space-y-3">
                {[
                  "Know exactly what to practice each day",
                  "Track progress without pressure",
                  "Works offline at the rink",
                  "Support multiple children",
                  "Celebrate consistency, not competition",
                  "Full privacy control",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to simplify training for your team?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Free for coaches. Easy for parents. Fun for players.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">
              Get Started Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Features;
