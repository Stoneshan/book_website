"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminEmail } from "@/lib/auth/allowlist";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { formatFromFileName } from "@/lib/parsers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PDF_MAX_BYTES = 50 * 1024 * 1024;
const TEXT_MAX_BYTES = 30 * 1024 * 1024;

export interface LoginState {
  error?: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface UploadTicket {
  ok: boolean;
  error?: string;
  bookId?: string;
  path?: string;
  token?: string;
  signedUrl?: string;
}

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(260),
  size: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  categoryIds: z.array(z.string().uuid()).max(20).optional(),
});

const updateSchema = z.object({
  bookId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  author: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  categoryIds: z.array(z.string().uuid()).max(20).optional(),
});

const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "slug 只能包含小写字母、数字和连字符"),
});

function errorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/duplicate|unique/i.test(message)) return "已存在同名或同 slug 的记录。";
  return fallback;
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function signInAction(
  _previous: LoginState | null,
  formData: FormData,
): Promise<LoginState> {
  const email = asString(formData.get("email")).trim().toLowerCase();
  const password = asString(formData.get("password"));
  const next = asString(formData.get("next")) || "/admin";

  if (!isSupabaseConfigured()) {
    return { error: "站点尚未配置 Supabase，请先完成环境变量设置。" };
  }
  if (!isAdminEmail(email)) {
    return { error: "邮箱或密码错误。" };
  }
  if (!email || !password) {
    return { error: "请输入邮箱和密码。" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "邮箱或密码错误。" };
  } catch {
    return { error: "登录失败，请稍后重试。" };
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore.
    }
  }
  redirect("/admin/login");
}

export async function createUploadAction(input: unknown): Promise<UploadTicket> {
  await requireAdmin();

  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "表单内容不完整或格式不正确。" };
  }

  const { fileName, size, title, author, description, categoryIds = [] } = parsed.data;
  const format = formatFromFileName(fileName);
  if (!format) {
    return { ok: false, error: "不支持的文件格式，请上传 TXT / MD / EPUB / MOBI / AZW3 / PDF。" };
  }
  const limit = format === "pdf" ? PDF_MAX_BYTES : TEXT_MAX_BYTES;
  if (size > limit) {
    return {
      ok: false,
      error:
        format === "pdf"
          ? "PDF 文件不能超过 50MB。"
          : "这个格式的文件不能超过 30MB。",
    };
  }

  const admin = getSupabaseAdminClient();
  const bookId = randomUUID();
  const path = `${bookId}/original.${format}`;
  const renderMode = format === "pdf" ? "pdf" : "text";

  const { error: bookError } = await admin.from("books").insert({
    id: bookId,
    title,
    author: author?.trim() || "佚名",
    description: description ?? "",
    format,
    render_mode: renderMode,
    status: "uploading",
  });

  if (bookError) {
    return { ok: false, error: errorMessage(bookError, "创建书籍记录失败。") };
  }

  const { error: fileError } = await admin.from("book_files").insert({
    book_id: bookId,
    storage_path: path,
    original_name: fileName,
    format,
    bytes: size,
  });

  if (fileError) {
    await admin.from("books").delete().eq("id", bookId);
    return { ok: false, error: "创建文件记录失败。" };
  }

  if (categoryIds.length > 0) {
    const { data: validCategories } = await admin
      .from("categories")
      .select("id")
      .in("id", categoryIds);
    const rows = (validCategories ?? []).map((row) => ({
      book_id: bookId,
      category_id: row.id as string,
    }));
    if (rows.length > 0) {
      const { error: categoryError } = await admin.from("book_categories").insert(rows);
      if (categoryError) {
        await admin.from("books").delete().eq("id", bookId);
        return { ok: false, error: "保存分类失败。" };
      }
    }
  }

  const { data: signed, error: signedError } = await admin.storage
    .from("books")
    .createSignedUploadUrl(path);

  if (signedError || !signed) {
    await admin.from("books").delete().eq("id", bookId);
    return { ok: false, error: "无法创建上传地址，请检查 Storage 配置。" };
  }

  return {
    ok: true,
    bookId,
    path,
    token: signed.token,
    signedUrl: signed.signedUrl,
  };
}

