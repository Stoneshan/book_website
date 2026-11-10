"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DemoBanner({ configured }: { configured: boolean }) {
  const pathname = usePathname();
  if (configured || pathname.includes("/read/") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="border-b border-amber-200/80 bg-[#fff9e8]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-2 text-xs text-amber-900 sm:px-6">
        <p>
          <span className="mr-2 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-amber-800">
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
