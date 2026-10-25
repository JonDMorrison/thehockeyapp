import { Link } from "react-router-dom";
import { Camera, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlayerProfilePrompt({
  player,
}: {
  player: {
    id: string;
    first_name: string;
    profile_photo_url?: string | null;
    position?: string | null;
    fav_nhl_player?: string | null;
    hockey_love?: string | null;
    season_goals?: string | null;
  };
}) {
  const missing = [
    !player.profile_photo_url && "Player photo",
    !player.position && "Position",
    !player.fav_nhl_player && "Favourite player",
    !player.hockey_love && "Why I love hockey",
    !player.season_goals && "Hockey dream",
  ].filter(Boolean);
  if (!missing.length) return null;
  return (
    <section
      aria-label="Complete your player profile"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Sparkles
          aria-hidden="true"
          className="mt-1 h-6 w-6 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">
            Your player card · Optional
          </p>
          <h2 className="mt-1 text-lg font-bold">
            Let the team meet {player.first_name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A photo and a few hockey favourites help your coaches get to know
            you.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {missing.slice(0, 3).map((label) => (
              <span
                key={String(label)}
                className="rounded-full border border-border bg-background/40 px-2.5 py-1"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!player.profile_photo_url && (
              <Button asChild variant="outline" className="min-h-11">
                <Link to={`/players/${player.id}#photo`}>
                  <Camera aria-hidden="true" className="h-4 w-4" />
                  Add player photo
                </Link>
              </Button>
            )}
            <Button asChild className="min-h-11">
              <Link to={`/players/${player.id}?edit=1`}>
                Complete player profile
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
