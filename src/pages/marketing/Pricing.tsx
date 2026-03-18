import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GetStartedModal } from "@/components/marketing/GetStartedModal";
import {
  Check,
  X,
  ArrowRight,
  Shield,
  Clock,
  CreditCard,
  Users,
} from "lucide-react";
import { useTranslation } from 'react-i18next';

const Pricing: React.FC = () => {
  const { t } = useTranslation();

  /* ── Comparison table: TWO columns only ── */
  const comparisonRows: { feature: string; parent: boolean | string; team: boolean | string }[] = [
    { feature: t('marketing.comparison_price'), parent: "$15/mo", team: "$500/yr" },
    { feature: t('marketing.comparison_free_trial'), parent: "7 days", team: "—" },
    { feature: t('marketing.comparison_coverage'), parent: "One family", team: "Up to 24 players" },
    { feature: t('marketing.comparison_full_workout_history'), parent: true, team: true },
    { feature: t('marketing.comparison_structured_programs'), parent: true, team: true },
    { feature: t('marketing.comparison_development_snapshot'), parent: true, team: true },
    { feature: t('marketing.comparison_ai_summaries'), parent: true, team: true },
    { feature: t('marketing.comparison_export_reports'), parent: true, team: true },
    { feature: t('marketing.comparison_player_limit'), parent: "Your children", team: "24 roster spots" },
  ];

  /* ── FAQ ── */
  const faqs = [
    {
      q: t('marketing.faq_q1'),
      a: t('marketing.faq_q1_a'),
    },
    {
      q: t('marketing.faq_q2'),
      a: t('marketing.faq_q2_a'),
    },
    {
      q: t('marketing.faq_q3'),
      a: t('marketing.faq_q3_a'),
    },
    {
      q: t('marketing.faq_q4'),
      a: t('marketing.faq_q4_a'),
    },
    {
      q: t('marketing.faq_q5'),
      a: t('marketing.faq_q5_a'),
    },
  ];

  const [showGetStarted, setShowGetStarted] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 bg-[hsl(0,0%,98%)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-foreground">
            {t('marketing.pricing_hero_heading')}
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto font-medium">
            {t('marketing.pricing_free_coaches')}
          </p>
        </div>
      </section>

      {/* Pricing Cards — TWO plans only */}
      <section className="pb-20 bg-[hsl(0,0%,98%)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

            {/* Parent Pro — visually dominant */}
            <div className="bg-card rounded-2xl border-2 border-primary shadow-medium p-8 md:p-10 flex flex-col relative md:scale-[1.03] md:z-10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                  {t('marketing.pricing_for_families')}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-primary mb-1">{t('marketing.pricing_parent_pro')}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-foreground">$15</span>
                  <span className="text-text-muted">{t('marketing.pricing_month')}</span>
                </div>
                <p className="text-sm text-text-muted mt-2">
                  {t('marketing.pricing_trial_cancel')}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  t('marketing.pricing_parent_pro_f1'),
                  t('marketing.pricing_parent_pro_f2'),
                  t('marketing.pricing_parent_pro_f3'),
                  t('marketing.pricing_parent_pro_f4'),
                  t('marketing.pricing_parent_pro_f5'),
                  t('marketing.pricing_parent_pro_f6'),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-secondary">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className="w-full bg-primary hover:bg-[hsl(22,85%,40%)] text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                onClick={() => setShowGetStarted(true)}
              >
                {t('marketing.pricing_start_trial')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-text-muted text-center mt-3">
                {t('marketing.pricing_credit_card')}
              </p>
            </div>

            {/* Team Plan */}
            <div className="bg-card rounded-2xl border border-border shadow-subtle p-8 flex flex-col relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-foreground text-background text-xs font-semibold px-4 py-1.5 rounded-full">
                  {t('marketing.pricing_best_for_teams')}
                </span>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">{t('marketing.pricing_team_plan')}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-foreground">$500</span>
                  <span className="text-text-muted">{t('marketing.pricing_year')}</span>
                </div>
                <p className="text-sm text-text-muted mt-2">
                  {t('marketing.pricing_covers_roster')}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  t('marketing.pricing_team_f1'),
                  t('marketing.pricing_team_f2'),
                  t('marketing.pricing_team_f3'),
                  t('marketing.pricing_team_f4'),
                  t('marketing.pricing_team_f5'),
                  t('marketing.pricing_team_f6'),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-text-secondary">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant="outline"
                className="w-full border-2 border-foreground text-foreground hover:bg-muted/50 rounded-xl"
                onClick={() => setShowGetStarted(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                {t('marketing.pricing_buy_team_plan')}
              </Button>
              <p className="text-xs text-text-muted text-center mt-3">
                {t('marketing.pricing_annual_billing')}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Savings Math Block */}
      <section className="py-16 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card rounded-2xl border border-border shadow-subtle p-8 md:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-8">
              {t('marketing.pricing_math_heading')}
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-[hsl(0,0%,96%)] rounded-xl p-6 text-center">
                <p className="text-sm font-medium text-text-muted mb-2">{t('marketing.pricing_math_20_families')}</p>
                <p className="text-lg text-text-secondary mb-1">20 × $15/mo = <span className="font-bold text-foreground">$300/mo</span></p>
                <p className="text-2xl font-bold text-foreground">{t('marketing.pricing_math_year')}</p>
              </div>
              <div className="bg-primary/5 rounded-xl p-6 text-center border border-primary/20">
                <p className="text-sm font-medium text-primary mb-2">{t('marketing.pricing_math_one_team')}</p>
                <p className="text-3xl font-bold text-primary mb-1">$500/year</p>
                <p className="text-sm text-text-muted">{t('marketing.pricing_covers_everyone')}</p>
              </div>
            </div>
            <p className="text-center text-lg font-semibold text-primary mt-6">
              {t('marketing.pricing_math_save')}
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Table — TWO columns */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-10">
            {t('marketing.comparison_table_heading')}
          </h2>

          <div className="bg-card rounded-2xl border border-border shadow-subtle overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 border-b border-border">
              <div className="p-4 sm:p-5">
                <span className="text-sm font-medium text-text-muted">{t('marketing.comparison_feature')}</span>
              </div>
              <div className="p-4 sm:p-5 text-center border-l border-border bg-primary/5">
                <span className="text-sm font-semibold text-primary">{t('marketing.pricing_parent_pro')}</span>
              </div>
              <div className="p-4 sm:p-5 text-center border-l border-border">
                <span className="text-sm font-semibold text-foreground">{t('marketing.pricing_team_plan')}</span>
              </div>
            </div>

            {/* Rows */}
            {comparisonRows.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 ${i < comparisonRows.length - 1 ? "border-b border-border" : ""}`}
              >
                <div className="p-4 sm:p-5 flex items-center">
                  <span className="text-sm text-text-secondary">{row.feature}</span>
                </div>
                <div className="p-4 sm:p-5 flex items-center justify-center border-l border-border bg-primary/5">
                  {row.parent === true ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : row.parent === false ? (
                    <X className="w-5 h-5 text-text-disabled" />
                  ) : (
                    <span className="text-xs font-medium text-primary">{row.parent}</span>
                  )}
                </div>
                <div className="p-4 sm:p-5 flex items-center justify-center border-l border-border">
                  {row.team === true ? (
                    <Check className="w-5 h-5 text-foreground" />
                  ) : row.team === false ? (
                    <X className="w-5 h-5 text-text-disabled" />
                  ) : (
                    <span className="text-xs font-medium text-foreground">{row.team}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started — coaches & free access */}
      <section className="py-16 bg-[hsl(0,0%,96%)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {t('marketing.pricing_not_ready')}
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed max-w-xl mx-auto mb-8">
            {t('marketing.pricing_not_ready_desc')}
          </p>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: Users,
                title: t('marketing.pricing_coaches_title'),
                desc: t('marketing.pricing_coaches_desc'),
              },
              {
                icon: Shield,
                title: t('marketing.pricing_parents_title'),
                desc: t('marketing.pricing_parents_desc'),
              },
              {
                icon: CreditCard,
                title: t('marketing.pricing_team_covered_title'),
                desc: t('marketing.pricing_team_covered_desc'),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border shadow-subtle p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: t('marketing.pricing_free_trial'),
                desc: t('marketing.pricing_free_trial_desc'),
              },
              {
                icon: CreditCard,
                title: t('marketing.pricing_cancel_anytime'),
                desc: t('marketing.pricing_cancel_anytime_desc'),
              },
              {
                icon: Shield,
                title: t('marketing.pricing_privacy_first'),
                desc: t('marketing.pricing_privacy_first_desc'),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border shadow-subtle p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-[hsl(0,0%,96%)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-10">
            {t('marketing.faq_heading')}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-5 sm:p-6">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-card rounded-2xl border border-border shadow-subtle p-8 md:p-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              {t('marketing.pricing_cta_heading')}
            </h2>
            <p className="text-lg text-text-secondary mb-8 max-w-xl mx-auto">
              {t('marketing.pricing_cta_subtext')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                onClick={() => setShowGetStarted(true)}
              >
                {t('marketing.pricing_cta_get_started')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 border-2 border-primary text-primary hover:bg-primary/5 rounded-xl"
                asChild
              >
                <Link to="/demo">
                  {t('marketing.pricing_cta_see_how')}
                  <ArrowRight className="w-4 h-4 ml-2" />
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

export default Pricing;
