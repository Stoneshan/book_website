import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReaderRegisterForm } from "@/components/auth/reader-register-form";
import { getReaderSession } from "@/lib/auth/reader";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "注册读者账号",
  description: "注册墨阅读者账号，继续阅读完整书籍。",
  robots: { index: false, follow: false },
};

interface RegisterPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const query = await searchParams;
  const next = safeNextPath(query.next);

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-24">
        <div className="paper-card rounded-2xl p-6 text-center sm:p-8">
          <p className="text-2xl font-semibold text-ink">暂未开放注册</p>
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

  const session = await getReaderSession();
  if (session) redirect(next);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-14">
      <div className="paper-card rounded-2xl p-6 sm:p-8">
        <p className="text-xs font-medium text-brand">读者注册</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">创建墨阅账号</h1>
        <p className="mt-2 text-xs leading-6 text-ink-faint">
          注册并登录后即可继续阅读全书，书签与阅读进度仍保存在本机。
        </p>
        <ReaderRegisterForm next={next} />
      </div>
    </div>
  );
}
