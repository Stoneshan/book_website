"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [value, setValue] = useState(query);

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    if (value === query) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      params.delete("page");
      const suffix = params.toString();
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value, query, pathname, router, searchParams]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    params.delete("page");
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  }

  return (
    <form
      onSubmit={submit}
      className="group relative flex w-full items-center gap-2 rounded-full border border-line-strong/80 bg-card/90 px-4 py-2.5 shadow-[0_10px_30px_-22px_rgba(43,33,18,0.5)] transition-colors focus-within:border-vermilion/45"
      role="search"
    >
      <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="搜索书名或作者，例如「鲁迅」"
        aria-label="搜索书籍"
        className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint/80"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="清空搜索"
          className="grid h-6 w-6 place-items-center rounded-full text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
      <button
        type="submit"
        className="hidden shrink-0 rounded-full bg-ink px-3.5 py-1.5 text-xs tracking-wider text-paper transition-colors hover:bg-ink/85 sm:block"
      >
        搜索
      </button>
    </form>
  );
}
