"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, LayoutDashboard } from "lucide-react";
import { ReaderAuthMenu } from "@/components/auth/reader-auth-menu";

const navItems = [
  { href: "/", label: "书架", icon: BookOpenText },
  { href: "/#categories", label: "分类", icon: null },
  { href: "/admin", label: "管理", icon: LayoutDashboard },
];

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname.includes("/read/") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3" aria-label="墨阅首页">
          <span className="grid h-9 w-9 place-items-center rounded-[3px] bg-vermilion font-serif-cn text-lg text-paper shadow-sm transition-transform group-hover:-translate-y-0.5">
            墨
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif-cn text-xl tracking-[0.2em] text-ink">墨阅</span>
            <span className="mt-1 text-[10px] tracking-[0.32em] text-ink-faint">在线书阁</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm text-ink-soft sm:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 transition-colors hover:bg-paper-deep/70 hover:text-ink"
            >
              {item.icon ? <item.icon className="h-4 w-4" aria-hidden /> : null}
              <span className={item.icon ? "hidden sm:inline" : ""}>{item.label}</span>
            </Link>
          ))}
          <ReaderAuthMenu />
        </nav>
      </div>
    </header>
  );
}
