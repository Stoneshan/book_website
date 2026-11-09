import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BookSort, Category } from "@/lib/types";

interface CategoryFilterProps {
  categories: Category[];
  active?: string;
  q?: string;
  sort?: BookSort;
}

function buildHref(options: CategoryFilterProps & { slug?: string }) {
  const params = new URLSearchParams();
  if (options.q) params.set("q", options.q);
  if (options.slug) params.set("category", options.slug);
  if (options.sort && options.sort !== "recent") params.set("sort", options.sort);
  const suffix = params.toString();
  return suffix ? `/?${suffix}#categories` : "/#categories";
}

export function CategoryFilter({ categories, active, q, sort }: CategoryFilterProps) {
  return (
    <section id="categories" className="scroll-mt-24">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-serif-cn text-lg tracking-[0.18em] text-ink">分类</h2>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Link
          href={buildHref({ categories, q, sort })}
          className={cn(
            "shrink-0 rounded-full border px-4 py-1.5 text-xs tracking-wider transition-colors",
            !active
              ? "border-ink bg-ink text-paper"
              : "border-line-strong/70 bg-card/70 text-ink-soft hover:border-ink/40 hover:text-ink",
          )}
        >
          全部
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={buildHref({ categories, q, sort, slug: category.slug })}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-xs tracking-wider transition-colors",
              active === category.slug
                ? "border-ink bg-ink text-paper"
                : "border-line-strong/70 bg-card/70 text-ink-soft hover:border-ink/40 hover:text-ink",
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
