"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
} from "@/app/admin/actions";
import { cn } from "@/lib/utils";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("请填写分类名称。");
      return;
    }
    setCreating(true);
    try {
      const result = await createCategoryAction({ name: name.trim(), slug: slug.trim() });
      if (!result.ok) {
        setError(result.error || "创建失败。");
        return;
      }
      setName("");
      setSlug("");
      flash("分类已创建");
      router.refresh();
    } catch {
      setError("创建失败，请稍后重试。");
    } finally {
      setCreating(false);
    }
  }

  async function rename(id: string) {
    setError("");
    setBusyId(id);
    try {
      const result = await renameCategoryAction({
        id,
        name: editName.trim(),
        slug: editSlug.trim(),
      });
      if (!result.ok) {
        setError(result.error || "更新失败。");
        return;
      }
      setEditingId(null);
      flash("分类已更新");
      router.refresh();
    } catch {
      setError("更新失败，请稍后重试。");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(category: CategoryRow) {
    if (
      !window.confirm(
        `确定删除分类「${category.name}」吗？${
          category.count > 0 ? `有 ${category.count} 本书会失去这个分类标签。` : ""
        }`,
      )
    ) {
      return;
    }
    setError("");
    setBusyId(category.id);
    try {
      const result = await deleteCategoryAction(category.id);
      if (!result.ok) {
        setError(result.error || "删除失败。");
        return;
      }
      flash("分类已删除");
      router.refresh();
    } catch {
      setError("删除失败，请稍后重试。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="paper-card rounded-lg p-5">
        <h2 className="font-serif-cn text-lg tracking-[0.14em] text-ink">新建分类</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            placeholder="分类名称，例如：古典文学"
            className="w-full rounded-md border border-line-strong bg-card/80 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-vermilion/50 sm:flex-1"
          />
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
            maxLength={80}
            placeholder="slug（可选，英文小写）"
            className="w-full rounded-md border border-line-strong bg-card/80 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-vermilion/50 sm:w-56"
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-xs text-paper transition-colors hover:bg-ink/85 disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-3.5 w-3.5" aria-hidden />
            )}
            创建
          </button>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-ink-faint">
          slug 用于筛选链接（/?category=slug）。留空时会根据英文名称生成；纯中文名会自动生成编号 slug。
        </p>
      </form>

      {error ? (
        <p className="rounded-md border border-vermilion/20 bg-vermilion/6 px-3 py-2 text-xs text-vermilion">
          {error}
        </p>
      ) : null}

      <div className="paper-card overflow-hidden rounded-lg">
        <div className="border-b border-line bg-paper-deep/40 px-4 py-3 text-[11px] tracking-wider text-ink-faint">
          共 {categories.length} 个分类
        </div>
        {categories.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ink-faint">还没有分类。</p>
        ) : (
          <ul>
            {categories.map((category) => {
              const editing = editingId === category.id;
              const busy = busyId === category.id;
              return (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center gap-3 border-b border-line/70 px-4 py-3 last:border-b-0"
                >
                  {editing ? (
                    <>
                      <input
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        className="w-44 rounded-md border border-line-strong bg-card px-2.5 py-1.5 text-sm outline-none focus:border-vermilion/50"
                        aria-label="分类名称"
                      />
                      <input
                        value={editSlug}
                        onChange={(event) => setEditSlug(event.target.value.toLowerCase())}
                        className="w-40 rounded-md border border-line-strong bg-card px-2.5 py-1.5 text-xs outline-none focus:border-vermilion/50"
                        aria-label="分类 slug"
                      />
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => rename(category.id)}
                          disabled={busy}
                          aria-label="保存分类"
                          className="grid h-8 w-8 place-items-center rounded-full text-[#3f6b52] hover:bg-[#3f6b52]/10 disabled:opacity-40"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Check className="h-4 w-4" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          aria-label="取消编辑"
                          className="grid h-8 w-8 place-items-center rounded-full text-ink-faint hover:bg-paper-deep"
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif-cn text-sm text-ink">{category.name}</p>
                        <p className="mt-0.5 text-[10px] text-ink-faint">
                          {category.slug} · {category.count} 本书
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditName(category.name);
                          setEditSlug(category.slug);
                          setError("");
                        }}
                        aria-label="编辑分类"
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-faint transition-colors hover:bg-paper-deep hover:text-ink"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(category)}
                        disabled={busy}
                        aria-label="删除分类"
                        className={cn(
                          "grid h-8 w-8 place-items-center rounded-full text-ink-faint transition-colors hover:bg-vermilion/8 hover:text-vermilion disabled:opacity-40",
                        )}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs text-paper shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
