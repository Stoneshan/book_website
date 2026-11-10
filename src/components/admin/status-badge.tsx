import { cn } from "@/lib/utils";
import type { BookStatus } from "@/lib/types";

const labels: Record<BookStatus, string> = {
  uploading: "待上传",
  parsing: "解析中",
  ready: "已上架",
  failed: "解析失败",
};

const styles: Record<BookStatus, string> = {
  uploading: "border-amber-600/25 bg-amber-500/10 text-amber-800",
  parsing: "border-[#5b5470]/25 bg-[#5b5470]/10 text-[#5b5470]",
  ready: "border-[#3f6b52]/25 bg-[#3f6b52]/10 text-[#3f6b52]",
  failed: "border-danger/25 bg-danger/8 text-danger",
};

export function StatusBadge({
  status,
  title,
}: {
  status: BookStatus;
  title?: string | null;
}) {
  return (
    <span
      title={title ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tracking-wider",
        styles[status],
      )}
    >
      {status === "parsing" ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      ) : null}
      {labels[status]}
    </span>
  );
}
