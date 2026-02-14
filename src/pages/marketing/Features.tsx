import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import {
  FeatureTaskCard,
  FeatureCheckoff,
  FeatureRewards,
  FeatureBuilder,
  FeatureCoachView,
  FeaturePrivacy,
} from "@/components/marketing/features";
import {
  ClipboardList,
  Zap,
  Sparkles,
  Trophy,
  Shield,
  CheckCircle,
  ArrowRight,
  Dumbbell,
  Users,
} from "lucide-react";

const Features: React.FC = () => {
  const features = [
    {
      icon: ClipboardList,
      title: "Clear expectations at home.",
      bullets: [
        "Coach assigns structured off-ice tasks",
        "Simple enough for any age to follow",
        "Your child knows exactly what to do each day",
        "Works offline — garage, basement, anywhere",
      ],
      Preview: FeatureTaskCard,
      glowColor: "primary" as const,
      gradient: "from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)]",
    },
    {
      icon: CheckCircle,
      title: "Ownership in seconds.",
      bullets: [
        "Your child checks off tasks independently",
        "Parents can verify if needed",
        "No complicated tracking or data entry",
        "Builds a daily habit loop naturally",
      ],
      Preview: FeatureCheckoff,
      glowColor: "success" as const,
      gradient: "from-success via-[hsl(142,60%,45%)] to-[hsl(160,60%,40%)]",
    },
    {
      icon: Trophy,
      title: "Consistency gets recognized.",
      bullets: [
        "Earn badges for showing up day after day",
        "Milestones mark real progress",
        "No public leaderboards or rankings",
        "Effort-based recognition builds confidence",
      ],
      Preview: FeatureRewards,
      glowColor: "orange" as const,
      gradient: "from-[hsl(35,90%,55%)] via-[hsl(25,85%,50%)] to-[hsl(15,80%,50%)]",
    },
    {
      icon: Sparkles,
      title: "Coaches build it. Families benefit.",
      bullets: [
        "Simple task builder takes minutes",
        "Smart suggestions help draft balanced weeks",
        "Copy from templates or customize freely",
        "Parents see what's assigned automatically",
      ],
      Preview: FeatureBuilder,
      glowColor: "purple" as const,
      gradient: "from-[hsl(280,70%,50%)] via-[hsl(260,60%,55%)] to-primary",
    },
    {
      icon: Users,
      title: "Participation visibility.",
      bullets: [
        "Coaches see who completed today's tasks",
        "Team-wide completion at a glance",
        "No individual rankings or comparisons",
        "Encourages participation, not competition",
      ],
      Preview: FeatureCoachView,
      glowColor: "cyan" as const,
      gradient: "from-[hsl(200,70%,50%)] via-[hsl(190,65%,45%)] to-[hsl(180,60%,40%)]",
    },
    {
      icon: Shield,
      title: "Parents own the account. Period.",
      bullets: [
        "You control your child's account entirely",
        "Nothing is ever public",
        "No social features or external sharing",
        "You decide what coaches can see",
      ],
      Preview: FeaturePrivacy,
      glowColor: "success" as const,
      gradient: "from-success via-[hsl(142,60%,45%)] to-[hsl(160,60%,40%)]",
    },
  ];

  const featureLabels = [
    "Structured Tasks",
    "Quick Checkoff",
    "Positive Reinforcement",
    "Coach Task Builder",
    "Participation Tracking",
    "Parent Control",
  ];

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative py-16 sm:py-20 lg:py-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-56 sm:w-80 h-56 sm:h-80 bg-success/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-soft mb-6">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Off-Ice Training for Hockey Families</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 px-2">
              <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
                Everything your hockey family needs. Nothing extra.
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Simple structure. Real accountability. Zero pressure.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20 sm:space-y-28 lg:space-y-40">
            {features.map((feature, i) => (
              <div
                key={i}
                className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center"
              >
                {/* Content */}
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  {/* Feature label with glassmorphism */}
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-soft mb-4 sm:mb-6">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                      <feature.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground">{featureLabels[i]}</span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
                    {feature.title}
                  </h2>
                  
                  {/* Glassmorphism card for bullets */}
                  <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-soft p-4 sm:p-6">
                    <ul className="space-y-3 sm:space-y-4">
                      {feature.bullets.map((bullet, j) => (
                        <li key={j} className="flex items-center gap-3 sm:gap-4 group">
                          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                            <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                          </div>
                          <span className="text-sm sm:text-base lg:text-lg text-muted-foreground group-hover:text-foreground transition-colors">{bullet}</span>
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
                    showGlow 
                    glowColor={feature.glowColor}
                    className="w-60 sm:w-64 md:w-72 lg:w-auto"
                  >
                    <feature.Preview />
                  </PhoneMockup>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-primary/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Glass card */}
          <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-depth p-6 sm:p-10 md:p-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              <span className="bg-gradient-to-r from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)] bg-clip-text text-transparent">
                See how it works.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-10 max-w-2xl mx-auto">
              Try one week of structured training. Then decide.
            </p>
            <Button 
              size="lg" 
              asChild
              className="bg-gradient-to-r from-primary to-[hsl(221,70%,60%)] hover:scale-105 transition-transform shadow-glow text-white border-0 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg w-full sm:w-auto"
            >
              {(
                <Link to="/demo">
                  View the demo
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
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