export async function updateBookAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "表单内容不完整或格式不正确。" };
  }

  const { bookId, title, author, description, categoryIds = [] } = parsed.data;
  const admin = getSupabaseAdminClient();

  const { error } = await admin
    .from("books")
    .update({
      title,
      author: author?.trim() || "佚名",
      description: description ?? "",
    })
    .eq("id", bookId);

  if (error) {
    return { ok: false, error: errorMessage(error, "保存失败。") };
  }

  const { error: deleteError } = await admin
    .from("book_categories")
    .delete()
    .eq("book_id", bookId);
  if (deleteError) {
    return { ok: false, error: "更新分类失败。" };
  }

  if (categoryIds.length > 0) {
    const { data: validCategories } = await admin
      .from("categories")
      .select("id")
      .in("id", categoryIds);
    const rows = (validCategories ?? []).map((row) => ({
      book_id: bookId,
      category_id: row.id as string,
    }));
    if (rows.length > 0) {
      const { error: insertError } = await admin.from("book_categories").insert(rows);
      if (insertError) return { ok: false, error: "更新分类失败。" };
    }
  }

  revalidatePath("/");
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/books/${bookId}`);
  return { ok: true };
}

export async function deleteBookAction(bookId: string): Promise<ActionResult> {
  await requireAdmin();

  if (!z.string().uuid().safeParse(bookId).success) {
    return { ok: false, error: "无效的书籍 ID。" };
  }

  const admin = getSupabaseAdminClient();
  const { data: book } = await admin
    .from("books")
    .select("id, title, cover_path, book_files(storage_path)")
    .eq("id", bookId)
    .maybeSingle();

  if (!book) return { ok: false, error: "书籍不存在。" };

  const fileRelation = book.book_files as
    | { storage_path: string }
    | Array<{ storage_path: string }>
    | null;
  const files = Array.isArray(fileRelation)
    ? fileRelation
    : fileRelation
      ? [fileRelation]
      : [];
  const storagePaths = files.map((file) => file.storage_path).filter(Boolean);
  if (storagePaths.length > 0) {
    await admin.storage.from("books").remove(storagePaths);
  }

  const coverPath = book.cover_path as string | null;
  if (coverPath && !coverPath.startsWith("/") && !/^https?:/i.test(coverPath)) {
    await admin.storage.from("covers").remove([coverPath]);
  }

  const { error } = await admin.from("books").delete().eq("id", bookId);
  if (error) return { ok: false, error: "删除失败，请稍后重试。" };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true };
}

function normalizeSlug(name: string, slug: string): string {
  const value = slug.trim();
  if (value) return value;
  const derived = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return derived || `cat-${randomUUID().slice(0, 8)}`;
}

export async function createCategoryAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "分类名称或 slug 格式不正确。" };
  }
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("categories").insert({
    name: parsed.data.name,
    slug: normalizeSlug(parsed.data.name, parsed.data.slug),
  });
  if (error) return { ok: false, error: errorMessage(error, "创建分类失败。") };
  revalidatePath("/");
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function renameCategoryAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const schema = categorySchema.extend({ id: z.string().uuid() });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "分类名称或 slug 格式不正确。" };
  }
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("categories")
    .update({
      name: parsed.data.name,
      slug: normalizeSlug(parsed.data.name, parsed.data.slug),
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: errorMessage(error, "更新分类失败。") };
  revalidatePath("/");
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "无效的分类 ID。" };
  }
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: "删除分类失败。" };
  revalidatePath("/");
  revalidatePath("/admin/categories");
  return { ok: true };
}
