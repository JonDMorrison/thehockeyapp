import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, Check, Heart, Repeat2, ShieldCheck, Target, Users } from "lucide-react";
import { AboutTeamStory } from "@/components/marketing/AboutTeamStory";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { setSelectedRole } from "@/components/marketing/GetStartedModal";
import { Button } from "@/components/ui/button";
import founderImg from "@/assets/founder-about-headshot.webp";
import garageTrainingImg from "@/assets/girl-garage-training.jpg";
import kidDrivewayImg from "@/assets/kid-driveway-shooting-optimized.jpg";

export default function About() {
  const { t } = useTranslation();
  const story = [
    { icon: Target, title: "player", description: "player_description" },
    { icon: Users, title: "coach", description: "coach_description" },
    { icon: Heart, title: "dad", description: "dad_description" },
  ];
  const principles = [
    { icon: Check, title: "clarity", description: "clarity_description" },
    { icon: ShieldCheck, title: "effort", description: "effort_description" },
    { icon: Repeat2, title: "habits", description: "habits_description" },
  ];
  const copy = (key: string) => t(`marketing.about_visual_${key}`);

  return (
    <div className="marketing-performance flex min-h-screen flex-col bg-background">
      <MarketingNav />
      <main className="pt-16">
        <section aria-labelledby="about-heading" className="performance-grid relative overflow-hidden border-b border-white/10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-0 h-[640px] w-[640px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-20">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{copy("eyebrow")}</p>
              <h1 id="about-heading" className="mt-5 font-display text-5xl font-black uppercase leading-[0.97] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                {copy("hero_first")}<br /><span className="text-primary">{copy("hero_accent")}</span>
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-white/65 sm:text-lg">{copy("intro")}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <Button size="lg" className="min-h-12 font-bold" asChild><Link to="/demo#sample-workout">{copy("try")}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button>
                <a href="#founder-story" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/75 underline underline-offset-4 hover:text-white">{copy("story_link")}<ArrowDown aria-hidden="true" className="h-4 w-4" /></a>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-sm text-white/60">
                {[{ icon: Users, label: "coach_label" }, { icon: Heart, label: "dad_label" }, { icon: Target, label: "builder_label" }].map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-2"><Icon aria-hidden="true" className="h-4 w-4 text-primary" />{copy(label)}</span>
                ))}
              </div>
            </div>
            <figure className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-card shadow-2xl">
              <img src={founderImg} alt={copy("portrait_alt")} width={1140} height={1064} fetchPriority="high" decoding="async" className="aspect-[4/5] w-full object-cover object-[50%_40%]" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 border-l-2 border-primary px-6 py-6">
                <p className="font-display text-2xl font-bold text-white">Jon Morrison</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/65">{copy("portrait_caption")}</p>
              </figcaption>
            </figure>
          </div>
        </section>

        <AboutTeamStory />

        <section id="founder-story" aria-labelledby="founder-story-heading" className="scroll-mt-20 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <figure className="relative overflow-hidden rounded-2xl border border-white/10 bg-card">
                <img src={kidDrivewayImg} alt={t('marketing.about_img_alt_kid_driveway')} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover object-left lg:aspect-[4/5]" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">{copy("story_photo_label")}</p>
                  <p className="mt-2 font-display text-2xl font-bold uppercase text-white">{copy("story_photo_caption")}</p>
                </figcaption>
              </figure>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{copy("story_eyebrow")}</p>
                <h2 id="founder-story-heading" className="mt-4 font-display text-3xl font-black uppercase leading-[1.02] tracking-[-0.03em] sm:text-4xl lg:text-5xl">{copy("story_heading")}</h2>
                <ol className="mt-7 divide-y divide-white/10 border-y border-white/10">
                  {story.map(({ icon: Icon, title, description }, index) => (
                    <li key={title} className="flex gap-4 py-5">
                      <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                      <div>
                        <div className="flex items-center gap-3"><span aria-hidden="true" className="text-xs font-bold text-white/35">0{index + 1}</span><h3 className="font-display text-lg font-bold">{copy(title)}</h3></div>
                        <p className="mt-2 text-sm leading-6 text-white/60">{copy(description)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <blockquote className="relative mt-10 border-l-2 border-primary bg-primary/[0.05] px-6 py-7 sm:px-10 sm:py-9 lg:mt-14">
              <span aria-hidden="true" className="absolute right-5 top-1 font-serif text-8xl leading-none text-primary/15">“</span>
              <p className="relative max-w-4xl font-display text-2xl font-bold leading-snug text-white sm:text-3xl">{copy("quote_first")} <span className="text-primary">{copy("quote_accent")}</span></p>
              <footer className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/50">{copy("quote_credit")}</footer>
            </blockquote>
          </div>
        </section>

        <section aria-labelledby="about-beliefs-heading" className="border-y border-white/10 bg-[#111319] py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{copy("beliefs_eyebrow")}</p><h2 id="about-beliefs-heading" className="mt-4 font-display text-3xl font-black uppercase leading-[1.02] tracking-[-0.03em] sm:text-4xl lg:text-5xl">{copy("beliefs_first")}<br /><span className="text-white/50">{copy("beliefs_accent")}</span></h2></div>
              <p className="max-w-xs text-sm leading-6 text-white/60">{copy("beliefs_intro")}</p>
            </div>
            <div className="mt-8 grid gap-7 border-t border-white/10 pt-7 sm:grid-cols-3 sm:gap-8">
              {principles.map(({ icon: Icon, title, description }) => <article key={title}><Icon aria-hidden="true" className="mb-4 h-6 w-6 text-primary" /><h3 className="font-display text-lg font-bold">{copy(title)}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-white/60">{copy(description)}</p></article>)}
            </div>
          </div>
        </section>

        <section aria-labelledby="about-builder-heading" className="py-10 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16 lg:px-8">
            <div><p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{copy("builder_eyebrow")}</p><h2 id="about-builder-heading" className="mt-3 font-display text-2xl font-bold sm:text-3xl">{copy("builder_heading")}</h2></div>
            <p className="max-w-xl text-sm leading-7 text-white/60">{copy("builder_description")}</p>
          </div>
        </section>

        <section aria-labelledby="about-start-heading" className="relative isolate overflow-hidden border-t border-white/10 bg-black">
          <img src={garageTrainingImg} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[65%_center] opacity-65" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/15" />
          <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{copy("start_eyebrow")}</p>
              <h2 id="about-start-heading" className="mt-4 font-display text-4xl font-black uppercase leading-[0.98] tracking-[-0.03em] sm:text-5xl lg:text-6xl">{copy("start_first")}<br /><span className="text-primary">{copy("start_accent")}</span></h2>
              <p className="mt-5 max-w-md text-base leading-7 text-white/70">{copy("start_description")}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="min-h-12 font-bold"><Link to="/auth?mode=signup" onClick={() => setSelectedRole("coach")}>{copy("start_team")}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button>
                <Button asChild size="lg" variant="outline" className="min-h-12 border-white/25 bg-black/30 font-bold text-white hover:bg-white/10"><Link to="/auth?mode=signup" onClick={() => setSelectedRole("solo")}>{copy("start_child")}</Link></Button>
              </div>
              <p className="mt-4 text-xs text-white/55">{copy("free")}</p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
