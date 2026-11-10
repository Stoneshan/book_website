import Link from "next/link";
import { BookCover, FormatBadge } from "@/components/books/book-cover";
import { StatusBadge } from "@/components/admin/status-badge";
import type { BookFormat, BookStatus, RenderMode } from "@/lib/types";
import { formatDate, formatWordCount } from "@/lib/utils";

export interface AdminBookRow {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  format: BookFormat;
  renderMode: RenderMode;
  status: BookStatus;
  chapterCount: number;
  pageCount: number | null;
  wordCount: number;
  createdAt: string;
  parseError: string | null;
}

export function AdminBookTable({ books }: { books: AdminBookRow[] }) {
  if (books.length === 0) {
    return (
      <div className="paper-card rounded-2xl px-6 py-16 text-center">
        <p className="text-xl tracking-[0.2em] text-ink-faint">空</p>
        <p className="mt-3 text-sm text-ink-soft">还没有书，先上传一本吧。</p>
        <Link
          href="/admin/books/new"
          className="mt-5 inline-block rounded-full bg-brand px-5 py-2 text-xs text-white"
        >
          上传新书
        </Link>
      </div>
    );
  }

  return (
    <div className="paper-card overflow-hidden rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-deep/40 text-[11px] tracking-wider text-ink-faint">
              <th className="px-4 py-3 font-normal">书籍</th>
              <th className="px-3 py-3 font-normal">格式</th>
              <th className="px-3 py-3 font-normal">状态</th>
              <th className="px-3 py-3 font-normal">内容</th>
              <th className="px-3 py-3 font-normal">收录</th>
              <th className="px-4 py-3 text-right font-normal">操作</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr
                key={book.id}
                className="border-b border-line/70 align-middle transition-colors last:border-b-0 hover:bg-paper-deep/25"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 shrink-0">
                      <BookCover
                        title={book.title}
                        author={book.author}
                        coverUrl={book.coverUrl}
                        format={book.format}
                      />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/books/${book.id}`}
                        className="block max-w-[18rem] truncate text-sm font-medium text-ink hover:text-brand"
                      >
                        {book.title}
                      </Link>
                      <p className="mt-0.5 max-w-[18rem] truncate text-[11px] text-ink-faint">
                        {book.author}
                      </p>
                      {book.status === "failed" && book.parseError ? (
                        <p className="mt-0.5 max-w-[18rem] truncate text-[10px] text-danger" title={book.parseError}>
                          {book.parseError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <FormatBadge format={book.format} />
                    <span className="text-[10px] text-ink-faint">
                      {book.renderMode === "pdf" ? "PDF 阅读" : "重排阅读"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={book.status} title={book.parseError} />
                </td>
                <td className="px-3 py-3 text-xs text-ink-soft">
                  {book.renderMode === "pdf" ? (
                    <span>{book.pageCount ?? "?"} 页</span>
                  ) : (
                    <span>
                      {book.chapterCount} 章 · {formatWordCount(book.wordCount)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-ink-faint">{formatDate(book.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/books/${book.id}`}
                    className="rounded-full border border-line px-3 py-1 text-[11px] text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    编辑
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
