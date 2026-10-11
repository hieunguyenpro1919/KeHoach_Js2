import type { Metadata } from "next";
import React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import HeaderNav from "@/shared/components/HeaderNav/HeaderNav";
import Footer from "@/shared/components/Footer/Footer";
import FloatingWidgets from "@/shared/components/FloatingWidgets/FloatingWidgets";
import ConcurrentSessionModal from "@/shared/components/Feedback/ConcurrentSessionModal";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MedSched - Hệ Thống Y Khoa Chuyên Sâu Quốc Tế & Đặt Lịch Tiếp Đón 1S",
  description: "Hệ thống Phòng khám Tư nhân Thông minh MedSched: Đặt lịch khám đa chuyên khoa, phân loại AI Triage, tiếp đón 1 giây bằng QR/CCCD",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className={`${inter.className} min-h-screen bg-mint-soft text-slate-800 flex flex-col antialiased`}>
        <ConcurrentSessionModal />
        <HeaderNav />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-5 flex flex-col">
          {children}
        </main>
        <Footer />
        <FloatingWidgets />
      </body>
    </html>
  );
}
