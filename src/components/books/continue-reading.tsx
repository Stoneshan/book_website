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
        <h2 id="continue-reading-title" className="text-lg font-semibold tracking-tight text-ink">
          继续阅读
        </h2>
        <span className="text-[11px] text-ink-faint">保存在本机</span>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {entries.map((entry) => (
          <Link
            key={entry.bookId}
            href={progressHref(entry)}
            className="group flex w-[268px] shrink-0 items-center gap-3.5 rounded-2xl border border-line bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]"
          >
            <div className="w-14 shrink-0">
              <BookCover
                title={entry.title}
                author={entry.author}
                coverUrl={entry.coverUrl}
                format={entry.format}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{entry.title}</p>
              <p className="mt-1 text-[11px] font-medium text-brand">{progressText(entry)}</p>
              <p className="mt-1 text-[10px] text-ink-faint">
                {formatRelativeDate(entry.updatedAt)}
              </p>
            </div>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper-deep text-ink-faint transition-colors group-hover:bg-brand-soft group-hover:text-brand">
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
