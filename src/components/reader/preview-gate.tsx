import Link from "next/link";
import { LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewGateProps {
  freePages: number;
  loginHref: string;
  registerHref: string;
  title?: string;
  description?: string;
  className?: string;
}

export function PreviewGate({
  freePages,
  loginHref,
  registerHref,
  title = "免费试读已结束",
  description,
  className,
}: PreviewGateProps) {
  return (
    <div
      className={cn("rounded-2xl border p-6 text-center sm:p-8", className)}
      style={{
        borderColor: "var(--reader-line)",
        backgroundColor: "var(--reader-panel)",
        color: "var(--reader-text)",
      }}
    >
      <span
        className="mx-auto grid h-12 w-12 place-items-center rounded-full"
        style={{
          backgroundColor: "color-mix(in srgb, var(--reader-accent) 12%, transparent)",
          color: "var(--reader-accent)",
        }}
      >
        <LockKeyhole className="h-5 w-5" aria-hidden />
      </span>

      <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>
      <p
        className="mx-auto mt-2 max-w-sm text-sm leading-6"
        style={{ color: "var(--reader-muted)" }}
      >
        {description ??
          `游客可免费阅读前 ${freePages} 页。登录或注册后，即可继续阅读全书。`}
      </p>

      <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
        <Link
          href={loginHref}
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--reader-accent)" }}
        >
          <LogIn className="h-4 w-4" aria-hidden />
          登录阅读
        </Link>
        <Link
          href={registerHref}
          className="inline-flex items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition-colors hover:opacity-80"
          style={{ borderColor: "var(--reader-line)", color: "var(--reader-ink-soft)" }}
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          注册账号
        </Link>
      </div>

      <p className="mt-4 text-[11px]" style={{ color: "var(--reader-muted)" }}>
        登录后会回到当前书籍
      </p>
    </div>
  );
}
