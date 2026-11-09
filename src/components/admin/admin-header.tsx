"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, FolderTree, LayoutDashboard, LogOut, Plus } from "lucide-react";
import { signOutAction } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard, exact: true },
  { href: "/admin/books/new", label: "上传新书", icon: Plus },
  { href: "/admin/categories", label: "分类", icon: FolderTree },
];

export function AdminHeader() {
  const pathname = usePathname();
  if (pathname === "/admin/login") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/admin" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[3px] bg-ink font-serif-cn text-sm text-paper">
            墨
          </span>
          <span className="font-serif-cn text-sm tracking-[0.18em] text-ink">
            墨阅 <span className="text-ink-faint">· 后台</span>
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 text-xs text-ink-soft">
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 transition-colors",
                  active ? "bg-ink text-paper" : "hover:bg-paper-deep/70 hover:text-ink",
                )}
              >
                <link.icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            );
          })}
          <Link
            href="/"
            className="ml-1 hidden items-center gap-1.5 rounded-full px-3 py-2 transition-colors hover:bg-paper-deep/70 hover:text-ink sm:flex"
          >
            <BookOpenText className="h-3.5 w-3.5" aria-hidden />
            书架
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              aria-label="退出登录"
              title="退出登录"
              className="ml-1 grid h-8 w-8 place-items-center rounded-full text-ink-faint transition-colors hover:bg-paper-deep/70 hover:text-vermilion"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
