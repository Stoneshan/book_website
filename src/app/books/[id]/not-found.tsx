import Link from "next/link";

export default function BookNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-28 text-center">
      <p className="text-6xl text-ink/15">未寻见</p>
      <h1 className="mt-6 text-2xl tracking-[0.14em] text-ink">
        这本书不在架上
      </h1>
      <p className="mt-3 text-sm text-ink-soft">它可能已下架，或者链接有误。</p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-line-strong px-5 py-2 text-sm text-ink-soft transition-colors hover:border-ink/40 hover:text-ink"
      >
        返回书架
      </Link>
    </div>
  );
}
