export interface ParsedCover {
  buffer: Buffer;
  contentType: string;
  ext: "jpg" | "png" | "webp";
}

export interface ParsedChapter {
  chapterNo: number;
  title: string;
  html: string;
  wordCount: number;
}

export interface ParsedTextBook {
  renderMode: "text";
  title?: string;
  author?: string;
  description?: string;
  chapters: ParsedChapter[];
  wordCount: number;
  cover?: ParsedCover;
}

export interface ParsedPdfBook {
  renderMode: "pdf";
  title?: string;
  author?: string;
  description?: string;
  chapters: [];
  wordCount: 0;
  pageCount: number;
  cover?: ParsedCover;
}

export type ParsedBook = ParsedTextBook | ParsedPdfBook;

export const MAX_CHAPTERS = 2000;
export const MAX_CHAPTER_HTML = 1024 * 1024;

export function countWords(html: string): number {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z#0-9]+;/gi, "")
    .replace(/\s/g, "")
    .length;
}

export function encodeChapter(
  chapterNo: number,
  title: string,
  html: string,
): ParsedChapter {
  if (html.length > MAX_CHAPTER_HTML) {
    throw new Error(`章节「${title}」内容过大，无法导入。`);
  }
  return { chapterNo, title: title.trim() || `第 ${chapterNo} 章`, html, wordCount: countWords(html) };
}

export function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, 200);
}
