"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck, UserPlus } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/utils";

export function ReaderRegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const target = safeNextPath(next, "/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setError("站点尚未配置 Supabase，暂时无法注册。");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 位字符。");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致。");
      return;
    }

    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(target)}`,
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();
        if (message.includes("already registered") || message.includes("already exists")) {
          setError("该邮箱已注册，请直接登录。");
        } else if (message.includes("signups not allowed") || message.includes("disabled")) {
          setError("注册暂未开放，请稍后再试或联系管理员。");
        } else {
          setError("注册失败，请稍后重试。");
        }
        return;
      }

      if (data.session) {
        router.push(target);
        router.refresh();
        return;
      }

      setDone(true);
    } catch {
      setError("注册失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mt-7 space-y-4 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand">
          <MailCheck className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-sm leading-6 text-ink-soft">
          确认邮件已发送至
          <span className="mx-1 font-medium text-ink">{email}</span>
          。点击邮件中的链接完成注册后即可登录阅读。
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(target)}`}
          className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-deep"
        >
          去登录
        </Link>
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
          autoComplete="email"
          placeholder="reader@example.com"
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">密码</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="至少 6 位字符"
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">确认密码</span>
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="再次输入密码"
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden />
        )}
        {pending ? "注册中…" : "创建账号"}
      </button>

      <p className="pt-1 text-center text-[11px] text-ink-faint">
        已有账号？
        <Link
          href={`/login?next=${encodeURIComponent(target)}`}
          className="ml-1 text-brand underline underline-offset-4"
        >
          直接登录
        </Link>
      </p>
    </form>
  );
}
