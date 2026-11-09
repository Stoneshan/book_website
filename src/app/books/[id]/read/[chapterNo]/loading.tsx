export default function ReaderLoading() {
  return (
    <div className="reader-surface min-h-screen">
      <div className="border-b" style={{ borderColor: "var(--reader-line)" }}>
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <div className="h-8 w-8 animate-pulse rounded-full bg-black/5" />
          <div className="h-3 w-40 animate-pulse rounded-full bg-black/5" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="mx-auto h-3 w-24 animate-pulse rounded-full bg-black/5" />
        <div className="mx-auto mt-5 h-7 w-56 animate-pulse rounded-full bg-black/5" />
        <div className="mt-12 space-y-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="h-3 animate-pulse rounded-full bg-black/5"
              style={{ width: `${index % 5 === 4 ? 62 : 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
