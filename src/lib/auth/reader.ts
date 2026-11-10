import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ReaderSession {
  email: string;
  userId: string;
}

export async function getReaderSession(): Promise<ReaderSession | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims) return null;
    return {
      email: String(data.claims.email ?? ""),
      userId: String(data.claims.sub ?? ""),
    };
  } catch {
    return null;
  }
}

export async function isReaderSignedIn(): Promise<boolean> {
  return Boolean(await getReaderSession());
}
