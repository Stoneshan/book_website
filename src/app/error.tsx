"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-28 text-center">
      <p className="text-5xl text-brand/25">意外</p>
      <h1 className="mt-6 text-2xl tracking-[0.12em] text-ink">
        页面出了点问题
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-ink-soft">
        {error.message || "加载失败，请稍后重试。"}
      </p>
      <div className="mt-8 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm text-white transition-colors hover:bg-brand-deep"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          重试
        </button>
        <Link
          href="/"
          className="rounded-full border border-line-strong px-5 py-2 text-sm text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
        >
          返回书架
        </Link>
      </div>
    </div>
  );
}
