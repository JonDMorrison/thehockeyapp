import React from "react";
import { Users, Calendar, Home as HomeIcon, TrendingUp } from "lucide-react";
import { PhoneMockup } from "@/components/marketing/PhoneMockup";
import { FeatureCoachView } from "@/components/marketing/features/FeatureCoachView";
import { FeatureProgramCalendar } from "@/components/marketing/features/FeatureProgramCalendar";
import { FeatureCheckoff } from "@/components/marketing/features/FeatureCheckoff";
import { FeaturePlayerProgress } from "@/components/marketing/features/FeaturePlayerProgress";
import { useTranslation } from 'react-i18next';

export const HomeFeaturesSection: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Users,
      title: t('marketing.home_features_coaches_title'),
      description: t('marketing.home_features_coaches_desc'),
      preview: FeatureCoachView,
    },
    {
      icon: Calendar,
      title: t('marketing.home_features_spring_title'),
      description: t('marketing.home_features_spring_desc'),
      preview: FeatureProgramCalendar,
    },
    {
      icon: HomeIcon,
      title: t('marketing.home_features_family_title'),
      description: t('marketing.home_features_family_desc'),
      preview: FeatureCheckoff,
    },
    {
      icon: TrendingUp,
      title: t('marketing.home_features_level_title'),
      description: t('marketing.home_features_level_desc'),
      preview: FeaturePlayerProgress,
    },
  ];

  return (
    <section className="relative py-20 lg:py-28 bg-[hsl(0,0%,96%)] overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-16 -left-24 w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl" />
      <div className="absolute bottom-16 -right-20 w-72 h-72 rounded-full bg-[hsl(213,100%,25%,0.04)] blur-3xl" />
      <div className="absolute top-1/3 right-12 w-3 h-3 rounded-full bg-primary/15 hidden lg:block" />
      <div className="absolute top-1/2 left-16 w-2 h-2 rounded-full bg-primary/10 hidden lg:block" />
      <div className="absolute bottom-1/4 right-1/3 w-2 h-2 rounded-full bg-[hsl(213,100%,25%,0.12)] hidden lg:block" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(0 0% 12%) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            {t('marketing.home_features_heading')}
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {t('marketing.home_features_description')}
          </p>
        </div>

        {/* Alternating two-column feature rows */}
        <div className="space-y-16 lg:space-y-24">
          {features.map((feature, i) => {
            const isReversed = i % 2 === 1;
            return (
              <div
                key={i}
                className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center`}
              >
                {/* Text column */}
                <div
                  className={`${
                    isReversed ? "lg:order-2" : ""
                  } text-center lg:text-left`}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 mb-6 shadow-sm">
                    <feature.icon
                      className="w-7 h-7 text-primary"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-lg text-text-secondary leading-relaxed max-w-md mx-auto lg:mx-0">
                    {feature.description}
                  </p>
                </div>

                {/* Visual column — decorative card */}
                <div
                  className={`${
                    isReversed ? "lg:order-1" : ""
                  } flex justify-center`}
                >
                  <PhoneMockup showGlow={false} className="w-56 lg:w-64">
                    <feature.preview />
                  </PhoneMockup>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
