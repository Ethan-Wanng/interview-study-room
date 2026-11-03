import type { Metadata } from "next";
import "./globals.css";
import "./themes.css";
import "./immersive.css";
import {headers} from 'next/headers';
import {I18nProvider} from './components/i18n';
import StaleReloadListener from './components/stale-reload-listener';

export const metadata: Metadata = {
  title: "面试自习室｜每日学习与复习",
  description: "305 道面试题，按日学习、间隔复习与关键词释义。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h=await headers();const cookie=h.get('cookie')?.match(/(?:^|;\s*)study-language=(zh|en)(?:;|$)/)?.[1];const locale=cookie==='en'||(!cookie&&h.get('accept-language')?.toLowerCase().startsWith('en'))?'en':'zh';
  return (
    <html lang={locale==='en'?'en':'zh-CN'} suppressHydrationWarning>
      <body className="antialiased"><StaleReloadListener/><I18nProvider initialLocale={locale}>{children}</I18nProvider></body>
    </html>
  );
}
