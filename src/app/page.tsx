import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
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
      <section className="relative overflow-hidden pb-10 pt-12 sm:pb-14 sm:pt-16">
        <div
          className="pointer-events-none absolute -right-6 top-10 hidden select-none font-serif-cn text-[130px] leading-none tracking-[0.1em] text-ink/[0.035] sm:block"
          aria-hidden
        >
          书
        </div>
        <div className="relative max-w-2xl">
          <p className="mb-4 flex items-center gap-2 text-[11px] tracking-[0.42em] text-vermilion">
            <span className="inline-block h-px w-8 bg-vermilion/60" aria-hidden />
            墨阅 · 静心阅读
          </p>
          <h1 className="text-balance font-serif-cn text-4xl font-semibold leading-[1.24] tracking-[0.03em] text-ink sm:text-5xl">
            把一本书，
            <br className="sm:hidden" />
            读慢一点。
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-ink-soft">
            收集值得反复读的文字。支持 TXT、Markdown、EPUB、MOBI、AZW3 与 PDF，
            打开即可阅读，进度、书签与笔记都留在你的浏览器里。
          </p>
          <div className="mt-7 max-w-xl">
            <Suspense fallback={<div className="h-12 rounded-full border border-line bg-card/70" />}>
              <SearchBar />
            </Suspense>
          </div>
          <p className="mt-3 text-[11px] text-ink-faint">
            共 {result.total} 本
            {activeCategory ? ` · 分类「${activeCategory.name}」` : ""}
            {q ? ` · 搜索「${q}」` : ""}
          </p>
        </div>
      </section>

      <div className="space-y-12">
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
              <h2 className="font-serif-cn text-2xl tracking-[0.12em] text-ink">
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
                  style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                >
                  <BookCard book={book} />
                </div>
              ))}
            </div>
          ) : (
            <div className="paper-card flex flex-col items-center justify-center rounded-lg px-6 py-16 text-center">
              <p className="font-serif-cn text-2xl tracking-[0.2em] text-ink-faint">空</p>
              <p className="mt-3 text-sm text-ink-soft">
                {hasFilters ? "没有找到匹配的书籍" : "书架还是空的"}
              </p>
              {hasFilters ? (
                <Link
                  href="/"
                  className="mt-5 rounded-full border border-line-strong px-4 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
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
