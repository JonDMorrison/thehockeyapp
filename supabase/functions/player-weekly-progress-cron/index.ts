import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { weeklyEmail } from "../_shared/weeklyEmail.ts";
serve(req => weeklyEmail(req, "parent", createClient, name => Deno.env.get(name)));
