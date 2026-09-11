import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
