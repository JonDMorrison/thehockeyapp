import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { BETA_MODE } from "@/core/constants";
import { Link } from "react-router-dom";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/button";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
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
import { FeatureCoachView } from "@/components/marketing/features/FeatureCoachView";
import { FeatureCheckoff } from "@/components/marketing/features/FeatureCheckoff";
import { useTranslation } from 'react-i18next';

const Demo: React.FC = () => {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState<"coach" | "player">("coach");
  const [showGetStarted, setShowGetStarted] = useState(false);

  const coachFeatures = [
    { icon: ClipboardList, text: t('marketing.demo_coach_feature_tasks'), description: t('marketing.demo_coach_feature_tasks_detail') },
    { icon: TrendingUp, text: t('marketing.demo_coach_see_who'), description: t('marketing.demo_coach_feature_completion') },
    { icon: Trophy, text: t('marketing.demo_coach_feature_consistency'), description: t('marketing.demo_coach_rewards_detail') },
    { icon: Users, text: t('marketing.demo_coach_feature_visibility'), description: t('marketing.demo_coach_feature_visibility_detail') },
  ];

  const playerFeatures = [
    { icon: CheckCircle, text: t('marketing.demo_player_feature_clear_tasks'), description: t('marketing.demo_player_feature_clear_tasks_detail') },
    { icon: Play, text: t('marketing.demo_player_feature_completion'), description: t('marketing.demo_player_feature_completion_detail') },
    { icon: Trophy, text: t('marketing.demo_player_feature_rewards'), description: t('marketing.demo_player_feature_rewards_detail') },
    { icon: WifiOff, text: t('marketing.demo_player_feature_offline'), description: t('marketing.demo_player_feature_offline_detail') },
  ];

  const privacyFeatures = [
    { icon: Eye, title: t('marketing.demo_privacy_nothing_public'), description: t('marketing.demo_privacy_nothing_public_detail') },
    { icon: Users, title: t('marketing.demo_privacy_no_comparisons'), description: t('marketing.demo_privacy_no_comparisons_detail') },
    { icon: Shield, title: t('marketing.demo_privacy_parent_controlled'), description: t('marketing.demo_privacy_parent_controlled_detail') },
    { icon: Lock, title: t('marketing.demo_privacy_built_for_families'), description: t('marketing.demo_privacy_built_for_families_detail') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>See It In Action — The Hockey App</title>
        <meta name="description" content="Watch a demo of The Hockey App's off-ice training tools." />
        <meta property="og:title" content="See It In Action — The Hockey App" />
        <meta property="og:description" content="Watch a demo of The Hockey App's off-ice training tools." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hockeyapp.ca/demo" />
        <meta property="og:image" content="https://www.hockeyapp.ca/SitePreview.png" />
      </Helmet>
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
            <span className="text-sm font-medium text-muted-foreground">{t('marketing.demo_badge_demo')}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground">
            {t('marketing.demo_hero_heading')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {t('marketing.demo_hero_description')}
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
              {t('marketing.demo_switch_coach')}
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
              {t('marketing.demo_switch_player')}
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
                <span className="text-sm font-medium text-foreground">{t('marketing.demo_badge_coach_dashboard')}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                {t('marketing.demo_assign_tasks')}
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
                <p className="text-xl font-semibold text-foreground">
                  {t('marketing.demo_coach_quote')}
                </p>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="flex justify-center">
              <PhoneMockup showGlow glowColor="primary">
                <FeatureCoachView />
              </PhoneMockup>
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
              <PhoneMockup showGlow glowColor="success">
                <FeatureCheckoff />
              </PhoneMockup>
            </div>

            {/* Content */}
            <div className="lg:order-2 order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-soft mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-success to-[hsl(160,60%,40%)] flex items-center justify-center">
                  <UserCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">{t('marketing.demo_badge_player_experience')}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                {t('marketing.demo_player_simple_tasks')}
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
                <p className="text-xl font-semibold text-foreground">
                  {t('marketing.demo_player_quote')}
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
              <span className="text-sm font-medium text-muted-foreground">{t('marketing.demo_badge_parent_control')}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              {t('marketing.demo_parents_always_in_charge')}
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl border border-gray-200/50 shadow-depth p-10 md:p-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              {t('marketing.features_cta_heading')}
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              {BETA_MODE ? t('marketing.home_hero_beta_free') : t('marketing.pricing_cta_subtext')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                onClick={() => setShowGetStarted(true)}
              >
                {t('marketing.home_cta_get_started')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              {!BETA_MODE && (
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
                  asChild
                >
                  <Link to="/pricing">
                    {t('marketing.demo_view_pricing')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
      <GetStartedModal open={showGetStarted} onOpenChange={setShowGetStarted} />
    </div>
  );
};

export default Demo;
