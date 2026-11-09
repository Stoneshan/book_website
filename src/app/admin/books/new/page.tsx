import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { UploadForm } from "@/components/admin/upload-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isAdminAuthConfigured } from "@/lib/server-env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Category } from "@/lib/types";

export const metadata: Metadata = {
  title: "上传新书",
  robots: { index: false, follow: false },
};

export default async function NewBookPage() {
  if (!isSupabaseConfigured() || !isAdminAuthConfigured()) {
    return <SetupNotice />;
  }

  await requireAdmin();
  const admin = getSupabaseAdminClient();
  const { data } = await admin.from("categories").select("id, name, slug").order("name");
  const categories = (data ?? []) as Category[];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-vermilion"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        返回仪表盘
      </Link>

      <div className="mt-4">
        <p className="text-[11px] tracking-[0.34em] text-vermilion">新增书籍</p>
        <h1 className="mt-2 font-serif-cn text-3xl font-semibold tracking-[0.04em] text-ink">
          上传一本书
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">
          文件会直接上传到私有存储，再由服务器解析为章节。上传完成后可在书籍页继续编辑元数据。
        </p>
      </div>

      <div className="paper-card mt-7 rounded-lg p-5 sm:p-7">
        <UploadForm categories={categories} />
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-md border border-line bg-card/50 px-4 py-3 text-[11px] leading-5 text-ink-faint">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          解析提示：TXT 支持 UTF-8 / GBK / GB18030；EPUB 会读取目录与封面；MOBI/AZW3 只保留正文与封面；
          PDF 不解析正文，使用原版页面阅读。加密或 DRM 文件会解析失败并给出提示。
        </p>
      </div>
    </div>
  );
}
