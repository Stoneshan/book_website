import { PDFDocument } from "pdf-lib";
import { titleFromFileName, type ParsedPdfBook } from "./types";

export async function parsePdf(buffer: Buffer, fileName: string): Promise<ParsedPdfBook> {
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(buffer, { updateMetadata: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/encrypt/i.test(message)) {
      throw new Error("这个 PDF 已加密，无法读取。请上传未加密的 PDF。");
    }
    throw new Error("PDF 文件无法解析，可能已损坏。");
  }

  const pageCount = document.getPageCount();
  if (!pageCount || pageCount < 1) {
    throw new Error("PDF 没有可阅读的页面。");
  }
  if (pageCount > 5000) {
    throw new Error("PDF 页数过多（超过 5000 页），暂不支持。");
  }

  return {
    renderMode: "pdf",
    title: document.getTitle()?.trim() || titleFromFileName(fileName),
    author: document.getAuthor()?.trim() || undefined,
    pageCount,
    chapters: [],
    wordCount: 0,
  };
}
