import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PreviewGate } from "@/components/reader/preview-gate";

interface LockedChapterProps {
  bookTitle: string;
  chapterNo: number;
  chapterTitle: string;
  detailHref: string;
  freePages: number;
  loginHref: string;
  registerHref: string;
}

export function LockedChapter({
  bookTitle,
  chapterNo,
  chapterTitle,
  detailHref,
  freePages,
  loginHref,
  registerHref,
}: LockedChapterProps) {
  return (
    <div className="reader-surface min-h-screen">
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          borderColor: "var(--reader-line)",
          backgroundColor: "color-mix(in srgb, var(--reader-panel) 90%, transparent)",
        }}
      >
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:px-6">
          <Link
            href={detailHref}
            aria-label="返回书籍详情"
            className="reader-hover grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <div className="min-w-0">
            <p
              className="hidden truncate text-[11px] sm:block"
              style={{ color: "var(--reader-muted)" }}
            >
              {bookTitle}
            </p>
            <p className="truncate text-sm font-medium">
              第 {chapterNo} 章 · {chapterTitle}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-5 pb-20 pt-16 sm:pt-24">
        <PreviewGate
          freePages={freePages}
          loginHref={loginHref}
          registerHref={registerHref}
        />
      </div>
    </div>
  );
}
