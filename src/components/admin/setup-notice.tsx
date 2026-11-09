import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";
import { isAdminAuthConfigured } from "@/lib/server-env";

export function SetupNotice() {
  const supabaseReady = isSupabaseConfigured();
  const adminReady = isAdminAuthConfigured();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="paper-card rounded-lg p-6 sm:p-8">
        <p className="text-[11px] tracking-[0.36em] text-vermilion">初始化后台</p>
        <h1 className="mt-3 font-serif-cn text-3xl font-semibold tracking-[0.04em] text-ink">
          还差几步，就能开始管理书籍
        </h1>
        <p className="mt-3 text-sm leading-7 text-ink-soft">
          当前站点正在演示模式下运行。公开书架与阅读器可用，但上传、编辑与数据库需要 Supabase。
        </p>

        <div className="mt-6 grid gap-2 text-xs sm:grid-cols-2">
          <StatusLine ok={supabaseReady} label="Supabase URL 与公开密钥" />
          <StatusLine ok={adminReady} label="服务端密钥与管理员白名单" />
        </div>

        <ol className="mt-8 space-y-6 text-sm leading-7 text-ink-soft">
          <Step index={1} title="创建 Supabase 项目">
            打开{" "}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vermilion underline underline-offset-4"
            >
              supabase.com/dashboard
            </a>
            ，新建项目，等待数据库就绪。
          </Step>
          <Step index={2} title="执行建表 SQL">
            在 SQL Editor 中运行项目里的{" "}
            <code className="rounded bg-paper-deep px-1.5 py-0.5 text-[12px]">
              supabase/migrations/20261110000000_init.sql
            </code>
            。它会创建数据表、RLS 策略、Storage 桶与索引。
          </Step>
          <Step index={3} title="填写 .env.local">
            复制{" "}
            <code className="rounded bg-paper-deep px-1.5 py-0.5 text-[12px]">.env.example</code>{" "}
            为{" "}
            <code className="rounded bg-paper-deep px-1.5 py-0.5 text-[12px]">
              .env.local
            </code>
            ，填入 Project URL、Publishable key、Secret key，并把管理员邮箱写进{" "}
            <code className="rounded bg-paper-deep px-1.5 py-0.5 text-[12px]">
              ADMIN_EMAILS
            </code>
            。
          </Step>
          <Step index={4} title="创建管理员账号">
            在 Supabase 的 Authentication → Users 中新增邮箱与密码，确认邮箱；同时关闭公开注册。
          </Step>
          <Step index={5} title="导入示例书（可选）">
            运行{" "}
            <code className="rounded bg-paper-deep px-1.5 py-0.5 text-[12px]">
              npm run seed
            </code>
            ，把演示书籍写入真实数据库。
          </Step>
          <Step index={6} title="重启并登录">
            重新启动开发服务器，访问{" "}
            <Link href="/admin/login" className="text-vermilion underline underline-offset-4">
              /admin/login
            </Link>
            。
          </Step>
        </ol>

        <div className="mt-8 rounded-md border border-line bg-paper-deep/40 p-4 text-xs leading-6 text-ink-soft">
          完整步骤、Vercel 部署与限制说明见项目根目录{" "}
          <code className="rounded bg-card px-1 py-0.5">README.md</code>。
        </div>
      </div>
    </div>
  );
}

function StatusLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
        ok
          ? "border-[#3f6b52]/25 bg-[#3f6b52]/8 text-[#3f6b52]"
          : "border-amber-600/25 bg-amber-500/8 text-amber-800"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
      )}
      {label}
    </span>
  );
}

function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-strong font-serif-cn text-xs text-ink-soft">
        {index}
      </span>
      <div>
        <p className="font-serif-cn text-base text-ink">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}
