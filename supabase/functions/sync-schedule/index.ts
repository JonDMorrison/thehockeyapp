import { parseICalDate } from "../_shared/calendarDate.ts";
import { fetchICal, isValidICalUrl } from "../_shared/calendarFeed.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ICalEvent {
  uid: string;
  summary: string;
  dtstart: Date;
  dtend: Date | null;
  location: string | null;
  status: string;
}

interface ParsedEvent {
  external_event_id: string;
  event_type: "game" | "practice" | "other";
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  is_cancelled: boolean;
}

// Parse iCal content into events
function parseICalContent(icalContent: string, defaultTimezone?: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  
  // Unfold lines first (lines starting with space/tab are continuations)
  const unfoldedContent = icalContent.replace(/\r?\n[ \t]/g, "");
  const lines = unfoldedContent.split(/\r?\n/);
  
  console.log(`[sync-schedule] Total lines in iCal: ${lines.length}`);
  
  let currentEvent: Partial<ICalEvent> | null = null;
  let eventCount = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check for event boundaries
    if (trimmedLine === "BEGIN:VEVENT") {
      currentEvent = { status: "CONFIRMED" };
      eventCount++;
      continue;
    }
    
    if (trimmedLine === "END:VEVENT" && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart) {
        events.push(currentEvent as ICalEvent);

      } else {
        throw new Error("The calendar contains an incomplete event. Your existing schedule was kept.");
      }
      currentEvent = null;
      continue;
    }
    
    // Parse key:value pairs within an event
    if (currentEvent) {
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex > 0) {
        const key = trimmedLine.slice(0, colonIndex);
        const value = trimmedLine.slice(colonIndex + 1);
        processKeyValue(currentEvent, key, value, defaultTimezone);
      }
    }
  }
  
  if (currentEvent || eventCount !== events.length) throw new Error("The calendar contains an incomplete event. Your existing schedule was kept.");

  console.log(`[sync-schedule] Found ${eventCount} VEVENT blocks, parsed ${events.length} valid events`);
  
  return events;
}

function processKeyValue(event: Partial<ICalEvent>, key: string, value: string, defaultTimezone?: string) {
  // Handle properties with parameters like DTSTART;TZID=America/New_York:20240115T180000
  const keyParts = key.split(";");
  const baseKey = keyParts[0];
  
  // Extract timezone if present
  let tzid: string | undefined;
  for (const part of keyParts) {
    if (part.startsWith("TZID=")) {
      tzid = part.substring(5);
      break;
    }
  }
  
  switch (baseKey) {
    case "UID":
      event.uid = value;
      break;
    case "SUMMARY":
      event.summary = unescapeICalValue(value);
      break;
    case "DTSTART":
      event.dtstart = parseICalDate(value, tzid || defaultTimezone);
      break;
    case "DTEND":
      event.dtend = parseICalDate(value, tzid || defaultTimezone);
      break;
    case "LOCATION":
      event.location = unescapeICalValue(value);
      break;
    case "STATUS":
      event.status = value;
      break;
  }
}

