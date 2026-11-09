import path from "node:path";
import JSZip from "jszip";
import * as cheerio from "cheerio";
import { htmlToPlainText, sanitizeChapterHtml } from "./sanitize";
import {
  encodeChapter,
  MAX_CHAPTERS,
  titleFromFileName,
  type ParsedChapter,
  type ParsedCover,
  type ParsedTextBook,
} from "./types";

const MAX_ENTRIES = 3000;
const MAX_ENTRY_SIZE = 20 * 1024 * 1024;
const MAX_TOTAL_SIZE = 200 * 1024 * 1024;
const LONG_CHAPTER_CHARS = 30000;

interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties: string;
  target: string;
}

function resolveTarget(baseDir: string, href: string): string {
  let clean = href.split("#")[0].split("?")[0];
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // Keep the raw value when decoding fails.
  }
  clean = clean.replace(/^\.?\//, "");
  const joined = baseDir
    ? path.posix.normalize(path.posix.join(baseDir, clean))
    : path.posix.normalize(clean);
  return joined.replace(/^\/+/, "");
}

function extFromMime(mime: string): ParsedCover["ext"] | null {
  const value = mime.toLowerCase();
  if (value.includes("jpeg") || value.includes("jpg")) return "jpg";
  if (value.includes("png")) return "png";
  if (value.includes("webp")) return "webp";
  return null;
}

function extFromPath(value: string): ParsedCover["ext"] | null {
  const clean = value.split("?")[0].toLowerCase();
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg")) return "jpg";
  if (clean.endsWith(".png")) return "png";
  if (clean.endsWith(".webp")) return "webp";
  return null;
}

function mimeFromExt(ext: ParsedCover["ext"]): string {
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
}

