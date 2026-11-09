import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PdfReader } from "@/components/reader/pdf-reader";
import { demoBookFileUrl, getBookDetail } from "@/lib/books/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

interface PdfReaderPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PdfReaderPageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getBookDetail(id);
  return {
    title: book ? `${book.title} · PDF 阅读` : "PDF 阅读",
    robots: { index: false, follow: false },
  };
}

async function resolvePdfUrl(bookId: string): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdminClient();
    const { data: file, error } = await admin
      .from("book_files")
      .select("storage_path")
      .eq("book_id", bookId)
      .maybeSingle();

    if (!error && file?.storage_path) {
      const { data: signed, error: signError } = await admin.storage
        .from("books")
        .createSignedUrl(file.storage_path as string, 60 * 60 * 6);

      if (!signError && signed?.signedUrl) {
        return signed.signedUrl;
      }
    }
  }

  return demoBookFileUrl(bookId);
}

export default async function PdfReaderPage({ params, searchParams }: PdfReaderPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const book = await getBookDetail(id);

  if (!book) notFound();
  if (book.renderMode !== "pdf") redirect(`/books/${book.id}/read/1`);

  const fileUrl = await resolvePdfUrl(book.id);
  if (!fileUrl) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="font-serif-cn text-2xl text-ink">PDF 暂时无法打开</p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          文件可能已下架或存储链接不可用。请返回详情页重试，或联系管理员重新上传。
        </p>
        <Link
          href={`/books/${book.id}`}
          className="mt-7 rounded-full border border-line-strong px-5 py-2 text-sm text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
        >
          返回详情
        </Link>
      </div>
    );
  }

  const rawPage = typeof query.page === "string" ? Number.parseInt(query.page, 10) : NaN;
  const initialPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : null;

  return (
    <PdfReader
      book={{
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        format: book.format,
      }}
      fileUrl={fileUrl}
      initialPage={initialPage}
      storedPageCount={book.pageCount}
    />
  );
}
