'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface BannerSlide {
  id: number;
  image: string;
  title: string;
  href: string;
}

const bannerSlides: BannerSlide[] = [
  {
    id: 1,
    image: '/banners/banner1.png',
    title: 'Dịch Vụ Y Tế Chất Lượng Cao - Chăm Sóc Toàn Diện Cho Gia Đình Bạn',
    href: '/booking',
  },
  {
    id: 2,
    image: '/banners/banner2.png',
    title: 'Kiểm Soát Huyết Áp Cao: 5 Bước Quan Trọng Để Bảo Vệ Sức Khỏe Của Bạn',
    href: '/booking',
  },
  {
    id: 3,
    image: '/banners/banner3.png',
    title: 'Bí Quyết Tăng Cường Sức Khỏe Tim Mạch - Sống Khỏe Mỗi Ngày',
    href: '/booking',
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Auto-slide transition continuously every 5 seconds, pauses when mouse hovers
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % bannerSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 45) {
      // Swiped left -> next
      setCurrent((prev) => (prev + 1) % bannerSlides.length);
    } else if (diff < -45) {
      // Swiped right -> prev
      setCurrent((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
    }
    setTouchStartX(null);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((prev) => (prev + 1) % bannerSlides.length);
  };

  return (
    <div className="w-full">
      {/* Banner Carousel Container */}
      <div
        className="relative group rounded-3xl overflow-hidden shadow-lg border border-mint-light select-none bg-slate-900 max-w-6xl mx-auto"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides Track */}
        <div className="relative w-full aspect-[16/7] sm:aspect-[21/8] lg:aspect-[25/8] max-h-[280px] sm:max-h-[320px] md:max-h-[350px] overflow-hidden">
          {bannerSlides.map((slide, idx) => {
            const isActive = current === idx;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <Link href={slide.href} className="block w-full h-full relative cursor-pointer group/link overflow-hidden bg-slate-950">
                  {/* Lớp nền mờ Ambient Backdrop lấp đầy khoảng trống hai bên */}
                  <img
                    src={slide.image}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-55 brightness-90 pointer-events-none select-none"
                  />
                  {/* Ảnh chính hiển thị đầy đủ 100% nội dung không bị cắt mép */}
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="relative z-10 w-full h-full object-contain object-center transition-transform duration-700 group-hover/link:scale-[1.01] drop-shadow-md"
                  />
                  {/* Lớp gradient nhẹ bảo đảm độ tương phản cho nút điều hướng */}
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Previous / Next Arrow Controls - Visible with low opacity on touch screens */}
        <button
          onClick={handlePrev}
          aria-label="Slide trước"
          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-pine-teal text-white backdrop-blur-md flex items-center justify-center transition-all duration-200 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 shadow-lg cursor-pointer hover:scale-110 active:scale-95"
        >
          <ChevronLeft size={16} className="sm:hidden" />
          <ChevronLeft size={20} className="hidden sm:block" />
        </button>
        <button
          onClick={handleNext}
          aria-label="Slide kế tiếp"
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-pine-teal text-white backdrop-blur-md flex items-center justify-center transition-all duration-200 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 shadow-lg cursor-pointer hover:scale-110 active:scale-95"
        >
          <ChevronRight size={16} className="sm:hidden" />
          <ChevronRight size={20} className="hidden sm:block" />
        </button>

        {/* Nút Đặt Lịch Khám xanh lá đè lên góc dưới bên trái Carousel */}
        <div className="absolute left-2.5 sm:left-5 bottom-2.5 sm:bottom-4 z-20">
          <Link
            href="/booking"
            className="inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-pine-teal hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-black/50 hover:shadow-emerald-900/60 hover:scale-105 active:scale-95 border border-white/40 text-[11px] sm:text-sm backdrop-blur-xs group/btn"
          >
            <Calendar size={14} className="sm:hidden text-mint-light" />
            <Calendar size={16} className="hidden sm:inline group-hover/btn:rotate-12 transition-transform duration-300 text-mint-light" />
            <span>Đặt Lịch Khám</span>
          </Link>
        </div>

        {/* Góc dưới bên phải: Bộ đốm chuyển slide & Bộ đếm */}
        <div className="absolute right-2.5 sm:right-5 bottom-2.5 sm:bottom-4 z-20 flex items-center gap-1.5 pointer-events-auto">
          {/* Indicator Dots */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-black/50 backdrop-blur-md px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border border-white/20 shadow-lg">
            {bannerSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                aria-label={`Chuyển tới slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  current === idx
                    ? 'w-4 sm:w-6 bg-mint-light shadow-xs'
                    : 'w-1.5 bg-white/40 hover:bg-white'
                }`}
              />
            ))}
          </div>

          {/* Slide counter */}
          <div className="text-white text-[10px] sm:text-[11px] font-bold bg-black/50 backdrop-blur-md px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border border-white/20 shadow-lg hidden sm:block">
            {current + 1}/{bannerSlides.length}
          </div>
        </div>
      </div>
    </div>
  );
}

