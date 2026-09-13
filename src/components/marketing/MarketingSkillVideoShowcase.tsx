import { Check, EyeOff, Play, Sparkles, Target } from "lucide-react";

const FEATURED_VIDEO_URL = "https://www.youtube.com/watch?v=iHHmFJ17m58";
const FEATURED_VIDEO_POSTER = "https://i.ytimg.com/vi/iHHmFJ17m58/maxresdefault.jpg";

export function MarketingSkillVideoShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0b0d11] py-16 sm:py-20 lg:py-24">
      <div className="absolute left-[58%] top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:px-8">
        <div>
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
            Built-in skill coaching
          </p>
          <h2 className="max-w-xl font-display text-4xl font-black uppercase leading-[0.94] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
            See it. Try it. <span className="text-primary">Check it off.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-7 text-white/60">
            The right short lesson appears with the drill, so players can learn the movement and get straight to work.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Matched automatically", "Never autoplays", "Easy to dismiss"].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/68"
              >
                <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={3} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <div className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-primary/20 via-transparent to-cyan-400/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[24px] border border-white/12 bg-[#08090c] p-2 shadow-[0_32px_100px_rgba(0,0,0,0.58)] sm:p-3">
            <div className="flex items-center justify-between px-2 pb-2.5 pt-1 sm:px-3">
              <div className="flex gap-1.5" aria-hidden="true">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                Player view · Today
              </span>
            </div>

            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#12151b]">
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Target className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">Today’s skill</p>
                  <p className="mt-0.5 truncate text-sm font-black text-white sm:text-base">Quick release drills</p>
                </div>
                <span className="shrink-0 rounded-md bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-white/62">
                  25 shots
                </span>
              </div>

              <a
                href={FEATURED_VIDEO_URL}
                target="_blank"
                rel="noreferrer"
                className="group relative block aspect-video overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                aria-label="Watch Hockey Canada's quick release skill video on YouTube"
              >
                <img
                  src={FEATURED_VIDEO_POSTER}
                  alt="Hockey Canada quick release video shown inside The Hockey App player experience"
                  className="h-full w-full object-cover opacity-82 transition duration-300 group-hover:scale-[1.015] group-hover:opacity-95"
                  width="1280"
                  height="720"
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/25" />
                <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/60 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-white backdrop-blur-md sm:left-4 sm:top-4">
                  Hockey Canada · 0:49
                </span>
                <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-[0_12px_35px_rgba(223,47,54,0.42)] transition-transform group-hover:scale-105 sm:h-16 sm:w-16">
                  <Play className="ml-1 h-6 w-6 fill-current sm:h-7 sm:w-7" />
                </span>
                <span className="absolute inset-x-4 bottom-3 text-sm font-black text-white sm:bottom-4 sm:text-base">
                  Shoot the puck quickly with Marie-Philip Poulin
                </span>
              </a>

              <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">Watch 60-second tip</p>
                  <p className="mt-0.5 truncate text-xs text-white/48">Recommended automatically for this drill</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-white/38">
                  <EyeOff className="h-3.5 w-3.5" />
                  Optional
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
