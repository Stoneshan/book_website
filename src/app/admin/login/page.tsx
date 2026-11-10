import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getAdminClaims } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isAdminAuthConfigured } from "@/lib/server-env";

export const metadata: Metadata = {
  title: "管理员登录",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;

  if (!isSupabaseConfigured() || !isAdminAuthConfigured()) {
    return <SetupNotice />;
  }

  const admin = await getAdminClaims();
  if (admin) redirect("/admin");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="paper-card rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-medium text-brand">管理后台</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">登录墨阅</h1>
        <p className="mt-2 text-xs leading-6 text-ink-faint">
          使用 Supabase Auth 管理员账号登录。仅 ADMIN_EMAILS 中的邮箱可进入。
        </p>
        <LoginForm next={query.next} />
      </div>
    </div>
  );
}
