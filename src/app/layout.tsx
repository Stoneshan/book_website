import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "墨阅 · 在线书阁",
    template: "%s · 墨阅",
  },
  description: "一个安静的中文电子书在线阅读站：TXT、Markdown、EPUB、MOBI、AZW3 与 PDF。",
  keywords: ["电子书", "在线阅读", "EPUB", "MOBI", "PDF", "中文书"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f8fa",
};

const themeScript = `
try {
  var raw = localStorage.getItem('ebook:settings:v2');
  var settings = raw ? JSON.parse(raw) : null;
  var theme = settings && settings.theme ? settings.theme : 'light';
  if (theme !== 'light' && theme !== 'sepia' && theme !== 'dark') theme = 'light';
  document.documentElement.dataset.readerTheme = theme;
} catch (error) {
  document.documentElement.dataset.readerTheme = 'light';
}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <Script
          id="reader-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <DemoBanner configured={isSupabaseConfigured()} />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
