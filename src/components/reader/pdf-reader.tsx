"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  List,
  Maximize2,
  Minus,
  NotebookPen,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { ReaderDrawer } from "@/components/reader/reader-drawer";
import {
  addBookmark,
  addNote,
  applyReaderTheme,
  DEFAULT_SETTINGS,
  getBookmarks,
  getNotes,
  getProgress,
  getSettings,
  removeBookmark,
  removeNote,
  saveProgress,
  saveSettings,
  updateNote,
  type BookmarkEntry,
  type NoteEntry,
  type ReaderSettings,
} from "@/lib/reader/storage";
import { clamp, cn, formatRelativeDate } from "@/lib/utils";

interface PdfReaderProps {
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    format: string;
  };
  fileUrl: string;
  initialPage: number | null;
  storedPageCount: number | null;
}

interface OutlineEntry {
  title: string;
  page: number | null;
  depth: number;
}

type DrawerName = "outline" | "bookmarks" | "notes" | "settings" | null;

const THEMES = [
  { value: "light", label: "纸白" },
  { value: "sepia", label: "米黄" },
  { value: "dark", label: "夜间" },
] as const;

export function PdfReader({ book, fileUrl, initialPage, storedPageCount }: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const setCanvasNode = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    setCanvasReady(Boolean(node));
  }, []);

  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(storedPageCount ?? 0);
  const [page, setPage] = useState(initialPage ?? 1);
  const [pageInput, setPageInput] = useState(String(initialPage ?? 1));
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<OutlineEntry[]>([]);
  const [drawer, setDrawer] = useState<DrawerName>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [toast, setToast] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const refreshCollections = useCallback(() => {
    setBookmarks(getBookmarks(book.id));
    setNotes(getNotes(book.id));
  }, [book.id]);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1800);
  }, []);

  const persist = useCallback(
    (nextPage: number, nextZoom: number) => {
      saveProgress({
        bookId: book.id,
        locator: { kind: "pdf", page: nextPage, zoom: nextZoom },
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        format: book.format,
      });
    },
    [book.id, book.title, book.author, book.coverUrl, book.format],
  );

  useEffect(() => {
    const loaded = getSettings();
    setSettings(loaded);
    applyReaderTheme(loaded.theme);
    setZoom(loaded.pdfZoom || 1);
    refreshCollections();

    const stored = getProgress(book.id);
    if (!initialPage && stored?.locator.kind === "pdf") {
      const storedPage = stored.locator.page;
      setPage(storedPage);
      setPageInput(String(storedPage));
    }
  }, [book.id, initialPage, refreshCollections]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

        const parameters = {
          url: fileUrl,
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          wasmUrl: "/pdfjs/wasm/",
          iccUrl: "/pdfjs/iccs/",
        } as unknown as Parameters<typeof pdfjs.getDocument>[0];

        const task = pdfjs.getDocument(parameters);
        const loadedDoc = await task.promise;
        if (cancelled) {
          void destroyPdfDocument(loadedDoc).catch(() => {});
          return;
        }

        setDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);

        const stored = getProgress(book.id);
        const target =
          initialPage ??
          (stored?.locator.kind === "pdf" ? stored.locator.page : 1);

        const start = clamp(target, 1, loadedDoc.numPages);
        setPage(start);
        setPageInput(String(start));

        try {
          const rawOutline = await loadedDoc.getOutline();
          if (rawOutline && !cancelled) {
            const flattened: OutlineEntry[] = [];
            const walk = async (
              items: Array<{ title: string; dest: string | unknown[] | null; items?: unknown[] }>,
              depth: number,
            ) => {
              for (const item of items) {
                if (flattened.length >= 300) return;
                let targetPage: number | null = null;
                try {
                  const destination =
                    typeof item.dest === "string"
                      ? await loadedDoc.getDestination(item.dest)
                      : item.dest;
                  if (Array.isArray(destination) && destination.length > 0) {
                    const ref = destination[0] as unknown;
                    if (ref && typeof ref === "object") {
                      targetPage = (await loadedDoc.getPageIndex(ref as never)) + 1;
                    } else if (typeof ref === "number") {
                      targetPage = ref + 1;
                    }
                  }
                } catch {
                  targetPage = null;
                }
                flattened.push({ title: item.title, page: targetPage, depth });
                if (Array.isArray(item.items) && item.items.length > 0) {
                  await walk(
                    item.items as Array<{
                      title: string;
                      dest: string | unknown[] | null;
                      items?: unknown[];
                    }>,
                    depth + 1,
                  );
                }
              }
            };
            await walk(rawOutline as never, 0);
            if (!cancelled) setOutline(flattened);
          }
        } catch {
          setOutline([]);
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("PDF 加载失败。文件可能已损坏、被加密，或链接已过期。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, initialPage, book.id, reloadKey]);

  useEffect(() => {
    return () => {
      if (doc) void destroyPdfDocument(doc).catch(() => {});
    };
  }, [doc]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? element.clientWidth;
      if (width > 0) setContainerWidth(width);
    });
    observer.observe(element);
    setContainerWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !canvasRef.current || containerWidth < 120) return;
    let cancelled = false;
    let renderTask: { promise: Promise<unknown>; cancel: () => void } | null = null;

    async function renderPage() {
      setRendering(true);
      try {
        const pdfPage = await doc!.getPage(page);
        if (cancelled) return;

        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const available = Math.max(280, containerWidth - (containerWidth > 640 ? 64 : 20));
        const fitScale = available / baseViewport.width;
        const viewport = pdfPage.getViewport({ scale: fitScale * zoom });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable.");

        const parameters = {
          canvasContext: context,
          viewport,
          canvas,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        } as unknown as Parameters<typeof pdfPage.render>[0];

        renderTask = pdfPage.render(parameters);
        await renderTask.promise;
        if (!cancelled) setRendering(false);
      } catch (renderError) {
        const name = (renderError as { name?: string })?.name;
        if (!cancelled && name !== "RenderingCancelledException") {
          console.error(renderError);
          setError("这一页渲染失败。");
        }
        if (!cancelled) setRendering(false);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // The render task may already have completed.
      }
    };
  }, [doc, page, zoom, containerWidth, canvasReady]);

  useEffect(() => {
    if (!doc) return;
    persist(page, zoom);
  }, [doc, page, zoom, persist]);

  function goToPage(nextPage: number) {
    if (!numPages) return;
    const value = clamp(Math.round(nextPage), 1, numPages);
    setPage(value);
    setPageInput(String(value));
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  function changeZoom(nextZoom: number) {
    const value = clamp(Math.round(nextZoom * 100) / 100, 0.5, 3);
    setZoom(value);
    const next = { ...settings, pdfZoom: value };
    setSettings(next);
    saveSettings(next);
  }

  function updateSettings(next: ReaderSettings) {
    setSettings(next);
    saveSettings(next);
    setZoom(next.pdfZoom);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (drawer) return;
      if (event.key === "ArrowLeft") {
        goToPage(page - 1);
      } else if (event.key === "ArrowRight") {
        goToPage(page + 1);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        changeZoom(zoom + 0.1);
      } else if (event.key === "-") {
        event.preventDefault();
        changeZoom(zoom - 0.1);
      } else if (event.key === "Escape") {
        setDrawer(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pageBookmark =
    bookmarks.find(
      (entry) => entry.locator.kind === "pdf" && entry.locator.page === page,
    ) ?? null;

  function toggleBookmark() {
    if (pageBookmark) {
      removeBookmark(pageBookmark.id);
      flash("已移除书签");
    } else {
      addBookmark({
        bookId: book.id,
        locator: { kind: "pdf", page, zoom },
        label: `第 ${page} 页`,
      });
      flash("已加入书签");
    }
    refreshCollections();
  }

  function submitNote() {
    const body = noteBody.trim();
    if (!body) return;
    addNote({
      bookId: book.id,
      locator: { kind: "pdf", page, zoom },
      label: `第 ${page} 页`,
      body,
    });
    setNoteBody("");
    refreshCollections();
    flash("笔记已保存");
  }

  function saveEditingNote(id: string) {
    if (!editingBody.trim()) return;
    const note = notes.find((entry) => entry.id === id);
    updateNote(id, editingBody.trim(), note?.quote);
    setEditingNoteId(null);
    setEditingBody("");
    refreshCollections();
    flash("笔记已更新");
  }

  const style = {
    "--reader-font-size": `${settings.fontSize}px`,
    "--reader-line-height": settings.lineHeight,
  } as CSSProperties;

  return (
    <div className="reader-surface flex h-screen flex-col" style={style}>
      <header
        className="relative z-30 shrink-0 border-b backdrop-blur-md"
        style={{
          borderColor: "var(--reader-line)",
          backgroundColor: "color-mix(in srgb, var(--reader-panel) 90%, transparent)",
        }}
      >
        <div
          className="absolute left-0 top-0 h-[3px]"
          style={{
            width: `${numPages ? Math.round((page / numPages) * 100) : 0}%`,
            backgroundColor: "var(--reader-accent)",
          }}
          aria-hidden
        />
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              href={`/books/${book.id}`}
              aria-label="返回书籍详情"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-black/5"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>
            <div className="min-w-0">
              <p className="hidden truncate text-[11px] tracking-wide sm:block" style={{ color: "var(--reader-muted)" }}>
                {book.title} · PDF
              </p>
              <p className="truncate font-serif-cn text-sm tracking-wide">
                第 {page} / {numPages || "?"} 页
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => setDrawer(drawer === "outline" ? null : "outline")}
              aria-label="PDF 目录"
              title="PDF 目录"
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-black/5"
              disabled={outline.length === 0}
            >
              <List className={cn("h-4 w-4", outline.length === 0 && "opacity-30")} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setDrawer(drawer === "bookmarks" ? null : "bookmarks")}
              aria-label="书签"
              title="书签"
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-black/5"
              style={{ color: pageBookmark ? "var(--reader-accent)" : undefined }}
            >
              {pageBookmark ? (
                <BookmarkCheck className="h-4 w-4" aria-hidden />
              ) : (
                <Bookmark className="h-4 w-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => setDrawer(drawer === "notes" ? null : "notes")}
              aria-label="笔记"
              title="笔记"
              className="relative grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-black/5"
            >
              <NotebookPen className="h-4 w-4" aria-hidden />
              {notes.length > 0 ? (
                <span
                  className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] text-white"
                  style={{ backgroundColor: "var(--reader-accent)" }}
                >
                  {notes.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => setDrawer(drawer === "settings" ? null : "settings")}
              aria-label="阅读设置"
              title="阅读设置"
              className="grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-black/5"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="reader-scroll relative flex-1 overflow-auto">
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col items-center px-2 pb-32 pt-6 sm:px-6 sm:pt-10">
          <div ref={stageRef} className="flex w-full justify-center px-1">
            <div className="relative">
              {loading || !doc ? (
                <div className="flex h-[60vh] w-[min(90vw,720px)] flex-col items-center justify-center gap-4 rounded-sm border border-line/60 bg-card/60 text-sm text-ink-soft">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink/15 border-t-vermilion" />
                  正在打开 PDF…
                </div>
              ) : error ? (
                <div className="flex w-[min(90vw,520px)] flex-col items-center gap-4 rounded-md border border-line bg-card p-8 text-center">
                  <p className="font-serif-cn text-lg text-ink">{error}</p>
                  <div className="flex gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setReloadKey((key) => key + 1)}
                      className="rounded-full border border-line-strong px-4 py-1.5 text-ink-soft"
                    >
                      重新加载
                    </button>
                    <Link
                      href={`/books/${book.id}`}
                      className="rounded-full bg-ink px-4 py-1.5 text-paper"
                    >
                      返回详情
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[2px] bg-white shadow-[0_20px_50px_-20px_rgba(20,16,10,0.55)]">
                  <canvas ref={setCanvasNode} className="block max-w-none" />
                  {settings.pdfDim > 0 ? (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ backgroundColor: `rgba(0,0,0,${settings.pdfDim})` }}
                      aria-hidden
                    />
                  ) : null}
                  {rendering ? (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/40">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink/15 border-t-vermilion" />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <p className="mt-5 text-[10px] tracking-[0.28em]" style={{ color: "var(--reader-muted)" }}>
            PDF · 原版页面
          </p>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3">
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-full border px-2 py-1.5 shadow-lg backdrop-blur-md"
          style={{
            borderColor: "var(--reader-line)",
            backgroundColor: "color-mix(in srgb, var(--reader-panel) 92%, transparent)",
          }}
        >
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            aria-label="上一页"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-black/5 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              goToPage(Number.parseInt(pageInput, 10) || page);
            }}
            className="flex items-center gap-1 text-xs"
          >
            <input
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => goToPage(Number.parseInt(pageInput, 10) || page)}
              inputMode="numeric"
              aria-label="跳转到页码"
              className="w-11 rounded-sm border bg-transparent px-1.5 py-1 text-center tabular-nums outline-none"
              style={{ borderColor: "var(--reader-line)" }}
            />
            <span style={{ color: "var(--reader-muted)" }}>/ {numPages || "?"}</span>
          </form>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={!numPages || page >= numPages}
            aria-label="下一页"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-black/5 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>

          <span className="mx-1 h-5 w-px" style={{ backgroundColor: "var(--reader-line)" }} aria-hidden />

          <button
            type="button"
            onClick={() => changeZoom(zoom - 0.1)}
            disabled={zoom <= 0.5}
            aria-label="缩小"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-black/5 disabled:opacity-30"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span className="w-11 text-center text-[11px] tabular-nums" style={{ color: "var(--reader-muted)" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => changeZoom(zoom + 0.1)}
            disabled={zoom >= 3}
            aria-label="放大"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-black/5 disabled:opacity-30"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => changeZoom(1)}
            aria-label="适合宽度"
            title="适合宽度"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-black/5"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <ReaderDrawer
        open={drawer === "outline"}
        title="PDF 目录"
        subtitle={outline.length ? `${outline.length} 项` : "本书没有内嵌目录"}
        onClose={() => setDrawer(null)}
      >
        {outline.length === 0 ? (
          <EmptyHint text="这个 PDF 没有提供书签目录。可以使用页码输入框直接跳转。" />
        ) : (
          <ul className="-mx-2">
            {outline.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="border-b last:border-b-0"
                style={{ borderColor: "var(--reader-line)" }}
              >
                <button
                  type="button"
                  disabled={item.page === null}
                  onClick={() => {
                    if (item.page) {
                      goToPage(item.page);
                      setDrawer(null);
                    }
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2.5 text-left text-sm transition-colors hover:bg-black/5 disabled:opacity-40"
                  style={{ paddingLeft: `${8 + Math.min(item.depth, 5) * 14}px` }}
                >
                  <span className="min-w-0 flex-1 truncate font-serif-cn">{item.title}</span>
                  {item.page ? (
                    <span className="shrink-0 text-[10px] opacity-60">第 {item.page} 页</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </ReaderDrawer>

      <ReaderDrawer
        open={drawer === "bookmarks"}
        title="书签"
        subtitle={`${bookmarks.length} 条 · 保存在本机`}
        onClose={() => setDrawer(null)}
        footer={
          <button
            type="button"
            onClick={toggleBookmark}
            className="flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs text-white"
            style={{ backgroundColor: "var(--reader-accent)" }}
          >
            {pageBookmark ? (
              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Bookmark className="h-3.5 w-3.5" aria-hidden />
            )}
            {pageBookmark ? "移除本页书签" : "为第 " + page + " 页添加书签"}
          </button>
        }
      >
        {bookmarks.length === 0 ? (
          <EmptyHint text="还没有书签。点击顶部书签图标，为当前页做标记。" />
        ) : (
          <ul className="space-y-2">
            {bookmarks.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border px-3 py-2.5"
                style={{ borderColor: "var(--reader-line)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (entry.locator.kind === "pdf") {
                        goToPage(entry.locator.page);
                        setDrawer(null);
                      }
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-serif-cn text-sm">{entry.label}</p>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--reader-muted)" }}>
                      {formatRelativeDate(entry.createdAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="删除书签"
                    onClick={() => {
                      removeBookmark(entry.id);
                      refreshCollections();
                      flash("已移除书签");
                    }}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full opacity-50 transition-opacity hover:bg-black/5 hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ReaderDrawer>

      <ReaderDrawer
        open={drawer === "notes"}
        title="笔记"
        subtitle={`${notes.length} 条 · 保存在本机`}
        onClose={() => setDrawer(null)}
        footer={
          <p className="text-center text-[10px]" style={{ color: "var(--reader-muted)" }}>
            PDF 笔记按页记录，暂不支持选中原文摘录
          </p>
        }
      >
        <div
          className="rounded-md border p-3"
          style={{ borderColor: "var(--reader-line)" }}
        >
          <textarea
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            rows={4}
            placeholder={`写下关于第 ${page} 页的想法…`}
            className="w-full resize-y rounded-sm bg-transparent text-sm leading-6 outline-none placeholder:opacity-50"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px]" style={{ color: "var(--reader-muted)" }}>
              第 {page} 页
            </span>
            <button
              type="button"
              onClick={submitNote}
              disabled={!noteBody.trim()}
              className="rounded-full px-3.5 py-1.5 text-xs text-white disabled:opacity-40"
              style={{ backgroundColor: "var(--reader-accent)" }}
            >
              保存笔记
            </button>
          </div>
        </div>

        <div className="mt-5">
          {notes.length === 0 ? (
            <EmptyHint text="还没有笔记。阅读时在上方写下这一页的想法。" />
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-md border p-3"
                  style={{ borderColor: "var(--reader-line)" }}
                >
                  {editingNoteId === note.id ? (
                    <div>
                      <textarea
                        value={editingBody}
                        onChange={(event) => setEditingBody(event.target.value)}
                        rows={3}
                        className="w-full resize-y rounded-sm border bg-transparent px-2 py-1.5 text-sm leading-6 outline-none"
                        style={{ borderColor: "var(--reader-line)" }}
                      />
                      <div className="mt-2 flex justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-full border px-3 py-1"
                          style={{ borderColor: "var(--reader-line)" }}
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEditingNote(note.id)}
                          className="rounded-full px-3 py-1 text-white"
                          style={{ backgroundColor: "var(--reader-accent)" }}
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px]" style={{ color: "var(--reader-muted)" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (note.locator.kind === "pdf") {
                          goToPage(note.locator.page);
                          setDrawer(null);
                        }
                      }}
                      className="truncate underline underline-offset-2"
                    >
                      {note.label}
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <span>{formatRelativeDate(note.updatedAt)}</span>
                      {editingNoteId !== note.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditingBody(note.body);
                          }}
                          className="rounded-full px-1.5 py-0.5 hover:bg-black/5"
                        >
                          编辑
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          removeNote(note.id);
                          refreshCollections();
                          flash("笔记已删除");
                        }}
                        className="rounded-full px-1.5 py-0.5 hover:bg-black/5"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ReaderDrawer>

      <ReaderDrawer
        open={drawer === "settings"}
        title="PDF 阅读设置"
        subtitle="页码与缩放会记住"
        onClose={() => setDrawer(null)}
      >
        <div className="space-y-5 text-sm">
          <div>
            <div className="mb-2 flex items-center justify-between text-xs" style={{ color: "var(--reader-muted)" }}>
              <span>缩放</span>
              <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="缩小"
                onClick={() => changeZoom(zoom - 0.1)}
                className="grid h-8 w-8 place-items-center rounded-full border"
                style={{ borderColor: "var(--reader-line)" }}
              >
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </button>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => changeZoom(Number(event.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                style={{ accentColor: "var(--reader-accent)", backgroundColor: "var(--reader-line)" }}
                aria-label="PDF 缩放"
              />
              <button
                type="button"
                aria-label="放大"
                onClick={() => changeZoom(zoom + 0.1)}
                className="grid h-8 w-8 place-items-center rounded-full border"
                style={{ borderColor: "var(--reader-line)" }}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={() => changeZoom(1)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px]"
              style={{ borderColor: "var(--reader-line)", color: "var(--reader-muted)" }}
            >
              <Maximize2 className="h-3 w-3" aria-hidden />
              适合宽度
            </button>
          </div>

          <div>
            <p className="mb-2 text-xs" style={{ color: "var(--reader-muted)" }}>
              周围主题
            </p>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => updateSettings({ ...settings, theme: theme.value })}
                  className="rounded-md border py-2 text-xs"
                  style={{
                    borderColor:
                      settings.theme === theme.value ? "var(--reader-accent)" : "var(--reader-line)",
                    boxShadow:
                      settings.theme === theme.value ? "0 0 0 1px var(--reader-accent)" : undefined,
                  }}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-xs" style={{ color: "var(--reader-muted)" }}>
              <span>页面降亮</span>
              <span className="tabular-nums">{Math.round(settings.pdfDim * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={0.6}
              step={0.05}
              value={settings.pdfDim}
              onChange={(event) =>
                updateSettings({ ...settings, pdfDim: Number(event.target.value) })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
              style={{ accentColor: "var(--reader-accent)", backgroundColor: "var(--reader-line)" }}
              aria-label="页面降亮"
            />
            <p className="mt-2 text-[10px] leading-5" style={{ color: "var(--reader-muted)" }}>
              PDF 保留原版页面，不做反色处理；夜间可适当降低页面亮度。
            </p>
          </div>
        </div>
      </ReaderDrawer>

      {toast ? (
        <div
          className="animate-fade fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-white shadow-lg"
          style={{ backgroundColor: "var(--reader-accent)" }}
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p
      className="rounded-md border border-dashed px-4 py-8 text-center text-xs leading-6"
      style={{ borderColor: "var(--reader-line)", color: "var(--reader-muted)" }}
    >
      {text}
    </p>
  );
}

function destroyPdfDocument(document: PDFDocumentProxy): Promise<void> {
  const candidate = document as unknown as {
    destroy?: () => Promise<void>;
    loadingTask?: { destroy: () => Promise<void> };
  };
  if (candidate.destroy) return candidate.destroy();
  if (candidate.loadingTask) return candidate.loadingTask.destroy();
  return Promise.resolve();
}
