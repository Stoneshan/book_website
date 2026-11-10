import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BookCard } from "@/components/books/book-card";
import { CategoryFilter } from "@/components/books/category-filter";
import { ContinueReading } from "@/components/books/continue-reading";
import { Pagination } from "@/components/books/pagination";
import { SearchBar } from "@/components/books/search-bar";
import { SortSelect } from "@/components/books/sort-select";
import { getAllCategories, listBooks } from "@/lib/books/queries";
import type { BookSort } from "@/lib/types";

export const metadata: Metadata = {
  title: "书架",
  description: "墨阅在线书阁：搜索、分类浏览并在线阅读中文电子书。",
};

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function firstValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function parseSort(value: string): BookSort {
  return value === "title" || value === "words" ? value : "recent";
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const q = firstValue(params.q).slice(0, 80);
  const category = firstValue(params.category);
  const sort = parseSort(firstValue(params.sort));
  const page = Math.max(1, Number.parseInt(firstValue(params.page) || "1", 10) || 1);

  const [result, categories] = await Promise.all([
    listBooks({ q, category, sort, page }),
    getAllCategories(),
  ]);

  const activeCategory = categories.find((item) => item.slug === category);
  const hasFilters = Boolean(q || category);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <section className="relative mt-6 overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-[#e8f1ff] via-[#f2f7ff] to-white px-6 py-10 shadow-[0_28px_70px_-48px_rgba(43,124,246,0.55)] sm:mt-8 sm:px-12 sm:py-14">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-28 right-16 h-64 w-64 rounded-full bg-[#9cc4ff]/25 blur-3xl"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 select-none font-serif-cn text-[190px] leading-none text-brand/[0.06] lg:block"
          aria-hidden
        >
          读
        </span>

        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-[11px] font-medium text-brand ring-1 ring-brand/15 backdrop-blur">
            <Sparkles className="h-3 w-3" aria-hidden />
            新书上架 · 静心阅读
          </p>
          <h1 className="mt-5 text-balance text-[34px] font-bold leading-[1.2] tracking-tight text-ink sm:text-5xl">
            把一本书，
            <br className="sm:hidden" />
            读慢一点<span className="text-brand">。</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-ink-soft sm:text-[15px]">
            收集值得反复读的文字。支持 TXT、Markdown、EPUB、MOBI、AZW3 与 PDF，
            打开即可阅读，进度、书签与笔记都留在你的浏览器里。
          </p>
          <div className="mt-7 max-w-xl">
            <Suspense fallback={<div className="h-12 rounded-full border border-line bg-white/80" />}>
              <SearchBar />
            </Suspense>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            共 {result.total} 本
            {activeCategory ? ` · 分类「${activeCategory.name}」` : ""}
            {q ? ` · 搜索「${q}」` : ""}
          </p>
        </div>
      </section>

      <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
        <ContinueReading />

        <CategoryFilter
          categories={categories}
          active={category || undefined}
          q={q || undefined}
          sort={sort}
        />

        <section id="books" className="scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                {activeCategory ? activeCategory.name : "全部书籍"}
              </h2>
              <p className="mt-1.5 text-xs text-ink-faint">
                {hasFilters ? "筛选结果" : "慢慢挑一本，今天读几页"}
              </p>
            </div>
            <Suspense fallback={null}>
              <SortSelect value={sort} />
            </Suspense>
          </div>

          {result.books.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {result.books.map((book, index) => (
                <div
                  key={book.id}
                  className="animate-rise"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <BookCard book={book} />
                </div>
              ))}
            </div>
          ) : (
            <div className="paper-card flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-4 text-base font-medium text-ink">
                {hasFilters ? "没有找到匹配的书籍" : "书架还是空的"}
              </p>
              <p className="mt-1.5 text-sm text-ink-faint">
                {hasFilters ? "换个关键词或分类试试" : "等第一本书上架"}
              </p>
              {hasFilters ? (
                <Link
                  href="/"
                  className="mt-5 rounded-full border border-line-strong px-4 py-1.5 text-xs text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                >
                  清除筛选
                </Link>
              ) : null}
            </div>
          )}

          <Pagination
            page={result.page}
            total={result.total}
            pageSize={result.pageSize}
            q={q || undefined}
            category={category || undefined}
            sort={sort}
          />
        </section>
      </div>
    </div>
  );
}
