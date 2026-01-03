import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  ClipboardList,
  Zap,
  Calendar,
  Sparkles,
  Camera,
  Shield,
  WifiOff,
  CheckCircle,
  Smartphone,
  UserCheck,
  Target,
  ArrowRight,
  MessageSquareOff,
  Eye,
  Lock,
} from "lucide-react";
import featurePracticeCard from "@/assets/feature-practice-card.png";
import featureCheckoff from "@/assets/feature-checkoff.png";
import featureGameday from "@/assets/feature-gameday.png";
import featureBuilder from "@/assets/feature-builder.png";
import featurePhoto from "@/assets/feature-photo.png";
import featurePrivacy from "@/assets/feature-privacy.png";

const Features: React.FC = () => {
  const features = [
    {
      icon: ClipboardList,
      title: "Clear plans. No guessing.",
      bullets: [
        "Coach-built or AI-assisted",
        "Rec / Rep / Elite tiers",
        "Shooting-only or balanced",
        "Works offline",
      ],
      image: featurePracticeCard,
      imageAlt: "Daily practice card on phone",
    },
    {
      icon: CheckCircle,
      title: "Consistency without nagging.",
      bullets: [
        "One-tap checklist",
        "Optional widgets",
        "Parent or player checkoff",
        "Quiet shot totals",
      ],
      image: featureCheckoff,
      imageAlt: "Checklist being checked off",
    },
    {
      icon: Calendar,
      title: "Game days handled for you.",
      bullets: [
        "Syncs with TeamSnap (iCal)",
        "Automatically switches modes",
        "Hydration, stretching, visualization",
      ],
      image: featureGameday,
      imageAlt: "Game Day prep screen",
    },
    {
      icon: Sparkles,
      title: "Build a week in minutes.",
      bullets: [
        "Simple wizard",
        "Shooting-only mode available",
        "AI drafts, coach approves",
        "Templates",
      ],
      image: featureBuilder,
      imageAlt: "Coach workout builder",
    },
    {
      icon: Camera,
      title: "Effort, not performance.",
      bullets: [
        "Optional photo upload",
        "Private by default",
        "Parent-controlled",
        "No public sharing",
      ],
      image: featurePhoto,
      imageAlt: "Photo upload with privacy",
    },
    {
      icon: Shield,
      title: "Not social media. Not a leaderboard.",
      bullets: [
        "No rankings",
        "No public feeds",
        "No child messaging",
        "Privacy first",
      ],
      image: featurePrivacy,
      imageAlt: "Privacy settings screen",
    },
  ];

  const featureLabels = [
    "Daily Practice Cards",
    "Ultra-Fast Checkoff",
    "Automatic Game-Day Prep",
    "Workout Builder (with AI)",
    "Proof of Work (Optional)",
    "Safety & Privacy",
  ];

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Features that respect families
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Everything coaches need. Nothing that creates pressure. 
              Simple tools for real hockey life.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-32">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center`}
              >
                {/* Content */}
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  {/* Feature label */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                    <feature.icon className="w-4 h-4" />
                    {featureLabels[i]}
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                    {feature.title}
                  </h2>
                  
                  <ul className="space-y-4">
                    {feature.bullets.map((bullet, j) => (
                      <li key={j} className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-success" />
                        </div>
                        <span className="text-lg text-muted-foreground">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mockup */}
                <div
                  className={`flex justify-center ${
                    i % 2 === 1 ? "lg:order-1" : ""
                  }`}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl blur-3xl opacity-50" />
                    <img
                      src={feature.image}
                      alt={feature.imageAlt}
                      className="relative w-64 sm:w-72 lg:w-80 rounded-3xl shadow-elevated"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            See it in action
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Experience the coach view and parent/player view side by side.
          </p>
          <Button size="lg" asChild>
            <Link to="/demo">
              View the demo
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
