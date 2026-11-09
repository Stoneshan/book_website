import { revalidatePath } from "next/cache";
import { getAdminClaims } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { parseBook, type BookFormat } from "@/lib/parsers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

const PDF_MAX_BYTES = 50 * 1024 * 1024;
const TEXT_MAX_BYTES = 30 * 1024 * 1024;

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase 尚未配置。" }, { status: 503 });
  }
  if (!sameOrigin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const adminUser = await getAdminClaims();
  if (!adminUser) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabaseAdminClient();

  const { data: book } = await db
    .from("books")
    .select("id, title, author, description, format, status")
    .eq("id", id)
    .maybeSingle();

  if (!book) {
    return Response.json({ error: "书籍不存在。" }, { status: 404 });
  }

  const { data: file } = await db
    .from("book_files")
    .select("storage_path, format, original_name")
    .eq("book_id", id)
    .maybeSingle();

  if (!file?.storage_path) {
    return Response.json({ error: "没有找到源文件。" }, { status: 404 });
  }

  const claimed = await db
    .from("books")
    .update({ status: "parsing", parse_error: null })
    .eq("id", id)
    .in("status", ["uploading", "failed"])
    .select("id")
    .maybeSingle();

  if (!claimed.data) {
    return Response.json(
      { error: "这本书正在解析或已经完成，请刷新后再试。" },
      { status: 409 },
    );
  }

  try {
    const { data: blob, error: downloadError } = await db.storage
      .from("books")
      .download(file.storage_path as string);

    if (downloadError || !blob) {
      throw new Error("源文件下载失败，请检查 Storage 配置。");
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const format = file.format as BookFormat;
    const limit = format === "pdf" ? PDF_MAX_BYTES : TEXT_MAX_BYTES;
    if (buffer.length > limit) {
      throw new Error(
        format === "pdf" ? "PDF 文件超过 50MB 限制。" : "文件超过 30MB 限制。",
      );
    }

    const parsed = await parseBook(buffer, format, file.original_name as string);

    await db.from("chapters").delete().eq("book_id", id);

    if (parsed.renderMode === "text") {
      for (const group of chunk(parsed.chapters, 20)) {
        const { error: insertError } = await db.from("chapters").insert(
          group.map((chapter) => ({
            book_id: id,
            chapter_no: chapter.chapterNo,
            title: chapter.title,
            content: chapter.html,
            word_count: chapter.wordCount,
          })),
        );
        if (insertError) throw new Error("章节写入数据库失败。");
      }
    }

    let coverPath: string | null = null;
    if (parsed.cover) {
      const path = `${id}/cover.${parsed.cover.ext}`;
      const { error: coverError } = await db.storage
        .from("covers")
        .upload(path, parsed.cover.buffer, {
          contentType: parsed.cover.contentType,
          upsert: true,
          cacheControl: "3600",
        });
      if (!coverError) coverPath = path;
    }

    const currentTitle = String(book.title ?? "").trim();
    const currentAuthor = String(book.author ?? "").trim();
    const currentDescription = String(book.description ?? "").trim();

    const nextTitle = currentTitle || parsed.title || "未命名";
    const nextAuthor =
      currentAuthor && currentAuthor !== "佚名" ? currentAuthor : parsed.author || currentAuthor || "佚名";
    const nextDescription = currentDescription || parsed.description || "";

    const { error: updateError } = await db
      .from("books")
      .update({
        title: nextTitle,
        author: nextAuthor,
        description: nextDescription,
        render_mode: parsed.renderMode,
        chapter_count: parsed.renderMode === "text" ? parsed.chapters.length : 0,
        page_count: parsed.renderMode === "pdf" ? parsed.pageCount : null,
        word_count: parsed.wordCount,
        status: "ready",
        parse_error: null,
        ...(coverPath ? { cover_path: coverPath } : {}),
      })
      .eq("id", id);

    if (updateError) {
      throw new Error("书籍信息更新失败。");
    }

    revalidatePath("/");
    revalidatePath(`/books/${id}`);
    revalidatePath("/admin");
    revalidatePath(`/admin/books/${id}`);

    return Response.json({
      ok: true,
      bookId: id,
      renderMode: parsed.renderMode,
      chapters: parsed.renderMode === "text" ? parsed.chapters.length : 0,
      pages: parsed.renderMode === "pdf" ? parsed.pageCount : 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "解析失败，请检查文件后重试。";
    await db.from("chapters").delete().eq("book_id", id);
    await db
      .from("books")
      .update({ status: "failed", parse_error: message.slice(0, 1000) })
      .eq("id", id);

    revalidatePath("/admin");
    revalidatePath(`/admin/books/${id}`);

    return Response.json({ error: message }, { status: 422 });
  }
}
