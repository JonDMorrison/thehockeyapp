import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are generating draft training checklists for youth hockey that will be reviewed by a coach before being published to players and parents.

CRITICAL RULES:
1. Output MUST be valid JSON matching the schema exactly
2. Do NOT include technique coaching, medical advice, or player comparisons
3. Keep task labels generic, simple, and action-oriented (e.g., "Wrist shots", "Wall sits", "Stretching")
4. Prefer balanced routines: shooting + light conditioning + mobility
5. Respect the time budget and tier level
6. For conditioning, keep it light and age-appropriate
7. Never suggest dangerous exercises or high-impact activities

TASK TYPES: shooting, conditioning, mobility, recovery, prep, other
TARGET TYPES: reps, seconds, minutes, none
SHOT TYPES (only for shooting tasks): wrist, snap, slap, backhand, mixed, none

Tier guidelines:
- rec: Shorter sessions, fewer reps, focus on fun and basics
- rep: Standard sessions, moderate intensity, balanced training
- elite: Longer sessions, higher volume, more focused drills

IMPORTANT: All output must be valid JSON only. No markdown, no explanations, just the JSON object.`;

const DAY_CARD_SCHEMA = {
  title: "string",
  notes: "string (optional, adult-facing)",
  tier: "rec|rep|elite",
  estimated_minutes: "number",
  tasks: [
    {
      task_type: "shooting|conditioning|mobility|recovery|prep|other",
      label: "string",
      target_type: "reps|seconds|minutes|none",
      target_value: "number|null",
      shot_type: "wrist|snap|slap|backhand|mixed|none",
      shots_expected: "number|null",
      is_required: "boolean"
    }
  ]
};

const WEEK_PLAN_SCHEMA = {
  name: "string",
  tier: "rec|rep|elite",
  start_date: "YYYY-MM-DD",
  days: [
    {
      date: "YYYY-MM-DD",
      title: "string",
      notes: "string (optional)",
      estimated_minutes: "number",
      tasks: "same as day card tasks array"
    }
  ]
};

interface GenerateRequest {
  type: "day_card" | "week_plan";
  team_id?: string;
  player_id?: string;
  date?: string; // for day_card
  start_date?: string; // for week_plan
  tier: "rec" | "rep" | "elite";
  time_budget: number; // minutes
  days_per_week?: number; // for week_plan
  focus_areas?: string[];
  keep_simple?: boolean;
  schedule_events?: Array<{
    date: string;
    event_type: "game" | "practice";
  }>;
}

function validateDayCard(output: any): boolean {
  if (!output || typeof output !== "object") return false;
  if (typeof output.title !== "string") return false;
  if (!["rec", "rep", "elite"].includes(output.tier)) return false;
  if (typeof output.estimated_minutes !== "number") return false;
  if (!Array.isArray(output.tasks)) return false;
  
  const validTaskTypes = ["shooting", "conditioning", "mobility", "recovery", "prep", "other"];
  const validTargetTypes = ["reps", "seconds", "minutes", "none"];
  const validShotTypes = ["wrist", "snap", "slap", "backhand", "mixed", "none"];
  
  for (const task of output.tasks) {
    if (!validTaskTypes.includes(task.task_type)) return false;
    if (typeof task.label !== "string" || !task.label) return false;
    if (!validTargetTypes.includes(task.target_type)) return false;
    if (!validShotTypes.includes(task.shot_type)) return false;
    if (typeof task.is_required !== "boolean") return false;
  }
  
  return true;
}

// Normalize task output from AI to ensure required fields exist
function normalizeTask(task: any): any {
  const validTaskTypes = ["shooting", "conditioning", "mobility", "recovery", "prep", "other"];
  const validShotTypes = ["wrist", "snap", "slap", "backhand", "mixed", "none"];
  
  // Handle "type" vs "task_type" mismatch from AI
  const taskType = task.task_type || task.type;
  const normalizedTaskType = validTaskTypes.includes(taskType) ? taskType : "other";
  
  // Default shot_type based on task type
  let shotType = task.shot_type || "none";
  if (!validShotTypes.includes(shotType)) {
    shotType = normalizedTaskType === "shooting" ? "mixed" : "none";
  }
  
  return {
    task_type: normalizedTaskType,
    label: task.label || "Task",
    target_type: ["reps", "seconds", "minutes", "none"].includes(task.target_type) ? task.target_type : "none",
    target_value: typeof task.target_value === "number" ? task.target_value : null,
    shot_type: shotType,
    shots_expected: typeof task.shots_expected === "number" ? task.shots_expected : null,
    is_required: typeof task.is_required === "boolean" ? task.is_required : true,
  };
}

// Normalize entire week plan output
function normalizeWeekPlan(output: any): any {
  if (!output || !Array.isArray(output.days)) return output;
  
  return {
    ...output,
    days: output.days.map((day: any) => ({
      ...day,
      tasks: Array.isArray(day.tasks) ? day.tasks.map(normalizeTask) : [],
    })),
  };
}

function validateWeekPlan(output: any): boolean {
  if (!output || typeof output !== "object") return false;
  if (typeof output.name !== "string") return false;
  if (!["rec", "rep", "elite"].includes(output.tier)) return false;
  if (typeof output.start_date !== "string") return false;
  if (!Array.isArray(output.days)) return false;
  
  for (const day of output.days) {
    if (!day.date || !day.title || !Array.isArray(day.tasks)) return false;
    // After normalization, tasks should be valid - just check basic structure
    for (const task of day.tasks) {
      if (typeof task.label !== "string" || !task.label) return false;
    }
  }
  
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("generate-workout-ai: Starting request processing");
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("generate-workout-ai: Auth header present, getting user");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("generate-workout-ai: User auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("generate-workout-ai: User authenticated:", user.id);

    const body: GenerateRequest = await req.json();
    console.log("generate-workout-ai: Request body:", JSON.stringify(body));
    const { type, team_id, player_id, date, start_date, tier, time_budget, days_per_week, focus_areas, keep_simple, schedule_events } = body;

    // For solo players without team_id, skip team role verification
    let allowedTaskTypes = ["shooting", "mobility", "conditioning", "recovery", "prep"];
    let trainingMode = "balanced";
    let effectiveTier = tier;

    if (team_id) {
      // Verify user is team adult
      const { data: teamRole, error: roleError } = await supabase
        .from("team_roles")
        .select("role")
        .eq("team_id", team_id)
        .eq("user_id", user.id)
        .single();

      if (roleError || !teamRole) {
        console.log("generate-workout-ai: Team role check failed for team", team_id, "user", user.id, "error:", roleError?.message);
        return new Response(JSON.stringify({ error: "Not authorized for this team" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("generate-workout-ai: Team role verified:", teamRole.role);

      // Fetch team training preferences
      const { data: preferences } = await supabase
        .from("team_training_preferences")
        .select("training_mode, allowed_task_types, default_tier, use_ai_assist")
        .eq("team_id", team_id)
        .maybeSingle();

      // Use preferences if available
      effectiveTier = tier || preferences?.default_tier || "rep";
      allowedTaskTypes = preferences?.allowed_task_types || allowedTaskTypes;
      trainingMode = preferences?.training_mode || "balanced";
    } else if (player_id) {
      // For solo players, verify ownership
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("id, owner_user_id")
        .eq("id", player_id)
        .eq("owner_user_id", user.id)
        .single();

      if (playerError || !playerData) {
        return new Response(JSON.stringify({ error: "Not authorized for this player" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build constraint hints based on training mode
    let modeHint = "";
    if (trainingMode === "shooting_only") {
      modeHint = "FOCUS ONLY ON SHOOTING TASKS. Do not include conditioning, mobility, or recovery. Keep it very simple: just shooting drills and shot counts.";
    } else if (trainingMode === "balanced") {
      modeHint = "Include a balanced mix of shooting, mobility, and prep tasks. Light conditioning optional.";
    } else if (trainingMode === "performance") {
      modeHint = "Include comprehensive training: shooting, conditioning, mobility, and recovery. Higher volume and intensity.";
    }

    // Build schedule-aware hints
    let scheduleHint = "";
    if (schedule_events && schedule_events.length > 0) {
      const gameDays = schedule_events.filter(e => e.event_type === "game").map(e => e.date);
      const practiceDays = schedule_events.filter(e => e.event_type === "practice").map(e => e.date);
      
      scheduleHint = `
