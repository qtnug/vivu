import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Vivu — Hệ thống Xe Buýt Đô Thị & Bán Vé Điện Tử',
  description: 'Nền tảng tra cứu tuyến xe buýt, mua vé điện tử VietQR, soát vé QR di động và quản trị vận hành xe buýt đô thị Việt Nam.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
