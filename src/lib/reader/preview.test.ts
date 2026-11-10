import { describe, expect, it } from "vitest";
import {
  CHARS_PER_PAGE,
  FREE_PREVIEW_CHARS,
  previewForChapter,
  truncateHtml,
} from "./preview";

const chapters = [
  { chapterNo: 1, wordCount: 8000 },
  { chapterNo: 2, wordCount: 8000 },
  { chapterNo: 3, wordCount: 8000 },
];

describe("previewForChapter", () => {
  it("keeps chapters inside the free preview fully readable", () => {
    expect(previewForChapter(chapters, 1)).toMatchObject({
      startPage: 1,
      locked: false,
      truncated: false,
      allowedChars: null,
    });
    expect(previewForChapter(chapters, 2)).toMatchObject({
      startPage: 11,
      locked: false,
      truncated: false,
      allowedChars: null,
    });
  });

  it("locks chapters that start after the free preview", () => {
    expect(previewForChapter(chapters, 3)).toMatchObject({
      startPage: 21,
      locked: true,
      truncated: false,
      allowedChars: 0,
    });
  });

  it("truncates a chapter that crosses the preview boundary", () => {
    const result = previewForChapter(
      [
        { chapterNo: 1, wordCount: 10000 },
        { chapterNo: 2, wordCount: 10000 },
      ],
      2,
    );
    expect(result).toMatchObject({
      startPage: 13,
      locked: false,
      truncated: true,
      allowedChars: FREE_PREVIEW_CHARS - 10000,
    });
  });

  it("returns null for an unknown chapter", () => {
    expect(previewForChapter(chapters, 99)).toBeNull();
  });

  it("uses the default page size", () => {
    expect(CHARS_PER_PAGE).toBe(800);
    expect(FREE_PREVIEW_CHARS).toBe(16000);
  });
});

describe("truncateHtml", () => {
  it("counts visible characters only and closes open tags", () => {
    const result = truncateHtml("<p>abc</p><p>def</p>", 4);
    expect(result.truncated).toBe(true);
    expect(result.html).toBe("<p>abc</p><p>d</p>");
  });

  it("keeps nested tags balanced", () => {
    const result = truncateHtml("<p><strong>abc</strong>def</p>", 4);
    expect(result.html).toBe("<p><strong>abc</strong>d</p>");
  });

  it("does not count whitespace between paragraphs", () => {
    const result = truncateHtml("<p>ab cd</p>\n<p>efgh</p>", 4);
    expect(result.html).toBe("<p>ab cd</p>\n<p></p>");
  });

  it("returns the original html when it is short enough", () => {
    const html = "<p>只有一点文字</p>";
    expect(truncateHtml(html, 100)).toEqual({ html, truncated: false });
  });

  it("returns an empty string for a zero limit", () => {
    expect(truncateHtml("<p>abc</p>", 0)).toEqual({ html: "", truncated: true });
  });
});
