import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LockedChapter } from "@/components/reader/locked-chapter";
import { TextReader } from "@/components/reader/text-reader";
import { getReaderSession } from "@/lib/auth/reader";
import { getBookDetail, getChapterContent } from "@/lib/books/queries";
import { isSupabaseConfigured } from "@/lib/env";
import {
  FREE_PREVIEW_CHARS,
  FREE_PREVIEW_PAGES,
  previewForChapter,
  truncateHtml,
} from "@/lib/reader/preview";

interface ReaderPageProps {
  params: Promise<{ id: string; chapterNo: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: ReaderPageProps): Promise<Metadata> {
  const { id, chapterNo } = await params;
  const book = await getBookDetail(id);
  const chapter = Number.parseInt(chapterNo, 10);
  const item = book?.chapters.find((entry) => entry.chapterNo === chapter);
  return {
    title: book && item ? `${book.title} · ${item.title}` : "阅读",
    robots: { index: false, follow: false },
  };
}

export default async function ReaderPage({ params, searchParams }: ReaderPageProps) {
  const { id, chapterNo } = await params;
  const query = await searchParams;
  const book = await getBookDetail(id);

  if (!book) notFound();
  if (book.renderMode === "pdf") redirect(`/books/${book.id}/read/pdf`);

  const requested = Number.parseInt(chapterNo, 10);
  if (!Number.isFinite(requested)) notFound();

  const chapterMeta = book.chapters.find((item) => item.chapterNo === requested);
  if (!chapterMeta) notFound();

  const session = await getReaderSession();
  const previewActive = isSupabaseConfigured() && !session;
  const preview = previewActive
    ? previewForChapter(book.chapters, requested, FREE_PREVIEW_CHARS)
    : null;

  const currentPath = `/books/${book.id}/read/${chapterMeta.chapterNo}`;
  const loginHref = `/login?next=${encodeURIComponent(currentPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(currentPath)}`;

  if (preview?.locked) {
    return (
      <LockedChapter
        bookTitle={book.title}
        chapterNo={chapterMeta.chapterNo}
        chapterTitle={chapterMeta.title}
        detailHref={`/books/${book.id}`}
        freePages={FREE_PREVIEW_PAGES}
        loginHref={loginHref}
        registerHref={registerHref}
      />
    );
  }

  const loadedChapter = await getChapterContent(book.id, requested);
  if (!loadedChapter) notFound();

  const chapter = preview?.truncated
    ? {
        ...loadedChapter,
        content: truncateHtml(loadedChapter.content, preview.allowedChars ?? 0).html,
      }
    : loadedChapter;

  const index = book.chapters.findIndex((item) => item.chapterNo === chapter.chapterNo);
  const prev = index > 0 ? book.chapters[index - 1] : null;
  const next = index >= 0 && index < book.chapters.length - 1 ? book.chapters[index + 1] : null;

  return (
    <TextReader
      book={{
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        format: book.format,
        wordCount: book.wordCount,
      }}
      chapters={book.chapters}
      chapter={chapter}
      prev={prev}
      next={next}
      resume={query.resume === "1"}
      preview={
        preview
          ? {
              freePages: FREE_PREVIEW_PAGES,
              loginHref,
              registerHref,
              truncated: preview.truncated,
            }
          : null
      }
    />
  );
}
