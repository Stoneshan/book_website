# 墨阅 · 在线书阁

一个安静的中文电子书在线阅读站：书架、搜索、分类、沉浸式阅读器、书签与笔记，以及带上传解析功能的管理后台。

技术栈：**Next.js 16（App Router）+ Tailwind CSS 4 + Supabase（Postgres / Auth / Storage）+ Vercel**。

---

## 功能

**书架**
- 按书名 / 作者搜索，分类筛选，按最近更新 / 书名 / 字数排序
- 「继续阅读」自动取本机最近阅读记录
- 书籍详情、完整目录、格式徽标（TXT / Markdown / EPUB / MOBI / AZW3 / PDF）

**重排阅读器**（TXT / MD / EPUB / MOBI / AZW3）
- 章节导航、目录抽屉、键盘 `←` `→` 翻章
- 字号、行距、版心宽度、宋体/黑体切换
- 白色 / 米黄 / 夜间三种主题，刷新不闪白
- 阅读进度自动保存并恢复滚动位置
- 章节书签、笔记；选中正文可直接摘录记笔记

**PDF 阅读器**
- PDF.js 原版页面渲染，保留排版、图表与扫描页
- 翻页、页码跳转、50%–300% 缩放、适合宽度、PDF 内嵌目录
- 页码进度、页码书签与页面笔记
- 夜间周围主题 + 页面降亮

**读者账号**
- `/login` 使用邮箱 + 密码登录，`/register` 支持自助注册（Supabase Auth）
- 游客可免费阅读前 **20 页**；重排书按约 800 字/页折算，超出后提示登录或注册
- 登录后可阅读全书；顶栏显示当前读者，可退出登录
- 书签、笔记与进度仍保存在本机浏览器

**管理后台**
- Supabase Auth 邮箱 + 密码登录，`ADMIN_EMAILS` 白名单
- 上传 `.txt` / `.md` / `.epub` / `.mobi` / `.azw3` / `.pdf`，服务端解析章节
- EPUB/MOBI/AZW3 自动读取标题、作者、简介、目录与封面
- 书籍元数据、分类编辑，失败重试，删除（级联清理 Storage 与章节）
- 分类增删改

> 未配置 Supabase 时自动进入**演示模式**：内置 3 本中文公版书 + 1 个 PDF 示例，公开书架、两种阅读器、书签/笔记/进度全部可用；后台显示配置向导。

---

## 快速开始（演示模式）

```bash
npm install
npm run dev
```

打开 <http://localhost:3000>。此时不需要任何环境变量。

> 演示模式只读内置数据；上传与管理需要配置 Supabase。

---

## 配置 Supabase

### 1. 创建项目

