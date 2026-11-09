import Link from "next/link";
import { BookCover, FormatBadge } from "@/components/books/book-cover";
import { formatWordCount } from "@/lib/utils";
import type { BookSummary } from "@/lib/types";

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <article className="group flex flex-col">
      <Link
        href={`/books/${book.id}`}
        className="book-cover-shadow relative block rounded-[3px] transition-transform duration-300 ease-out group-hover:-translate-y-1.5"
        aria-label={`《${book.title}》${book.author}`}
      >
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          format={book.format}
        />
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-serif-cn text-[15px] font-semibold tracking-wide text-ink">
            <Link href={`/books/${book.id}`} className="hover:text-vermilion">
              {book.title}
            </Link>
          </h3>
          <p className="mt-1 truncate text-xs text-ink-faint">{book.author}</p>
        </div>
        <FormatBadge format={book.format} className="mt-0.5 shrink-0" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-faint">
        {book.categories.slice(0, 2).map((category) => (
          <span key={category.id} className="rounded-sm bg-paper-deep/70 px-1.5 py-0.5">
            {category.name}
          </span>
        ))}
        <span>
          {book.renderMode === "pdf"
            ? `${book.pageCount ?? "?"} 页`
            : `${book.chapterCount} 章`}
        </span>
        {book.renderMode === "text" && book.wordCount > 0 ? (
          <span>· {formatWordCount(book.wordCount)}</span>
        ) : null}
      </div>
    </article>
  );
}
