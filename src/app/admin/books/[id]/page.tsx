import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EditBookForm } from "@/components/admin/edit-book-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isAdminAuthConfigured } from "@/lib/server-env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { BookFormat, BookStatus, Category, RenderMode } from "@/lib/types";

export const metadata: Metadata = {
  title: "编辑书籍",
  robots: { index: false, follow: false },
};

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBookPage({ params }: EditPageProps) {
  if (!isSupabaseConfigured() || !isAdminAuthConfigured()) {
    return <SetupNotice />;
  }

  await requireAdmin();
  const { id } = await params;
  const admin = getSupabaseAdminClient();

  const { data: book } = await admin.from("books").select("*").eq("id", id).maybeSingle();
  if (!book) notFound();

  const [{ data: file }, { data: categoriesData }, { data: links }] = await Promise.all([
    admin
      .from("book_files")
      .select("original_name, bytes")
      .eq("book_id", id)
      .maybeSingle(),
    admin.from("categories").select("id, name, slug").order("name"),
    admin.from("book_categories").select("category_id").eq("book_id", id),
  ]);

  const coverPath = book.cover_path as string | null;
  const coverUrl = coverPath
    ? coverPath.startsWith("/") || /^https?:/i.test(coverPath)
      ? coverPath
      : admin.storage.from("covers").getPublicUrl(coverPath).data.publicUrl
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        返回仪表盘
      </Link>

      <div className="mt-4 mb-6">
        <p className="text-xs font-medium text-brand">书籍详情</p>
        <h1 className="mt-2 truncate text-2xl font-bold tracking-tight text-ink">
          {book.title}
        </h1>
        <p className="mt-2 text-xs text-ink-faint">
          {book.author} · {book.format?.toUpperCase?.() ?? ""}
        </p>
      </div>

      <EditBookForm
        book={{
          id: book.id as string,
          title: book.title as string,
          author: book.author as string,
          description: (book.description as string) ?? "",
          coverUrl,
          format: book.format as BookFormat,
          renderMode: book.render_mode as RenderMode,
          status: book.status as BookStatus,
          chapterCount: (book.chapter_count as number) ?? 0,
          pageCount: (book.page_count as number | null) ?? null,
          wordCount: (book.word_count as number) ?? 0,
          createdAt: book.created_at as string,
          parseError: (book.parse_error as string | null) ?? null,
        }}
        categories={(categoriesData ?? []) as Category[]}
        selectedCategoryIds={(links ?? []).map((link) => link.category_id as string)}
        originalName={(file?.original_name as string | null) ?? null}
        fileBytes={(file?.bytes as number | null) ?? null}
      />
    </div>
  );
}
