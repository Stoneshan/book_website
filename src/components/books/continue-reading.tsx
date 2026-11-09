"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookCover } from "@/components/books/book-cover";
import {
  getRecentProgress,
  progressHref,
  progressText,
  type ProgressEntry,
} from "@/lib/reader/storage";
import { formatRelativeDate } from "@/lib/utils";

export function ContinueReading() {
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEntries(getRecentProgress(6));
    setReady(true);
  }, []);

  if (!ready || entries.length === 0) return null;

  return (
    <section aria-labelledby="continue-reading-title">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2
            id="continue-reading-title"
            className="font-serif-cn text-lg tracking-[0.18em] text-ink"
          >
            继续阅读
          </h2>
          <span className="h-px w-10 bg-line-strong" aria-hidden />
        </div>
        <span className="text-[11px] text-ink-faint">保存在本机</span>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {entries.map((entry) => (
          <Link
            key={entry.bookId}
            href={progressHref(entry)}
            className="group flex w-[260px] shrink-0 items-center gap-3 rounded-md border border-line/80 bg-card/80 p-3 transition-colors hover:border-ink/25 hover:bg-card"
          >
            <div className="w-12 shrink-0">
              <BookCover
                title={entry.title}
                author={entry.author}
                coverUrl={entry.coverUrl}
                format={entry.format}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif-cn text-sm font-semibold text-ink">
                {entry.title}
              </p>
              <p className="mt-1 text-[11px] text-vermilion">{progressText(entry)}</p>
              <p className="mt-1 text-[10px] text-ink-faint">
                {formatRelativeDate(entry.updatedAt)}
              </p>
            </div>
            <ArrowRight
              className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-vermilion"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
