import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { demoBooks, demoCategories } from "../src/lib/demo/books";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const secret = (
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  ""
).trim();

if (!url || !secret) {
  console.error(
    "缺少 Supabase 配置。请先把 .env.example 复制为 .env.local，并填写 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SECRET_KEY。",
  );
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function seed() {
  console.log("[seed] 写入分类…");
  const categoryIds = new Map<string, string>();

  for (const category of demoCategories) {
    const { data, error } = await supabase
      .from("categories")
      .upsert({ name: category.name, slug: category.slug }, { onConflict: "slug" })
      .select("id, slug")
      .single();

    if (error || !data) {
      throw new Error(`分类「${category.name}」写入失败：${error?.message ?? "未知错误"}`);
    }
    categoryIds.set(data.slug as string, data.id as string);
  }

  const pdfSource = path.join(process.cwd(), "public", "demo", "sample.pdf");
  let pdfUploaded = false;

  for (const book of demoBooks) {
    console.log(`[seed] 写入《${book.title}》…`);

    const { error: bookError } = await supabase.from("books").upsert(
      {
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        cover_path: book.coverPath,
        format: book.format,
        render_mode: book.renderMode,
        status: "ready",
        parse_error: null,
        chapter_count: book.chapterCount,
        page_count: book.pageCount,
        word_count: book.wordCount,
      },
      { onConflict: "id" },
    );

    if (bookError) {
      throw new Error(`《${book.title}》写入失败：${bookError.message}`);
    }

    await supabase.from("chapters").delete().eq("book_id", book.id);
    for (const group of chunk(book.chapters, 20)) {
      const { error } = await supabase.from("chapters").insert(
        group.map((chapter) => ({
          book_id: book.id,
          chapter_no: chapter.chapterNo,
          title: chapter.title,
          content: chapter.content,
          word_count: chapter.wordCount,
        })),
      );
      if (error) throw new Error(`《${book.title}》章节写入失败：${error.message}`);
    }

    await supabase.from("book_categories").delete().eq("book_id", book.id);
    const links = book.categories
      .map((category) => categoryIds.get(category.slug))
      .filter((id): id is string => Boolean(id))
      .map((categoryId) => ({ book_id: book.id, category_id: categoryId }));
    if (links.length > 0) {
      const { error } = await supabase.from("book_categories").insert(links);
      if (error) throw new Error(`《${book.title}》分类关联失败：${error.message}`);
    }

    await supabase.from("book_files").delete().eq("book_id", book.id);

    if (book.renderMode === "pdf") {
      if (!pdfUploaded) {
        const bytes = readFileSync(pdfSource);
        const { error: uploadError } = await supabase.storage
          .from("books")
          .upload("demo/sample.pdf", bytes, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (uploadError) {
          throw new Error(
            `示例 PDF 上传失败：${uploadError.message}（请先在 SQL Editor 执行 0001_init.sql）`,
          );
        }
        pdfUploaded = true;
        const { error: fileError } = await supabase.from("book_files").insert({
          book_id: book.id,
          storage_path: "demo/sample.pdf",
          original_name: "Aesop-Fables-Sample.pdf",
          format: "pdf",
          bytes: bytes.length,
        });
        if (fileError) throw new Error(`示例 PDF 文件记录失败：${fileError.message}`);
      }
    }
  }

  console.log("[seed] 完成。");
  console.log(`  · ${demoCategories.length} 个分类`);
  console.log(`  · ${demoBooks.length} 本书`);
  console.log(`  · ${demoBooks.reduce((total, book) => total + book.chapters.length, 0)} 个章节`);
}

seed().catch((error) => {
  console.error("[seed] 失败：", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
