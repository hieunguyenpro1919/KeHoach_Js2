'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, QrCode, FileText, ArrowRight } from 'lucide-react';

export default function ClinicSimpleWorkflow() {
  const steps = [
    {
      step: '01',
      icon: Calendar,
      title: 'Đặt Lịch Trực Tuyến',
      desc: 'Chọn bác sĩ, chuyên khoa và khung giờ 30 phút phù hợp ngay trên website mà không cần đến sớm xếp hàng.',
      color: 'bg-emerald-500',
      tag: 'Chủ động thời gian',
      href: '/booking',
    },
    {
      step: '02',
      icon: QrCode,
      title: 'Check-in QR Trong 3 Giây',
      desc: 'Đến phòng khám, đưa mã QR trên điện thoại vào máy quét tại quầy lễ tân để nhận số phòng khám ngay lập tức.',
      color: 'bg-pine-teal',
      tag: 'Không cần bốc số',
      href: '/booking',
    },
    {
      step: '03',
      icon: FileText,
      title: 'Khám & Nhận Đơn Điện Tử',
      desc: 'Gặp bác sĩ đúng giờ hẹn thăm khám tận tình. Toàn bộ đơn thuốc và kết quả khám được lưu an toàn trên hồ sơ trực tuyến.',
      color: 'bg-teal-700',
      tag: 'Minh bạch & An tâm',
      href: '/my-appointments',
    }
  ];

  return (
    <section id="workflow" className="scroll-mt-24 space-y-6 py-1">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
          <span>Tiết Kiệm Thời Gian</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          QUY TRÌNH KHÁM BỆNH NHANH CHÓNG
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Đơn giản hóa thủ tục khám chữa bệnh tại MedSched với 3 bước tiện lợi, giúp bạn và người thân luôn an tâm.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {steps.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.step}
              href={item.href}
              className="bg-white rounded-3xl p-6 border border-mint-light shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${item.color} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                    <Icon size={22} />
                  </div>
                  <span className="font-mono text-2xl font-black text-slate-200 group-hover:text-pine-teal/30 transition-colors">
                    {item.step}
                  </span>
                </div>

                <span className="inline-block text-[10px] font-bold text-pine-teal uppercase tracking-wider px-2 py-0.5 rounded-md bg-mint-soft mb-2">
                  {item.tag}
                </span>

                <h4 className="text-base font-bold text-slate-900 mb-2 group-hover:text-pine-teal transition-colors">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-pine-teal group-hover:translate-x-1 transition-transform">
                <span>Trải nghiệm ngay</span>
                <ArrowRight size={14} className="ml-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
