"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

const options = [
  { value: "recent", label: "最近更新" },
  { value: "title", label: "书名" },
  { value: "words", label: "字数" },
];

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-faint">
      <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">排序</span>
      <select
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          if (event.target.value === "recent") params.delete("sort");
          else params.set("sort", event.target.value);
          params.delete("page");
          const suffix = params.toString();
          router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
        }}
        className="cursor-pointer rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink-soft shadow-sm outline-none transition-colors hover:border-brand/40 hover:text-brand"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