function splitLongHtml(html: string, fallbackTitle: string): Array<{ title: string; html: string }> {
  const parts = html.split(/(?=<h[1-3][\s>])/i).filter((part) => htmlToPlainText(part).trim());
  if (parts.length <= 1) return [{ title: fallbackTitle, html }];

  return parts
    .map((part) => {
      const match = part.match(/^\s*<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
      const title = match ? htmlToPlainText(match[2]).trim() : "";
      const content = match ? part.slice(match[0].length) : part;
      return { title: title || fallbackTitle, html: content };
    })
    .filter((part) => htmlToPlainText(part.html).trim());
}

export async function parseEpub(buffer: Buffer, fileName: string): Promise<ParsedTextBook> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("EPUB 文件无法解压，可能已损坏。");
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length > MAX_ENTRIES) {
    throw new Error("EPUB 压缩包条目过多，已拒绝解析。");
  }

  let totalSize = 0;
  for (const entry of entries) {
    const size =
      (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    if (size > MAX_ENTRY_SIZE) {
      throw new Error("EPUB 内存在超大文件，已拒绝解析。");
    }
    totalSize += size;
  }
  if (totalSize > MAX_TOTAL_SIZE) {
    throw new Error("EPUB 解压后体积过大，已拒绝解析。");
  }

  const keyMap = new Map(Object.keys(zip.files).map((key) => [key.toLowerCase(), key]));

  async function readText(target: string): Promise<string | null> {
    const entry = zip.file(target) ?? zip.file(keyMap.get(target.toLowerCase()) ?? "");
    return entry ? entry.async("string") : null;
  }

  async function readBuffer(target: string): Promise<Buffer | null> {
    const entry = zip.file(target) ?? zip.file(keyMap.get(target.toLowerCase()) ?? "");
    return entry ? ((await entry.async("nodebuffer")) as Buffer) : null;
  }

  const encryption = await readText("META-INF/encryption.xml");
  if (encryption) {
    const lower = encryption.toLowerCase();
    if (lower.includes(".xhtml") || lower.includes(".html") || lower.includes(".opf")) {
      throw new Error("这个 EPUB 受 DRM 保护或正文已加密，无法解析。");
    }
  }

  const containerXml = await readText("META-INF/container.xml");
  let opfPath = "";
  if (containerXml) {
    const $container = cheerio.load(containerXml, { xmlMode: true });
    opfPath = $container("rootfile").first().attr("full-path") ?? "";
  }
  if (!opfPath) {
    opfPath = entries.map((entry) => entry.name).find((name) => name.toLowerCase().endsWith(".opf")) ?? "";
  }
  if (!opfPath) {
    throw new Error("EPUB 缺少 OPF 文件，无法解析。");
  }
  opfPath = opfPath.replace(/^\/+/, "");
  const opfDir = path.posix.dirname(opfPath) === "." ? "" : path.posix.dirname(opfPath);
  const opf = await readText(opfPath);
  if (!opf) {
    throw new Error("EPUB 的 OPF 文件无法读取。");
  }

  const $ = cheerio.load(opf, { xmlMode: true });

  const title =
    $("dc\\:title").first().text().trim() || titleFromFileName(fileName);
  const authors = $("dc\\:creator")
    .toArray()
    .map((element) => $(element).text().trim())
    .filter(Boolean);
  const description = htmlToPlainText($("dc\\:description").first().text().trim()).slice(0, 1200);

  const manifest = new Map<string, ManifestItem>();
  $("manifest")
    .find("item")
    .each((_, element) => {
      const id = $(element).attr("id") ?? "";
      const href = $(element).attr("href") ?? "";
      const mediaType = $(element).attr("media-type") ?? "";
      const properties = $(element).attr("properties") ?? "";
      if (!id || !href) return;
      manifest.set(id, {
        id,
        href,
        mediaType,
        properties,
        target: resolveTarget(opfDir, href),
      });
    });

  const spineIds: string[] = [];
  $("spine")
    .find("itemref")
    .each((_, element) => {
      const idref = $(element).attr("idref");
      if (idref) spineIds.push(idref);
    });

  const titleMap = new Map<string, string>();

  const navItem = [...manifest.values()].find((item) => item.properties.split(/\s+/).includes("nav"));
  if (navItem) {
    const navHtml = await readText(navItem.target);
    if (navHtml) {
      const $nav = cheerio.load(navHtml);
      $nav("a").each((_, element) => {
        const href = $nav(element).attr("href");
        const label = $nav(element).text().replace(/\s+/g, " ").trim();
        if (!href || !label) return;
        const target = resolveTarget(path.posix.dirname(navItem.target), href);
        if (!titleMap.has(target)) titleMap.set(target, label);
      });
    }
  }

  const ncxId =
    $("spine").attr("toc") ??
    [...manifest.values()].find(
      (item) => item.mediaType === "application/x-dtbncx+xml" || item.target.endsWith(".ncx"),
    )?.id;
  if (ncxId) {
    const ncxItem = manifest.get(ncxId);
    if (ncxItem) {
      const ncxXml = await readText(ncxItem.target);
      if (ncxXml) {
        const $ncx = cheerio.load(ncxXml, { xmlMode: true });
        $ncx("navPoint").each((_, element) => {
          const label = $ncx(element).find("navLabel").first().text().replace(/\s+/g, " ").trim();
          const src = $ncx(element).find("content").first().attr("src");
          if (!label || !src) return;
          const target = resolveTarget(path.posix.dirname(ncxItem.target), src);
          if (!titleMap.has(target)) titleMap.set(target, label);
        });
      }
    }
  }

  const coverMeta = $('meta[name="cover"]').attr("content");
  const coverItem =
    [...manifest.values()].find((item) => item.properties.split(/\s+/).includes("cover-image")) ??
    (coverMeta ? manifest.get(coverMeta) : undefined) ??
    [...manifest.values()].find(
      (item) =>
        item.mediaType.startsWith("image/") &&
        (item.id.toLowerCase().includes("cover") || item.target.toLowerCase().includes("cover")),
    );

  let cover: ParsedCover | undefined;
  if (coverItem) {
    const ext = extFromMime(coverItem.mediaType) ?? extFromPath(coverItem.target);
    if (ext) {
      const coverBuffer = await readBuffer(coverItem.target);
      if (coverBuffer) {
        cover = { buffer: coverBuffer, ext, contentType: mimeFromExt(ext) };
      }
    }
  }

  const chapters: ParsedChapter[] = [];

  for (const idref of spineIds) {
    const item = manifest.get(idref);
    if (!item) continue;
    if (!/html/i.test(item.mediaType) && !/\.x?html?$/i.test(item.target)) continue;
    if (item.properties.split(/\s+/).includes("nav")) continue;
    if (/(^|\/)nav[^/]*\.x?html?$/i.test(item.target)) continue;

    const source = await readText(item.target);
    if (!source) continue;

    const $doc = cheerio.load(source);
    $doc("script, style, link, iframe, object, embed, form, input, img, svg, video, audio").remove();

    const $body = $doc("body");
    const heading = $body.find("h1, h2, h3").first();
    const headingText = heading.text().replace(/\s+/g, " ").trim();
    if (heading.length > 0) heading.remove();

    const bodyHtml = $body.html() ?? $doc.root().html() ?? "";
    if (!htmlToPlainText(bodyHtml).trim()) continue;

    const fallbackTitle =
      titleMap.get(item.target) ||
      headingText ||
      `第 ${chapters.length + 1} 章`;

    const chunks =
      htmlToPlainText(bodyHtml).length > LONG_CHAPTER_CHARS
        ? splitLongHtml(bodyHtml, fallbackTitle)
        : [{ title: fallbackTitle, html: bodyHtml }];

    for (const chunk of chunks) {
      const html = sanitizeChapterHtml(chunk.html);
      if (!htmlToPlainText(html).trim()) continue;
      if (chapters.length >= MAX_CHAPTERS) {
        throw new Error(`章节数量超过 ${MAX_CHAPTERS}，请拆分文件后再上传。`);
      }
      chapters.push(encodeChapter(chapters.length + 1, chunk.title, html));
    }
  }

  if (chapters.length === 0) {
    throw new Error("未能从 EPUB 中解析出正文，可能是不支持的排版或受 DRM 保护。");
  }

  return {
    renderMode: "text",
    title: title || titleFromFileName(fileName),
    author: authors.join("、") || undefined,
    description: description || undefined,
    chapters,
    wordCount: chapters.reduce((total, chapter) => total + chapter.wordCount, 0),
    cover,
  };
}
