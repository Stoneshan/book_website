"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReaderDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function ReaderDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = "max-w-md",
}: ReaderDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-black/30 backdrop-blur-[1px]"
      />
      <aside
        className={cn(
          "animate-[drawer-in_0.22s_ease-out] absolute right-0 top-0 flex h-full w-full flex-col border-l shadow-2xl",
          width,
        )}
        style={{
          backgroundColor: "var(--reader-panel)",
          borderColor: "var(--reader-line)",
          color: "var(--reader-text)",
        }}
      >
        <header
          className="flex items-start justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: "var(--reader-line)" }}
        >
          <div>
            <h2 className="font-serif-cn text-base tracking-[0.14em]">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-[11px]" style={{ color: "var(--reader-muted)" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭面板"
            className="grid h-8 w-8 place-items-center rounded-full transition-colors hover:bg-black/5"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="reader-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer
            className="border-t px-5 py-3"
            style={{ borderColor: "var(--reader-line)" }}
          >
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
