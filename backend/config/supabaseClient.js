// =============================================================
// Supabase Admin Client (Service Role)
// =============================================================
// Uses the SERVICE_ROLE_KEY for full database access.
// This bypasses Row Level Security — use only in trusted server code.
// NEVER expose this client or key to the frontend.
// =============================================================

import { createClient } from "@supabase/supabase-js";

const rawUrl = process.env.SUPABASE_URL;
const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "") : undefined;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY in environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
