import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M-CDS v3.3 Dashboard",
  description: "竞技游泳教练用 M-CDS v3.3 看板"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
