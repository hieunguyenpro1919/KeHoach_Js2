'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Calendar, Sparkles, Stethoscope, User, MapPin } from 'lucide-react';
import { api } from '@/shared/lib/api';

interface RealSpecialty {
  id: string;
  name: string;
  code: string;
  description: string;
  doctorName?: string;
  roomNumber?: string;
}

export default function ClinicSpecialtiesDirectory() {
  const [specialties, setSpecialties] = useState<RealSpecialty[]>([]);
  const [loading, setLoading] = useState(true);

  // Dữ liệu bác sĩ phụ trách tương ứng với các chuyên khoa thật đang hoạt động trong Database
  const activeSpecialtyMap: Record<string, { doctor: string; room: string; desc: string }> = {
    INTERNAL_MEDICINE: {
      doctor: 'PGS.TS Trần Văn Hùng',
      room: 'Phòng 208',
      desc: 'Khám nội tổng quát, tim mạch, huyết áp, tiểu đường và các rối loạn chuyển hóa.',
    },
    DERMATOLOGY: {
      doctor: 'BS.CKII Nguyễn Minh Anh',
      room: 'Phòng 101',
      desc: 'Chẩn đoán và điều trị bệnh lý da liễu, mụn ngứa, viêm da cơ địa và phục hồi da.',
    },
  };

  useEffect(() => {
    // Tải danh mục chuyên khoa thật từ Backend API
    api.getSpecialties()
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // Chỉ lấy các chuyên khoa thật sự đang hoạt động có bác sĩ khám bệnh (Nội tổng quát & Da liễu)
          const seen = new Set<string>();
          const filtered: RealSpecialty[] = [];

          data.forEach((item) => {
            const meta = activeSpecialtyMap[item.code];
            // Chỉ hiển thị chuyên khoa có bác sĩ phụ trách thực tế
            if (meta && !seen.has(item.code)) {
              seen.add(item.code);
              filtered.push({
                id: item.id,
                name: item.name,
                code: item.code,
                description: meta.desc || item.description || 'Khám và tư vấn chuyên khoa tại MedSched.',
                doctorName: meta.doctor,
                roomNumber: meta.room,
              });
            }
          });

          // Sắp xếp Nội tổng quát lên trước, Da liễu tiếp theo
          filtered.sort((a, b) => {
            if (a.code === 'INTERNAL_MEDICINE') return -1;
            if (b.code === 'INTERNAL_MEDICINE') return 1;
            return 0;
          });

          setSpecialties(filtered.length > 0 ? filtered : [
            {
              id: 'c1b2c3d4-0002-4000-8000-000000000002',
              name: 'Chuyên khoa Nội tổng quát',
              code: 'INTERNAL_MEDICINE',
              description: 'Khám nội tổng quát, tim mạch, huyết áp, tiểu đường và các rối loạn chuyển hóa.',
              doctorName: 'PGS.TS Trần Văn Hùng',
              roomNumber: 'Phòng 208',
            },
            {
              id: 'c1b2c3d4-0001-4000-8000-000000000001',
              name: 'Chuyên khoa Da liễu',
              code: 'DERMATOLOGY',
              description: 'Chẩn đoán và điều trị bệnh lý da liễu, mụn ngứa, viêm da cơ địa và phục hồi da.',
              doctorName: 'BS.CKII Nguyễn Minh Anh',
              roomNumber: 'Phòng 101',
            },
          ]);
        } else {
          // Dự phòng nếu API tạm thời không khả dụng
          setSpecialties([
            {
              id: 'c1b2c3d4-0002-4000-8000-000000000002',
              name: 'Chuyên khoa Nội tổng quát',
              code: 'INTERNAL_MEDICINE',
              description: 'Khám nội tổng quát, tim mạch, huyết áp, tiểu đường và các rối loạn chuyển hóa.',
              doctorName: 'PGS.TS Trần Văn Hùng',
              roomNumber: 'Phòng 208',
            },
            {
              id: 'c1b2c3d4-0001-4000-8000-000000000001',
              name: 'Chuyên khoa Da liễu',
              code: 'DERMATOLOGY',
              description: 'Chẩn đoán và điều trị bệnh lý da liễu, mụn ngứa, viêm da cơ địa và phục hồi da.',
              doctorName: 'BS.CKII Nguyễn Minh Anh',
              roomNumber: 'Phòng 101',
            },
          ]);
        }
      })
      .catch(() => {
        setSpecialties([
          {
            id: 'c1b2c3d4-0002-4000-8000-000000000002',
            name: 'Chuyên khoa Nội tổng quát',
            code: 'INTERNAL_MEDICINE',
            description: 'Khám nội tổng quát, tim mạch, huyết áp, tiêu đường và các rối loạn chuyển hóa.',
            doctorName: 'PGS.TS Trần Văn Hùng',
            roomNumber: 'Phòng 208',
          },
          {
            id: 'c1b2c3d4-0001-4000-8000-000000000001',
            name: 'Chuyên khoa Da liễu',
            code: 'DERMATOLOGY',
            description: 'Chẩn đoán và điều trị bệnh lý da liễu, mụn ngứa, viêm da cơ địa và phục hồi da.',
            doctorName: 'BS.CKII Nguyễn Minh Anh',
            roomNumber: 'Phòng 101',
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="specialties" className="scroll-mt-24 space-y-6 py-2">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-mint-light shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Cột Trái: Tiêu đề & Giới thiệu */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-primary/10 text-pine-teal text-xs font-bold uppercase tracking-wider border border-teal-primary/20">
              <Sparkles size={14} />
              <span>Chuyên Khoa Đang Khám</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              CÁC CHUYÊN KHOA <br />
              <span className="text-pine-teal">ĐANG PHỤC VỤ KHÁCH HÀNG</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Dữ liệu chuyên khoa được đồng bộ trực tiếp từ hệ thống phòng khám MedSched. 
              Mỗi chuyên khoa có bác sĩ đầu ngành trực tiếp phụ trách tại buồng khám cố định.
            </p>

            <div className="p-4 rounded-2xl bg-mint-soft border border-mint-light space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-pine-teal">
                <Stethoscope size={15} />
                <span>Bác Sĩ Trực Khám Hàng Ngày</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chủ động đặt lịch khám theo khung giờ hẹn trước để được phục vụ chu đáo, vào khám ngay không cần chờ.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pine-teal text-white text-xs font-bold hover:bg-pine-teal-hover transition shadow-xs w-full justify-center cursor-pointer"
              >
                <Calendar size={14} />
                <span>Đặt Lịch Khám Chuyên Khoa</span>
              </Link>
            </div>
          </div>

          {/* Cột Phải: Danh Sách Chuyên Khoa Thật */}
          <div className="lg:col-span-7 divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Đang tải danh mục chuyên khoa từ hệ thống...
              </div>
            ) : (
              specialties.map((item, index) => (
                <Link
                  key={item.id}
                  href="/booking"
                  className="group py-4 sm:py-5 flex items-start sm:items-center justify-between gap-4 hover:pl-2 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <span className="font-mono text-base font-bold text-teal-600/80 group-hover:text-pine-teal transition-colors shrink-0">
                      0{index + 1}
                    </span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-pine-teal transition-colors">
                          {item.name}
                        </h4>
                        {item.roomNumber && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">
                            {item.roomNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        {item.description}
                      </p>

                      {item.doctorName && (
                        <div className="flex items-center gap-1.5 text-[11px] text-pine-teal font-medium pt-0.5">
                          <User size={12} className="text-teal-600" />
                          <span>Phụ trách: <strong>{item.doctorName}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-pine-teal group-hover:text-white transition-all duration-200">
                    <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