在 [supabase.com/dashboard](https://supabase.com/dashboard) 新建项目，等待数据库就绪。

### 2. 执行建表 SQL

打开 **SQL Editor**，运行仓库中的：

```
supabase/migrations/20261110000000_init.sql
```

它会创建数据表、索引、RLS 策略、搜索索引、Storage 桶（`covers` 公共读，`books` 私有）以及更新时间触发器。

### 3. 填写环境变量

```bash
cp .env.example .env.local
```

填写：

| 变量 | 说明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 项目 URL，如 `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 可公开的 Publishable key（也兼容旧版 `NEXT_PUBLIC_SUPABASE_ANON_KEY`） |
| `SUPABASE_SECRET_KEY` | **只在服务端使用**的 Secret key（兼容旧版 `SUPABASE_SERVICE_ROLE_KEY`） |
| `ADMIN_EMAILS` | 管理员邮箱，逗号分隔、大小写不敏感 |
| `NEXT_PUBLIC_SITE_URL` | 站点地址，本地为 `http://localhost:3000` |

> `SUPABASE_SECRET_KEY` 拥有绕过 RLS 的权限，**绝不能**加 `NEXT_PUBLIC_` 前缀或提交到仓库。

### 4. 创建管理员并开放读者注册

Supabase Dashboard → **Authentication → Users → Add user**：

- 填写邮箱与密码
- 确认邮箱（Confirm email）
- 把同一个邮箱写进 `ADMIN_EMAILS`

读者注册：

1. **Authentication → Sign In / Providers → Email** 打开 **Allow new users to sign up**。
2. 建议保持 **Confirm email** 开启；注册后用户需点击邮件里的确认链接。
3. **Authentication → URL Configuration**：
   - Site URL 填部署地址，例如 `https://your-domain.vercel.app`
   - Redirect URLs 增加 `http://localhost:3000/auth/confirm` 与
     `https://your-domain.vercel.app/auth/confirm`
4. 生产环境建议配置自有 SMTP，避免 Supabase 默认邮件额度不足。
5. 若确认邮件没有带上 `code` / `token_hash`，请在 **Authentication → Email Templates → Confirm signup** 把链接改为
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`。

> 未配置 Supabase 时进入演示模式，不启用 20 页试读限制，所有示例书都可完整阅读。

### 5. 导入示例书（可选）

```bash
npm run seed
```

把演示用的 3 本中文公版书 + PDF 示例写入真实数据库，并把 PDF 上传到私有 `books` 桶。脚本可重复执行。

### 6. 重启并登录

```bash
npm run dev
```

访问 <http://localhost:3000/admin/login>，用管理员账号登录。

---

## 上传与解析

| 格式 | 上传上限 | 解析方式 | 阅读器 |
|---|---|---|---|
| TXT | 30MB | UTF-8 / GBK / GB18030 自动识别，按「第X章/回/节」等标题切章 | 重排阅读器 |
| Markdown | 30MB | 按 `#` / `##` 标题切章 | 重排阅读器 |
| EPUB | 30MB | OPF spine + 目录 + 封面；单个超大 XHTML 会再切分 | 重排阅读器 |
| MOBI / AZW3 | 30MB | KF8 / MOBI 解析，读取元数据、目录与封面 | 重排阅读器 |
| PDF | 50MB | 仅读取页数与元数据，不解析正文 | PDF 原版阅读器 |

- 文件由浏览器**直接上传到 Supabase Storage**，不经过 Vercel 函数，避开 4.5MB 请求体限制。
- 解析在 `/api/admin/books/[id]/parse` 中完成，状态机为 `uploading → parsing → ready / failed`。
- 失败会记录可读原因，可在书籍编辑页重新解析；源文件保留。
- 加密 PDF、DRM EPUB/MOBI 会明确报错。
- EPUB 会拒绝 zip 炸弹与加密正文；MOBI/AZW3 的图片与内嵌 CSS 不保留（仅正文与封面）。
- 章节 HTML 在入库前统一用 `sanitize-html` 清洗，前端只渲染清洗后的内容。

---

## 常用命令

```bash
npm run dev          # 开发服务器
npm run build        # 生产构建（会先复制 PDF.js worker/cmaps/字体）
npm run start        # 启动生产构建
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm test             # 解析器单元测试（Vitest）
npm run seed         # 写入示例书（需要 .env.local）

node scripts/generate-demo-pdf.mjs   # 重新生成演示 PDF
npx tsx scripts/test-mobi.ts <file.mobi> [mobi|azw3]   # 手动验证 MOBI 解析
```

---

## 部署到 Vercel

1. 将仓库推送到 GitHub，在 Vercel 导入项目（Framework 预设：Next.js）。
2. Node.js 选择 **22.x / 24.x**。
3. 在 Vercel 项目设置中添加与 `.env.local` 相同的环境变量（Production / Preview / Development）。
4. 函数区域选择离 Supabase 最近的位置。本项目 Supabase 位于悉尼，已在 `vercel.json` 中设置 `syd1`；如更换 Supabase 区域，请同步修改。
5. 部署前在 Supabase 执行 SQL、创建管理员、按需运行 seed。
6. 部署后复测：登录、上传、解析、两种阅读器、删除。

注意事项：

- 解析路由设置了 `maxDuration = 300`。Vercel Hobby 需要启用 Fluid Compute，否则函数时长可能被限制为 60 秒；大文件建议 Pro 或拆分上传。
- 预览部署默认共用同一个 Supabase 项目，会改动生产数据；需要隔离时请为 Preview 单独建项目。
- Supabase 免费版 Storage 1GB、数据库 500MB、单文件上限 50MB；项目长期闲置可能暂停。
- PDF 的私有文件通过服务端生成的 **6 小时签名 URL** 交给 PDF.js；跨域与 Range 请求由 Supabase Storage 直接处理。

---

## 安全设计

- 公开角色只能 `SELECT` 状态为 `ready` 的书籍及其章节；所有写权限被撤销。
- `book_files`（原始文件路径）对公开角色完全不可见，仅服务端 service key 可访问。
- `covers` 桶公开读；`books` 桶私有，无公开策略。
- 每个后台页面、Server Action、API 路由都独立调用 `requireAdmin()`（`getClaims()` + 邮箱白名单），Proxy 只做会话刷新与跳转。
- 管理员登录失败统一返回「邮箱或密码错误」；`ADMIN_EMAILS` 为空时默认拒绝所有管理员。
- 章节内容入库前清洗；生成封面只接受 jpeg/png/webp。
- 管理端响应设置 `Cache-Control: private, no-store`。

---

## 已知限制

- **PDF** 保留原版页面，不支持重排/字号调整；v1 不支持 PDF 文字选择与划线引用，笔记按页记录。
- **MOBI/AZW3** 不保留内嵌图片与原始 CSS；复杂排版可能简化。DRM 文件无法解析。
- PDF 书籍封面为自动生成的排版封面，不抽取 PDF 首页。
- 书签、笔记、阅读进度仅保存在**本机浏览器 localStorage**，不跨设备。
- 游客试读：重排书按 800 字/页折算并在服务端截断章节内容；PDF 的第 20 页之后仅在阅读器中拦截，浏览器仍会加载原始 PDF 文件，无法防止技术用户直接下载。
- 试读限制是应用层控制：持有 Supabase 匿名 key 的用户仍可直接查询章节表。若需要更强保护，应改为服务端代理所有章节读取并收紧 RLS。
- 搜索范围为书名 / 作者，不包含章节全文。
- 单本书章节上限 2000，单章 HTML 上限 1MB。
- 示例 PDF 为公版英文内容（中文字体嵌入体积大），仅用于演示 PDF 阅读器。
- 演示模式下 `/admin` 只显示配置向导。

---

## 项目结构

```
src/
  app/
    page.tsx                              # 书架
    books/[id]/page.tsx                   # 详情 + 目录
    books/[id]/read/[chapterNo]/page.tsx  # 重排阅读器
    books/[id]/read/pdf/page.tsx          # PDF 阅读器
    login/page.tsx                        # 读者登录
    register/page.tsx                     # 读者注册
    auth/confirm/page.tsx                 # 邮箱确认回调
    admin/                                # 后台页面与 Server Actions
    api/admin/books/[id]/parse/route.ts   # 下载 + 解析 + 入库
  components/
    books/  reader/  reader/pdf/  admin/
  lib/
    books/queries.ts   # 公共数据层（真库 / 演示模式双数据源）
    parsers/           # txt / markdown / epub / mobi / pdf / sanitize
    supabase/          # browser / server / public / admin 客户端
    auth/              # 白名单与 requireAdmin
    reader/storage.ts  # 进度 / 书签 / 笔记 / 设置
    reader/preview.ts  # 20 页试读计算与 HTML 截断
    demo/books.ts      # 演示数据（seed 共用）
  proxy.ts             # Next.js 16 Proxy：会话刷新 + 后台门禁
supabase/migrations/20261110000000_init.sql
scripts/                # PDF.js 资源复制、演示 PDF、seed、MOBI 验证
public/covers/*.svg     # 演示封面
public/demo/sample.pdf  # 演示 PDF
```

---

## 测试

```bash
npm test
```

覆盖：TXT（UTF-8 / GB18030）、Markdown、EPUB（元数据 / 目录 / 封面 / XSS / 图片剥离）、HTML 清洗、PDF 页数。

MOBI/AZW3 使用 Project Gutenberg 公版书做过本地真实文件验证（解析出 18 章、13 万+ 字），该 fixture 不纳入仓库。

---

## License

代码用于个人学习与自建阅读站。示例文本均为公版内容；上传受版权保护的书籍前请确认你拥有相应权利。
