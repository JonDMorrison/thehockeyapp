import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { BETA_MODE } from "@/core/constants";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { MarketingAppPreview } from "@/components/marketing/MarketingAppPreview";
import { FeatureRewards } from "@/components/marketing/features";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
import {
  CheckCircle,
  ArrowRight,
  Trophy,
  Calendar,
  ClipboardCheck,
  Flame,
  FileText,
  Users,
  Home as HomeIcon,
} from "lucide-react";
import familyNexlevelImg from "@/assets/family-nexlevel.png";
import { useTranslation } from 'react-i18next';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [showGetStarted, setShowGetStarted] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>The Hockey App — Off-Ice Training for Hockey Teams</title>
        <meta name="description" content="The off-ice training system for hockey teams. Coaches assign structured home training, players follow it on their own, and you see who's putting in the work." />
        <meta property="og:title" content="The Hockey App — Off-Ice Training for Hockey Teams" />
        <meta property="og:description" content="The off-ice training system for hockey teams. Coaches assign structured home training, players follow it on their own, and you see who's putting in the work." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hockeyapp.ca/" />
        <meta property="og:image" content="https://www.hockeyapp.ca/SitePreview.png" />
      </Helmet>
      <MarketingNav />

      {/* Hero Section */}
      <section className="relative pt-16 bg-[hsl(0,0%,98%)] overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-80 h-80 rounded-full bg-[hsl(213,100%,25%,0.04)] blur-3xl" />
        <div className="absolute top-40 right-16 w-3 h-3 rounded-full bg-primary/20 hidden lg:block" />
        <div className="absolute top-60 right-32 w-2 h-2 rounded-full bg-primary/15 hidden lg:block" />
        <div className="absolute bottom-32 left-20 w-2 h-2 rounded-full bg-[hsl(213,100%,25%,0.15)] hidden lg:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-20 lg:pb-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05] text-foreground">
                {t('marketing.home_hero_heading_prefix')}{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                  {t('marketing.home_hero_heading_gradient')}
                </span>
              </h1>

              <p className="text-xl text-text-secondary font-medium mb-4 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                {t('marketing.home_hero_subtext')}
              </p>

              <p className="text-sm text-text-muted mb-8 max-w-xl mx-auto lg:mx-0">
                {BETA_MODE ? t('marketing.home_hero_beta_free') : t('marketing.home_hero_trial')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                  onClick={() => setShowGetStarted(true)}
                >
                  {t('marketing.home_hero_get_started')}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 transition-colors rounded-xl"
                  asChild
                >
                  <Link to="/demo">
                    {t('marketing.home_hero_see_how')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <div className="relative">
                  <PhoneMockup
                    showGlow={false}
                    className="w-72 lg:w-80"
                  >
                    <MarketingAppPreview />
                  </PhoneMockup>
                  {/* Bottom gradient mask for clean mobile crop */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[hsl(0,0%,98%)] to-transparent pointer-events-none lg:hidden" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 12%) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-10 text-foreground">
              {t('marketing.home_problem_heading')}
            </h2>

            <div className="space-y-8 max-w-2xl mx-auto">
              <div className="space-y-5 text-lg text-text-secondary">
                <p>{t('marketing.home_problem_p1')}</p>
                <p>{t('marketing.home_problem_p2')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 lg:py-28 bg-background overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/[0.03] blur-2xl" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-[hsl(213,100%,25%,0.03)] blur-2xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              {t('marketing.home_how_heading')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('marketing.home_how_subtext')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: ClipboardCheck,
                title: t('marketing.home_how_setup_title'),
                description: t('marketing.home_how_setup_desc'),
              },
              {
                icon: Calendar,
                title: t('marketing.home_how_calendar_title'),
                description: t('marketing.home_how_calendar_desc'),
              },
              {
                icon: Trophy,
                title: t('marketing.home_how_team_title'),
                description: t('marketing.home_how_team_desc'),
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>

                <h3 className="text-xl font-bold mb-3 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for coaches and managers */}
      <section className="relative py-20 lg:py-28 bg-background overflow-hidden">
        <div className="absolute top-16 -right-24 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute bottom-16 -left-20 w-72 h-72 rounded-full bg-[hsl(213,100%,25%,0.04)] blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 mb-6 shadow-sm">
                <ClipboardCheck className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                {t('marketing.home_coaches_heading')}
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg mx-auto lg:mx-0">
                {t('marketing.home_coaches_lead')}
              </p>
              <p className="mt-4 text-lg font-semibold text-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
                {t('marketing.home_coaches_edge')}
              </p>
            </div>

            {/* Lightweight coach-dashboard mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-subtle overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      {t('marketing.home_coaches_dashboard_subtitle')}
                    </p>
                    <h3 className="text-base font-bold text-foreground">
                      {t('marketing.home_coaches_dashboard_title')}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">
                      18 {t('marketing.home_coaches_dashboard_active')}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2.5">
                  {[
                    { name: t('marketing.home_coaches_player1'), initial: "A", sessions: 5, done: true },
                    { name: t('marketing.home_coaches_player2'), initial: "L", sessions: 4, done: true },
                    { name: t('marketing.home_coaches_player3'), initial: "N", sessions: 2, done: false },
                    { name: t('marketing.home_coaches_player4'), initial: "E", sessions: 5, done: true },
                  ].map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {p.initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(p.sessions / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-sm font-bold text-foreground">
                          {p.sessions}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {t('marketing.home_coaches_sessions_label')}
                        </span>
                      </div>
                      {p.done ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <span className="text-[10px] font-medium text-amber-600 flex-shrink-0">
                          {t('marketing.home_coaches_in_progress')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 30-Day Challenge */}
      <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 12%) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Lightweight challenge mockup */}
            <div className="flex justify-center lg:justify-start lg:order-1">
              <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-subtle p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {t('marketing.home_challenge_badge')}
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1.5 mb-4">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                    <div
                      key={n}
                      className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-semibold ${
                        n <= 12
                          ? "bg-primary text-white"
                          : n === 13
                          ? "bg-primary/20 text-primary ring-1 ring-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {n}
                    </div>
                  ))}
                </div>
                <p className="text-xs font-medium text-muted-foreground text-center">
                  {t('marketing.home_challenge_progress')}
                </p>
              </div>
            </div>

            <div className="text-center lg:text-left lg:order-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 mb-6 shadow-sm">
                <Flame className="w-7 h-7 text-orange-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                {t('marketing.home_challenge_heading')}
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg mx-auto lg:mx-0">
                {t('marketing.home_challenge_body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The end of season report */}
      <section className="relative py-20 lg:py-28 bg-background overflow-hidden">
        <div className="absolute -top-10 -left-20 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full bg-[hsl(213,100%,25%,0.03)] blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 mb-6 shadow-sm">
                <FileText className="w-7 h-7 text-primary" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                {t('marketing.home_report_heading')}
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed max-w-lg mx-auto lg:mx-0">
                {t('marketing.home_report_body')}
              </p>
              <p className="mt-4 text-lg font-semibold text-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
                {t('marketing.home_report_recruiting')}
              </p>
            </div>

            {/* Lightweight season report mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-subtle overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    {t('marketing.home_report_card_title')}
                  </h3>
                </div>
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 px-5 py-3 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{t('marketing.home_report_col_player')}</span>
                  <span className="text-right">{t('marketing.home_report_col_sessions')}</span>
                  <span className="text-right">{t('marketing.home_report_col_shots')}</span>
                  <span className="text-right">{t('marketing.home_report_col_streak')}</span>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { name: t('marketing.home_coaches_player1'), sessions: 64, shots: 1920, streak: 21 },
                    { name: t('marketing.home_coaches_player2'), sessions: 58, shots: 1740, streak: 14 },
                    { name: t('marketing.home_coaches_player3'), sessions: 41, shots: 1230, streak: 9 },
                    { name: t('marketing.home_coaches_player4'), sessions: 67, shots: 2010, streak: 28 },
                  ].map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 px-5 py-3 items-center"
                    >
                      <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                      <span className="text-sm text-foreground text-right tabular-nums">{r.sessions}</span>
                      <span className="text-sm text-foreground text-right tabular-nums">{r.shots}</span>
                      <span className="text-sm font-semibold text-primary text-right tabular-nums flex items-center justify-end gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {r.streak}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Families Section — demoted + condensed */}
      <section className="relative py-16 lg:py-20 bg-[hsl(0,0%,96%)] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 12%) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 mb-6 shadow-sm">
            <HomeIcon className="w-7 h-7 text-orange-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            {t('marketing.home_families_heading')}
          </h2>
          <p className="text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto mb-8">
            {t('marketing.home_families_body')}
          </p>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 transition-colors rounded-xl"
            onClick={() => setShowGetStarted(true)}
          >
            {t('marketing.home_families_button')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Founder Section */}
      <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 12%) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-10 left-1/4 w-4 h-4 rounded-full bg-primary/10 hidden lg:block" />
        <div className="absolute bottom-20 right-1/4 w-3 h-3 rounded-full bg-[hsl(213,100%,25%,0.1)] hidden lg:block" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative flex justify-center">
              <div className="max-w-md w-full">
                <img
                  src={familyNexlevelImg}
                  alt={t('marketing.home_founder_img_alt')}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                {t('marketing.home_founder_heading_prefix')}{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">{t('marketing.home_founder_heading_gradient')}</span>
              </h2>

              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>{t('marketing.home_founder_p1')}</p>
                <p>{t('marketing.home_founder_p2')}</p>
                <p>{t('marketing.home_founder_p3')}</p>
                <p>{t('marketing.home_founder_p4')}</p>
                <p className="text-lg font-semibold text-foreground">
                  {t('marketing.home_founder_p5')}
                </p>
              </div>

              <div className="mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 transition-colors rounded-xl"
                  asChild
                >
                  <Link to="/about">
                    {t('marketing.home_founder_button')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
       <section className="relative py-20 lg:py-28 bg-background overflow-hidden">
        <div className="absolute -top-10 -left-20 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute bottom-10 right-0 w-64 h-64 rounded-full bg-[hsl(213,100%,25%,0.03)] blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground">
                {t('marketing.home_results_heading_prefix')}{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                  {t('marketing.home_results_heading_gradient')}
                </span>
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-lg">
                {t('marketing.home_results_subtext')}
              </p>
              <div className="space-y-4">
                {[
                  t('marketing.home_results_kids_train'),
                  t('marketing.home_results_coaches_see'),
                  t('marketing.home_results_parents_stop'),
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-base font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <PhoneMockup showGlow={false} className="w-72 lg:w-80">
                <FeatureRewards />
              </PhoneMockup>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 lg:py-28 bg-background overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-4 h-4 rounded-full bg-primary/10 hidden lg:block" />
        <div className="absolute top-10 right-1/3 w-3 h-3 rounded-full bg-[hsl(213,100%,25%,0.1)] hidden lg:block" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="bg-card rounded-2xl p-8 md:p-12 border border-border shadow-subtle">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
              {t('marketing.home_cta_heading')}
            </h2>
            <p className="text-lg text-text-secondary mb-10 max-w-2xl mx-auto">
              {t('marketing.home_cta_subtext')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                onClick={() => setShowGetStarted(true)}
              >
                {t('marketing.home_cta_get_started')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 transition-colors rounded-xl"
                asChild
              >
                <Link to="/demo">
                  {t('marketing.home_cta_see_how')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
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
