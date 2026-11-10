export const FREE_PREVIEW_PAGES = 20;
export const CHARS_PER_PAGE = 800;
export const FREE_PREVIEW_CHARS = FREE_PREVIEW_PAGES * CHARS_PER_PAGE;

export interface ChapterPreview {
  /** 1-based page on which this chapter starts. */
  startPage: number;
  /** 1-based page on which this chapter ends. */
  endPage: number;
  /** Number of characters a guest may read, or null for the whole chapter. */
  allowedChars: number | null;
  /** True when the chapter starts after the free preview ends. */
  locked: boolean;
  /** True when the chapter starts inside the preview but ends after it. */
  truncated: boolean;
}

interface ChapterInfo {
  chapterNo: number;
  wordCount: number;
}

export function previewForChapter(
  chapters: ChapterInfo[],
  chapterNo: number,
  freeChars: number = FREE_PREVIEW_CHARS,
  charsPerPage: number = CHARS_PER_PAGE,
): ChapterPreview | null {
  const safeCharsPerPage = Math.max(1, charsPerPage);
  const safeFreeChars = Math.max(0, freeChars);
  let charsBefore = 0;

  for (const chapter of chapters) {
    const chars = Math.max(0, chapter.wordCount);
    if (chapter.chapterNo === chapterNo) {
      const startPage = Math.floor(charsBefore / safeCharsPerPage) + 1;
      const endPage = Math.max(startPage, Math.ceil((charsBefore + chars) / safeCharsPerPage));

      if (charsBefore >= safeFreeChars) {
        return { startPage, endPage, allowedChars: 0, locked: true, truncated: false };
      }

      const remaining = safeFreeChars - charsBefore;
      if (chars > remaining) {
        return {
          startPage,
          endPage,
          allowedChars: remaining,
          locked: false,
          truncated: true,
        };
      }

      return { startPage, endPage, allowedChars: null, locked: false, truncated: false };
    }

    charsBefore += chars;
  }

  return null;
}

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/**
 * Cuts sanitized chapter HTML after `maxChars` visible characters and closes
 * any tags left open. Whitespace and tags are not counted, entities count as
 * one character.
 */
export function truncateHtml(
  html: string,
  maxChars: number,
): { html: string; truncated: boolean } {
  if (maxChars <= 0) {
    return { html: "", truncated: html.length > 0 };
  }

  let visible = 0;
  let index = 0;
  let inTag = false;
  let cut = html.length;

  while (index < html.length) {
    const char = html[index];

    if (inTag) {
      if (char === ">") inTag = false;
      index += 1;
      continue;
    }

    if (char === "<") {
      inTag = true;
      index += 1;
      continue;
    }

    if (char === "&") {
      const semi = html.indexOf(";", index + 1);
      if (semi !== -1 && semi - index <= 10) {
        visible += 1;
        index = semi + 1;
        if (visible > maxChars) {
          cut = index;
          break;
        }
        continue;
      }
    }

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    visible += 1;
    if (visible > maxChars) {
      cut = index;
      break;
    }
    index += 1;
  }

  if (visible <= maxChars) {
    return { html, truncated: false };
  }

  const output = html.slice(0, cut);
  const stack: string[] = [];
  const tagPattern = /<(\/?)([a-zA-Z][\w:-]*)([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(output)) !== null) {
    const closing = match[1] === "/";
    const name = match[2].toLowerCase();
    const selfClosing = /\/\s*$/.test(match[3]);

    if (closing) {
      const position = stack.lastIndexOf(name);
      if (position !== -1) stack.splice(position, 1);
    } else if (!selfClosing && !VOID_TAGS.has(name)) {
      stack.push(name);
    }
  }

  let closed = output;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    closed += `</${stack[i]}>`;
  }

  return { html: closed, truncated: true };
}
