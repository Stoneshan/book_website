import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";
import { SetupNotice } from "@/components/admin/setup-notice";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { isAdminAuthConfigured } from "@/lib/server-env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "分类管理",
  robots: { index: false, follow: false },
};

export default async function CategoriesPage() {
  if (!isSupabaseConfigured() || !isAdminAuthConfigured()) {
    return <SetupNotice />;
  }

  await requireAdmin();
  const admin = getSupabaseAdminClient();

  const [{ data: categories }, { data: links }] = await Promise.all([
    admin.from("categories").select("id, name, slug").order("name"),
    admin.from("book_categories").select("category_id"),
  ]);

  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    const id = link.category_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const rows: CategoryRow[] = (categories ?? []).map((category) => ({
    id: category.id as string,
    name: category.name as string,
    slug: category.slug as string,
    count: counts.get(category.id as string) ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-brand"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        返回仪表盘
      </Link>

      <div className="mt-4 mb-6">
        <p className="text-xs font-medium text-brand">分类</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          管理分类
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          分类用于书架筛选。删除分类不会删除书籍，只会移除标签关联。
        </p>
      </div>

      <CategoryManager categories={rows} />
    </div>
  );
}
