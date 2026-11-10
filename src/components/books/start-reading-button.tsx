"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Play } from "lucide-react";
import {
  getProgress,
  progressHref,
  progressText,
  saveProgress,
  type ProgressEntry,
} from "@/lib/reader/storage";
import { cn } from "@/lib/utils";

interface StartReadingButtonProps {
  bookId: string;
  renderMode: "text" | "pdf";
  title: string;
  author: string;
  coverUrl: string | null;
  format: string;
  className?: string;
}

export function StartReadingButton({
  bookId,
  renderMode,
  title,
  author,
  coverUrl,
  format,
  className,
}: StartReadingButtonProps) {
  const [progress, setProgress] = useState<ProgressEntry | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProgress(getProgress(bookId));
    setReady(true);
  }, [bookId]);

  const startHref = renderMode === "pdf" ? `/books/${bookId}/read/pdf` : `/books/${bookId}/read/1`;
  const resumeHref = progress ? progressHref(progress) : startHref;
  const label = progress ? "继续阅读" : "开始阅读";

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Link
        href={resumeHref}
        onClick={() => {
          if (!progress) {
            saveProgress({
              bookId,
              locator:
                renderMode === "pdf"
                  ? { kind: "pdf", page: 1, zoom: 1 }
                  : { kind: "chapter", chapterNo: 1, ratio: 0 },
              title,
              author,
              coverUrl,
              format,
            });
          }
        }}
        className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_-14px_rgba(43,124,246,0.95)] transition-colors hover:bg-brand-deep"
      >
        <Play className="h-4 w-4" aria-hidden />
        {ready ? label : "开始阅读"}
      </Link>

      {progress ? (
        <Link
          href={startHref}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          {renderMode === "pdf" ? "从第一页开始" : "从第一章开始"}
        </Link>
      ) : null}

      {progress ? (
        <span className="text-xs text-ink-faint">{progressText(progress)}</span>
      ) : null}
    </div>
  );
}
