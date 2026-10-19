import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Keep failed reads distinct from an empty workspace: never suggest recreating lost data. */
export function DataLoadError({ title, onRetry, retrying = false }: {
  title: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <section role="alert" className="rounded-2xl border border-border bg-card p-6 text-center">
      <WifiOff aria-hidden="true" className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Check your connection and try again to load your saved work.</p>
      <Button className="mt-5 min-h-11" onClick={onRetry} disabled={retrying}>
        <RefreshCw aria-hidden="true" className={`mr-2 h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "Trying again…" : "Try again"}
      </Button>
    </section>
  );
}
