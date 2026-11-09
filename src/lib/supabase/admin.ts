import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";
import { getSupabaseSecretKey } from "@/lib/server-env";

let cached: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error("Supabase 尚未配置。");
  }
  if (!cached) {
    cached = createClient(supabaseUrl, getSupabaseSecretKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return cached;
}
