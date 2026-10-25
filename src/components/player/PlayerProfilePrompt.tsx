import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Camera, ArrowRight, Sparkles, X } from "lucide-react";
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
  const { user } = useAuth();
  const key = `profile-prompt:v1:${user?.id}:${player.id}`;
  const [dismissedKey, setDismissedKey] = useState("");
  const dismiss = () => {
    setDismissedKey(key);
    try {
      localStorage.setItem(key, "dismissed");
    } catch {
      /* Optional preference. */
    }
  };
  let remembered = false;
  try {
    remembered = localStorage.getItem(key) === "dismissed";
  } catch {
    /* Optional preference. */
  }
  const missing = [
    !player.profile_photo_url && "Player photo",
    !player.position && "Position",
    !player.fav_nhl_player && "Favourite player",
    !player.hockey_love && "Why I love hockey",
    !player.season_goals && "Hockey dream",
  ].filter(Boolean);
  if (!user || !missing.length || remembered || dismissedKey === key)
    return null;
  return (
    <section
      aria-label="Complete your player profile"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="order-last shrink-0 min-h-11 min-w-11"
          aria-label="Dismiss profile reminder"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        <Sparkles
          aria-hidden="true"
          className="mt-1 h-6 w-6 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary">
            Your player card · Optional
          </p>
          <h2 className="mt-1 break-words text-lg font-bold">
            Let the team meet {player.first_name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a photo, favourites and a hockey dream.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {!player.profile_photo_url && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="min-h-11 px-3 text-xs"
              >
                <Link
                  onClick={dismiss}
                  aria-label="Add player photo"
                  to={`/players/${player.id}#photo`}
                >
                  <Camera aria-hidden="true" className="h-4 w-4" />
                  Add photo
                </Link>
              </Button>
            )}
            <Button asChild size="sm" className="min-h-11 px-3 text-xs">
              <Link
                onClick={dismiss}
                aria-label="Complete player profile"
                to={`/players/${player.id}?edit=1`}
              >
                Complete profile
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
