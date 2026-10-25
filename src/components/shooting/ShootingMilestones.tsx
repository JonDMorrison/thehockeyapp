import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Crosshair, Flame, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BRAND_CONFETTI_COLORS } from "@/lib/brand";
const badges = [
  {
    threshold: 1,
    name: "First Flight",
    line: "Your first shot. Your story starts here.",
    icon: Crosshair,
    color: "from-slate-600 to-slate-900",
  },
  {
    threshold: 100,
    name: "Century Sniper",
    line: "100 shots. A hundred chances to get better.",
    icon: Flame,
    color: "from-rose-700 to-slate-950",
  },
  {
    threshold: 1000,
    name: "Thousand Shot Club",
    line: "1,000 shots. You put in the work. Own this moment.",
    icon: Trophy,
    color: "from-primary to-slate-950",
  },
];
type Reward = { threshold: number; earned_at: string; unveiled: boolean };
export function ShootingMilestones({
  playerId,
  savedVersion,
}: {
  playerId: string;
  savedVersion: number;
}) {
  const reduced = useReducedMotion();
  const [reveal, setReveal] = useState<Reward[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["shooting-rewards", playerId, savedVersion],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("shooting_rewards", {
        p_player: playerId,
      });
      if (error) throw error;
      return data as unknown as Reward[];
    },
  });
  // Only saved server totals unlock rewards. Claim on a deliberate reveal, never on a draft or poll.
  const unveil = async () => {
    setError("");
    const { data, error } = await supabase.rpc("shooting_rewards", {
      p_player: playerId,
      p_claim: true,
    });
    if (error) {
      setError("Couldn’t open your badges. Try again.");
      return;
    }
    const fresh = data as unknown as Reward[];
    setIndex(0);
    setReveal(fresh.length ? fresh : query.data || []);
    void query.refetch();
  };
  const reward = reveal[index];
  const badge = badges.find((b) => b.threshold === reward?.threshold);
  useEffect(() => {
    if (!badge || reduced) return;
    const timer = setTimeout(() => {
      confetti({
        particleCount: badge.threshold === 1000 ? 180 : 90,
        spread: badge.threshold === 1 ? 55 : 100,
        origin: { y: 0.55 },
        colors: BRAND_CONFETTI_COLORS,
        disableForReducedMotion: true,
        zIndex: 100,
      });
      if (badge.threshold >= 100)
        confetti({
          particleCount: 70,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: BRAND_CONFETTI_COLORS,
          disableForReducedMotion: true,
          zIndex: 100,
        });
      if (badge.threshold === 1000)
        confetti({
          particleCount: 90,
          angle: 120,
          spread: 70,
          origin: { x: 1, y: 0.6 },
          colors: BRAND_CONFETTI_COLORS,
          disableForReducedMotion: true,
          zIndex: 100,
        });
    }, 650);
    return () => clearTimeout(timer);
  }, [badge, reduced]);
  return (
    <section
      aria-label="Shooting badges"
      className="rounded-xl border border-border bg-card p-4"
    >
      <p className="font-semibold">Your shooting milestones</p>
      <div className="my-3 grid grid-cols-3 gap-2">
        {badges.map((b) => {
          const earned = query.data?.some((r) => r.threshold === b.threshold);
          const Icon = b.icon;
          return (
            <div
              key={b.threshold}
              className={`rounded-xl border border-border p-3 text-center ${earned ? "bg-primary/10" : "opacity-60"}`}
            >
              <Icon aria-hidden className="mx-auto mb-2 h-6 w-6" />
              <p className="text-xs font-semibold">{b.name}</p>
              <p className="text-xs text-muted-foreground">
                {earned ? "Earned" : `${b.threshold.toLocaleString()} shots`}
              </p>
            </div>
          );
        })}
      </div>
      {query.isError ? (
        <Button variant="outline" onClick={() => void query.refetch()}>
          Retry shooting badges
        </Button>
      ) : (
        !!query.data?.length && (
          <Button variant="outline" onClick={() => void unveil()}>
            {query.data.some((r) => !r.unveiled)
              ? "Unveil your new badges"
              : "View your badges"}
          </Button>
        )
      )}
      <p role="status" className="text-sm">
        {error}
      </p>
      <Dialog
        open={!!badge}
        onOpenChange={(open) => {
          if (!open) setReveal([]);
        }}
      >
        <DialogContent className="overflow-hidden text-center sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Achievement unlocked</DialogTitle>
            <DialogDescription>
              A milestone built from your saved shooting practice.
            </DialogDescription>
          </DialogHeader>
          {badge && (
            <motion.div
              key={`${playerId}:${badge.threshold}`}
              initial={
                reduced
                  ? false
                  : {
                      opacity: 0,
                      scale: badge.threshold === 1000 ? 0.3 : 0.65,
                  rotate: badge.threshold === 1000 ? -20 : 0,
                      rotateY: badge.threshold === 100 ? -180 : 0,
                      y: 40,
                    }
              }
              animate={{ opacity: 1, scale: 1, rotateY: 0, rotate: 0, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 12,
                delay: 0.15,
              }}
              className="relative py-8"
            >
              <motion.div
                aria-hidden
                initial={reduced ? false : { rotate: 0 }}
                animate={reduced ? {} : { rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="pointer-events-none absolute inset-4 rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(234,46,52,.18),transparent,rgba(255,255,255,.1),transparent)] blur-xl"
              />
              <div
                className={`relative mx-auto flex h-36 w-36 items-center justify-center rounded-full border-4 border-white/30 bg-gradient-to-br ${badge.color} shadow-2xl ring-8 ring-primary/10`}
              >
                <badge.icon
                  className="h-16 w-16 text-white"
                  strokeWidth={1.5}
                />
              </div>
              <p className="relative mt-6 text-3xl font-black tracking-tight">
                {badge.name}
              </p>
              <p className="relative mx-auto mt-3 max-w-xs text-muted-foreground">
                {badge.line}
              </p>
            </motion.div>
          )}
          <Button
            onClick={() => {
              if (index + 1 < reveal.length) setIndex((i) => i + 1);
              else setReveal([]);
            }}
          >
            {index + 1 < reveal.length
              ? "Reveal next badge"
              : "Let’s keep shooting"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
