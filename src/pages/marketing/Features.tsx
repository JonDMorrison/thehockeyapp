import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import {
  ClipboardList,
  Zap,
  Calendar,
  Sparkles,
  Trophy,
  Shield,
  CheckCircle,
  ArrowRight,
  Dumbbell,
  Users,
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
      title: "Simple tasks. No confusion.",
      bullets: [
        "Coach creates off-ice assignments",
        "Easy for any age to understand",
        "Clear daily expectations",
        "Works offline everywhere",
      ],
      image: featurePracticeCard,
      imageAlt: "Daily off-ice task card",
      gradient: "from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)]",
    },
    {
      icon: CheckCircle,
      title: "One tap. Done.",
      bullets: [
        "Kids check off tasks in seconds",
        "Parents can help verify",
        "No complicated tracking",
        "Completion is automatic",
      ],
      image: featureCheckoff,
      imageAlt: "One-tap task checkoff",
      gradient: "from-success via-[hsl(142,60%,45%)] to-[hsl(160,60%,40%)]",
    },
    {
      icon: Trophy,
      title: "Fun rewards that motivate.",
      bullets: [
        "Earn badges for consistency",
        "Celebrate milestones",
        "No public leaderboards",
        "Positive reinforcement only",
      ],
      image: featureGameday,
      imageAlt: "Rewards and badges",
      gradient: "from-[hsl(35,90%,55%)] via-[hsl(25,85%,50%)] to-[hsl(15,80%,50%)]",
    },
    {
      icon: Sparkles,
      title: "Build tasks in minutes.",
      bullets: [
        "Simple task builder for coaches",
        "AI can help draft ideas",
        "Copy from templates",
        "Customize per week",
      ],
      image: featureBuilder,
      imageAlt: "Coach task builder",
      gradient: "from-[hsl(280,70%,50%)] via-[hsl(260,60%,55%)] to-primary",
    },
    {
      icon: Users,
      title: "Coaches see who's doing the work.",
      bullets: [
        "Team completion dashboard",
        "See who checked off today",
        "No individual rankings",
        "Celebrate participation",
      ],
      image: featurePhoto,
      imageAlt: "Coach visibility dashboard",
      gradient: "from-[hsl(200,70%,50%)] via-[hsl(190,65%,45%)] to-[hsl(180,60%,40%)]",
    },
    {
      icon: Shield,
      title: "Total parent control.",
      bullets: [
        "Parents own the account",
        "Nothing is ever public",
        "No social features",
        "You decide what's shared",
      ],
      image: featurePrivacy,
      imageAlt: "Parent control settings",
      gradient: "from-success via-[hsl(142,60%,45%)] to-[hsl(160,60%,40%)]",
    },
  ];

  const featureLabels = [
    "Simple Task Cards",
    "Quick Checkoff",
    "Fun Rewards",
    "Easy Task Builder",
    "Coach Visibility",
    "Parent Control",
  ];

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
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

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Floating badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft mb-6">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Off-Ice Training Made Simple</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
                Everything you need. Nothing you don't.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple tools for coaches to assign off-ice tasks, fun rewards to keep kids motivated, 
              and complete control for parents.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-32 lg:space-y-40">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center`}
              >
                {/* Content */}
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  {/* Feature label with glassmorphism */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft mb-6">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                      <feature.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{featureLabels[i]}</span>
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                    <span className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                      {feature.title}
                    </span>
                  </h2>
                  
                  {/* Glassmorphism card for bullets */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-soft p-6">
                    <ul className="space-y-4">
                      {feature.bullets.map((bullet, j) => (
                        <li key={j} className="flex items-center gap-4 group">
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-lg text-muted-foreground group-hover:text-foreground transition-colors">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Phone Mockup */}
                <div
                  className={`flex justify-center ${
                    i % 2 === 1 ? "lg:order-1" : ""
                  }`}
                >
                  <PhoneMockup 
                    imageSrc={feature.image} 
                    showGlow 
                    glowColor={feature.gradient.includes('success') ? 'success' : feature.gradient.includes('280') ? 'purple' : feature.gradient.includes('35') ? 'orange' : feature.gradient.includes('200,70') ? 'cyan' : 'primary'}
                  />
                </div>
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
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
                See it in action
              </span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Watch how coaches assign off-ice tasks and how families track completion.
            </p>
            <Button 
              size="lg" 
              asChild
              className="bg-gradient-to-r from-primary to-[hsl(221,70%,60%)] hover:scale-105 transition-transform shadow-glow text-white border-0 h-14 px-8 text-lg"
            >
              {(
                <Link to="/demo">
                  View the demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              )}
            </Button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Features;
