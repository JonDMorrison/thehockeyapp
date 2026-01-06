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

// Timezone offset map for common North American timezones
const TIMEZONE_OFFSETS: Record<string, number> = {
  "America/Los_Angeles": -8,
  "America/Vancouver": -8,
  "America/Denver": -7,
  "America/Phoenix": -7,
  "America/Chicago": -6,
  "America/New_York": -5,
  "America/Toronto": -5,
  "US/Pacific": -8,
  "US/Mountain": -7,
  "US/Central": -6,
  "US/Eastern": -5,
  "Pacific": -8,
  "PST": -8,
  "PDT": -7,
  "MST": -7,
  "MDT": -6,
  "CST": -6,
  "CDT": -5,
  "EST": -5,
  "EDT": -4,
};

// Check if date falls in DST for North American timezones
function isDST(date: Date, baseOffset: number): boolean {
  // DST in North America: Second Sunday in March to First Sunday in November
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // March: Find second Sunday
  const marchFirst = new Date(Date.UTC(year, 2, 1));
  const marchFirstDay = marchFirst.getUTCDay();
  const secondSunday = marchFirstDay === 0 ? 8 : 15 - marchFirstDay;
  
  // November: Find first Sunday
  const novFirst = new Date(Date.UTC(year, 10, 1));
  const novFirstDay = novFirst.getUTCDay();
  const firstSunday = novFirstDay === 0 ? 1 : 8 - novFirstDay;
  
  // DST starts at 2am on second Sunday in March (becomes 3am)
  // DST ends at 2am on first Sunday in November (becomes 1am)
  if (month > 2 && month < 10) return true; // April-October
  if (month === 2 && day > secondSunday) return true; // After March DST start
  if (month === 2 && day === secondSunday) return true; // Simplified: count the day as DST
  if (month === 10 && day < firstSunday) return true; // Before November DST end
  
  return false;
}

// Parse iCal date/time format
function parseICalDate(dateStr: string, tzid?: string): Date {
  // Handle formats: 20240115T180000Z, 20240115T180000, 20240115
  const cleaned = dateStr.replace(/[^0-9TZ]/g, "");
  
  if (cleaned.length === 8) {
    // Date only: YYYYMMDD - treat as local midnight
    const year = parseInt(cleaned.slice(0, 4));
    const month = parseInt(cleaned.slice(4, 6)) - 1;
    const day = parseInt(cleaned.slice(6, 8));
    // For date-only, use noon UTC to avoid date boundary issues
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }
  
  // DateTime format: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
  const year = parseInt(cleaned.slice(0, 4));
  const month = parseInt(cleaned.slice(4, 6)) - 1;
  const day = parseInt(cleaned.slice(6, 8));
  const hour = parseInt(cleaned.slice(9, 11)) || 0;
  const minute = parseInt(cleaned.slice(11, 13)) || 0;
  const second = parseInt(cleaned.slice(13, 15)) || 0;
  
  if (cleaned.endsWith("Z")) {
    // Already UTC
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }
  
  // If we have a timezone identifier, apply the offset
  if (tzid) {
    const baseOffset = TIMEZONE_OFFSETS[tzid];
    if (baseOffset !== undefined) {
      // Create a preliminary date to check DST
      const prelimDate = new Date(Date.UTC(year, month, day, hour, minute, second));
      const dstActive = isDST(prelimDate, baseOffset);
      // DST adds 1 hour, so offset is less negative
      const actualOffset = dstActive ? baseOffset + 1 : baseOffset;
      // Convert local time to UTC by subtracting the offset
      return new Date(Date.UTC(year, month, day, hour - actualOffset, minute, second));
    }
    console.log(`[sync-schedule] Unknown timezone: ${tzid}, treating as UTC`);
  }
  
  // No timezone info - assume Pacific Time as default for TeamSnap
  const prelimDate = new Date(Date.UTC(year, month, day, hour, minute, second));
  const dstActive = isDST(prelimDate, -8);
  const actualOffset = dstActive ? -7 : -8;
  console.log(`[sync-schedule] No timezone for date ${dateStr}, assuming Pacific (offset: ${actualOffset})`);
  return new Date(Date.UTC(year, month, day, hour - actualOffset, minute, second));
}

// Parse iCal content into events
function parseICalContent(icalContent: string): ICalEvent[] {
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
        console.log(`[sync-schedule] Parsed event: ${currentEvent.summary} @ ${currentEvent.dtstart}`);
      } else {
        console.log(`[sync-schedule] Skipped incomplete event: uid=${currentEvent.uid}, dtstart=${currentEvent.dtstart}`);
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
        processKeyValue(currentEvent, key, value);
      }
    }
  }
  
  console.log(`[sync-schedule] Found ${eventCount} VEVENT blocks, parsed ${events.length} valid events`);
  
  return events;
}

