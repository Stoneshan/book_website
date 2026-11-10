"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.includes("/read/") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-line/70 bg-white/50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-medium tracking-wide text-ink-soft">墨阅 · 把一本书，读慢一点</p>
        <p className="flex items-center gap-3">
          <span>书签与笔记保存在本机浏览器</span>
          <span aria-hidden>·</span>
          <Link href="/admin" className="transition-colors hover:text-brand">
            管理后台
          </Link>
        </p>
      </div>
    </footer>
  );
}
