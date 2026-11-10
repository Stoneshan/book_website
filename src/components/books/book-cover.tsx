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
  className,
  priority = false,
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const hue = hashString(title) % 360;

  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-paper-deep",
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
          className="cover-fallback flex h-full w-full flex-col items-center justify-between px-4 py-5 text-white"
          style={{ "--cover-hue": hue } as React.CSSProperties}
        >
          <span className="cover-title font-serif-cn text-[clamp(1rem,2.1vw,1.6rem)] font-medium">
            {title.slice(0, 18)}
          </span>
          <span className="flex w-full items-end justify-between gap-2 border-t border-white/25 pt-2 text-[10px] tracking-widest text-white/80">
            <span className="truncate">{author}</span>
            <span className="font-serif-cn">墨阅</span>
          </span>
        </div>
      )}
      <span className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-black/5 ring-inset" />
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
      ? "bg-[#e54d42]/10 text-[#d13b30] border-[#e54d42]/20"
      : format === "epub"
        ? "bg-[#2f9e6e]/10 text-[#27865d] border-[#2f9e6e]/20"
        : format === "mobi" || format === "azw3"
          ? "bg-[#6b5bd2]/10 text-[#5b4bc0] border-[#6b5bd2]/20"
          : "bg-ink/5 text-ink-soft border-ink/10";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium tracking-wide",
        tone,
        className,
      )}
    >
      {formatLabel(format)}
    </span>
  );
}