function unescapeICalValue(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

// Classify event type based on title
function classifyEventType(title: string): "game" | "practice" | "other" {
  const lower = title.toLowerCase();
  
  // Game indicators
  if (
    lower.includes(" vs ") ||
    lower.includes(" vs. ") ||
    lower.includes(" @ ") ||
    lower.includes("game") ||
    lower.includes("match") ||
    lower.includes("tournament") ||
    lower.includes("playoff") ||
    lower.includes("championship")
  ) {
    return "game";
  }
  
  // Practice indicators
  if (
    lower.includes("practice") ||
    lower.includes("training") ||
    lower.includes("skate") ||
    lower.includes("ice time") ||
    lower.includes("drill")
  ) {
    return "practice";
  }
  
  return "other";
}

// Convert ICalEvent to ParsedEvent
function convertToEvent(icalEvent: ICalEvent, sourceType: string): ParsedEvent {
  const isCancelled = icalEvent.status === "CANCELLED";
  const eventType = classifyEventType(icalEvent.summary || "");
  
  return {
    external_event_id: icalEvent.uid,
    event_type: eventType,
    title: icalEvent.summary || "Untitled Event",
    start_time: icalEvent.dtstart.toISOString(),
    end_time: icalEvent.dtend?.toISOString() || null,
    location: icalEvent.location || null,
    is_cancelled: isCancelled,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    const serviceRequest = authHeader === `Bearer ${supabaseServiceKey}`;
    let userId: string | null = null;

    if (!serviceRequest && authHeader?.startsWith("Bearer ")) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await authClient.auth.getUser(authHeader.slice(7));
      userId = user?.id ?? null;
    }

    if (!serviceRequest && !userId) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, team_id, player_id, ical_url, timezone } = await req.json();

    console.log(`[sync-schedule] Action: ${action}, Team: ${team_id}, Player: ${player_id}`);

    if (action === "preview") {
      // Preview mode: fetch and parse without saving
      if (!ical_url) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing iCal URL" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!isValidICalUrl(ical_url)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid iCal URL format" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      let icalContent: string;
      try {
        icalContent = await fetchICal(ical_url);
      } catch {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Could not fetch the calendar. Please check the URL and try again." 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      if (!icalContent.includes("BEGIN:VCALENDAR")) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "This doesn't look like a calendar file. Make sure you copied the iCal/Subscribe link." 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const icalEvents = parseICalContent(icalContent, timezone);
      const events = icalEvents.map((e) => convertToEvent(e, "teamsnap_ical"));

      // Filter future events only
      const now = new Date();
      const futureEvents = events.filter((e) => new Date(e.start_time) >= now);
      
      // Find next game and next practice
      const games = futureEvents.filter((e) => e.event_type === "game" && !e.is_cancelled);
      const practices = futureEvents.filter((e) => e.event_type === "practice" && !e.is_cancelled);
      
      games.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      practices.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      return new Response(
        JSON.stringify({
          success: true,
          total_events: events.length,
          future_events: futureEvents.length,
          next_game: games[0] || null,
          next_practice: practices[0] || null,
          games_count: games.length,
          practices_count: practices.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync") {
      // Full sync: fetch, parse, and save to database
      if (!team_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing team_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!serviceRequest) {
        const { data: role } = await supabase
          .from("team_roles")
          .select("role")
          .eq("team_id", team_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!role) {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Get the schedule source for this team
      const { data: source, error: sourceError } = await supabase
        .from("team_schedule_sources")
        .select("*")
        .eq("team_id", team_id)
        .eq("source_type", "teamsnap_ical")
        .single();

      if (sourceError || !source) {
        console.error(`[sync-schedule] No schedule source for team: ${team_id}`);
        return new Response(
          JSON.stringify({ success: false, error: "No schedule source configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Update sync status
      await supabase
        .from("team_schedule_sources")
        .update({ sync_status: "syncing", sync_error: null })
        .eq("id", source.id);

      try {
        const icalContent = await fetchICal(source.ical_url);
        const icalEvents = parseICalContent(icalContent, source.timezone);
        const events = icalEvents.map((e) => convertToEvent(e, "teamsnap_ical"));

        console.log(`[sync-schedule] Parsed ${events.length} events`);

        // Get existing events for this team
        const { data: existingEvents, error: existingError } = await supabase
          .from("team_events")
          .select("external_event_id")
          .eq("team_id", team_id)
          .eq("source_type", "teamsnap_ical");

        if (existingError) throw new Error("Could not read your saved schedule");
        const existingIds = new Set(existingEvents?.map((e) => e.external_event_id) || []);
        const newIds = new Set(events.map((e) => e.external_event_id));

        // Upsert all events
        for (const event of events) {
          const { error: upsertError } = await supabase
            .from("team_events")
            .upsert({
              team_id,
              source_type: "teamsnap_ical",
              ...event,
              updated_at: new Date().toISOString(),
            }, { 
              onConflict: "team_id,source_type,external_event_id" 
            });

          if (upsertError) {
            throw new Error("Could not save a calendar event. Your existing schedule was kept; try again.");
          }
        }

        // Mark events that no longer exist as cancelled
        const removedIds = [...existingIds].filter((id) => !newIds.has(id));
        if (removedIds.length > 0) {
          const { error: cancelError } = await supabase
            .from("team_events")
            .update({ is_cancelled: true, updated_at: new Date().toISOString() })
            .eq("team_id", team_id)
            .eq("source_type", "teamsnap_ical")
            .in("external_event_id", removedIds);
          if (cancelError) throw new Error("Could not update removed events. Please try syncing again.");
        }

        // Update sync status
        const { error: statusError } = await supabase
          .from("team_schedule_sources")
          .update({ 
            sync_status: "success", 
            sync_error: null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

        if (statusError) throw new Error("The schedule was saved, but sync confirmation failed. Please retry.");

        // Check and enable game days if auto_game_day is on
        if (source.auto_game_day) {
          await supabase.rpc("check_and_enable_game_days");
        }

        console.log(`[sync-schedule] Sync complete for team ${team_id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            synced_events: events.length,
            removed_events: removedIds.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (syncError) {
        console.error(`[sync-schedule] Sync error: ${syncError}`);
        
        await supabase
          .from("team_schedule_sources")
          .update({ 
            sync_status: "error", 
            sync_error: syncError instanceof Error ? syncError.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

        return new Response(
          JSON.stringify({ success: false, error: "Sync failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    if (action === "sync_solo") {
      // Sync solo player schedule
      if (!player_id) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing player_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      if (!serviceRequest) {
        const { data: player } = await supabase
          .from("players")
          .select("id")
          .eq("id", player_id)
          .eq("owner_user_id", userId)
          .maybeSingle();
        if (!player) {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Get the schedule source for this player
      const { data: source, error: sourceError } = await supabase
        .from("solo_schedule_sources")
        .select("*")
        .eq("player_id", player_id)
        .eq("source_type", "teamsnap_ical")
        .single();

      if (sourceError || !source) {
        console.error(`[sync-schedule] No schedule source for player: ${player_id}`);
        return new Response(
          JSON.stringify({ success: false, error: "No schedule source configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }

      // Update sync status
      await supabase
        .from("solo_schedule_sources")
        .update({ sync_status: "syncing", sync_error: null })
        .eq("id", source.id);

      try {
        const icalContent = await fetchICal(source.ical_url);
        const icalEvents = parseICalContent(icalContent, source.timezone);
        const events = icalEvents.map((e) => convertToEvent(e, "teamsnap_ical"));

        console.log(`[sync-schedule] Parsed ${events.length} events for solo player`);

        // Get existing events for this player
        const { data: existingEvents, error: existingError } = await supabase
          .from("solo_events")
          .select("external_event_id")
          .eq("player_id", player_id)
          .eq("source_type", "teamsnap_ical");

        if (existingError) throw new Error("Could not read your saved schedule");
        const existingIds = new Set(existingEvents?.map((e) => e.external_event_id) || []);
        const newIds = new Set(events.map((e) => e.external_event_id));

        // Upsert all events
        for (const event of events) {
          const { error: upsertError } = await supabase
            .from("solo_events")
            .upsert({
              player_id,
              source_type: "teamsnap_ical",
              ...event,
              updated_at: new Date().toISOString(),
            }, { 
              onConflict: "player_id,source_type,external_event_id" 
            });

          if (upsertError) {
            throw new Error("Could not save a calendar event. Your existing schedule was kept; try again.");
          }
        }

        // Mark events that no longer exist as cancelled
        const removedIds = [...existingIds].filter((id) => !newIds.has(id));
        if (removedIds.length > 0) {
          const { error: cancelError } = await supabase
            .from("solo_events")
            .update({ is_cancelled: true, updated_at: new Date().toISOString() })
            .eq("player_id", player_id)
            .eq("source_type", "teamsnap_ical")
            .in("external_event_id", removedIds);
          if (cancelError) throw new Error("Could not update removed events. Please try syncing again.");
        }

        // Update sync status
        const { error: statusError } = await supabase
          .from("solo_schedule_sources")
          .update({ 
            sync_status: "success", 
            sync_error: null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

        if (statusError) throw new Error("The schedule was saved, but sync confirmation failed. Please retry.");

        console.log(`[sync-schedule] Solo sync complete for player ${player_id}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            synced_events: events.length,
            removed_events: removedIds.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (syncError) {
        console.error(`[sync-schedule] Solo sync error: ${syncError}`);
        
        await supabase
          .from("solo_schedule_sources")
          .update({ 
            sync_status: "error", 
            sync_error: syncError instanceof Error ? syncError.message : "Unknown error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

        return new Response(
          JSON.stringify({ success: false, error: "Sync failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    if (action === "sync_all") {
      if (!serviceRequest) {
        return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Sync all teams (for cron job)
      const { data: sources, error: sourcesError } = await supabase
        .from("team_schedule_sources")
        .select("team_id")
        .eq("source_type", "teamsnap_ical");

      if (sourcesError || !sources) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch sources" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log(`[sync-schedule] Syncing ${sources.length} teams`);

      let synced = 0;
      let failed = 0;

      for (const source of sources) {
        try {
          // Call this same function recursively with sync action
          const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-schedule`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ action: "sync", team_id: source.team_id }),
          });

          if (syncResponse.ok) {
            synced++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      return new Response(
        JSON.stringify({ success: true, synced, failed }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error(`[sync-schedule] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
