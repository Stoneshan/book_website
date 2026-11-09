import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { Kf8, Mobi, MobiTocItem, Kf8TocItem } from "@lingo-reader/mobi-parser";
import { htmlToPlainText, sanitizeChapterHtml } from "./sanitize";
import {
  encodeChapter,
  MAX_CHAPTERS,
  titleFromFileName,
  type ParsedChapter,
  type ParsedCover,
  type ParsedTextBook,
} from "./types";

type MobiInstance = Mobi | Kf8;
type TocItem = MobiTocItem | Kf8TocItem;

interface ExtractedBook {
  title?: string;
  author?: string;
  description?: string;
  chapters: ParsedChapter[];
  wordCount: number;
  cover?: ParsedCover;
}

function detectImage(buffer: Buffer): ParsedCover["ext"] | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

function mimeFromExt(ext: ParsedCover["ext"]): string {
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
}

function readCover(value: string): ParsedCover | undefined {
  if (!value) return undefined;
  try {
    if (value.startsWith("data:")) {
      const match = value.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
      if (!match) return undefined;
      const buffer = Buffer.from(match[2], "base64");
      const ext = detectImage(buffer);
      if (!ext) return undefined;
      return { buffer, ext, contentType: mimeFromExt(ext) };
    }

    if (value.startsWith("blob:") || value.startsWith("http")) return undefined;

    let filePath = value;
    if (filePath.startsWith("file://")) {
      filePath = decodeURIComponent(filePath.replace("file://", ""));
    }
    if (!fs.existsSync(filePath)) return undefined;
    const buffer = fs.readFileSync(filePath);
    const ext = detectImage(buffer);
    if (!ext) return undefined;
    return { buffer, ext, contentType: mimeFromExt(ext) };
  } catch {
    return undefined;
  }
}

function flattenToc(instance: MobiInstance): Map<string, string> {
  const titles = new Map<string, string>();
  const walk = (items: TocItem[]) => {
    for (const item of items) {
      if (item.label && item.href) {
        try {
          const resolved = instance.resolveHref(item.href);
          if (resolved?.id && !titles.has(resolved.id)) {
            titles.set(resolved.id, item.label.replace(/\s+/g, " ").trim());
          }
        } catch {
          // Ignore broken TOC entries.
        }
      }
      if (item.children && item.children.length > 0) {
        walk(item.children);
      }
    }
  };
  try {
    walk(instance.getToc() as TocItem[]);
  } catch {
    // TOC is optional.
  }
  return titles;
}

function headingTitle(html: string): string {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  return match ? htmlToPlainText(match[1]).replace(/\s+/g, " ").trim() : "";
}

function extractBook(instance: MobiInstance): ExtractedBook {
  let metadata: ReturnType<MobiInstance["getMetadata"]> | null = null;
  try {
    metadata = instance.getMetadata();
  } catch {
    metadata = null;
  }

  const titleMap = flattenToc(instance);
  const spine = instance.getSpine() as Array<{ id: string }>;
  const chapters: ParsedChapter[] = [];

  for (const item of spine) {
    let html = "";
    try {
      const chapter = instance.loadChapter(item.id);
      html = chapter?.html ?? "";
    } catch {
      continue;
    }
    if (!html || !htmlToPlainText(html).trim()) continue;

    const htmlTitle = headingTitle(html);
    const title = titleMap.get(item.id) || htmlTitle || `第 ${chapters.length + 1} 章`;

    const withoutHeading = html.replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/i, "");
    let sanitized = sanitizeChapterHtml(withoutHeading);
    if (!htmlToPlainText(sanitized).trim()) {
      sanitized = sanitizeChapterHtml(html);
    }
    if (!htmlToPlainText(sanitized).trim()) continue;
    if (chapters.length >= MAX_CHAPTERS) {
      throw new Error(`章节数量超过 ${MAX_CHAPTERS}，请拆分文件后再上传。`);
    }
    chapters.push(encodeChapter(chapters.length + 1, title, sanitized));
  }

  let cover: ParsedCover | undefined;
  try {
    cover = readCover(instance.getCoverImage());
  } catch {
    cover = undefined;
  }

  return {
    title: metadata?.title?.trim() || undefined,
    author: metadata?.author?.filter(Boolean).join("、") || undefined,
    description: metadata?.description?.trim().slice(0, 1200) || undefined,
    chapters,
    wordCount: chapters.reduce((total, chapter) => total + chapter.wordCount, 0),
    cover,
  };
}

interface ReplacePrototype {
  replace?: (input: string) => unknown;
  __moyuePatched?: boolean;
}

/**
 * KF8 files from some converters contain <link> tags whose href is not a
 * kindle: resource. The upstream parser throws on those. We keep the original
 * behavior but fall back to the raw body so the chapter text remains readable.
 */
function patchResourceReplacement(instance: MobiInstance): void {
  const prototype = Object.getPrototypeOf(instance) as ReplacePrototype;
  if (!prototype?.replace || prototype.__moyuePatched) return;

  const original = prototype.replace;
  prototype.replace = function patchedReplace(this: unknown, input: string) {
    try {
      return original.call(this, input);
    } catch {
      const body = input.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? input;
      return { html: body, css: [] };
    }
  };
  prototype.__moyuePatched = true;
}

export async function parseMobi(
  buffer: Buffer,
  fileName: string,
  format: "mobi" | "azw3",
): Promise<ParsedTextBook> {
  const parser = await import("@lingo-reader/mobi-parser");
  const tempDir = path.join(os.tmpdir(), `moyue-mobi-${crypto.randomUUID()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  let lastError: unknown = null;
  let extracted: ExtractedBook | null = null;

  try {
    const input = new Uint8Array(buffer);
    const candidates =
      format === "azw3"
        ? [parser.initKf8File, parser.initMobiFile]
        : [parser.initKf8File, parser.initMobiFile];

    for (const init of candidates) {
      let instance: MobiInstance | null = null;
      try {
        instance = await init(input, tempDir);
        patchResourceReplacement(instance);
        const result = extractBook(instance);
        // A KF8 parser applied to a legacy MOBI often returns only the cover
        // page; require a plausible amount of text before accepting it.
        if (result.chapters.length > 1 || result.wordCount > 500) {
          extracted = result;
          break;
        }
        lastError = new Error("解析结果为空或只有封面页。");
      } catch (error) {
        lastError = error;
      } finally {
        try {
          instance?.destroy();
        } catch {
          // Ignore cleanup errors.
        }
      }
    }

    if (!extracted) {
      const message = lastError instanceof Error ? lastError.message : "";
      if (/drm|encrypt|encrypted/i.test(message)) {
        throw new Error("这个 MOBI/AZW3 受 DRM 保护，无法解析。");
      }
      throw new Error("MOBI/AZW3 文件无法解析，可能已损坏或格式不受支持。");
    }

    return {
      renderMode: "text",
      title: extracted.title || titleFromFileName(fileName),
      author: extracted.author,
      description: extracted.description,
      chapters: extracted.chapters,
      wordCount: extracted.wordCount,
      cover: extracted.cover,
    };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors.
    }
  }
}
