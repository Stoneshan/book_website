import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { demoBooks, demoCategories } from "@/lib/demo/books";
import { getSupabasePublicClient } from "@/lib/supabase/public";
import { escapeLike, formatLabel } from "@/lib/utils";
import type {
  BookDetail,
  BookFormat,
  BookListResult,
  BookSort,
  BookSummary,
  Category,
  ChapterContent,
  ListBooksOptions,
  RenderMode,
} from "@/lib/types";

const PAGE_SIZE = 12;

const BOOK_SELECT = `
  id, title, author, description, cover_path, format, render_mode, chapter_count,
  page_count, word_count, created_at,
  book_categories(categories(id, name, slug))
`;

interface RawBookRow {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_path: string | null;
  format: BookFormat | null;
  render_mode: RenderMode | null;
  chapter_count: number | null;
  page_count: number | null;
  word_count: number | null;
  created_at: string;
  book_categories?: Array<{ categories: Category | null }> | null;
}

function publicCoverUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http")) return path;
  try {
    return getSupabasePublicClient().storage.from("covers").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

function flattenCategories(row: RawBookRow): Category[] {
  return (row.book_categories ?? [])
    .map((item) => item.categories)
    .filter((category): category is Category => Boolean(category));
}

export function mapBookRow(row: RawBookRow): BookSummary {
  const format = (row.format ?? "txt") as BookFormat;
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description ?? "",
    coverUrl: publicCoverUrl(row.cover_path),
    coverPath: row.cover_path,
    format,
    renderMode: row.render_mode ?? (format === "pdf" ? "pdf" : "text"),
    chapterCount: row.chapter_count ?? 0,
    pageCount: row.page_count,
    wordCount: row.word_count ?? 0,
    categories: flattenCategories(row),
    createdAt: row.created_at,
  };
}

function demoSummary(book: (typeof demoBooks)[number]): BookSummary {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    coverUrl: book.coverPath,
    coverPath: book.coverPath,
    format: book.format,
    renderMode: book.renderMode,
    chapterCount: book.chapterCount,
    pageCount: book.pageCount,
    wordCount: book.wordCount,
    categories: book.categories,
    createdAt: book.createdAt,
  };
}

function sortDemoBooks(
  books: typeof demoBooks,
  sort: BookSort,
): typeof demoBooks {
  const copy = [...books];
  switch (sort) {
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));
    case "words":
      return copy.sort((a, b) => b.wordCount - a.wordCount);
    default:
      return copy.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}

export async function listBooks(options: ListBooksOptions = {}): Promise<BookListResult> {
  const q = options.q?.trim() ?? "";
  const category = options.category?.trim() ?? "";
  const sort = options.sort ?? "recent";
  const page = Math.max(1, Number.isFinite(options.page) ? (options.page as number) : 1);
  const pageSize = Math.max(1, options.pageSize ?? PAGE_SIZE);

  if (!isSupabaseConfigured()) {
    let books = demoBooks;
    if (q) {
      const needle = q.toLowerCase();
      books = books.filter(
        (book) =>
          book.title.toLowerCase().includes(needle) ||
          book.author.toLowerCase().includes(needle),
      );
    }
    if (category) {
      books = books.filter((book) =>
        book.categories.some((item) => item.slug === category),
      );
    }
    const sorted = sortDemoBooks(books, sort);
    const total = sorted.length;
    const start = (page - 1) * pageSize;
    return {
      books: sorted.slice(start, start + pageSize).map(demoSummary),
      total,
      page,
      pageSize,
    };
  }

  const supabase = getSupabasePublicClient();
  let categoryBookIds: string[] | null = null;

  if (category) {
    const { data: categoryRow } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();

    if (!categoryRow) {
      return { books: [], total: 0, page, pageSize };
    }

    const { data: links } = await supabase
      .from("book_categories")
      .select("book_id")
      .eq("category_id", categoryRow.id);

    categoryBookIds = (links ?? []).map((link) => link.book_id as string);
    if (categoryBookIds.length === 0) {
      return { books: [], total: 0, page, pageSize };
    }
  }

  let query = supabase
    .from("books")
    .select(BOOK_SELECT, { count: "exact" })
    .eq("status", "ready");

  if (q) {
    query = query.ilike("search_text", `%${escapeLike(q)}%`);
  }
  if (categoryBookIds) {
    query = query.in("id", categoryBookIds);
  }

  switch (sort) {
    case "title":
      query = query.order("title", { ascending: true });
      break;
    case "words":
      query = query.order("word_count", { ascending: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const start = (page - 1) * pageSize;
  const { data, error, count } = await query.range(start, start + pageSize - 1);

  if (error) {
    console.error("listBooks failed", error.message);
    return { books: [], total: 0, page, pageSize };
  }

  return {
    books: (data ?? []).map((row) => mapBookRow(row as unknown as RawBookRow)),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAllCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return demoCategories;
  }
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });
  if (error) {
    console.error("getAllCategories failed", error.message);
    return [];
  }
  return (data ?? []) as Category[];
}

export async function getBookDetail(id: string): Promise<BookDetail | null> {
  if (!isSupabaseConfigured()) {
    const book = demoBooks.find((item) => item.id === id);
    if (!book) return null;
    return {
      ...demoSummary(book),
      chapters: book.chapters.map((item) => ({
        chapterNo: item.chapterNo,
        title: item.title,
        wordCount: item.wordCount,
      })),
    };
  }

  const supabase = getSupabasePublicClient();
  const { data: row, error } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("id", id)
    .eq("status", "ready")
    .maybeSingle();

  if (error || !row) return null;

  const { data: chapters } = await supabase
    .from("chapters")
    .select("chapter_no, title, word_count")
    .eq("book_id", id)
    .order("chapter_no", { ascending: true });

  const summary = mapBookRow(row as unknown as RawBookRow);

  return {
    ...summary,
    chapters: (chapters ?? []).map((item) => ({
      chapterNo: item.chapter_no as number,
      title: item.title as string,
      wordCount: (item.word_count as number) ?? 0,
    })),
  };
}

export async function getChapterContent(
  bookId: string,
  chapterNo: number,
): Promise<ChapterContent | null> {
  if (!isSupabaseConfigured()) {
    const book = demoBooks.find((item) => item.id === bookId);
    return book?.chapters.find((item) => item.chapterNo === chapterNo) ?? null;
  }

  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("chapter_no, title, content, word_count")
    .eq("book_id", bookId)
    .eq("chapter_no", chapterNo)
    .maybeSingle();

  if (error || !data) return null;
  return {
    chapterNo: data.chapter_no as number,
    title: data.title as string,
    content: data.content as string,
    wordCount: (data.word_count as number) ?? 0,
  };
}

export function demoBookFileUrl(id: string): string | null {
  return demoBooks.find((book) => book.id === id)?.fileUrl ?? null;
}

export function bookFormatLabel(format: BookFormat): string {
  return formatLabel(format);
}
