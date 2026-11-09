export type ReaderTheme = "light" | "sepia" | "dark";
export type ReaderFont = "serif" | "sans";

export interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
  width: number;
  font: ReaderFont;
  pdfZoom: number;
  pdfDim: number;
}

export type ReaderLocator =
  | { kind: "chapter"; chapterNo: number; ratio: number }
  | { kind: "pdf"; page: number; zoom: number };

export interface ProgressEntry {
  bookId: string;
  locator: ReaderLocator;
  title: string;
  author: string;
  coverUrl: string | null;
  format: string;
  updatedAt: number;
}

export interface BookmarkEntry {
  id: string;
  bookId: string;
  locator: ReaderLocator;
  label: string;
  excerpt?: string;
  createdAt: number;
}

export interface NoteEntry {
  id: string;
  bookId: string;
  locator: ReaderLocator;
  label: string;
  quote?: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "light",
  fontSize: 19,
  lineHeight: 1.95,
  width: 42,
  font: "serif",
  pdfZoom: 1,
  pdfDim: 0,
};

const SETTINGS_KEY = "ebook:settings:v2";
const PROGRESS_KEY = "ebook:progress:v2";
const BOOKMARKS_KEY = "ebook:bookmarks:v2";
const NOTES_KEY = "ebook:notes:v2";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode; ignore.
  }
}

function numberInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

export function getSettings(): ReaderSettings {
  const stored = readJson<Partial<ReaderSettings>>(SETTINGS_KEY, {});
  const theme =
    stored.theme === "sepia" || stored.theme === "dark" || stored.theme === "light"
      ? stored.theme
      : DEFAULT_SETTINGS.theme;
  return {
    theme,
    fontSize: numberInRange(stored.fontSize, 16, 30, DEFAULT_SETTINGS.fontSize),
    lineHeight: numberInRange(stored.lineHeight, 1.5, 2.2, DEFAULT_SETTINGS.lineHeight),
    width: numberInRange(stored.width, 32, 54, DEFAULT_SETTINGS.width),
    font: stored.font === "sans" ? "sans" : "serif",
    pdfZoom: numberInRange(stored.pdfZoom, 0.5, 3, DEFAULT_SETTINGS.pdfZoom),
    pdfDim: numberInRange(stored.pdfDim, 0, 0.6, DEFAULT_SETTINGS.pdfDim),
  };
}

export function saveSettings(settings: ReaderSettings): void {
  writeJson(SETTINGS_KEY, settings);
  applyReaderTheme(settings.theme);
}

export function applyReaderTheme(theme: ReaderTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.readerTheme = theme;
}

export function getProgressMap(): Record<string, ProgressEntry> {
  const raw = readJson<Record<string, ProgressEntry>>(PROGRESS_KEY, {});
  const result: Record<string, ProgressEntry> = {};
  for (const [bookId, entry] of Object.entries(raw ?? {})) {
    if (
      entry &&
      typeof entry === "object" &&
      entry.bookId === bookId &&
      entry.locator &&
      (entry.locator.kind === "chapter" || entry.locator.kind === "pdf")
    ) {
      result[bookId] = entry;
    }
  }
  return result;
}

export function getProgress(bookId: string): ProgressEntry | null {
  return getProgressMap()[bookId] ?? null;
}

export function saveProgress(entry: Omit<ProgressEntry, "updatedAt">): void {
  const map = getProgressMap();
  map[entry.bookId] = { ...entry, updatedAt: Date.now() };
  writeJson(PROGRESS_KEY, map);
}

export function getRecentProgress(limit = 6): ProgressEntry[] {
  return Object.values(getProgressMap())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function clearProgress(bookId: string): void {
  const map = getProgressMap();
  delete map[bookId];
  writeJson(PROGRESS_KEY, map);
}

function readEntries<T>(key: string): T[] {
  const raw = readJson<T[]>(key, []);
  return Array.isArray(raw) ? raw : [];
}

export function getBookmarks(bookId: string): BookmarkEntry[] {
  return readEntries<BookmarkEntry>(BOOKMARKS_KEY)
    .filter((entry) => entry && entry.bookId === bookId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function addBookmark(entry: Omit<BookmarkEntry, "id" | "createdAt">): BookmarkEntry {
  const bookmark: BookmarkEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  const all = readEntries<BookmarkEntry>(BOOKMARKS_KEY);
  writeJson(BOOKMARKS_KEY, [bookmark, ...all].slice(0, 500));
  return bookmark;
}

export function removeBookmark(id: string): void {
  writeJson(
    BOOKMARKS_KEY,
    readEntries<BookmarkEntry>(BOOKMARKS_KEY).filter((entry) => entry.id !== id),
  );
}

export function isLocatorEqual(a: ReaderLocator, b: ReaderLocator): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "chapter" && b.kind === "chapter") return a.chapterNo === b.chapterNo;
  if (a.kind === "pdf" && b.kind === "pdf") return a.page === b.page;
  return false;
}

export function getNotes(bookId: string): NoteEntry[] {
  return readEntries<NoteEntry>(NOTES_KEY)
    .filter((entry) => entry && entry.bookId === bookId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function addNote(entry: Omit<NoteEntry, "id" | "createdAt" | "updatedAt">): NoteEntry {
  const note: NoteEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const all = readEntries<NoteEntry>(NOTES_KEY);
  writeJson(NOTES_KEY, [note, ...all].slice(0, 500));
  return note;
}

export function updateNote(id: string, body: string, quote?: string): void {
  const all = readEntries<NoteEntry>(NOTES_KEY).map((entry) =>
    entry.id === id ? { ...entry, body, quote, updatedAt: Date.now() } : entry,
  );
  writeJson(NOTES_KEY, all);
}

export function removeNote(id: string): void {
  writeJson(
    NOTES_KEY,
    readEntries<NoteEntry>(NOTES_KEY).filter((entry) => entry.id !== id),
  );
}

export function locatorLabel(locator: ReaderLocator): string {
  return locator.kind === "pdf" ? `第 ${locator.page} 页` : `第 ${locator.chapterNo} 章`;
}

export function progressText(entry: ProgressEntry): string {
  if (entry.locator.kind === "pdf") {
    return `读到第 ${entry.locator.page} 页`;
  }
  const percent = Math.round((entry.locator.ratio ?? 0) * 100);
  return `读到第 ${entry.locator.chapterNo} 章${percent > 2 ? ` · ${percent}%` : ""}`;
}

export function progressHref(entry: ProgressEntry): string {
  if (entry.locator.kind === "pdf") {
    return `/books/${entry.bookId}/read/pdf?page=${entry.locator.page}`;
  }
  return `/books/${entry.bookId}/read/${entry.locator.chapterNo}?resume=1`;
}
