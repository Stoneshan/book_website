import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookOpen, FileWarning, Plus, UploadCloud } from "lucide-react";
import { AdminBookTable, type AdminBookRow } from "@/components/admin/book-table";
import { SetupNotice } from "@/components/admin/setup-notice";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isAdminAuthConfigured } from "@/lib/server-env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatWordCount } from "@/lib/utils";
import type { BookFormat, BookStatus, RenderMode } from "@/lib/types";

export const metadata: Metadata = {
  title: "后台仪表盘",
  robots: { index: false, follow: false },
};

interface RawAdminBook {
  id: string;
  title: string;
  author: string;
  cover_path: string | null;
  format: BookFormat;
  render_mode: RenderMode;
  status: BookStatus;
  chapter_count: number;
  page_count: number | null;
  word_count: number;
  created_at: string;
  parse_error: string | null;
}

export default async function AdminPage() {
  if (!isSupabaseConfigured() || !isAdminAuthConfigured()) {
    return <SetupNotice />;
  }

  const session = await requireAdmin();
  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from("books")
    .select(
      "id, title, author, cover_path, format, render_mode, status, chapter_count, page_count, word_count, created_at, parse_error",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as RawAdminBook[];

  const books: AdminBookRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author,
    coverUrl: row.cover_path
      ? row.cover_path.startsWith("/") || /^https?:/i.test(row.cover_path)
        ? row.cover_path
        : admin.storage.from("covers").getPublicUrl(row.cover_path).data.publicUrl
      : null,
    format: row.format,
    renderMode: row.render_mode,
    status: row.status,
    chapterCount: row.chapter_count,
    pageCount: row.page_count,
    wordCount: row.word_count,
    createdAt: row.created_at,
    parseError: row.parse_error,
  }));

  const ready = books.filter((book) => book.status === "ready");
  const failed = books.filter((book) => book.status === "failed");
  const pending = books.filter(
    (book) => book.status === "uploading" || book.status === "parsing",
  );
  const totalWords = ready.reduce((total, book) => total + book.wordCount, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.34em] text-vermilion">管理后台</p>
          <h1 className="mt-2 font-serif-cn text-3xl font-semibold tracking-[0.04em] text-ink">
            书库总览
          </h1>
          <p className="mt-2 text-xs text-ink-faint">
            已登录：{session.email}
          </p>
        </div>
        <Link
          href="/admin/books/new"
          className="inline-flex items-center gap-2 rounded-full bg-vermilion px-5 py-2.5 text-sm tracking-wider text-paper transition-colors hover:bg-[#8f3124]"
        >
          <Plus className="h-4 w-4" aria-hidden />
          上传新书
        </Link>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={<BookOpen className="h-4 w-4" aria-hidden />}
          label="已上架"
          value={String(ready.length)}
          hint={`共 ${books.length} 本`}
        />
        <Stat
          icon={<UploadCloud className="h-4 w-4" aria-hidden />}
          label="处理中"
          value={String(pending.length)}
          hint="上传或解析中"
        />
        <Stat
          icon={<FileWarning className="h-4 w-4" aria-hidden />}
          label="需处理"
          value={String(failed.length)}
          hint="解析失败"
          tone={failed.length > 0 ? "danger" : "normal"}
        />
        <Stat
          icon={<BookOpen className="h-4 w-4" aria-hidden />}
          label="总字数"
          value={formatWordCount(totalWords)}
          hint="已上架书籍"
        />
      </div>

      {error ? (
        <div className="mt-6 flex items-start gap-2 rounded-md border border-vermilion/20 bg-vermilion/6 px-4 py-3 text-xs text-vermilion">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          数据库读取失败：{error.message}
        </div>
      ) : null}

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif-cn text-lg tracking-[0.16em] text-ink">全部书籍</h2>
            <span className="text-[11px] text-ink-faint">
              含待上传、解析中与失败记录
            </span>
          </div>
          <Link href="/" className="text-xs text-ink-faint hover:text-vermilion">
            查看前台 →
          </Link>
        </div>
        <AdminBookTable books={books} />
      </div>

      {failed.length > 0 ? (
        <div className="mt-6 rounded-md border border-vermilion/20 bg-vermilion/5 px-4 py-3 text-xs leading-6 text-vermilion">
          有 {failed.length} 本书解析失败。打开书籍编辑页可以查看原因并重试解析。
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  tone = "normal",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "normal" | "danger";
}) {
  return (
    <div className="paper-card rounded-lg px-4 py-4">
      <div
        className={`flex items-center gap-1.5 text-[11px] tracking-wider ${
          tone === "danger" ? "text-vermilion" : "text-ink-faint"
        }`}
      >
        {icon}
        {label}
      </div>
      <p className="mt-2 font-serif-cn text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] text-ink-faint">{hint}</p>
    </div>
  );
}
