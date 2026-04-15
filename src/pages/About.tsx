import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Button } from "@/components/ui/button";
import founderImg from "@/assets/founder-about-headshot.png";
import garageTrainingImg from "@/assets/girl-garage-training.jpg";
import kidDrivewayImg from "@/assets/kid-driveway-shooting.jpg";
import { useTranslation } from 'react-i18next';


const About: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>About — The Hockey App</title>
        <meta name="description" content="The story behind The Hockey App and why it was built for hockey families." />
        <meta property="og:title" content="About — The Hockey App" />
        <meta property="og:description" content="The story behind The Hockey App and why it was built for hockey families." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://hockeyapp.ca/about" />
        <meta property="og:image" content="https://www.hockeyapp.ca/SitePreview.png" />
      </Helmet>
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-16 bg-[hsl(0,0%,98%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-[60px] pb-20 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.08] text-foreground">
                {t('marketing.about_hero_heading_prefix')}{" "}
                <span className="bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] bg-clip-text text-transparent">
                  {t('marketing.about_hero_heading_gradient')}
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                {t('marketing.about_hero_p1')}
              </p>
              <Button
                size="lg"
                className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                asChild
              >
                <Link to="/demo">
                  {t('marketing.about_hero_button')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="rounded-2xl overflow-hidden shadow-subtle max-w-md w-full">
                <img
                  src={founderImg}
                  alt={t('marketing.about_img_alt_founder')}
                  className="w-full h-auto object-cover aspect-[4/5]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Story */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-16 items-start">
            <div className="rounded-2xl overflow-hidden shadow-subtle sticky top-24 hidden lg:block">
              <img
                src={kidDrivewayImg}
                alt={t('marketing.about_img_alt_kid_driveway')}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="space-y-6 text-base text-muted-foreground leading-relaxed">
              <h2 className="text-2xl font-bold text-foreground">{t('marketing.about_story_h2_started')}</h2>
              <p>{t('marketing.about_story_p_started1')}</p>
              <p>{t('marketing.about_story_p_started2')}</p>

              {/* Mobile-only image */}
              <div className="rounded-2xl overflow-hidden shadow-subtle lg:hidden">
                <img
                  src={kidDrivewayImg}
                  alt={t('marketing.about_img_alt_kid_driveway')}
                  className="w-full h-auto object-cover"
                />
              </div>

              <h2 className="text-2xl font-bold text-foreground pt-4">{t('marketing.about_story_h2_pattern')}</h2>
              <p>{t('marketing.about_story_p_pattern1')}</p>
              <p>{t('marketing.about_story_p_pattern2')}</p>
              <p>{t('marketing.about_story_p_pattern3')}</p>
              <p>{t('marketing.about_story_p_pattern4')}</p>

              <h2 className="text-2xl font-bold text-foreground pt-4">{t('marketing.about_story_h2_daughters')}</h2>
              <p>{t('marketing.about_story_p_daughters1')}</p>
              <p>{t('marketing.about_story_p_daughters2')}</p>

              <h2 className="text-2xl font-bold text-foreground pt-4">{t('marketing.about_story_h2_built')}</h2>
              <p>{t('marketing.about_story_p_built1')}</p>
              <p>{t('marketing.about_story_p_built2')}</p>

              <h2 className="text-2xl font-bold text-foreground pt-4">{t('marketing.about_story_h2_what_it_does')}</h2>
              <p>{t('marketing.about_story_p_what1')}</p>
              <p>{t('marketing.about_story_p_what2')}</p>

              <h2 className="text-2xl font-bold text-foreground pt-4">{t('marketing.about_story_h2_philosophy')}</h2>
              <p>{t('marketing.about_story_p_philosophy1')}</p>
              <p>{t('marketing.about_story_p_philosophy2')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 lg:py-28 bg-[hsl(0,0%,96%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="rounded-2xl overflow-hidden shadow-subtle">
              <img
                src={garageTrainingImg}
                alt={t('marketing.about_img_alt_garage')}
                className="w-full h-auto object-cover aspect-[4/5]"
              />
            </div>
            <div className="text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-[1.08] text-foreground">
                {t('marketing.about_section_cta_heading_prefix')}{" "}
                <span className="text-primary">{t('marketing.about_section_cta_heading_gradient')}</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                {t('marketing.about_section_cta_p1')}
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-10">
                {t('marketing.about_section_cta_p2')}
              </p>
              <Button
                size="lg"
                className="text-base px-10 bg-primary hover:bg-[hsl(22,85%,40%)] transition-colors text-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                asChild
              >
                <Link to="/auth">{t('marketing.about_section_cta_get_started')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default About;
