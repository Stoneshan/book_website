import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

let cached: SupabaseClient | null = null;

export function getSupabasePublicClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 尚未配置。");
  }
  if (!cached) {
    cached = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return cached;
}
