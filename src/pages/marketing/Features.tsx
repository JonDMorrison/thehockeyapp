import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
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
import { useTranslation } from 'react-i18next';

const Features: React.FC = () => {
  const { t } = useTranslation();
  const [showGetStarted, setShowGetStarted] = useState(false);
  const features = [
    {
      icon: ClipboardList,
      title: t('marketing.features_title_clear'),
      bullets: [
        t('marketing.features_bullet_coach_assigns'),
        t('marketing.features_bullet_any_age'),
        t('marketing.features_bullet_child_knows'),
        t('marketing.features_bullet_works_offline'),
      ],
      Preview: FeatureTaskCard,
      glowColor: "primary" as const,
      gradient: "from-primary via-[hsl(221,70%,60%)] to-[hsl(200,70%,55%)]",
    },
    {
      icon: CheckCircle,
      title: t('marketing.features_title_ownership'),
      bullets: [
        t('marketing.features_bullet_child_checks'),
        t('marketing.features_bullet_parents_verify'),
        t('marketing.features_bullet_no_complicated'),
        t('marketing.features_bullet_builds_habit'),
      ],
      Preview: FeatureCheckoff,
      glowColor: "success" as const,
      gradient: "from-success via-[hsl(142,60%,45%)] to-[hsl(160,60%,40%)]",
    },
    {
      icon: Trophy,
      title: t('marketing.features_title_consistency'),
      bullets: [
        t('marketing.features_bullet_badges'),
        t('marketing.features_bullet_milestones'),
        t('marketing.features_bullet_no_public_leaderboards'),
        t('marketing.features_bullet_effort_based'),
      ],
      Preview: FeatureRewards,
      glowColor: "orange" as const,
      gradient: "from-[hsl(35,90%,55%)] via-[hsl(25,85%,50%)] to-[hsl(15,80%,50%)]",
    },
    {
      icon: Sparkles,
      title: t('marketing.features_title_coaches_build'),
      bullets: [
        t('marketing.features_bullet_task_builder'),
        t('marketing.features_bullet_balanced'),
        t('marketing.features_bullet_copy_templates'),
        t('marketing.features_bullet_parents_see'),
      ],
      Preview: FeatureBuilder,
      glowColor: "purple" as const,
      gradient: "from-[hsl(280,70%,50%)] via-[hsl(260,60%,55%)] to-primary",
    },
    {
      icon: Users,
      title: t('marketing.features_title_participation'),
      bullets: [
        t('marketing.features_bullet_who_completed'),
        t('marketing.features_bullet_team_completion'),
        t('marketing.features_bullet_no_individual'),
        t('marketing.features_bullet_participation'),
      ],
      Preview: FeatureCoachView,
      glowColor: "cyan" as const,
      gradient: "from-[hsl(200,70%,50%)] via-[hsl(190,65%,45%)] to-[hsl(180,60%,40%)]",
    },
    {
      icon: Shield,
      title: t('marketing.features_title_parents_own'),
      bullets: [
        t('marketing.features_bullet_who_control'),
        t('marketing.features_bullet_nothing_public'),
        t('marketing.features_bullet_no_sharing'),
        t('marketing.features_bullet_you_decide'),
      ],
      Preview: FeaturePrivacy,
      glowColor: "success" as const,
      gradient: "from-success via-[hsl(142,60%,45%)] to-[hsl(160,60%,40%)]",
    },
  ];

  const featureLabels = [
    t('marketing.features_label_structured'),
    t('marketing.features_label_quick_checkoff'),
    t('marketing.features_label_reinforcement'),
    t('marketing.features_label_coach_builder'),
    t('marketing.features_label_participation'),
    t('marketing.features_label_parent_control'),
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Features — The Hockey App</title>
        <meta name="description" content="Practice planning, player tracking, badges, weekly goals, solo training and more." />
        <meta property="og:title" content="Features — The Hockey App" />
        <meta property="og:description" content="Practice planning, player tracking, badges, weekly goals, solo training and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hockeyapp.ca/features" />
      </Helmet>
      <MarketingNav />

      {/* Hero */}
      <section className="relative py-16 sm:py-20 lg:py-32 bg-[hsl(0,0%,98%)]">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Floating badge */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-card border border-border shadow-subtle mb-6">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-text-muted">{t('marketing.features_hero_badge')}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 px-2 text-foreground">
              {t('marketing.features_hero_heading')}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-text-secondary max-w-2xl mx-auto px-4">
              {t('marketing.features_hero_subtext')}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="py-12 sm:py-16 lg:py-24 bg-[hsl(0,0%,96%)]">
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
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-card border border-border shadow-subtle mb-4 sm:mb-6">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center">
                      <feature.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground">{featureLabels[i]}</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
                    {feature.title}
                  </h2>

                  {/* Glassmorphism card for bullets */}
                  <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-subtle p-4 sm:p-6">
                    <ul className="space-y-3 sm:space-y-4">
                      {feature.bullets.map((bullet, j) => (
                        <li key={j} className="flex items-center gap-3 sm:gap-4 group">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                          </div>
                          <span className="text-sm sm:text-base lg:text-lg text-text-secondary group-hover:text-foreground transition-colors">{bullet}</span>
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
                    showGlow={false}
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
      <section className="py-16 sm:py-24 lg:py-32 bg-background">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card rounded-2xl border border-border shadow-subtle p-6 sm:p-10 md:p-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-foreground">
              {t('marketing.features_cta_heading')}
            </h2>
            <p className="text-base sm:text-lg text-text-secondary mb-6 sm:mb-10 max-w-2xl mx-auto">
              {t('marketing.features_cta_subtext')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white border-0 h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg w-full sm:w-auto rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                onClick={() => setShowGetStarted(true)}
              >
                {t('marketing.features_cta_get_started')}
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary/5 transition-colors h-12 sm:h-14 px-6 sm:px-8 text-base sm:text-lg w-full sm:w-auto rounded-xl"
                asChild
              >
                <Link to="/demo">
                  {t('marketing.features_cta_see_how')}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
};

export default Features;
