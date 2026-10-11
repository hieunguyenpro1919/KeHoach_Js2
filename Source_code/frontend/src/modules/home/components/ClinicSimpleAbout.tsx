'use client';

import React from 'react';
import { Clock, HeartHandshake, ShieldCheck, UserCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ClinicSimpleAbout() {
  return (
    <section id="about" className="scroll-mt-24 space-y-8 py-2">
      {/* Khối Giới Thiệu Chung Phòng Khám Nhỏ */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-mint-light shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Cột trái: Ảnh phòng khám thân thiện, gần gũi */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden border border-mint-light shadow-md group">
              <img
                src="/clinic/care_service.png"
                alt="Phòng khám MedSched chăm sóc tận tâm"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent flex items-end p-5 text-white">
                <div>
                  <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                    Chăm Sóc Sức Khỏe Ban Đầu
                  </span>
                  <p className="text-sm sm:text-base font-extrabold mt-0.5">
                    Phòng Khám Đa Khoa MedSched
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Thông điệp cốt lõi */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-primary/10 text-pine-teal text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Về Chúng Tôi</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              PHÒNG KHÁM MEDSCHED <br />
              <span className="text-pine-teal">TẬN TÂM – GẦN GŨI – KHÔNG CHỜ ĐỢI</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              MedSched là phòng khám tư nhân quy mô vừa và nhỏ, chuyên cung cấp dịch vụ khám chữa bệnh ngoại trú 
              và chăm sóc sức khỏe thiết yếu cho cá nhân và gia đình. Chúng tôi hướng tới mô hình y tế thông minh, 
              nơi người bệnh được chăm sóc ân cần, nhanh chóng mà không phải mệt mỏi chen lấn hay chờ đợi hàng giờ như tại các bệnh viện lớn.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Bác sĩ khám kỹ càng, tư vấn rõ ràng</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Đặt hẹn đúng giờ, tiếp đón trong 5 phút</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Hồ sơ bệnh án & đơn thuốc điện tử</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Chi phí khám chữa bệnh minh bạch 100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Thẻ Tiêu Chí Phục Vụ Của Phòng Khám */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-8 mt-8 border-t border-slate-100">
          <div className="bg-mint-soft/50 rounded-2xl p-5 border border-mint-light space-y-2.5 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-pine-teal text-white flex items-center justify-center shadow-xs">
              <Clock size={20} />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">Tiết Kiệm Thời Gian</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Chủ động đặt lịch theo khung giờ 30 phút. Quét mã QR làm thủ tục tức thì, không cần bốc số xếp hàng mệt mỏi.
            </p>
          </div>

          <div className="bg-mint-soft/50 rounded-2xl p-5 border border-mint-light space-y-2.5 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-pine-teal text-white flex items-center justify-center shadow-xs">
              <HeartHandshake size={20} />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">Bác Sĩ Tận Tình</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bác sĩ chuyên khoa trực tiếp thăm khám kỹ lưỡng, lắng nghe mọi thắc mắc và đồng hành cùng sức khỏe gia đình bạn.
            </p>
          </div>

          <div className="bg-mint-soft/50 rounded-2xl p-5 border border-mint-light space-y-2.5 hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-pine-teal text-white flex items-center justify-center shadow-xs">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">Chi Phí Hợp Lý & Rõ Ràng</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Giá dịch vụ và tiền thuốc được niêm yết công khai, không kê thêm thuốc không cần thiết, không phụ phí phát sinh.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
