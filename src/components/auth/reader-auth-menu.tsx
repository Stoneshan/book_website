"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function ReaderAuthMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        setEmail(data.session?.user.email ?? null);
        setReady(true);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        setEmail(session?.user.email ?? null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      setReady(true);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  if (pathname === "/login" || pathname.startsWith("/admin")) return null;
  if (!isSupabaseConfigured() || !ready) return null;

  if (!email) {
    return (
      <Link
        href="/login"
        className="ml-1 flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-xs text-ink-soft shadow-sm transition-colors hover:border-brand/40 hover:text-brand"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">登录</span>
      </Link>
    );
  }

  async function signOut() {
    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      setEmail(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ml-1 flex items-center gap-1 border-l border-line pl-2">
      <span
        className="flex max-w-[9rem] items-center gap-1.5 truncate text-[11px] text-ink-faint"
        title={email}
      >
        <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden truncate sm:inline">{email.split("@")[0]}</span>
      </span>
      <button
        type="button"
        onClick={signOut}
        disabled={pending}
        aria-label="退出登录"
        title="退出登录"
        className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition-colors hover:bg-paper-deep/70 hover:text-brand disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
