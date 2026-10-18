import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Heart, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import teamHuddle from "@/assets/brand/team-huddle-v2.jpg";

export function AboutTeamStory() {
  const { t } = useTranslation();
  const steps = [
    { icon: ClipboardList, title: 'marketing.about_teams_coach_title', description: 'marketing.about_teams_coach_description' },
    { icon: Target, title: 'marketing.about_teams_player_title', description: 'marketing.about_teams_player_description' },
    { icon: Heart, title: 'marketing.about_teams_family_title', description: 'marketing.about_teams_family_description' },
  ];

  return (
    <section aria-labelledby="why-teams-heading" className="relative overflow-hidden border-y border-white/10 bg-[#0b0d11] py-12 sm:py-16 lg:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-0 h-[480px] w-[480px] rounded-full bg-primary/10 blur-[100px]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
              <span aria-hidden="true" className="h-px w-8 bg-primary" />
              {t('marketing.about_why_teams_h2')}
            </p>
            <h2 id="why-teams-heading" className="mt-5 font-display text-4xl font-black uppercase leading-[0.98] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              {t('marketing.about_teams_heading_first')}<br />
              <span className="text-primary">{t('marketing.about_teams_heading_accent')}</span>
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-white/65 sm:text-lg">
              {t('marketing.about_teams_intro')}
            </p>
            <Link to="/demo#sample-workout" className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-bold text-white underline decoration-primary decoration-2 underline-offset-8 transition-colors hover:text-primary focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              {t('marketing.about_teams_action')}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <figure className="relative overflow-hidden rounded-2xl border border-white/10 bg-background">
            <img src={teamHuddle} alt={t('marketing.about_teams_photo_alt')} loading="lazy" decoding="async" width={800} height={500} className="aspect-[8/5] w-full object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 px-5 py-5 sm:px-7 sm:py-6">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/65">{t('marketing.about_teams_caption_label')}</p>
              <p className="mt-2 max-w-xs font-display text-xl font-bold uppercase leading-tight text-white sm:text-2xl">{t('marketing.about_teams_caption')}</p>
            </figcaption>
          </figure>
        </div>
        <ol className="mt-10 grid gap-6 border-t border-white/15 pt-7 sm:grid-cols-3 sm:gap-7 lg:mt-12">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="flex items-start gap-4 sm:block">
              <div className="flex shrink-0 items-center gap-3 sm:mb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <span aria-hidden="true" className="hidden font-display text-sm font-black tracking-wider text-white/35 sm:inline">0{index + 1}</span>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">{t(title)}</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/60">{t(description)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
