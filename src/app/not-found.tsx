import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-28 text-center">
      <p className="text-6xl text-ink/15">404</p>
      <h1 className="mt-6 text-2xl tracking-[0.14em] text-ink">
        这一页不在了
      </h1>
      <p className="mt-3 text-sm text-ink-soft">链接可能已失效，或者你走错了书架。</p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-line-strong px-5 py-2 text-sm text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
      >
        返回书架
      </Link>
    </div>
  );
}
