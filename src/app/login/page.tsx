import type { Metadata } from "next";
import Link from "next/link";
import { ReaderLoginForm } from "@/components/auth/reader-login-form";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "读者登录",
  description: "登录墨阅，继续阅读完整书籍。",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const next = safeNextPath(query.next);
  const initialError =
    query.error === "confirm" ? "确认链接无效或已过期，请重新登录。" : undefined;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-24">
        <div className="paper-card rounded-2xl p-6 text-center sm:p-8">
          <p className="text-2xl font-semibold text-ink">暂未开放登录</p>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            站点尚未配置 Supabase，公开书架与阅读器仍可正常使用。
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full border border-line bg-white px-5 py-2 text-sm text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
          >
            返回书架
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-14">
      <div className="paper-card rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-medium text-brand">读者登录</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">登录墨阅</h1>
        <p className="mt-2 text-xs leading-6 text-ink-faint">
          使用邮箱与密码登录，登录后可继续阅读完整书籍。
        </p>
        <ReaderLoginForm next={next} initialError={initialError} />
      </div>
    </div>
  );
}
