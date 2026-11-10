"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";
import { deleteBookAction, updateBookAction } from "@/app/admin/actions";
import { BookCover, FormatBadge } from "@/components/books/book-cover";
import { StatusBadge } from "@/components/admin/status-badge";
import type { BookFormat, BookStatus, Category, RenderMode } from "@/lib/types";
import { cn, formatDate, formatLabel, formatWordCount } from "@/lib/utils";

interface EditFormProps {
  book: {
    id: string;
    title: string;
    author: string;
    description: string;
    coverUrl: string | null;
    format: BookFormat;
    renderMode: RenderMode;
    status: BookStatus;
    chapterCount: number;
    pageCount: number | null;
    wordCount: number;
    createdAt: string;
    parseError: string | null;
  };
  categories: Category[];
  selectedCategoryIds: string[];
  originalName: string | null;
  fileBytes: number | null;
}

export function EditBookForm({
  book,
  categories,
  selectedCategoryIds,
  originalName,
  fileBytes,
}: EditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [description, setDescription] = useState(book.description);
  const [selected, setSelected] = useState<string[]>(selectedCategoryIds);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("书名不能为空。");
      return;
    }
    setSaving(true);
    try {
      const result = await updateBookAction({
        bookId: book.id,
        title: title.trim(),
        author: author.trim(),
        description: description.trim(),
        categoryIds: selected,
      });
      if (!result.ok) {
        setError(result.error || "保存失败。");
        return;
      }
      flash("已保存");
      router.refresh();
    } catch {
      setError("保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function retryParse() {
    setError("");
    setRetrying(true);
    try {
      const response = await fetch(`/api/admin/books/${book.id}/parse`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(result.error || "解析失败，请查看失败原因。");
        return;
      }
      flash("解析完成");
      router.refresh();
    } catch {
      setError("解析请求失败，请稍后重试。");
    } finally {
      setRetrying(false);
    }
  }

  async function remove() {
    if (!window.confirm(`确定删除《${book.title}》吗？源文件、章节与书签关联都会一并删除，且无法恢复。`)) {
      return;
    }
    setError("");
    setDeleting(true);
    try {
      const result = await deleteBookAction(book.id);
      if (!result.ok) {
        setError(result.error || "删除失败。");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("删除失败，请稍后重试。");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || retrying || deleting;
  const canRetry = book.status === "failed" || book.status === "uploading";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <form onSubmit={save} className="paper-card rounded-2xl p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">书籍信息</h2>
            <p className="mt-1 text-[11px] text-ink-faint">
              修改后会立即反映到前台。重新上传文件请删除后新建。
            </p>
          </div>
          <div className="flex items-center gap-2">
            {book.status === "ready" ? (
              <Link
                href={`/books/${book.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
                前台预览
              </Link>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs text-white transition-colors hover:bg-brand/85 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden />
              )}
              保存
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">书名 *</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">作者</span>
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              maxLength={200}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">简介</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              maxLength={5000}
              className="w-full resize-y rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm leading-6 text-ink outline-none transition-colors focus:border-brand/50"
            />
          </label>
          <div>
            <p className="mb-2 text-xs tracking-wider text-ink-soft">分类</p>
            {categories.length === 0 ? (
              <p className="text-xs text-ink-faint">还没有分类。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const active = selected.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setSelected((current) =>
                          active
                            ? current.filter((id) => id !== category.id)
                            : [...current, category.id],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        active
                          ? "border-ink bg-brand text-white"
                          : "border-line bg-card/60 text-ink-soft hover:border-brand/40",
                      )}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-xs leading-5 text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-[10px] leading-5 text-ink-faint">
            收录于 {formatDate(book.createdAt)}
          </p>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-danger/25 px-3.5 py-1.5 text-[11px] text-danger transition-colors hover:bg-danger/8 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            )}
            删除书籍
          </button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="paper-card rounded-2xl p-4">
          <div className="book-cover-shadow mx-auto w-32">
            <BookCover
              title={book.title}
              author={book.author}
              coverUrl={book.coverUrl}
              format={book.format}
            />
          </div>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-faint">格式</span>
              <span className="flex items-center gap-1.5">
                <FormatBadge format={book.format} />
                <span className="text-[10px] text-ink-faint">{formatLabel(book.format)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-faint">阅读器</span>
              <span className="text-ink-soft">
                {book.renderMode === "pdf" ? "PDF 原版" : "重排文本"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-faint">状态</span>
              <StatusBadge status={book.status} title={book.parseError} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-faint">内容</span>
              <span className="text-ink-soft">
                {book.renderMode === "pdf"
                  ? `${book.pageCount ?? "?"} 页`
                  : `${book.chapterCount} 章 · ${formatWordCount(book.wordCount)}`}
              </span>
            </div>
            {originalName ? (
              <div className="flex items-start justify-between gap-3">
                <span className="shrink-0 text-ink-faint">源文件</span>
                <span className="min-w-0 truncate text-right text-ink-soft" title={originalName}>
                  {originalName}
                  {fileBytes ? ` · ${(fileBytes / 1024 / 1024).toFixed(2)}MB` : ""}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {book.status === "failed" ? (
          <div className="rounded-md border border-brand/25 bg-brand/6 p-4">
            <p className="text-xs font-medium text-danger">解析失败</p>
            <p className="mt-1.5 break-words text-[11px] leading-5 text-danger/90">
              {book.parseError || "未知错误"}
            </p>
          </div>
        ) : null}

        {canRetry ? (
          <button
            type="button"
            onClick={retryParse}
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-xs text-ink-soft transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-50"
          >
            {retrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            {retrying ? "重新解析中…" : "重新解析"}
          </button>
        ) : null}

        <div className="rounded-lg border border-line bg-white/50 px-4 py-3 text-[10px] leading-5 text-ink-faint">
          {book.format === "pdf"
            ? "PDF 使用原版页面阅读，不会解析文字；封面为自动生成。"
            : "重新解析会覆盖现有章节，但保留书签与阅读进度的章节编号。"}
        </div>
      </aside>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-brand px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
