"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { signInAction, type LoginState } from "@/app/admin/actions";

interface LoginFormProps {
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signInAction,
    {},
  );

  return (
    <form action={formAction} className="mt-7 space-y-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <label className="block">
        <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">管理员邮箱</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          placeholder="you@example.com"
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">密码</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
        />
      </label>

      {state.error ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand py-2.5 text-sm text-white transition-colors hover:bg-brand/85 disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        {pending ? "登录中…" : "进入后台"}
      </button>

      <p className="pt-1 text-center text-[11px] text-ink-faint">
        没有账号？管理员需在 Supabase 控制台创建。
        <Link href="/" className="ml-2 text-brand underline underline-offset-4">
          返回书架
        </Link>
      </p>
    </form>
  );
}
