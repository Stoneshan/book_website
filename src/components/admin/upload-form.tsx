"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { createUploadAction } from "@/app/admin/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";
import { cn, formatLabel } from "@/lib/utils";

const ACCEPT = ".txt,.md,.epub,.mobi,.azw3,.pdf";
const SUPPORTED = ["txt", "md", "epub", "mobi", "azw3", "pdf"];

interface UploadFormProps {
  categories: Category[];
}

type Stage = "idle" | "creating" | "uploading" | "parsing" | "done";

const stageLabels: Record<Exclude<Stage, "idle" | "done">, string> = {
  creating: "创建书籍记录",
  uploading: "上传源文件",
  parsing: "解析章节",
};

function formatFromName(name: string): string | null {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match && SUPPORTED.includes(match[1]) ? match[1] : null;
}

export function UploadForm({ categories }: UploadFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const busy = stage === "creating" || stage === "uploading" || stage === "parsing";

  function acceptFile(next: File | null) {
    setError("");
    if (!next) {
      setFile(null);
      return;
    }
    const format = formatFromName(next.name);
    if (!format) {
      setError("不支持的文件格式，请上传 TXT / MD / EPUB / MOBI / AZW3 / PDF。");
      return;
    }
    const limit = format === "pdf" ? 50 * 1024 * 1024 : 30 * 1024 * 1024;
    if (next.size > limit) {
      setError(format === "pdf" ? "PDF 文件不能超过 50MB。" : "这个格式的文件不能超过 30MB。");
      return;
    }
    setFile(next);
    if (!title.trim()) {
      setTitle(next.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    }
  }

  function toggleCategory(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file) {
      setError("请选择要上传的文件。");
      return;
    }
    if (!title.trim()) {
      setError("请填写书名。");
      return;
    }

    try {
      setStage("creating");
      const ticket = await createUploadAction({
        fileName: file.name,
        size: file.size,
        title: title.trim(),
        author: author.trim(),
        description: description.trim(),
        categoryIds: selected,
      });

      if (!ticket.ok || !ticket.bookId || !ticket.path || !ticket.token) {
        throw new Error(ticket.error || "创建上传任务失败。");
      }

      setStage("uploading");
      const supabase = getSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from("books")
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type || "application/octet-stream",
        });
      if (uploadError) {
        throw new Error(`文件上传失败：${uploadError.message}`);
      }

      setStage("parsing");
      const response = await fetch(`/api/admin/books/${ticket.bookId}/parse`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        chapters?: number;
        pages?: number;
      };
      if (!response.ok) {
        throw new Error(result.error || "解析失败，请打开书籍详情查看原因。");
      }

      setStage("done");
      router.push(`/admin/books/${ticket.bookId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "上传失败，请重试。");
      setStage("idle");
    }
  }

  const format = file ? formatFromName(file.name) : null;

  return (
    <form onSubmit={submit} className="space-y-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          acceptFile(event.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-brand bg-brand/5"
            : "border-line bg-card/50 hover:border-ink/30",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => acceptFile(event.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex w-full max-w-xl items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-left">
            <FileText className="h-8 w-8 shrink-0 text-brand/80" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{file.name}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {formatLabel(format ?? "")} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              aria-label="移除文件"
              onClick={() => {
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-paper-deep hover:text-brand"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="h-9 w-9 text-ink-faint/70" aria-hidden />
            <p className="mt-3 text-base text-ink">拖拽文件到这里，或点击选择</p>
            <p className="mt-1.5 text-[11px] leading-5 text-ink-faint">
              支持 TXT / Markdown / EPUB / MOBI / AZW3 / PDF
              <br />
              PDF 最大 50MB，其余格式最大 30MB
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded-full border border-line px-4 py-1.5 text-xs text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
            >
              选择文件
            </button>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">书名 *</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={300}
            placeholder="例如：朝花夕拾"
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">作者</span>
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            maxLength={200}
            placeholder="留空则使用文件元数据或「佚名」"
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs tracking-wider text-ink-soft">简介</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            placeholder="一句话介绍（可留空）"
            className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50"
          />
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs tracking-wider text-ink-soft">分类</p>
        {categories.length === 0 ? (
          <p className="text-xs text-ink-faint">还没有分类，可以先到「分类」页创建。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = selected.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "border-ink bg-brand text-white"
                      : "border-line bg-card/60 text-ink-soft hover:border-brand/40",
                  )}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {busy ? (
        <div className="rounded-lg border border-line bg-white/70 px-4 py-3">
          <ul className="space-y-1.5 text-xs">
            {(["creating", "uploading", "parsing"] as const).map((item) => {
              const order = ["creating", "uploading", "parsing"] as const;
              const activeIndex = order.indexOf(stage as (typeof order)[number]);
              const itemIndex = order.indexOf(item);
              const done = activeIndex > itemIndex;
              return (
                <li
                  key={item}
                  className={cn(
                    "flex items-center gap-2",
                    done ? "text-[#3f6b52]" : item === stage ? "text-ink" : "text-ink-faint",
                  )}
                >
                  {done ? (
                    <span aria-hidden>✓</span>
                  ) : item === stage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <span className="inline-block h-3.5 w-3.5 rounded-full border border-line" aria-hidden />
                  )}
                  {stageLabels[item]}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10px] leading-5 text-ink-faint">
            文件直接上传到 Supabase Storage，随后由服务器解析。请保持页面打开。
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-xs leading-5 text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-[10px] leading-5 text-ink-faint">
          上传即解析。PDF 将使用原版页面阅读器；MOBI/AZW3 会转换为重排文本。
        </p>
        <button
          type="submit"
          disabled={busy || !file}
          className="shrink-0 rounded-full bg-brand px-6 py-2.5 text-sm text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
        >
          {busy ? "处理中…" : "上传并解析"}
        </button>
      </div>
    </form>
  );
}
