import { marked } from "marked";
import { sanitizeChapterHtml } from "./sanitize";
import {
  encodeChapter,
  MAX_CHAPTERS,
  titleFromFileName,
  type ParsedChapter,
  type ParsedTextBook,
} from "./types";

interface Section {
  title: string;
  markdown: string;
}

const HEADING = /^(#{1,2})\s+(.+?)\s*$/;

function splitSections(markdown: string): Section[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const sections: Section[] = [];
  let current: Section = { title: "前言", markdown: "" };
  let found = false;

  for (const line of lines) {
    const match = line.match(HEADING);
    if (match) {
      if (current.markdown.trim()) sections.push(current);
      current = { title: match[2].trim(), markdown: "" };
      found = true;
    } else {
      current.markdown += `${line}\n`;
    }
  }
  if (current.markdown.trim()) sections.push(current);

  if (!found) {
    return [{ title: "正文", markdown }];
  }
  return sections;
}

export function parseMarkdown(buffer: Buffer, fileName: string): ParsedTextBook {
  const source = buffer.toString("utf8").replace(/^﻿/, "");
  if (!source.trim()) {
    throw new Error("Markdown 文件是空的。");
  }

  const sections = splitSections(source);
  if (sections.length > MAX_CHAPTERS) {
    throw new Error(`章节数量超过 ${MAX_CHAPTERS}，请拆分文件后再上传。`);
  }

  const chapters: ParsedChapter[] = sections
    .map((section, index) => {
      const rendered = marked.parse(section.markdown, { async: false }) as string;
      const html = sanitizeChapterHtml(rendered);
      if (!html.trim()) return null;
      return encodeChapter(index + 1, section.title, html);
    })
    .filter((chapter): chapter is ParsedChapter => chapter !== null)
    .map((chapter, index) => ({ ...chapter, chapterNo: index + 1 }));

  if (chapters.length === 0) {
    throw new Error("未能从 Markdown 中解析出正文。");
  }

  return {
    renderMode: "text",
    title: titleFromFileName(fileName),
    chapters,
    wordCount: chapters.reduce((total, chapter) => total + chapter.wordCount, 0),
  };
}
