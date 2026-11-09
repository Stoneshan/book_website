import chardet from "chardet";
import iconv from "iconv-lite";
import { escapeHtml } from "./sanitize";
import {
  encodeChapter,
  MAX_CHAPTERS,
  titleFromFileName,
  type ParsedChapter,
  type ParsedTextBook,
} from "./types";

const HEADING_PATTERN =
  /^\s*(第[零〇一二三四五六七八九十百千万两0-9]+[章节回卷部篇][^\n]{0,40}|序章|楔子|尾声|后记|番外[^\n]{0,30}|Chapter\s+\d+[^\n]{0,60})\s*$/i;

function normalizeEncoding(encoding: string | null): string {
  const value = (encoding ?? "utf-8").toLowerCase();
  if (value.includes("gb") || value.includes("big5") || value.includes("euc-cn")) {
    return "gb18030";
  }
  if (value.includes("utf-16")) return "utf-16le";
  if (value.includes("ascii")) return "utf-8";
  return value;
}

export function decodeTextBuffer(buffer: Buffer): string {
  const withBom = (value: string) => value.replace(/﻿/g, "");

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return withBom(iconv.decode(buffer.subarray(3), "utf-8"));
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return withBom(iconv.decode(buffer.subarray(2), "utf-16le"));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return withBom(iconv.decode(buffer.subarray(2), "utf-16be"));
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // Fall through to charset detection for GBK / Big5 files.
  }

  const encoding = normalizeEncoding(chardet.detect(buffer));
  try {
    return withBom(iconv.decode(buffer, encoding));
  } catch {
    return withBom(iconv.decode(buffer, "utf-8"));
  }
}

interface Section {
  title: string;
  lines: string[];
}

function splitByHeadings(text: string): Section[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections: Section[] = [];
  let current: Section = { title: "开篇", lines: [] };
  let foundHeading = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length <= 80 && HEADING_PATTERN.test(trimmed)) {
      if (current.lines.some((item) => item.trim())) {
        sections.push(current);
      }
      current = { title: trimmed, lines: [] };
      foundHeading = true;
    } else {
      current.lines.push(line);
    }
  }

  if (current.lines.some((item) => item.trim()) || sections.length === 0) {
    sections.push(current);
  }

  if (!foundHeading) {
    return [];
  }

  return sections.filter((section) => section.lines.some((line) => line.trim()));
}

function linesToHtml(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function chunkByLength(text: string): Section[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  const sections: Section[] = [];
  let buffer: string[] = [];
  let length = 0;
  let index = 1;

  const flush = () => {
    if (buffer.length === 0) return;
    sections.push({ title: `第 ${index} 节`, lines: buffer });
    index += 1;
    buffer = [];
    length = 0;
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > 8000) {
      flush();
      for (let start = 0; start < paragraph.length; start += 7000) {
        sections.push({
          title: `第 ${index} 节`,
          lines: [paragraph.slice(start, start + 7000)],
        });
        index += 1;
      }
      continue;
    }

    if (length + paragraph.length > 7000) {
      flush();
    }
    buffer.push(paragraph);
    length += paragraph.length;
  }
  flush();

  if (sections.length === 1) {
    sections[0].title = "正文";
  }

  return sections;
}

export function parseTxt(buffer: Buffer, fileName: string): ParsedTextBook {
  const text = decodeTextBuffer(buffer);
  if (!text.trim()) {
    throw new Error("TXT 文件是空的。");
  }

  let sections = splitByHeadings(text);
  if (sections.length === 0) {
    sections = chunkByLength(text);
  }

  if (sections.length > MAX_CHAPTERS) {
    throw new Error(`章节数量超过 ${MAX_CHAPTERS}，请拆分文件后再上传。`);
  }

  const chapters: ParsedChapter[] = sections
    .map((section, index) => {
      const html = linesToHtml(section.lines);
      if (!html) return null;
      return encodeChapter(index + 1, section.title, html);
    })
    .filter((chapter): chapter is ParsedChapter => chapter !== null)
    .map((chapter, index) => ({ ...chapter, chapterNo: index + 1 }));

  if (chapters.length === 0) {
    throw new Error("未能从 TXT 中解析出正文。");
  }

  return {
    renderMode: "text",
    title: titleFromFileName(fileName),
    chapters,
    wordCount: chapters.reduce((total, chapter) => total + chapter.wordCount, 0),
  };
}
