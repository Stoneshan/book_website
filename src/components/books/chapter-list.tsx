import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { CHARS_PER_PAGE } from "@/lib/reader/preview";
import type { ChapterListItem } from "@/lib/types";
import { formatWordCount } from "@/lib/utils";

interface ChapterListProps {
  bookId: string;
  chapters: ChapterListItem[];
  previewPages?: number | null;
}

function annotateLocks(chapters: ChapterListItem[], previewChars: number | null) {
  let charsBefore = 0;
  return chapters.map((chapter) => {
    const locked = previewChars !== null && charsBefore >= previewChars;
    charsBefore += Math.max(0, chapter.wordCount);
    return { chapter, locked };
  });
}

export function ChapterList({ bookId, chapters, previewPages = null }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-faint">
        本书没有章节列表。
      </p>
    );
  }

  const previewChars = previewPages === null ? null : previewPages * CHARS_PER_PAGE;
  const rows = annotateLocks(chapters, previewChars);

  return (
    <ol className="reader-scroll max-h-[26rem] overflow-y-auto rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {rows.map(({ chapter, locked }) => (
        <li key={chapter.chapterNo} className="border-b border-line/70 last:border-b-0">
            <Link
              href={`/books/${bookId}/read/${chapter.chapterNo}`}
              className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-brand-soft/60"
            >
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-ink-faint">
                {String(chapter.chapterNo).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink transition-colors group-hover:text-brand">
                {chapter.title}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-ink-faint">
                {formatWordCount(chapter.wordCount)}
                {locked ? (
                  <LockKeyhole
                    className="h-3 w-3 text-brand/70"
                    aria-label="登录后可阅读"
                  />
                ) : null}
              </span>
            </Link>
          </li>
      ))}
    </ol>
  );
}
