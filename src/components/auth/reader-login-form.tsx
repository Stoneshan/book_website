"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function ReaderLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    let active = true;
    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (!active) return;
        setSessionEmail(data.session?.user.email ?? null);
        setReady(true);
      });
    } catch {
      setReady(true);
    }
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isSupabaseConfigured()) {
      setError("站点尚未配置 Supabase，暂时无法登录。");
      return;
    }
    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError("邮箱或密码错误。");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("登录失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      setSessionEmail(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <div className="mt-8 flex items-center justify-center gap-2 text-sm text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        正在检查登录状态…
      </div>
    );
  }

  if (sessionEmail) {
    return (
      <div className="mt-7 space-y-5">
        <div className="rounded-md border border-line bg-paper-deep/35 px-4 py-3 text-sm text-ink-soft">
          当前已登录：
          <span className="ml-1 font-medium text-ink">{sessionEmail}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-ink px-5 py-2 text-sm tracking-wider text-paper transition-colors hover:bg-ink/85"
          >
            进入书架
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 text-sm text-ink-soft transition-colors hover:border-vermilion/40 hover:text-vermilion disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            退出登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">邮箱</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="username"
          placeholder="reader@example.com"
          className="w-full rounded-md border border-line-strong bg-card/80 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-vermilion/50"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">密码</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-md border border-line-strong bg-card/80 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-vermilion/50"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-vermilion/20 bg-vermilion/6 px-3 py-2 text-xs text-vermilion">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-vermilion py-2.5 text-sm tracking-widest text-paper transition-colors hover:bg-[#8f3124] disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        {pending ? "登录中…" : "登录"}
      </button>

      <div className="rounded-md border border-line bg-paper-deep/30 px-3 py-2.5 text-[11px] leading-5 text-ink-faint">
        当前为临时账号阶段，读者注册功能将在后续开放。书签与笔记仍保存在本机浏览器。
      </div>

      <p className="pt-1 text-center text-[11px] text-ink-faint">
        <Link href="/" className="text-vermilion underline underline-offset-4">
          返回书架
        </Link>
      </p>
    </form>
  );
}
