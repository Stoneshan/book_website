"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  List,
  NotebookPen,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { ReaderDrawer } from "@/components/reader/reader-drawer";
import { ReaderSettingsPanel } from "@/components/reader/reader-settings";
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
import type { ChapterContent, ChapterListItem } from "@/lib/types";
import { clamp, cn, formatRelativeDate, formatWordCount } from "@/lib/utils";

interface TextReaderProps {
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    format: string;
    wordCount: number;
  };
  chapters: ChapterListItem[];
  chapter: ChapterContent;
  prev: ChapterListItem | null;
  next: ChapterListItem | null;
  resume: boolean;
}

type DrawerName = "toc" | "bookmarks" | "notes" | "settings" | null;

interface SelectionState {
  text: string;
  x: number;
  y: number;
}

const NAV_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-40";

export function TextReader({
  book,
  chapters,
  chapter,
  prev,
  next,
  resume,
}: TextReaderProps) {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const currentChapterRef = useRef<HTMLLIElement>(null);
  const ratioRef = useRef(0);
  const lastSaveRef = useRef(0);
  const restoringRef = useRef(false);
  const toastTimer = useRef<number | null>(null);

  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [drawer, setDrawer] = useState<DrawerName>(null);
  const [ratio, setRatio] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [noteQuote, setNoteQuote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [toast, setToast] = useState("");

  const chapterBookmark = useMemo(
    () =>
      bookmarks.find(
        (entry) => entry.locator.kind === "chapter" && entry.locator.chapterNo === chapter.chapterNo,
      ) ?? null,
    [bookmarks, chapter.chapterNo],
  );

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1800);
  }, []);

  const persistProgress = useCallback(
    (value: number) => {
      saveProgress({
        bookId: book.id,
        locator: { kind: "chapter", chapterNo: chapter.chapterNo, ratio: value },
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        format: book.format,
      });
    },
    [book.id, book.title, book.author, book.coverUrl, book.format, chapter.chapterNo],
  );

  const refreshCollections = useCallback(() => {
    setBookmarks(getBookmarks(book.id));
    setNotes(getNotes(book.id));
  }, [book.id]);

  useEffect(() => {
    const loaded = getProgress(book.id);
    const initialRatio =
      resume &&
      loaded?.locator.kind === "chapter" &&
      loaded.locator.chapterNo === chapter.chapterNo
        ? clamp(loaded.locator.ratio, 0, 1)
        : 0;
    ratioRef.current = initialRatio;
    setRatio(initialRatio);
    restoringRef.current = initialRatio > 0;

    const restoreScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = initialRatio * Math.max(0, max);
      const previous = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, target);
      document.documentElement.style.scrollBehavior = previous;
      ratioRef.current = initialRatio;
    };

    const timerOne = window.setTimeout(restoreScroll, 100);
    const timerTwo = window.setTimeout(() => {
      restoreScroll();
    }, 550);
    const timerThree = window.setTimeout(() => {
      restoringRef.current = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const current = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      ratioRef.current = current;
      setRatio(current);
      persistProgress(current);
    }, 1100);

    persistProgress(initialRatio);
    refreshCollections();

    return () => {
      window.clearTimeout(timerOne);
      window.clearTimeout(timerTwo);
      window.clearTimeout(timerThree);
    };
  }, [book.id, chapter.chapterNo, resume, persistProgress, refreshCollections]);

  useEffect(() => {
    const loaded = getSettings();
    setSettings(loaded);
    applyReaderTheme(loaded.theme);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      setSelection(null);

      if (restoringRef.current) {
        setRatio(value);
        return;
      }

      ratioRef.current = value;
      setRatio(value);

      const now = Date.now();
      if (now - lastSaveRef.current > 700) {
        lastSaveRef.current = now;
        persistProgress(value);
      }
    };

    const saveNow = () => persistProgress(ratioRef.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", saveNow);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", saveNow);
      persistProgress(ratioRef.current);
    };
  }, [persistProgress]);

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
      if (event.key === "ArrowLeft" && prev) {
        router.push(`/books/${book.id}/read/${prev.chapterNo}`);
      } else if (event.key === "ArrowRight" && next) {
        router.push(`/books/${book.id}/read/${next.chapterNo}`);
      } else if (event.key === "Escape") {
        setDrawer(null);
        setSelection(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book.id, prev, next, router, drawer]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (drawer === "toc" && currentChapterRef.current) {
      currentChapterRef.current.scrollIntoView({ block: "center" });
    }
  }, [drawer]);

  function updateSettings(next: ReaderSettings) {
    setSettings(next);
    saveSettings(next);
  }

  function toggleBookmark() {
    if (chapterBookmark) {
      removeBookmark(chapterBookmark.id);
      flash("已移除书签");
    } else {
      addBookmark({
        bookId: book.id,
        locator: { kind: "chapter", chapterNo: chapter.chapterNo, ratio: ratioRef.current },
        label: `第 ${chapter.chapterNo} 章 · ${chapter.title}`,
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
      locator: { kind: "chapter", chapterNo: chapter.chapterNo, ratio: ratioRef.current },
      label: `第 ${chapter.chapterNo} 章 · ${chapter.title}`,
      quote: noteQuote.trim() || undefined,
      body,
    });
    setNoteBody("");
    setNoteQuote("");
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

  function handleSelection() {
    if (drawer) return;
    const active = window.getSelection();
    const text = active?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (!active || text.length < 2 || active.rangeCount === 0) {
      setSelection(null);
      return;
    }
    const range = active.getRangeAt(0);
    if (!contentRef.current?.contains(range.commonAncestorContainer)) {
      setSelection(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setSelection({
      text: text.slice(0, 600),
      x: clamp(rect.left + rect.width / 2, 80, window.innerWidth - 80),
      y: Math.max(rect.top, 70),
    });
  }

  function startQuoteNote() {
    if (!selection) return;
    setNoteQuote(selection.text);
    setNoteBody("");
    setDrawer("notes");
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  const bookmarked = Boolean(chapterBookmark);
  const contentStyle = {
    "--reader-font-size": `${settings.fontSize}px`,
    "--reader-line-height": settings.lineHeight,
    "--reader-width": `${settings.width}rem`,
  } as CSSProperties;

  return (
    <div className="reader-surface min-h-screen" style={contentStyle}>
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          borderColor: "var(--reader-line)",
          backgroundColor: "color-mix(in srgb, var(--reader-panel) 88%, transparent)",
        }}
      >
        <div
          className="absolute left-0 top-0 h-[3px] transition-[width] duration-150"
          style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: "var(--reader-accent)" }}
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
                {book.title}
              </p>
              <p className="truncate font-serif-cn text-sm tracking-wide">
                第 {chapter.chapterNo} 章 · {chapter.title}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <IconButton
              label="目录"
              onClick={() => setDrawer(drawer === "toc" ? null : "toc")}
            >
              <List className="h-4 w-4" aria-hidden />
            </IconButton>
            <IconButton
              label="书签"
              active={bookmarked}
              onClick={() => setDrawer(drawer === "bookmarks" ? null : "bookmarks")}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-4 w-4" aria-hidden />
              ) : (
                <Bookmark className="h-4 w-4" aria-hidden />
              )}
            </IconButton>
            <IconButton
              label="笔记"
              onClick={() => setDrawer(drawer === "notes" ? null : "notes")}
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
            </IconButton>
            <IconButton
              label="阅读设置"
              onClick={() => setDrawer(drawer === "settings" ? null : "settings")}
            >
              <Settings2 className="h-4 w-4" aria-hidden />
            </IconButton>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        <div className="mb-10 text-center">
          <p
            className="text-[10px] tracking-[0.4em]"
            style={{ color: "var(--reader-muted)" }}
          >
            第 {String(chapter.chapterNo).padStart(2, "0")} 章
          </p>
          <h1 className="mt-3 font-serif-cn text-2xl font-semibold tracking-[0.08em] sm:text-3xl">
            {chapter.title}
          </h1>
          <p className="mt-3 text-[11px]" style={{ color: "var(--reader-muted)" }}>
            {formatWordCount(chapter.wordCount)}
          </p>
        </div>

        <article
          ref={contentRef}
          className="reader-content"
          style={{
            fontFamily: settings.font === "serif" ? "var(--font-serif)" : "var(--font-sans)",
          }}
          onMouseUp={handleSelection}
          onTouchEnd={handleSelection}
          dangerouslySetInnerHTML={{ __html: chapter.content }}
        />

        <div className="mt-14 flex items-center gap-3 rule-ornament">
          <span className="text-[10px] tracking-[0.32em]" style={{ color: "var(--reader-muted)" }}>
            本章完
          </span>
        </div>

        <nav className="mt-8 flex items-center justify-between gap-3">
          {prev ? (
            <Link
              href={`/books/${book.id}/read/${prev.chapterNo}`}
              className={NAV_BUTTON}
              style={{ borderColor: "var(--reader-line)", color: "var(--reader-ink-soft)" }}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              <span className="max-w-[9rem] truncate">上一章 · {prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/books/${book.id}/read/${next.chapterNo}`}
              className={NAV_BUTTON}
              style={{ borderColor: "var(--reader-line)", color: "var(--reader-ink-soft)" }}
            >
              <span className="max-w-[9rem] truncate">下一章 · {next.title}</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <div className="mt-10 flex items-center justify-center gap-3 text-[11px]" style={{ color: "var(--reader-muted)" }}>
          <span>本章 {Math.round(ratio * 100)}%</span>
          <span aria-hidden>·</span>
          <Link href={`/books/${book.id}`} className="underline underline-offset-4">
            返回目录
          </Link>
        </div>
      </div>

      {selection ? (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={startQuoteNote}
          className="animate-fade fixed z-50 inline-flex -translate-x-1/2 -translate-y-[calc(100%+10px)] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs text-white shadow-lg"
          style={{
            left: selection.x,
            top: selection.y,
            backgroundColor: "var(--reader-accent)",
          }}
        >
          <Highlighter className="h-3.5 w-3.5" aria-hidden />
          记笔记
        </button>
      ) : null}

      <ReaderDrawer
        open={drawer === "toc"}
        title="目录"
        subtitle={`共 ${chapters.length} 章`}
        onClose={() => setDrawer(null)}
      >
        <ol className="-mx-2">
          {chapters.map((item) => {
            const active = item.chapterNo === chapter.chapterNo;
            return (
              <li
                key={item.chapterNo}
                ref={active ? currentChapterRef : undefined}
                className="border-b last:border-b-0"
                style={{ borderColor: "var(--reader-line)" }}
              >
                <Link
                  href={`/books/${book.id}/read/${item.chapterNo}`}
                  onClick={() => setDrawer(null)}
                  className={cn(
                    "flex items-center gap-3 rounded-sm px-2 py-2.5 text-sm transition-colors hover:bg-black/5",
                    active && "font-semibold",
                  )}
                  style={{ color: active ? "var(--reader-accent)" : undefined }}
                >
                  <span className="w-7 shrink-0 text-right text-[10px] tabular-nums opacity-60">
                    {String(item.chapterNo).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-serif-cn tracking-wide">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[10px] opacity-50">
                    {formatWordCount(item.wordCount)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
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
            {bookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Bookmark className="h-3.5 w-3.5" aria-hidden />
            )}
            {bookmarked ? "移除本章书签" : "为本章添加书签"}
          </button>
        }
      >
        {bookmarks.length === 0 ? (
          <EmptyHint text="还没有书签。在阅读时点击顶部书签图标即可标记当前章节。" />
        ) : (
          <ul className="space-y-2">
            {bookmarks.map((entry) => (
              <li
                key={entry.id}
                className="group rounded-md border px-3 py-2.5"
                style={{ borderColor: "var(--reader-line)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/books/${book.id}/read/${
                      entry.locator.kind === "chapter" ? entry.locator.chapterNo : 1
                    }`}
                    onClick={() => setDrawer(null)}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate font-serif-cn text-sm">{entry.label}</p>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--reader-muted)" }}>
                      {formatRelativeDate(entry.createdAt)}
                      {entry.locator.kind === "chapter" && entry.locator.ratio > 0.02
                        ? ` · 本章 ${Math.round(entry.locator.ratio * 100)}%`
                        : ""}
                    </p>
                  </Link>
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
            选中正文中的文字，可以直接摘录记笔记
          </p>
        }
      >
        <div
          className="rounded-md border p-3"
          style={{ borderColor: "var(--reader-line)" }}
        >
          {noteQuote ? (
            <div
              className="mb-2 flex items-start gap-2 rounded-sm border-l-2 px-2 py-1.5 text-xs leading-5"
              style={{ borderColor: "var(--reader-accent)", color: "var(--reader-muted)" }}
            >
              <span className="min-w-0 flex-1 line-clamp-4">{noteQuote}</span>
              <button
                type="button"
                aria-label="清除摘录"
                onClick={() => setNoteQuote("")}
                className="mt-0.5 opacity-60 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
          <textarea
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            rows={4}
            placeholder={`写下关于「${chapter.title}」的想法…`}
            className="w-full resize-y rounded-sm bg-transparent text-sm leading-6 outline-none placeholder:opacity-50"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px]" style={{ color: "var(--reader-muted)" }}>
              第 {chapter.chapterNo} 章
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
            <EmptyHint text="还没有笔记。阅读时选中一段文字，或在上方直接写下想法。" />
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-md border p-3"
                  style={{ borderColor: "var(--reader-line)" }}
                >
                  {note.quote ? (
                    <p
                      className="mb-2 border-l-2 pl-2 text-[11px] leading-5 line-clamp-3"
                      style={{ borderColor: "var(--reader-accent)", color: "var(--reader-muted)" }}
                    >
                      {note.quote}
                    </p>
                  ) : null}

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
                    <Link
                      href={`/books/${book.id}/read/${
                        note.locator.kind === "chapter" ? note.locator.chapterNo : 1
                      }`}
                      onClick={() => setDrawer(null)}
                      className="truncate underline underline-offset-2"
                    >
                      {note.label}
                    </Link>
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
        title="阅读设置"
        subtitle="偏好保存在本机"
        onClose={() => setDrawer(null)}
      >
        <ReaderSettingsPanel settings={settings} onChange={updateSettings} />
      </ReaderDrawer>

      {toast ? (
        <div
          className="animate-fade fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs text-white shadow-lg"
          style={{ backgroundColor: "var(--reader-accent)" }}
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-black/5"
      style={{ color: active ? "var(--reader-accent)" : undefined }}
    >
      {children}
    </button>
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
