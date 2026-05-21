import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ODRÉ GANGWON | 오드래강원",
  description: "강원의 하루를 고르는 프리미엄 AI 여행 큐레이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
