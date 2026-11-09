import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BookSort } from "@/lib/types";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  q?: string;
  category?: string;
  sort?: BookSort;
}

function pageHref(props: PaginationProps, page: number) {
  const params = new URLSearchParams();
  if (props.q) params.set("q", props.q);
  if (props.category) params.set("category", props.category);
  if (props.sort && props.sort !== "recent") params.set("sort", props.sort);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/?${suffix}#books` : "/#books";
}

export function Pagination(props: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
  if (totalPages <= 1) return null;

  const pages = new Set<number>([1, totalPages, props.page]);
  for (let offset = -1; offset <= 1; offset += 1) {
    const candidate = props.page + offset;
    if (candidate >= 1 && candidate <= totalPages) pages.add(candidate);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="分页">
      {props.page > 1 ? (
        <Link
          href={pageHref(props, props.page - 1)}
          className="rounded-full border border-line-strong/70 px-3.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
        >
          上一页
        </Link>
      ) : null}

      {sorted.map((page, index) => (
        <span key={page} className="flex items-center gap-1.5">
          {index > 0 && page - sorted[index - 1] > 1 ? (
            <span className="px-1 text-xs text-ink-faint">…</span>
          ) : null}
          <Link
            href={pageHref(props, page)}
            aria-current={page === props.page ? "page" : undefined}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full text-xs transition-colors",
              page === props.page
                ? "bg-ink text-paper"
                : "border border-line-strong/70 text-ink-soft hover:border-ink/40 hover:text-ink",
            )}
          >
            {page}
          </Link>
        </span>
      ))}

      {props.page < totalPages ? (
        <Link
          href={pageHref(props, props.page + 1)}
          className="rounded-full border border-line-strong/70 px-3.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
        >
          下一页
        </Link>
      ) : null}
    </nav>
  );
}
