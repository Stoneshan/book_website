"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 尚未配置，无法连接存储服务。");
  }
  if (!cached) {
    cached = createBrowserClient(supabaseUrl, supabasePublishableKey);
  }
  return cached;
}
