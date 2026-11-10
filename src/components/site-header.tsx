"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText } from "lucide-react";
import { ReaderAuthMenu } from "@/components/auth/reader-auth-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "书架", active: (pathname: string) => pathname === "/" },
  { href: "/#categories", label: "分类", active: () => false },
  { href: "/admin", label: "管理", active: (pathname: string) => pathname.startsWith("/admin") },
];

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname.includes("/read/") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="墨阅首页">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-[0_6px_16px_-8px_rgba(43,124,246,0.9)] transition-transform group-hover:-translate-y-0.5">
            <BookOpenText className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="text-[19px] font-semibold tracking-tight text-ink">墨阅</span>
        </Link>

        <nav className="flex items-center gap-0.5 text-sm sm:gap-1">
          {navItems.map((item) => {
            const active = item.active(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3 py-2 transition-colors sm:px-4",
                  active
                    ? "bg-brand-soft font-medium text-brand"
                    : "text-ink-soft hover:bg-paper-deep/70 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ReaderAuthMenu />
        </div>
      </div>
    </header>
  );
}
