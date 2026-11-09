import "server-only";

import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/auth/allowlist";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminSession {
  email: string;
  userId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}

export async function getAdminClaims(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return null;
    const email = String(data.claims.email ?? "");
    const userId = String(data.claims.sub ?? "");
    if (!isAdminEmail(email)) return null;
    return { email, userId, supabase };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdminClaims();
  if (!admin) redirect("/admin/login");
  return admin;
}
