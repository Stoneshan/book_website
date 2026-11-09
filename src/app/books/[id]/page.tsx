import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, FileText, Layers } from "lucide-react";
import { BookCover, FormatBadge } from "@/components/books/book-cover";
import { ChapterList } from "@/components/books/chapter-list";
import { StartReadingButton } from "@/components/books/start-reading-button";
import { getBookDetail } from "@/lib/books/queries";
import { formatDate, formatWordCount } from "@/lib/utils";

interface BookPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getBookDetail(id);
  if (!book) return { title: "书籍不存在" };
  return {
    title: book.title,
    description: book.description || `《${book.title}》，${book.author}。在墨阅在线阅读。`,
    openGraph: {
      title: book.title,
      description: book.description,
      type: "book",
    },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const book = await getBookDetail(id);
  if (!book) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <nav className="mb-8 flex items-center gap-2 text-xs text-ink-faint" aria-label="面包屑">
        <Link href="/" className="transition-colors hover:text-vermilion">
          书架
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-ink-soft">{book.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-14">
        <div className="mx-auto w-full max-w-[240px] lg:mx-0 lg:max-w-none">
          <div className="book-cover-shadow">
            <BookCover
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              format={book.format}
              priority
            />
          </div>
          <div className="mt-6 hidden rounded-md border border-line/70 bg-card/50 p-4 lg:block">
            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink-faint">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  格式
                </dt>
                <dd>
                  <FormatBadge format={book.format} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink-faint">
                  <Layers className="h-3.5 w-3.5" aria-hidden />
                  {book.renderMode === "pdf" ? "页数" : "章节"}
                </dt>
                <dd className="text-ink-soft">
                  {book.renderMode === "pdf" ? `${book.pageCount ?? "?"} 页` : `${book.chapterCount} 章`}
                </dd>
              </div>
              {book.renderMode === "text" ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-faint">字数</dt>
                  <dd className="text-ink-soft">{formatWordCount(book.wordCount)}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-ink-faint">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  收录
                </dt>
                <dd className="text-ink-soft">{formatDate(book.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FormatBadge format={book.format} />
            {book.categories.map((category) => (
              <Link
                key={category.id}
                href={`/?category=${category.slug}#categories`}
                className="rounded-full border border-line-strong/70 px-2.5 py-0.5 text-[10px] tracking-wider text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
              >
                {category.name}
              </Link>
            ))}
          </div>

          <h1 className="mt-4 font-serif-cn text-3xl font-semibold leading-tight tracking-[0.03em] text-ink sm:text-4xl">
            {book.title}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">{book.author}</p>

          <p className="mt-6 max-w-2xl whitespace-pre-line text-sm leading-7 text-ink-soft">
            {book.description || "这本书还没有简介。"}
          </p>

          <div className="mt-8">
            <StartReadingButton
              bookId={book.id}
              renderMode={book.renderMode}
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              format={book.format}
            />
          </div>

          <div className="mt-10 flex items-center gap-3 border-b border-line/70 pb-3">
            <h2 className="font-serif-cn text-lg tracking-[0.16em] text-ink">
              {book.renderMode === "pdf" ? "关于本书" : "目录"}
            </h2>
            <span className="text-[11px] text-ink-faint">
              {book.renderMode === "pdf"
                ? "PDF 原版页面阅读，保留排版与图表"
                : `共 ${book.chapterCount} 章`}
            </span>
          </div>

          {book.renderMode === "pdf" ? (
            <div className="mt-5 rounded-md border border-line/80 bg-card/50 p-6 text-sm leading-7 text-ink-soft">
              <p>
                本书以 PDF 原版页面呈现，支持翻页、页码跳转、缩放与页码书签。
                阅读进度会自动保存在本机浏览器。
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                {book.pageCount ? `共 ${book.pageCount} 页` : "页数未知"}
              </p>
            </div>
          ) : (
            <div className="mt-5">
              <ChapterList bookId={book.id} chapters={book.chapters} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
