"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f6f1e7",
          color: "#1c1a17",
          fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "3rem", color: "rgba(163,58,43,.3)", margin: 0 }}>意外</p>
          <h1 style={{ fontSize: "1.4rem", marginTop: "1rem" }}>站点暂时无法访问</h1>
          <p style={{ color: "#5c554b", fontSize: ".9rem", marginTop: ".8rem" }}>
            {error.message || "请稍后重试。"}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.6rem",
              padding: ".55rem 1.4rem",
              borderRadius: "999px",
              border: 0,
              background: "#1c1a17",
              color: "#f6f1e7",
              cursor: "pointer",
            }}
          >
            重新加载
          </button>
        </div>
      </body>
    </html>
  );
}
