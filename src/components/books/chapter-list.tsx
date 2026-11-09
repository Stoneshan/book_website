import Link from "next/link";
import type { ChapterListItem } from "@/lib/types";
import { formatWordCount } from "@/lib/utils";

interface ChapterListProps {
  bookId: string;
  chapters: ChapterListItem[];
}

export function ChapterList({ bookId, chapters }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line-strong/70 px-4 py-8 text-center text-sm text-ink-faint">
        本书没有章节列表。
      </p>
    );
  }

  return (
    <ol className="reader-scroll max-h-[26rem] overflow-y-auto rounded-md border border-line/80 bg-card/50">
      {chapters.map((chapter) => (
        <li key={chapter.chapterNo} className="border-b border-line/60 last:border-b-0">
          <Link
            href={`/books/${bookId}/read/${chapter.chapterNo}`}
            className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-paper-deep/55"
          >
            <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-ink-faint">
              {String(chapter.chapterNo).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1 truncate font-serif-cn text-sm tracking-wide text-ink group-hover:text-vermilion">
              {chapter.title}
            </span>
            <span className="shrink-0 text-[10px] text-ink-faint">
              {formatWordCount(chapter.wordCount)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