IMPORTANT SCHEDULE CONSTRAINTS:
- Game days (${gameDays.join(", ")}): Create LIGHT "Game Day Prep" routines - only quick prep, visualization, and light mobility. Max 15 minutes.
- Practice days (${practiceDays.join(", ")}): Create REDUCED workouts - player already has ice time. Focus on recovery/light mobility. Max 15 minutes.
- Day BEFORE a game: Reduce intensity, avoid heavy conditioning. Focus on technique and mental prep.
- Day AFTER a game: Recovery-focused with light stretching and mobility.
For non-game/practice days, create normal training sessions.`;
    }

    // Build the user prompt based on type
    let userPrompt: string;
    let schema: any;

    if (type === "day_card") {
      schema = DAY_CARD_SCHEMA;
      userPrompt = `Generate a single day practice card with the following constraints:
- Date: ${date}
- Tier: ${effectiveTier}
- Time budget: ${time_budget} minutes
- Allowed task types: ${allowedTaskTypes.join(", ")}
- Focus areas: ${focus_areas?.join(", ") || "based on allowed types"}
${modeHint}
${scheduleHint}
${keep_simple ? "- Keep it simple with 2-4 tasks" : "- Include 4-6 varied tasks"}

Output the JSON matching this exact schema:
${JSON.stringify(schema, null, 2)}`;
    } else {
      schema = WEEK_PLAN_SCHEMA;
      userPrompt = `Generate a weekly training plan with the following constraints:
