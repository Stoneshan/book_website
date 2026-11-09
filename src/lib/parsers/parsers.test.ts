import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import iconv from "iconv-lite";
import { parseTxt } from "./txt";
import { parseMarkdown } from "./markdown";
import { parseEpub } from "./epub";
import { parsePdf } from "./pdf";
import { sanitizeChapterHtml } from "./sanitize";

describe("txt parser", () => {
  it("splits UTF-8 Chinese chapter headings", () => {
    const text = "前言内容。\n\n第一章 初见\n第一段。\n\n第二段。\n\n第二章 再会\n这是第二章。\n";
    const parsed = parseTxt(Buffer.from(text, "utf8"), "测试.txt");
    expect(parsed.renderMode).toBe("text");
    expect(parsed.chapters.map((chapter) => chapter.title)).toEqual([
      "开篇",
      "第一章 初见",
      "第二章 再会",
    ]);
    expect(parsed.chapters[1].html).toContain("<p>第一段。</p>");
  });

  it("decodes GB18030 text", () => {
    const text = "第一章 春\n床前明月光。\n\n第二章 夏\n疑是地上霜。\n";
    const buffer = iconv.encode(text, "gb18030");
    const parsed = parseTxt(buffer, "gbk.txt");
    expect(parsed.chapters).toHaveLength(2);
    expect(parsed.chapters[0].title).toBe("第一章 春");
    expect(parsed.chapters[0].wordCount).toBeGreaterThan(0);
  });
});

describe("markdown parser", () => {
  it("splits headings and removes scripts", () => {
    const source = "# 第一章\n\n你好，**世界**。\n\n<script>alert(1)</script>\n\n## 第二章\n\n再见。\n";
    const parsed = parseMarkdown(Buffer.from(source, "utf8"), "笔记.md");
    expect(parsed.chapters).toHaveLength(2);
    expect(parsed.chapters[0].title).toBe("第一章");
    expect(parsed.chapters[0].html).toContain("<strong>世界</strong>");
    expect(parsed.chapters[0].html).not.toContain("script");
  });
});

async function buildEpub(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
    <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
    </container>`,
  );
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="utf-8"?>
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
      <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>测试之书</dc:title>
        <dc:creator>测试作者</dc:creator>
        <dc:description>一本测试书。</dc:description>
      </metadata>
      <manifest>
        <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
        <item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
        <item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
        <item id="cover" href="images/cover.png" media-type="image/png" properties="cover-image"/>
      </manifest>
      <spine><itemref idref="c1"/><itemref idref="c2"/></spine>
    </package>`,
  );
  zip.file(
    "OEBPS/nav.xhtml",
    `<html xmlns="http://www.w3.org/1999/xhtml"><body><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops">
      <ol><li><a href="text/ch1.xhtml">第一章 山</a></li><li><a href="text/ch2.xhtml">第二章 水</a></li></ol>
    </nav></body></html>`,
  );
  zip.file(
    "OEBPS/text/ch1.xhtml",
    `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>山</h1><p>山不在高。</p><script>alert(1)</script><img src="../images/x.png"/></body></html>`,
  );
  zip.file(
    "OEBPS/text/ch2.xhtml",
    `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>水</h1><p>水不在深。</p><p><a href="ch1.xhtml">回到第一章</a></p></body></html>`,
  );
  // 1x1 transparent PNG
  zip.file(
    "OEBPS/images/cover.png",
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("epub parser", () => {
  it("reads metadata, toc, chapters, cover and strips unsafe html", async () => {
    const parsed = await parseEpub(await buildEpub(), "测试.epub");
    expect(parsed.title).toBe("测试之书");
    expect(parsed.author).toBe("测试作者");
    expect(parsed.chapters).toHaveLength(2);
    expect(parsed.chapters[0].title).toBe("第一章 山");
    expect(parsed.chapters[0].html).toContain("山不在高");
    expect(parsed.chapters[0].html).not.toContain("script");
    expect(parsed.chapters[0].html).not.toContain("<img");
    expect(parsed.cover?.ext).toBe("png");
  });
});

describe("sanitizer", () => {
  it("removes xss payloads and unsafe links", () => {
    const html = sanitizeChapterHtml(
      `<p onclick="alert(1)">安全<script>alert(1)</script><iframe src="x"></iframe><a href="javascript:alert(1)">x</a><a href="https://example.com">y</a></p>`,
    );
    expect(html).toContain("安全");
    expect(html).not.toContain("script");
    expect(html).not.toContain("iframe");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
});

describe("pdf parser", () => {
  it("counts pages in the demo pdf", async () => {
    const buffer = readFileSync(path.join(process.cwd(), "public", "demo", "sample.pdf"));
    const parsed = await parsePdf(buffer, "sample.pdf");
    expect(parsed.renderMode).toBe("pdf");
    expect(parsed.pageCount).toBe(6);
  });
});
