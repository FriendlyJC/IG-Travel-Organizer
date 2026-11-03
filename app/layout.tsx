import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IG Travel Organizer',
  description: '將 Instagram 旅遊收藏自動整理成 Google Earth KML 地圖',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}

