"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck, TriangleAlert } from "lucide-react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

export default function ConfirmPage() {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function confirm() {
      const query = new URLSearchParams(window.location.search);
      const next = safeNextPath(query.get("next"), "/");
      const code = query.get("code");
      const tokenHash = query.get("token_hash");
      const type = query.get("type") as EmailOtpType | null;

      try {
        const supabase = getSupabaseBrowserClient();
        let ok = false;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          ok = !error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
          ok = !error;
        } else {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            ok = !error;
          }
        }

        if (!active) return;

        if (ok) {
          setState("done");
          window.location.replace(next);
          return;
        }

        setState("error");
        setMessage("确认链接无效或已过期，请重新登录。");
      } catch {
        if (active) {
          setState("error");
          setMessage("确认失败，请稍后重试。");
        }
      }
    }

    void confirm();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="paper-card rounded-2xl p-8 text-center">
        {state === "loading" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand" aria-hidden />
            <p className="mt-4 text-sm text-ink-soft">正在确认邮箱…</p>
          </>
        ) : state === "done" ? (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand">
              <MailCheck className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm text-ink-soft">确认成功，正在进入阅读…</p>
          </>
        ) : (
          <>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger">
              <TriangleAlert className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm leading-6 text-ink-soft">{message}</p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-deep"
            >
              返回登录
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
