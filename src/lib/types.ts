export type BookFormat = "txt" | "md" | "epub" | "mobi" | "azw3" | "pdf";
export type RenderMode = "text" | "pdf";
export type BookStatus = "uploading" | "parsing" | "ready" | "failed";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string | null;
  coverPath: string | null;
  format: BookFormat;
  renderMode: RenderMode;
  chapterCount: number;
  pageCount: number | null;
  wordCount: number;
  categories: Category[];
  createdAt: string;
}

export interface ChapterListItem {
  chapterNo: number;
  title: string;
  wordCount: number;
}

export interface BookDetail extends BookSummary {
  chapters: ChapterListItem[];
}

export interface ChapterContent {
  chapterNo: number;
  title: string;
  content: string;
  wordCount: number;
}

export interface BookListResult {
  books: BookSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export type BookSort = "recent" | "title" | "words";

export interface ListBooksOptions {
  q?: string;
  category?: string;
  sort?: BookSort;
  page?: number;
  pageSize?: number;
}
