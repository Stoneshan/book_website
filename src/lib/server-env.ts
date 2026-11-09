import "server-only";

import { getAdminEmails } from "@/lib/auth/allowlist";

const secretKey = (
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  ""
).trim();

export function getSupabaseSecretKey(): string {
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not configured.");
  }
  return secretKey;
}

export function isAdminAuthConfigured(): boolean {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim() &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        "").trim() &&
      secretKey &&
      getAdminEmails().length > 0,
  );
}
