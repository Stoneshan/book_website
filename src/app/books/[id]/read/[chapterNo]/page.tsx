import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TextReader } from "@/components/reader/text-reader";
import { getBookDetail, getChapterContent } from "@/lib/books/queries";

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

  const chapter = await getChapterContent(book.id, requested);
  if (!chapter) notFound();

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
    />
  );
}
