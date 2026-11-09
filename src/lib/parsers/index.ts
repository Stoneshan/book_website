import { parseEpub } from "./epub";
import { parseMarkdown } from "./markdown";
import { parseMobi } from "./mobi";
import { parsePdf } from "./pdf";
import { parseTxt } from "./txt";
import type { ParsedBook } from "./types";

export type BookFormat = "txt" | "md" | "epub" | "mobi" | "azw3" | "pdf";

export const SUPPORTED_FORMATS: BookFormat[] = [
  "txt",
  "md",
  "epub",
  "mobi",
  "azw3",
  "pdf",
];

export function formatFromFileName(fileName: string): BookFormat | null {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!match) return null;
  const candidate = match[1] as BookFormat;
  return SUPPORTED_FORMATS.includes(candidate) ? candidate : null;
}

export function validateMagic(buffer: Buffer, format: BookFormat): void {
  if (buffer.length === 0) {
    throw new Error("文件是空的。");
  }

  if (format === "pdf") {
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("文件内容不是有效的 PDF。");
    }
    return;
  }

  if (format === "epub") {
    if (!(buffer[0] === 0x50 && buffer[1] === 0x4b)) {
      throw new Error("文件内容不是有效的 EPUB（ZIP）包。");
    }
    return;
  }

  if (format === "mobi" || format === "azw3") {
    const header = buffer.subarray(0, 68).toString("latin1");
    const isPalmDoc = header.startsWith("TEXtREAd");
    const isBookMobi = buffer.length >= 68 && buffer.subarray(60, 68).toString("latin1") === "BOOKMOBI";
    if (!isPalmDoc && !isBookMobi) {
      throw new Error("文件内容不是有效的 MOBI/AZW3。");
    }
    return;
  }

  // Plain text formats: reject obvious binaries.
  const sample = buffer.subarray(0, 2048);
  if (sample.includes(0)) {
    throw new Error("这个文件看起来是二进制文件，不是文本。");
  }
}

export async function parseBook(
  buffer: Buffer,
  format: BookFormat,
  fileName: string,
): Promise<ParsedBook> {
  validateMagic(buffer, format);

  switch (format) {
    case "txt":
      return parseTxt(buffer, fileName);
    case "md":
      return parseMarkdown(buffer, fileName);
    case "epub":
      return parseEpub(buffer, fileName);
    case "mobi":
    case "azw3":
      return parseMobi(buffer, fileName, format);
    case "pdf":
      return parsePdf(buffer, fileName);
    default:
      throw new Error("暂不支持这种文件格式。");
  }
}
