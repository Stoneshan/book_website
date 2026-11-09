"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DemoBanner({ configured }: { configured: boolean }) {
  const pathname = usePathname();
  if (configured || pathname.includes("/read/") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="border-b border-amber-300/50 bg-amber-100/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2 text-xs text-amber-900 sm:px-6">
        <p>
          <span className="mr-2 rounded-sm bg-amber-900/85 px-1.5 py-0.5 text-[10px] tracking-widest text-amber-50">
            演示
          </span>
          正在使用内置示例内容。配置 Supabase 后即可上传书籍并使用后台。
        </p>
        <Link href="/admin" className="hidden shrink-0 underline underline-offset-4 sm:inline">
          查看配置步骤
        </Link>
      </div>
    </div>
  );
}