- Start date: ${start_date}
- Tier: ${effectiveTier}
- Time budget per day: ${time_budget} minutes
- Days per week: ${days_per_week || 5}
- Allowed task types: ${allowedTaskTypes.join(", ")}
- Focus areas: ${focus_areas?.join(", ") || "based on allowed types"}
${modeHint}
${scheduleHint}
${keep_simple ? "- Keep each day simple with 2-4 tasks" : "- Include 4-6 varied tasks per day"}

Output the JSON matching this exact schema:
${JSON.stringify(schema, null, 2)}`;
    }

    console.log("Generating workout with prompt:", userPrompt);

    // Call AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("AI Gateway error");
    }

    const aiData = await aiResponse.json();
    let outputText = aiData.choices?.[0]?.message?.content || "";
    
    console.log("AI raw output:", outputText);

    // Clean up the response - remove markdown code blocks if present
    outputText = outputText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let outputJson: any;
    try {
      outputJson = JSON.parse(outputText);
    } catch (parseError) {
      console.error("Failed to parse AI output:", parseError);
      
      // Store failed generation only if we have a team_id
      if (team_id) {
        await supabase.from("ai_generations").insert({
          team_id,
          created_by_user_id: user.id,
          generation_type: type,
          input_json: body,
          output_json: null,
          status: "failed",
          error: "Invalid JSON output from AI",
        });
      }
      
      return new Response(JSON.stringify({ error: "Couldn't generate a valid draft. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize and validate output
    if (type === "week_plan") {
      outputJson = normalizeWeekPlan(outputJson);
    }
    
    const isValid = type === "day_card" ? validateDayCard(outputJson) : validateWeekPlan(outputJson);
    
    if (!isValid) {
      console.error("Validation failed for AI output");
      
      // Store failed generation only if we have a team_id
      if (team_id) {
        await supabase.from("ai_generations").insert({
          team_id,
          created_by_user_id: user.id,
          generation_type: type,
          input_json: body,
          output_json: outputJson,
          status: "failed",
          error: "Output validation failed",
        });
      }
      
      return new Response(JSON.stringify({ error: "Generated plan didn't meet requirements. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store successful generation only if we have a team_id
    let generationId: string | undefined;
    if (team_id) {
      const { data: generation, error: insertError } = await supabase
        .from("ai_generations")
        .insert({
          team_id,
          created_by_user_id: user.id,
          generation_type: type,
          input_json: body,
          output_json: outputJson,
          status: "draft",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to store generation:", insertError);
      } else {
        generationId = generation?.id;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: outputJson,
      generation_id: generationId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-workout-ai:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
