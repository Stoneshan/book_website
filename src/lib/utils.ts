import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatWordCount(count: number): string {
  if (!count) return "0 字";
  if (count >= 10000) {
    const value = count / 10000;
    return `${value >= 100 ? Math.round(value) : value.toFixed(1)} 万字`;
  }
  return `${count} 字`;
}

export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatRelativeDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDate(date);
}

export function formatCount(count: number): string {
  if (count >= 10000) return `${(count / 10000).toFixed(1)} 万`;
  return String(count);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatLabel(format: string): string {
  switch (format) {
    case "txt":
      return "TXT";
    case "md":
      return "Markdown";
    case "epub":
      return "EPUB";
    case "mobi":
      return "MOBI";
    case "azw3":
      return "AZW3";
    case "pdf":
      return "PDF";
    default:
      return format.toUpperCase();
  }
}

export function bookPath(id: string): string {
  return `/books/${id}`;
}

export function readerPath(
  id: string,
  target: { kind: "chapter"; chapterNo: number } | { kind: "pdf"; page?: number },
): string {
  if (target.kind === "pdf") {
    return `/books/${id}/read/pdf${target.page ? `?page=${target.page}` : ""}`;
  }
  return `/books/${id}/read/${target.chapterNo}`;
}
