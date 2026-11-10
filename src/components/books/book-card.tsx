import Link from "next/link";
import { BookCover, FormatBadge } from "@/components/books/book-cover";
import { formatWordCount } from "@/lib/utils";
import type { BookSummary } from "@/lib/types";

export function BookCard({ book }: { book: BookSummary }) {
  return (
    <article className="group flex flex-col">
      <Link
        href={`/books/${book.id}`}
        className="book-cover-shadow relative block rounded-lg transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_36px_-16px_rgba(15,23,42,0.4)]"
        aria-label={`《${book.title}》${book.author}`}
      >
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.coverUrl}
          format={book.format}
        />
        <FormatBadge
          format={book.format}
          className="absolute left-2 top-2 border-white/50 bg-white/90 text-ink-soft shadow-sm backdrop-blur"
        />
      </Link>

      <div className="mt-3 min-w-0">
        <h3 className="truncate text-[15px] font-medium leading-6 text-ink">
          <Link href={`/books/${book.id}`} className="transition-colors hover:text-brand">
            {book.title}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-faint">{book.author}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-faint">
        {book.categories.slice(0, 2).map((category) => (
          <span key={category.id} className="rounded-full bg-paper-deep px-2 py-0.5">
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
