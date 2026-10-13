'use client';

import React, { useState, useEffect } from 'react';
import { Phone, ArrowUp, MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function FloatingWidgets() {
  const pathname = usePathname();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Không hiển thị nút nổi trên các trang xác thực và các phân hệ tác vụ nội bộ (Bác sĩ, Admin, Tiếp đón...)
  const isExcluded = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/forgot-password' ||
    pathname.startsWith('/doctor') || 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/reception') || 
    pathname.startsWith('/statistics') ||
    pathname.startsWith('/checkin');

  if (isExcluded) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-5 z-40 flex flex-col items-center gap-2.5 select-none">
      {/* 1. Nút Zalo Chat */}
      <a
        href="https://zalo.me"
        target="_blank"
        rel="noreferrer"
        title="Chat Zalo với tư vấn viên MedSched"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0068ff] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 group relative cursor-pointer"
      >
        <span className="font-extrabold text-xs sm:text-sm tracking-tighter">Zalo</span>
        <span className="absolute right-full mr-2.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
          Chat Zalo 24/7
        </span>
      </a>

      {/* 2. Nút Gọi Hotline Ngay */}
      <a
        href="tel:02835352468"
        title="Gọi điện hotline hỗ trợ y tế"
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 group relative animate-pulse cursor-pointer"
      >
        <Phone size={20} />
        <span className="absolute right-full mr-2.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
          Hotline: (028) 3535 2468
        </span>
      </a>

      {/* 3. Nút Cuộn Lên Đầu Trang (Scroll to Top) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          title="Cuộn lên đầu trang"
          aria-label="Cuộn lên đầu trang"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800/90 hover:bg-pine-teal text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer backdrop-blur-xs"
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