function processKeyValue(event: Partial<ICalEvent>, key: string, value: string) {
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
      event.dtstart = parseICalDate(value, tzid);
      console.log(`[sync-schedule] Parsed DTSTART: ${value} (tzid: ${tzid}) -> ${event.dtstart?.toISOString()}`);
      break;
    case "DTEND":
      event.dtend = parseICalDate(value, tzid);
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

// Validate iCal URL
function isValidICalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // TeamSnap iCal URLs typically look like:
    // https://go.teamsnap.com/.../.ics or webcal://...
    if (parsed.protocol === "webcal:") {
      return true;
    }
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return url.includes(".ics") || url.includes("teamsnap") || url.includes("ical");
    }
    return false;
  } catch {
    return false;
  }
}

// Normalize webcal:// to https://
function normalizeICalUrl(url: string): string {
  if (url.startsWith("webcal://")) {
    return url.replace("webcal://", "https://");
  }
  return url;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

      const normalizedUrl = normalizeICalUrl(ical_url);

      // Fetch the iCal feed
      console.log(`[sync-schedule] Fetching iCal from: ${normalizedUrl}`);
      const icalResponse = await fetch(normalizedUrl, {
        headers: { "User-Agent": "HockeyTraining/1.0" },
      });

      if (!icalResponse.ok) {
        console.error(`[sync-schedule] Failed to fetch iCal: ${icalResponse.status}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Could not fetch the calendar. Please check the URL and try again." 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const icalContent = await icalResponse.text();
      
      // Debug: Log first 500 chars of iCal content
      console.log(`[sync-schedule] iCal content preview: ${icalContent.slice(0, 500)}`);
      console.log(`[sync-schedule] iCal total length: ${icalContent.length} chars`);
      
      if (!icalContent.includes("BEGIN:VCALENDAR")) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "This doesn't look like a calendar file. Make sure you copied the iCal/Subscribe link." 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const icalEvents = parseICalContent(icalContent);
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
        const normalizedUrl = normalizeICalUrl(source.ical_url);
        
        console.log(`[sync-schedule] Syncing team ${team_id} from ${normalizedUrl}`);
        const icalResponse = await fetch(normalizedUrl, {
          headers: { "User-Agent": "HockeyTraining/1.0" },
        });

        if (!icalResponse.ok) {
          throw new Error(`Failed to fetch iCal: ${icalResponse.status}`);
        }

        const icalContent = await icalResponse.text();
        const icalEvents = parseICalContent(icalContent);
        const events = icalEvents.map((e) => convertToEvent(e, "teamsnap_ical"));

        console.log(`[sync-schedule] Parsed ${events.length} events`);

        // Get existing events for this team
        const { data: existingEvents } = await supabase
          .from("team_events")
          .select("external_event_id")
          .eq("team_id", team_id)
          .eq("source_type", "teamsnap_ical");

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
            console.error(`[sync-schedule] Failed to upsert event: ${upsertError.message}`);
          }
        }

        // Mark events that no longer exist as cancelled
        const removedIds = [...existingIds].filter((id) => !newIds.has(id));
        if (removedIds.length > 0) {
          await supabase
            .from("team_events")
            .update({ is_cancelled: true, updated_at: new Date().toISOString() })
            .eq("team_id", team_id)
            .eq("source_type", "teamsnap_ical")
            .in("external_event_id", removedIds);
        }

        // Update sync status
        await supabase
          .from("team_schedule_sources")
          .update({ 
            sync_status: "success", 
            sync_error: null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

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
        const normalizedUrl = normalizeICalUrl(source.ical_url);
        
        console.log(`[sync-schedule] Syncing player ${player_id} from ${normalizedUrl}`);
        const icalResponse = await fetch(normalizedUrl, {
          headers: { "User-Agent": "HockeyTraining/1.0" },
        });

        if (!icalResponse.ok) {
          throw new Error(`Failed to fetch iCal: ${icalResponse.status}`);
        }

        const icalContent = await icalResponse.text();
        const icalEvents = parseICalContent(icalContent);
        const events = icalEvents.map((e) => convertToEvent(e, "teamsnap_ical"));

        console.log(`[sync-schedule] Parsed ${events.length} events for solo player`);

        // Get existing events for this player
        const { data: existingEvents } = await supabase
          .from("solo_events")
          .select("external_event_id")
          .eq("player_id", player_id)
          .eq("source_type", "teamsnap_ical");

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
            console.error(`[sync-schedule] Failed to upsert solo event: ${upsertError.message}`);
          }
        }

        // Mark events that no longer exist as cancelled
        const removedIds = [...existingIds].filter((id) => !newIds.has(id));
        if (removedIds.length > 0) {
          await supabase
            .from("solo_events")
            .update({ is_cancelled: true, updated_at: new Date().toISOString() })
            .eq("player_id", player_id)
            .eq("source_type", "teamsnap_ical")
            .in("external_event_id", removedIds);
        }

        // Update sync status
        await supabase
          .from("solo_schedule_sources")
          .update({ 
            sync_status: "success", 
            sync_error: null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", source.id);

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