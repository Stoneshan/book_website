"use client";

import { useState } from "react";
import { cn, formatLabel } from "@/lib/utils";

interface BookCoverProps {
  title: string;
  author: string;
  coverUrl: string | null;
  format: string;
  className?: string;
  priority?: boolean;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function BookCover({
  title,
  author,
  coverUrl,
  format,
  className,
  priority = false,
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const hue = hashString(title) % 360;

  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-[3px] bg-paper-deep",
        className,
      )}
    >
      {coverUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={`《${title}》封面`}
          loading={priority ? "eager" : "lazy"}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="cover-fallback flex h-full w-full flex-col items-center justify-between px-4 py-4 text-paper"
          style={{ "--cover-hue": hue } as React.CSSProperties}
        >
          <span className="self-start rounded-[2px] border border-paper/35 px-1.5 py-0.5 text-[9px] tracking-[0.28em] text-paper/80">
            {formatLabel(format)}
          </span>
          <span className="cover-title font-serif-cn text-[clamp(1rem,2.1vw,1.6rem)] font-medium">
            {title.slice(0, 18)}
          </span>
          <span className="flex w-full items-end justify-between border-t border-paper/25 pt-2 text-[10px] tracking-widest text-paper/75">
            <span className="truncate">{author}</span>
            <span className="font-serif-cn">墨阅</span>
          </span>
        </div>
      )}
      <span className="pointer-events-none absolute inset-0 rounded-[3px] ring-1 ring-black/10 ring-inset" />
    </div>
  );
}

export function FormatBadge({
  format,
  className,
}: {
  format: string;
  className?: string;
}) {
  const tone =
    format === "pdf"
      ? "bg-[#8c3b2e]/10 text-[#8c3b2e] border-[#8c3b2e]/20"
      : format === "epub"
        ? "bg-[#3f6b52]/10 text-[#3f6b52] border-[#3f6b52]/20"
        : format === "mobi" || format === "azw3"
          ? "bg-[#5b5470]/10 text-[#5b5470] border-[#5b5470]/20"
          : "bg-ink/5 text-ink-soft border-ink/10";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-1.5 py-0.5 text-[10px] font-medium tracking-[0.16em]",
        tone,
        className,
      )}
    >
      {formatLabel(format)}
    </span>
  );
}
