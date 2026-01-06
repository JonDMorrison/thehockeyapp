import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Calendar, Check, ChevronDown, ChevronRight, ExternalLink, 
  Loader2, RefreshCw, Smartphone, Monitor, Trash2, AlertCircle, 
  Zap, Users, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SoloScheduleSyncSectionProps {
  playerId: string;
  onConnected?: () => void;
}

interface PreviewResult {
  success: boolean;
  error?: string;
  total_events: number;
  future_events: number;
  games_count: number;
  practices_count: number;
  next_game: {
    title: string;
    start_time: string;
    location: string | null;
  } | null;
  next_practice: {
    title: string;
    start_time: string;
    location: string | null;
  } | null;
}

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
];

export function SoloScheduleSyncSection({ playerId, onConnected }: SoloScheduleSyncSectionProps) {
  const queryClient = useQueryClient();
  const [showConnectSheet, setShowConnectSheet] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [autoGameDay, setAutoGameDay] = useState(true);
  const [includePractices, setIncludePractices] = useState(true);
  const [phoneOpen, setPhoneOpen] = useState(true);
  const [computerOpen, setComputerOpen] = useState(false);

  // Fetch existing schedule source
  const { data: source, isLoading } = useQuery({
    queryKey: ["solo-schedule-source", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solo_schedule_sources")
        .select("*")
        .eq("player_id", playerId)
        .eq("source_type", "teamsnap_ical")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch upcoming events
  const { data: events } = useQuery({
    queryKey: ["solo-events", playerId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("solo_events")
        .select("*")
        .eq("player_id", playerId)
        .eq("is_cancelled", false)
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!source,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-schedule", {
        body: {
          action: "preview",
          ical_url: icalUrl,
          timezone,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as PreviewResult;
    },
    onSuccess: (result) => {
      setPreviewResult(result);
      toast.success("Schedule found!", {
        description: `${result.games_count} games, ${result.practices_count} practices`,
      });
    },
    onError: (error: Error) => {
      toast.error("Preview failed", { description: error.message });
    },
  });

  // Save/connect mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert or update the schedule source
      const { error } = await supabase
        .from("solo_schedule_sources")
        .upsert({
          player_id: playerId,
          source_type: "teamsnap_ical",
          ical_url: icalUrl,
          timezone,
          auto_game_day: autoGameDay,
          include_practices: includePractices,
          created_by_user_id: user.id,
          sync_status: "pending",
        }, { onConflict: "player_id,source_type" });

      if (error) throw error;

      // Trigger sync
      const { error: syncError } = await supabase.functions.invoke("sync-schedule", {
        body: {
          action: "sync_solo",
          player_id: playerId,
        },
      });
      if (syncError) throw syncError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solo-schedule-source", playerId] });
      queryClient.invalidateQueries({ queryKey: ["solo-events", playerId] });
      setShowConnectSheet(false);
      setIcalUrl("");
      setPreviewResult(null);
      toast.success("Schedule connected!");
      onConnected?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to connect", { description: error.message });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-schedule", {
        body: {
          action: "sync_solo",
          player_id: playerId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solo-schedule-source", playerId] });
      queryClient.invalidateQueries({ queryKey: ["solo-events", playerId] });
      toast.success("Schedule synced!");
    },
    onError: (error: Error) => {
      toast.error("Sync failed", { description: error.message });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      // Delete the schedule source
      const { error } = await supabase
        .from("solo_schedule_sources")
        .delete()
        .eq("player_id", playerId)
        .eq("source_type", "teamsnap_ical");
      if (error) throw error;

      // Delete all events
      const { error: eventsError } = await supabase
        .from("solo_events")
        .delete()
        .eq("player_id", playerId);
      if (eventsError) throw eventsError;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solo-schedule-source", playerId] });
      queryClient.invalidateQueries({ queryKey: ["solo-events", playerId] });
      toast.success("Schedule disconnected");
    },
    onError: (error: Error) => {
      toast.error("Failed to disconnect", { description: error.message });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: { auto_game_day?: boolean; include_practices?: boolean }) => {
      const { error } = await supabase
        .from("solo_schedule_sources")
        .update(updates)
        .eq("player_id", playerId)
        .eq("source_type", "teamsnap_ical");
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solo-schedule-source", playerId] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 bg-card border border-border rounded-xl animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-2" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
    );
  }

  // Connected state
  if (source) {
    return (
      <div className="space-y-4">
        {/* Connection Status */}
        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">TeamSnap Connected</h3>
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {source.last_synced_at 
                    ? `Last synced ${format(new Date(source.last_synced_at), "MMM d 'at' h:mm a")}`
                    : "Syncing..."
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Sync Error */}
          {source.sync_error && (
            <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-destructive">{source.sync_error}</span>
            </div>
          )}

          {/* Settings toggles */}
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Auto Game Day Prep</p>
                <p className="text-xs text-muted-foreground">Lighter workouts on game days</p>
              </div>
              <Switch
                checked={source.auto_game_day ?? true}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ auto_game_day: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Show Practices</p>
                <p className="text-xs text-muted-foreground">Adjust training around practice days</p>
              </div>
              <Switch
                checked={source.include_practices ?? true}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ include_practices: checked })}
              />
            </div>
          </div>

          {/* Disconnect */}
          <div className="mt-4 pt-4 border-t border-border">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect Schedule
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Schedule?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your TeamSnap connection and all synced events.
                    AI workouts will no longer adjust for games and practices.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => disconnectMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Upcoming Events Preview */}
        {events && events.length > 0 && (
          <div className="p-4 bg-card border border-border rounded-xl">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Upcoming</h4>
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className="flex items-center gap-3">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    event.event_type === "game" 
                      ? "bg-amber-500/10 text-amber-600" 
                      : "bg-blue-500/10 text-blue-600"
                  )}>
                    {event.event_type === "game" ? (
                      <Zap className="h-3.5 w-3.5" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(event.start_time), "EEE, MMM d 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not connected state
  return (
    <>
      <button
        onClick={() => setShowConnectSheet(true)}
        className="w-full p-4 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Connect Your TeamSnap Schedule</h3>
            <p className="text-sm text-muted-foreground">
              We'll adjust your training around games and practices
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>

      {/* Connect Sheet */}
      <Sheet open={showConnectSheet} onOpenChange={setShowConnectSheet}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Connect TeamSnap Schedule</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-6">
            {/* Instructions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">How to get your iCal link:</h4>
              
              {/* Phone instructions */}
              <Collapsible open={phoneOpen} onOpenChange={setPhoneOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">On Phone (TeamSnap App)</span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    phoneOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">1</span>
                    <p>Open the <strong>TeamSnap</strong> app</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">2</span>
                    <p>Select your <strong>team</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">3</span>
                    <p>Tap <strong>Schedule</strong> at the bottom</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">4</span>
                    <p>Tap the <strong>share icon</strong> (top right)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">5</span>
                    <p>Choose <strong>Subscribe (iCal)</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">6</span>
                    <p>Tap <strong>Copy Link</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">7</span>
                    <p>Come back here and paste it below</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Computer instructions */}
              <Collapsible open={computerOpen} onOpenChange={setComputerOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">On Computer (TeamSnap Website)</span>
                  </div>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    computerOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="p-3 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">1</span>
                    <p>Go to <strong>teamsnap.com</strong> and sign in</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">2</span>
                    <p>Click on your <strong>team</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">3</span>
                    <p>Go to <strong>Schedule</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">4</span>
                    <p>Click <strong>Export</strong> (top right)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">5</span>
                    <p>Right-click <strong>Subscribe</strong> and copy the link</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">6</span>
                    <p>Paste it below</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* URL Input */}
            <div>
              <Label className="text-sm font-medium">iCal URL</Label>
              <Input
                className="mt-2"
                placeholder="webcal://... or https://..."
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
              />
            </div>

            {/* Timezone */}
            <div>
              <Label className="text-sm font-medium">Your Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="mt-2">
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

            {/* Preview Button */}
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={!icalUrl || previewMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {previewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking schedule...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview Schedule
                </>
              )}
            </Button>

            {/* Preview Result */}
            {previewResult && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">Schedule Found!</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-amber-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-600" />
                      <span className="text-2xl font-bold text-amber-600">{previewResult.games_count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Upcoming games</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-600">{previewResult.practices_count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Practices</p>
                  </div>
                </div>

                {previewResult.next_game && (
                  <div className="p-2 bg-card border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">Next game:</p>
                    <p className="text-sm font-medium text-foreground">{previewResult.next_game.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(previewResult.next_game.start_time), "EEE, MMM d 'at' h:mm a")}
                    </p>
                  </div>
                )}

                {/* Settings */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Auto Game Day Prep</p>
                      <p className="text-xs text-muted-foreground">Lighter workouts on game days</p>
                    </div>
                    <Switch checked={autoGameDay} onCheckedChange={setAutoGameDay} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Include Practices</p>
                      <p className="text-xs text-muted-foreground">Adjust for practice days too</p>
                    </div>
                    <Switch checked={includePractices} onCheckedChange={setIncludePractices} />
                  </div>
                </div>
              </div>
            )}

            {/* Connect Button */}
            {previewResult && (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full"
                size="lg"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Connect Schedule
                  </>
                )}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
