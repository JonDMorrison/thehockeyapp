import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppCard } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import { format } from "date-fns";
import {
  Calendar,
  Link2,
  Check,
  ChevronDown,
  Smartphone,
  Monitor,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Trophy,
  Clock,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleSyncSectionProps {
  teamId: string;
}

interface ScheduleSource {
  id: string;
  team_id: string;
  source_type: string;
  ical_url: string;
  timezone: string;
  auto_game_day: boolean;
  include_practices: boolean;
  last_synced_at: string | null;
  sync_status: string;
  sync_error: string | null;
}

interface PreviewResult {
  success: boolean;
  total_events?: number;
  future_events?: number;
  next_game?: {
    title: string;
    start_time: string;
    location: string | null;
  } | null;
  next_practice?: {
    title: string;
    start_time: string;
    location: string | null;
  } | null;
  games_count?: number;
  practices_count?: number;
  error?: string;
}

interface TeamEvent {
  id: string;
  event_type: string;
  title: string;
  start_time: string;
  location: string | null;
  is_cancelled: boolean;
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "America/Edmonton", label: "Edmonton (MT)" },
  { value: "America/Winnipeg", label: "Winnipeg (CT)" },
];

export const ScheduleSyncSection: React.FC<ScheduleSyncSectionProps> = ({ teamId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [showSheet, setShowSheet] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [autoGameDay, setAutoGameDay] = useState(true);
  const [includePractices, setIncludePractices] = useState(true);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showPhoneInstructions, setShowPhoneInstructions] = useState(false);
  const [showDesktopInstructions, setShowDesktopInstructions] = useState(false);

  // Fetch existing schedule source
  const { data: source, isLoading: sourceLoading } = useQuery({
    queryKey: ["team-schedule-source", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_schedule_sources")
        .select("*")
        .eq("team_id", teamId)
        .eq("source_type", "teamsnap_ical")
        .maybeSingle();

      if (error) throw error;
      return data as ScheduleSource | null;
    },
  });

  // Fetch upcoming events
  const { data: upcomingEvents } = useQuery({
    queryKey: ["team-upcoming-events", teamId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("team_events")
        .select("*")
        .eq("team_id", teamId)
        .eq("is_cancelled", false)
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(5);

      if (error) throw error;
      return data as TeamEvent[];
    },
    enabled: !!source,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-schedule", {
        body: { action: "preview", ical_url: icalUrl },
      });

      if (error) throw error;
      return data as PreviewResult;
    },
    onSuccess: (data) => {
      setPreview(data);
      if (!data.success) {
        toast.error(data.error || "Failed to preview schedule");
      }
    },
    onError: (error) => {
      toast.error("Failed to preview schedule");
      console.error(error);
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("team_schedule_sources").upsert({
        team_id: teamId,
        source_type: "teamsnap_ical",
        ical_url: icalUrl,
        timezone,
        auto_game_day: autoGameDay,
        include_practices: includePractices,
        created_by_user_id: user!.id,
        sync_status: "pending",
      }, { onConflict: "team_id,source_type" });

      if (error) throw error;

      // Trigger initial sync
      await supabase.functions.invoke("sync-schedule", {
        body: { action: "sync", team_id: teamId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-schedule-source", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-upcoming-events", teamId] });
      setShowSheet(false);
      setPreview(null);
      setIcalUrl("");
      toast.success("Schedule connected!", "Events will sync automatically");
    },
    onError: (error) => {
      toast.error("Failed to connect schedule");
      console.error(error);
    },
  });

  // Sync now mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-schedule", {
        body: { action: "sync", team_id: teamId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-schedule-source", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-upcoming-events", teamId] });
      toast.success("Schedule synced");
    },
    onError: () => {
      toast.error("Sync failed");
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("team_schedule_sources")
        .delete()
        .eq("team_id", teamId)
        .eq("source_type", "teamsnap_ical");

      if (error) throw error;

      // Also delete synced events
      await supabase
        .from("team_events")
        .delete()
        .eq("team_id", teamId)
        .eq("source_type", "teamsnap_ical");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-schedule-source", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-upcoming-events", teamId] });
      toast.success("Schedule disconnected");
    },
    onError: () => {
      toast.error("Failed to disconnect");
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<ScheduleSource>) => {
      const { error } = await supabase
        .from("team_schedule_sources")
        .update(updates)
        .eq("id", source!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-schedule-source", teamId] });
      toast.success("Settings updated");
    },
  });

  const handlePreview = async () => {
    if (!icalUrl.trim()) {
      toast.error("Please paste the iCal link");
      return;
    }
    setIsPreviewing(true);
    await previewMutation.mutateAsync();
    setIsPreviewing(false);
  };

  const handleConnect = () => {
    saveMutation.mutate();
  };

  if (sourceLoading) {
    return (
      <AppCard>
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-1/3 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </AppCard>
    );
  }

  // Connected state
  if (source) {
    const nextGame = upcomingEvents?.find((e) => e.event_type === "game");
    const nextPractice = upcomingEvents?.find((e) => e.event_type === "practice");

    return (
      <AppCard>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold">TeamSnap Schedule Connected</h3>
              <p className="text-sm text-muted-foreground">
                {source.last_synced_at
                  ? `Last synced ${format(new Date(source.last_synced_at), "MMM d 'at' h:mm a")}`
                  : "Syncing..."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={cn("w-4 h-4", syncMutation.isPending && "animate-spin")} />
          </Button>
        </div>

        {source.sync_status === "error" && source.sync_error && (
          <div className="mt-3 p-3 bg-destructive/10 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{source.sync_error}</p>
          </div>
        )}

        <Separator className="my-4" />

        {/* Upcoming events */}
        <div className="space-y-3">
          {nextGame && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Trophy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{nextGame.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(nextGame.start_time), "EEE, MMM d 'at' h:mm a")}
                </p>
                {nextGame.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{nextGame.location}</span>
                  </p>
                )}
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full shrink-0">
                Next Game
              </span>
            </div>
          )}

          {nextPractice && source.include_practices && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{nextPractice.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(nextPractice.start_time), "EEE, MMM d 'at' h:mm a")}
                </p>
              </div>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full shrink-0">
                Practice
              </span>
            </div>
          )}

          {!nextGame && !nextPractice && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming events found
            </p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="font-medium">Auto Game Day Prep</Label>
              <p className="text-xs text-muted-foreground">
                Automatically enable prep mode on game days
              </p>
            </div>
            <Switch
              checked={source.auto_game_day}
              onCheckedChange={(checked) => updateSettingsMutation.mutate({ auto_game_day: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="font-medium">Show Practices</Label>
              <p className="text-xs text-muted-foreground">
                Display practice times as reminders
              </p>
            </div>
            <Switch
              checked={source.include_practices}
              onCheckedChange={(checked) => updateSettingsMutation.mutate({ include_practices: checked })}
            />
          </div>
        </div>

        <Separator className="my-4" />

        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
          onClick={() => disconnectMutation.mutate()}
          disabled={disconnectMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Disconnect Schedule
        </Button>
      </AppCard>
    );
  }

  // Not connected state
  return (
    <>
      <AppCard>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Connect Your TeamSnap Schedule</h3>
            <p className="text-sm text-muted-foreground mt-1">
              We'll automatically detect <strong>games</strong> and handle <strong>Game Day Prep</strong> for you.
            </p>
          </div>
        </div>
        <Button className="w-full mt-4" onClick={() => setShowSheet(true)}>
          <Link2 className="w-4 h-4 mr-2" />
          Connect TeamSnap Schedule
        </Button>
      </AppCard>

      {/* Connection Sheet */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Connect TeamSnap</SheetTitle>
            <SheetDescription>
              Follow these steps to sync your schedule
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Step 1: Instructions */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                  1
                </span>
                Copy your TeamSnap iCal link
              </h4>

              {/* Phone instructions */}
              <Collapsible open={showPhoneInstructions} onOpenChange={setShowPhoneInstructions}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm font-medium">On a phone (TeamSnap app)</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showPhoneInstructions && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <ol className="text-sm text-muted-foreground space-y-2 pl-4 list-decimal">
                    <li>Open <strong>TeamSnap</strong></li>
                    <li>Choose your <strong>team</strong></li>
                    <li>Tap <strong>Schedule</strong></li>
                    <li>Tap <strong>Share / Export / Subscribe</strong></li>
                    <li>Choose <strong>Subscribe (iCal)</strong></li>
                    <li>Copy the link</li>
                  </ol>
                </CollapsibleContent>
              </Collapsible>

              {/* Desktop instructions */}
              <Collapsible open={showDesktopInstructions} onOpenChange={setShowDesktopInstructions}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    <span className="text-sm font-medium">On a computer (easiest)</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", showDesktopInstructions && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <ol className="text-sm text-muted-foreground space-y-2 pl-4 list-decimal">
                    <li>Go to <strong>teamsnap.com</strong></li>
                    <li>Open your team</li>
                    <li>Click <strong>Schedule</strong></li>
                    <li>Click <strong>Subscribe / Export</strong></li>
                    <li>Copy the <strong>iCal link</strong></li>
                  </ol>
                </CollapsibleContent>
              </Collapsible>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Tip:</strong> If TeamSnap opens your calendar instead of showing a link, look for{" "}
                  <strong>"Copy iCal URL"</strong> or a link icon.
                </p>
              </div>
            </div>

            {/* Step 2: Paste URL */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                  2
                </span>
                Paste the link
              </h4>
              <Input
                placeholder="Paste TeamSnap iCal link here"
                value={icalUrl}
                onChange={(e) => {
                  setIcalUrl(e.target.value);
                  setPreview(null);
                }}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePreview}
                disabled={isPreviewing || !icalUrl.trim()}
              >
                {isPreviewing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Preview Schedule
              </Button>
            </div>

            {/* Preview result */}
            {preview && (
              <div className="space-y-3">
                {preview.success ? (
                  <>
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="font-semibold text-green-700 dark:text-green-300">
                          Found {preview.future_events} upcoming events
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {preview.next_game && (
                          <p>
                            <strong>Next game:</strong>{" "}
                            {format(new Date(preview.next_game.start_time), "EEE, MMM d 'at' h:mm a")}
                          </p>
                        )}
                        {preview.next_practice && (
                          <p>
                            <strong>Next practice:</strong>{" "}
                            {format(new Date(preview.next_practice.start_time), "EEE, MMM d 'at' h:mm a")}
                          </p>
                        )}
                        <p className="text-xs mt-2">
                          {preview.games_count} games · {preview.practices_count} practices
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Settings */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                          3
                        </span>
                        Settings
                      </h4>

                      <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <Label className="text-sm font-medium">Your timezone</Label>
                          <Select value={timezone} onValueChange={setTimezone}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <Label className="font-medium">Auto Game Day Prep</Label>
                            <p className="text-xs text-muted-foreground">
                              Automatically enable prep mode (recommended)
                            </p>
                          </div>
                          <Switch checked={autoGameDay} onCheckedChange={setAutoGameDay} />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <Label className="font-medium">Include Practices</Label>
                            <p className="text-xs text-muted-foreground">
                              Show practice times as reminders
                            </p>
                          </div>
                          <Switch checked={includePractices} onCheckedChange={setIncludePractices} />
                        </div>
                      </div>
                    </div>

                    {/* Connect button */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleConnect}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4 mr-2" />
                      )}
                      Connect Schedule
                    </Button>
                  </>
                ) : (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive">Couldn't read the calendar</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {preview.error || "Double-check that you copied the iCal / Subscribe link."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ScheduleSyncSection;