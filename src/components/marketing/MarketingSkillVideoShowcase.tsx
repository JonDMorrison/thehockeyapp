import {
  ArrowLeft,
  Check,
  ChevronRight,
  EyeOff,
  Flame,
  Home,
  MoreHorizontal,
  Play,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

const FEATURED_VIDEO_POSTER = "https://i.ytimg.com/vi/iHHmFJ17m58/maxresdefault.jpg";

const NAV_ITEMS = [
  { label: "Home", icon: Home },
  { label: "Today", icon: Target, active: true },
  { label: "Team", icon: Users },
];

export function MarketingSkillVideoShowcase() {
  return (
    <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#0b0d11] py-16 sm:py-20 lg:py-24">
      <div className="absolute left-[62%] top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-8">
        <div>
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
            Built into every workout
          </p>
          <h2 className="max-w-xl font-display text-4xl font-black uppercase leading-[0.94] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
            See it. Try it. <span className="text-primary">Check it off.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-7 text-white/60">
            Each short tip sits directly beneath the exercise it teaches—inside the workout players are already completing.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Inside the drill", "Never autoplays", "Easy to hide"].map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/68"
              >
                <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <figure className="relative mx-auto w-full max-w-3xl">
          <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[26px] border border-white/12 bg-[#080a0e] shadow-[0_32px_100px_rgba(0,0,0,0.58)]">
            <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#0d1015] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-xs font-black text-white shadow-[0_6px_18px_rgba(223,47,54,0.3)]">
                  HA
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white">The Hockey App</p>
                  <p className="text-[9px] font-semibold text-white/38">Abbotsford Hawks</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1.5">
                <Flame className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-black text-white/70">7 day streak</span>
              </div>
            </div>

            <div className="bg-[#0b0e13] px-3 pb-3 pt-3 sm:px-5 sm:pb-4">
              <div className="mb-3 flex items-center gap-3 px-1">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/55">
                  <ArrowLeft className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white sm:text-base">Today&apos;s workout</p>
                  <p className="truncate text-[10px] font-semibold text-white/38">Development day · Saturday</p>
                </div>
                <MoreHorizontal className="h-5 w-5 text-white/38" />
              </div>

              <div className="rounded-xl border border-primary/20 bg-[radial-gradient(circle_at_top_right,rgba(239,51,59,0.16),transparent_48%),#12161d] p-3.5 sm:p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">Today&apos;s progress</p>
                    <p className="mt-1 font-display text-3xl font-black text-white">40%</p>
                  </div>
                  <span className="pb-1 text-[10px] font-bold text-white/42">2 of 5 exercises</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full w-2/5 rounded-full bg-primary" />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2.5 text-white/38">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-xs font-bold line-through">Quick hands warm-up</span>
                  <span className="text-[10px] font-semibold">5 min</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-primary/35 bg-[#13171e] shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
                  <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-white/18">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">Up next · Shooting</p>
                      <p className="truncate text-sm font-black text-white">Quick release drills</p>
                    </div>
                    <span className="rounded-md bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-white/58">25 shots</span>
                  </div>

                  <div className="mx-2.5 mb-2.5 overflow-hidden rounded-xl border border-white/10 bg-[#0a0c10] sm:mx-3 sm:mb-3">
                    <div className="grid sm:grid-cols-[0.46fr_0.54fr]">
                      <div className="relative aspect-video overflow-hidden bg-black sm:aspect-auto sm:min-h-36">
                        <img
                          src={FEATURED_VIDEO_POSTER}
                          alt="Hockey Canada quick release lesson shown inside a player's workout"
                          className="h-full w-full object-cover opacity-80"
                          width="1280"
                          height="720"
                          decoding="async"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15" />
                        <span
                          data-testid="marketing-video-preview-play"
                          className="pointer-events-none absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-primary text-white shadow-[0_10px_28px_rgba(223,47,54,0.4)]"
                          aria-hidden="true"
                        >
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        </span>
                        <span className="absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-white/80">
                          0:49
                        </span>
                      </div>

                      <div className="flex min-w-0 flex-col justify-center px-3.5 py-3 sm:px-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                            <Sparkles className="h-3.5 w-3.5" />
                          </span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/32">
                            <EyeOff className="h-3 w-3" /> Optional
                          </span>
                        </div>
                        <p className="mt-2 text-[9px] font-black uppercase tracking-[0.15em] text-primary">Watch 60-second tip</p>
                        <p className="mt-1 text-xs font-black leading-4 text-white">Shoot quickly with Marie-Philip Poulin</p>
                        <p className="mt-1.5 text-[9px] font-semibold text-white/38">Hockey Canada · Included for this drill</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#11151b] px-3 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-white/16" />
                  <span className="flex-1 text-xs font-bold text-white/72">Backhand accuracy</span>
                  <span className="text-[10px] font-semibold text-white/38">20 shots</span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/25" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_28px_rgba(223,47,54,0.25)]">
                <Trophy className="h-4 w-4" />
                Complete workout
              </div>
            </div>

            <div className="grid grid-cols-3 border-t border-white/[0.07] bg-[#0d1015] px-8 py-2.5">
              {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
                <div key={label} className={`flex flex-col items-center gap-1 ${active ? "text-primary" : "text-white/30"}`}>
                  <Icon className="h-4 w-4" />
                  <span className="text-[8px] font-black uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <figcaption className="sr-only">
            The Hockey App Today screen showing a Hockey Canada skill tip placed directly beneath its matching quick-release exercise.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
