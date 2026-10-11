'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-mint-light py-4 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MedSched Logo" className="w-5 h-5 object-contain" />
          <span className="font-bold text-pine-teal">MedSched</span>
          <span className="text-slate-400 hidden sm:inline">—</span>
          <span className="text-slate-600">Hệ thống Đặt lịch & Tiếp đón Khám bệnh Thông minh</span>
        </div>
        <p className="text-slate-400 text-[11px]">
          © 2026 MedSched Healthcare System. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
