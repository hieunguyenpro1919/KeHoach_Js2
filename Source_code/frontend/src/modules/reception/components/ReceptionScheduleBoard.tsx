'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Search, 
  Stethoscope, 
  DoorOpen, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Zap, 
  RefreshCw, 
  Building2, 
  Sun, 
  Sunset, 
  Info,
  CalendarDays,
  UserCheck,
  Lock,
  Tag,
  Sparkles
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';

interface ReceptionScheduleBoardProps {
  onSelectSlotForWalkin?: (doctor: any, slot: any, date: string) => void;
  specialties?: any[];
  doctors?: any[];
}

export default function ReceptionScheduleBoard({
  onSelectSlotForWalkin,
  specialties = [],
  doctors = []
}: ReceptionScheduleBoardProps) {
  const getTodayISODate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const getTomorrowISODate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Logic hệ thống thông minh: Sau 17:00, tất cả ca khám hôm nay đã kết thúc!
  // Hệ thống tự động ưu tiên chọn NGÀY MAI để Lễ tân tư vấn và tiếp nhận bệnh nhân.
  const getSmartInitialDate = () => {
    const now = new Date();
    if (now.getHours() >= 17) {
      return getTomorrowISODate();
    }
    return getTodayISODate();
  };

  const [selectedDate, setSelectedDate] = useState<string>(getSmartInitialDate);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAvailability, setFilterAvailability] = useState<'ALL' | 'ONLY_AVAILABLE'>('ALL');

  const [loading, setLoading] = useState<boolean>(true);
  const [syncingTomorrow, setSyncingTomorrow] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [doctorSlotsMap, setDoctorSlotsMap] = useState<Record<string, any[]>>({});

  const isToday = selectedDate === getTodayISODate();
  const isTomorrow = selectedDate === getTomorrowISODate();
  const isAfter17h = new Date().getHours() >= 17;

  const formatDisplayDateVN = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleShiftDate = (offset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offset);
    const day = String(current.getDate()).padStart(2, '0');
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const year = current.getFullYear();
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Kích hoạt thủ công tác vụ đồng bộ lịch ngày mai
  const handleSyncTomorrowSchedule = async () => {
    try {
      setSyncingTomorrow(true);
      setSyncSuccessMsg(null);
      const res = await api.triggerAutoScheduleTomorrow();
      setSelectedDate(getTomorrowISODate());
      await loadSlotsForAllDoctors();
      setSyncSuccessMsg(res?.message || 'Đã đồng bộ lịch trực ngày mai thành công!');
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch (e: any) {
      console.warn('Lỗi kích hoạt auto schedule ngày mai:', e);
      setSyncSuccessMsg('Đã yêu cầu làm mới dữ liệu ca trực ngày mai.');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } finally {
      setSyncingTomorrow(false);
    }
  };

  // Tải danh sách slots cho tất cả bác sĩ trong ngày đang chọn
  const loadSlotsForAllDoctors = useCallback(async () => {
    if (!doctors || doctors.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const slotsMap: Record<string, any[]> = {};

    try {
      // Gọi song song danh sách slot của các bác sĩ
      const promises = doctors.map(async (doc) => {
        try {
          const slots = await api.getDoctorAvailableSlots(doc.id, selectedDate);
          if (Array.isArray(slots)) {
            slotsMap[doc.id] = slots;
          } else {
            slotsMap[doc.id] = [];
          }
        } catch {
          slotsMap[doc.id] = [];
        }
      });

      await Promise.all(promises);
      setDoctorSlotsMap(slotsMap);
    } catch (e) {
      console.warn('Lỗi khi tải danh sách slots toàn viện:', e);
    } finally {
      setLoading(false);
    }
  }, [doctors, selectedDate]);

  useEffect(() => {
    loadSlotsForAllDoctors();
  }, [loadSlotsForAllDoctors]);

  // Kiểm tra thời gian slot còn cách hiện tại bao nhiêu phút (Quy tắc 15 phút - A3)
  const getSlotTimingInfo = useCallback((timeStr: string) => {
    if (!isToday) {
      return { isPast: false, isUrgentTooClose: false, minutesDiff: 999 };
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Giả sử timeStr là "08:00 - 08:30"
    const startPart = timeStr.split('-')[0]?.trim() || '';
    const [startH, startM] = startPart.split(':').map(Number);
    const slotStartMinutes = (startH || 0) * 60 + (startM || 0);

    const minutesDiff = slotStartMinutes - currentMinutes;

    if (minutesDiff <= 0) {
      return { isPast: true, isUrgentTooClose: false, minutesDiff };
    } else if (minutesDiff < 15) {
      // Dưới 15 phút: Quá sát giờ tiếp đón, không đủ thời gian chuẩn bị hồ sơ
      return { isPast: false, isUrgentTooClose: true, minutesDiff };
    } else {
      // Đủ điều kiện tiếp nhận (>= 15 phút)
      return { isPast: false, isUrgentTooClose: false, minutesDiff };
    }
  }, [isToday]);

  // Lọc danh sách bác sĩ theo chuyên khoa, tên, phòng khám
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Lọc chuyên khoa
      if (selectedSpecialtyId !== 'ALL' && doc.specialtyId !== selectedSpecialtyId && doc.specialtyName !== selectedSpecialtyId) {
        return false;
      }

      // Lọc từ khóa tìm kiếm
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const docName = (doc.fullName || '').toLowerCase();
        const room = (doc.roomNumber || '').toLowerCase();
        const spec = (doc.specialtyName || '').toLowerCase();
        if (!docName.includes(term) && !room.includes(term) && !spec.includes(term)) {
          return false;
        }
      }

      // Lọc theo khung giờ còn trống (Khả dụng)
      if (filterAvailability === 'ONLY_AVAILABLE') {
        const slots = doctorSlotsMap[doc.id] || [];
        const hasAvailable = slots.some((s) => {
          if (s.disabled || s.status === 'full' || s.status === 'expired') return false;
          const timing = getSlotTimingInfo(s.time);
          return !timing.isPast && !timing.isUrgentTooClose;
        });
        if (!hasAvailable) return false;
      }

      return true;
    });
  }, [doctors, selectedSpecialtyId, searchTerm, filterAvailability, doctorSlotsMap, getSlotTimingInfo]);

  // Thống kê toàn viện trong ngày
  const clinicMetrics = useMemo(() => {
    let totalSlots = 0;
    let totalBooked = 0;
    let totalEligibleAvailable = 0;
    const activeRooms = new Set<string>();

    doctors.forEach((doc) => {
      if (doc.roomNumber) activeRooms.add(doc.roomNumber);
      const slots = doctorSlotsMap[doc.id] || [];
      totalSlots += slots.length;

      slots.forEach((s) => {
        if (s.status === 'full' || s.status === 'booked') {
          totalBooked++;
        } else if (s.status === 'available' && !s.disabled) {
          const timing = getSlotTimingInfo(s.time);
          if (!timing.isPast && !timing.isUrgentTooClose) {
            totalEligibleAvailable++;
          }
        }
      });
    });

    return {
      doctorCount: doctors.length,
      roomCount: activeRooms.size || 6,
      totalSlots,
      totalBooked,
      totalEligibleAvailable,
    };
  }, [doctors, doctorSlotsMap, getSlotTimingInfo]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Header Điều Khiển & Bộ Lọc Tra Cứu ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              <CalendarDays size={14} className="text-teal-600" />
              <span>Bảng Điều Phối Lịch Toàn Viện &amp; Khung Giờ Bác Sĩ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Tra Cứu Lịch Khám &amp; Tư Vấn Khách Vãng Lai
            </h2>
            <p className="text-xs text-slate-500">
              Lễ tân tra cứu tình trạng buồng khám, giờ trống của tất cả Bác sĩ theo thời gian thực và đăng ký ngay cho khách tại quầy.
            </p>
          </div>

          {/* Điều Khiển Chọn Ngày Khám & Chuyển Nhanh */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
            {/* Quick Switcher Hôm nay & Ngày mai */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayISODate())}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isToday
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={13} className={isToday ? 'text-teal-600' : 'text-slate-400'} />
                <span>Hôm nay ({formatDisplayDateVN(getTodayISODate())})</span>
                {isAfter17h && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isToday ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    Đã hết ca
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getTomorrowISODate())}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isTomorrow
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-teal-800 hover:bg-white/60'
                }`}
              >
                <Sparkles size={13} className={isTomorrow ? 'text-amber-200' : 'text-teal-600'} />
                <span>Ngày mai ({formatDisplayDateVN(getTomorrowISODate())})</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isTomorrow ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
                }`}>
                  Mở nhận lịch
                </span>
              </button>
            </div>

            {/* Chọn ngày tùy chỉnh */}
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer shadow-2xs"
                title="Lùi 1 ngày"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer shadow-2xs"
                title="Tiến 1 ngày"
              >
                <ChevronRight size={15} />
              </button>

              <button
                type="button"
                onClick={loadSlotsForAllDoctors}
                disabled={loading}
                className="p-1.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 transition cursor-pointer ml-1"
                title="Tải lại dữ liệu slots"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Thanh KPI Thống Kê Toàn Viện */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bác sĩ trực</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">{clinicMetrics.doctorCount} bác sĩ</div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Buồng khám mở</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">{clinicMetrics.roomCount} buồng khám</div>
          </div>

          <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
              <Zap size={11} className="text-emerald-600" />
              <span>Slot trống đón khách</span>
            </span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              {clinicMetrics.totalEligibleAvailable} khung giờ
            </div>
          </div>

          <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Bệnh nhân đã đặt</span>
            <div className="text-lg font-black text-blue-700 mt-0.5">{clinicMetrics.totalBooked} lượt khám</div>
          </div>
        </div>

        {/* Banner Thông Báo Trạng Thái Thông Minh (Sau 17:00 / Xem Ngày Mai) */}
        {isToday && isAfter17h && (
          <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-amber-950 text-sm flex items-center gap-2">
                  <span>Ca khám hôm nay đã kết thúc (Sau 17:00)</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full">
                    Đã đóng ca hôm nay
                  </span>
                </p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Tất cả các khung giờ khám trong ngày hôm nay đã kết thúc. Hệ thống đã tự động chốt buồng khám và kích hoạt lịch trực của toàn bộ Bác sĩ cho <strong>Ngày mai ({formatDisplayDateVN(getTomorrowISODate())})</strong>. Lễ tân vui lòng chuyển sang xem lịch ngày mai để tư vấn và đăng ký khám cho người bệnh.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(getTomorrowISODate())}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Sparkles size={15} />
              <span>Xem Lịch Ngày Mai Ngay</span>
            </button>
          </div>
        )}

        {isTomorrow && (
          <div className="p-3.5 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-teal-100 rounded-xl text-teal-700 shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="font-extrabold text-teal-950 text-sm">
                  Đang xem Lịch trực Ngày Mai ({formatDisplayDateVN(selectedDate)})
                </span>
                <span className="text-teal-800 text-xs block sm:inline sm:ml-2">
                  • Toàn bộ {clinicMetrics.doctorCount} Bác sĩ đã chốt buồng khám 🔒 • {clinicMetrics.totalEligibleAvailable} khung giờ khám sẵn sàng nhận đặt lịch.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSyncTomorrowSchedule}
              disabled={syncingTomorrow}
              className="px-3.5 py-1.5 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 font-bold rounded-xl text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Kích hoạt kiểm tra và đồng bộ lại nếu có bác sĩ mới"
            >
              <RefreshCw size={13} className={syncingTomorrow ? 'animate-spin' : ''} />
              <span>{syncingTomorrow ? 'Đang đồng bộ...' : 'Đồng bộ lại ngày mai'}</span>
            </button>
          </div>
        )}

        {syncSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {/* Banner Quy tắc đón khách vãng lai (Quy định 15 phút theo lựa chọn của người dùng) */}
        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold text-amber-950 block">
              Quy tắc tiếp nhận khách vãng lai tại quầy (Lead-time $\ge$ 15 phút):
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Để Bác sĩ kịp chuẩn bị hồ sơ bệnh án và tránh trùng giờ bệnh nhân đã hẹn, hệ thống chỉ cho phép tiếp nhận ngay đối với các khung giờ <strong>còn trống và có giờ bắt đầu cách hiện tại tối thiểu 15 phút</strong>. Các khung giờ dưới 15 phút sẽ hiển thị cảnh báo <span className="font-bold text-amber-700">Sát giờ</span>.
            </p>
          </div>
        </div>

        {/* Bộ Lọc Tìm Kiếm & Chuyên Khoa */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên Bác sĩ, phòng khám (P.208), chuyên khoa..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc chuyên khoa */}
          <div className="sm:w-64">
            <select
              value={selectedSpecialtyId}
              onChange={(e) => setSelectedSpecialtyId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="ALL">Tất cả chuyên khoa</option>
              {specialties.map((spec) => (
                <option key={spec.id} value={spec.id || spec.name}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle chỉ xem bác sĩ còn slot trống */}
          <button
            type="button"
            onClick={() => setFilterAvailability((prev) => (prev === 'ALL' ? 'ONLY_AVAILABLE' : 'ALL'))}
            className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterAvailability === 'ONLY_AVAILABLE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Zap size={14} />
            <span>Chỉ Bác Sĩ Còn Giờ Trống</span>
          </button>
        </div>
      </div>

      {/* ── Danh Sách Lưới Thẻ Bác Sĩ (Doctor Cards Grid) ── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-3">
          <RefreshCw size={24} className="animate-spin text-teal-700 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Đang tải lịch trực &amp; khung giờ toàn bộ Bác sĩ...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
          <Stethoscope size={36} className="text-slate-300 mx-auto" />
          <h4 className="font-extrabold text-slate-700 text-sm">Không tìm thấy bác sĩ phù hợp</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn lại chuyên khoa và ngày khám khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredDoctors.map((doc) => {
            const rawSlots = doctorSlotsMap[doc.id] || [];
            const docName = formatDoctorFullName(doc.academicTitle, doc.fullName);
            const specialtyName = doc.specialtyName || 'Đa Khoa';
            const roomNumber = doc.roomNumber || 'Phòng P.208';
            const fee = Number(doc.consultationFee) || 200000;

            // Phân loại slot Sáng & Chiều
            const morningSlots = rawSlots.filter((s) => {
              const hour = parseInt(s.time.split(':')[0], 10) || 0;
              return hour < 12;
            });

            const afternoonSlots = rawSlots.filter((s) => {
              const hour = parseInt(s.time.split(':')[0], 10) || 0;
              return hour >= 12;
            });

            const totalSlots = rawSlots.length;
            const availableCount = rawSlots.filter((s) => {
              if (s.disabled || s.status === 'full' || s.status === 'expired') return false;
              const timing = getSlotTimingInfo(s.time);
              return !timing.isPast && !timing.isUrgentTooClose;
            }).length;

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all overflow-hidden flex flex-col"
              >
                {/* Header Thẻ Bác Sĩ */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-teal-50/20 to-white border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-800 text-white flex items-center justify-center font-extrabold text-lg shadow-sm shrink-0">
                      {doc.fullName ? doc.fullName.charAt(doc.fullName.length - 1) : 'BS'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {doc.academicTitle || 'BS.CKII'}
                        </span>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <DoorOpen size={11} className="text-blue-600" />
                          <span>{roomNumber}</span>
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-800 text-sm sm:text-base mt-0.5 truncate">
                        {docName}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Stethoscope size={12} className="text-teal-600" />
                          <span>{specialtyName}</span>
                        </span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">
                          {fee.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge số slot trống */}
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs ${
                      availableCount > 0
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <Zap size={12} className={availableCount > 0 ? 'text-emerald-600' : 'text-slate-400'} />
                      <span>{availableCount} slot trống</span>
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      Tổng {totalSlots} slots trong ngày
                    </span>
                  </div>
                </div>

                {/* Danh Sách Các Khung Giờ (Sáng & Chiều) */}
                <div className="p-4 sm:p-5 flex-1 space-y-4">
                  {rawSlots.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      Bác sĩ chưa có ca trực trong ngày {formatDisplayDateVN(selectedDate)}.
                    </div>
                  ) : (
                    <>
                      {/* Buổi Sáng */}
                      {morningSlots.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                            <span className="flex items-center gap-1.5">
                              <Sun size={14} className="text-amber-500" />
                              <span>Ca Sáng (08:00 - 12:00)</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {morningSlots.filter((s) => !s.disabled && s.status === 'available').length} slots còn lại
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {morningSlots.map((slot) => {
                              const timing = getSlotTimingInfo(slot.time);
                              const isBooked = slot.status === 'full' || slot.status === 'booked';
                              const isLocked = slot.status === 'locked';
                              const isPast = timing.isPast || slot.status === 'expired';
                              const isUrgent = timing.isUrgentTooClose;
                              const isClickable = !isBooked && !isLocked && !isPast && !isUrgent && !slot.disabled;

                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={!isClickable}
                                  onClick={() => {
                                    if (isClickable && onSelectSlotForWalkin) {
                                      onSelectSlotForWalkin(doc, slot, selectedDate);
                                    }
                                  }}
                                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center min-w-0 ${
                                    isBooked
                                      ? 'bg-blue-50/80 border-blue-200 text-blue-800 cursor-not-allowed opacity-80'
                                      : isPast
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                      : isUrgent
                                      ? 'bg-amber-50 border-amber-300 text-amber-800 cursor-not-allowed'
                                      : isLocked
                                      ? 'bg-amber-50/60 border-amber-200 text-amber-700 cursor-not-allowed'
                                      : 'bg-emerald-50/80 hover:bg-emerald-600 border-emerald-300 text-emerald-900 hover:text-white shadow-2xs hover:shadow-sm cursor-pointer group'
                                  }`}
                                  title={
                                    isBooked
                                      ? 'Đã có người đặt lịch'
                                      : isPast
                                      ? 'Khung giờ đã qua'
                                      : isUrgent
                                      ? 'Quá sát giờ (< 15p), không nhận khách vãng lai'
                                      : isLocked
                                      ? 'Bác sĩ tạm khóa'
                                      : 'Click để tiếp nhận khách vãng lai cho khung giờ này'
                                  }
                                >
                                  <span className="text-xs font-black tracking-tight">{slot.time}</span>
                                  <span className={`text-[9px] font-bold mt-0.5 ${
                                    isClickable ? 'text-emerald-700 group-hover:text-emerald-100 flex items-center gap-0.5' : 'opacity-80'
                                  }`}>
                                    {isBooked ? (
                                      'ĐÃ ĐẶT'
                                    ) : isPast ? (
                                      'ĐÃ QUA'
                                    ) : isUrgent ? (
                                      'SÁT GIỜ (<15P)'
                                    ) : isLocked ? (
                                      'TẠM KHÓA'
                                    ) : (
                                      <>
                                        <Zap size={9} /> ĐÓN KHÁCH
                                      </>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Buổi Chiều */}
                      {afternoonSlots.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
                            <span className="flex items-center gap-1.5">
                              <Sunset size={14} className="text-indigo-500" />
                              <span>Ca Chiều (13:30 - 17:00)</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {afternoonSlots.filter((s) => !s.disabled && s.status === 'available').length} slots còn lại
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {afternoonSlots.map((slot) => {
                              const timing = getSlotTimingInfo(slot.time);
                              const isBooked = slot.status === 'full' || slot.status === 'booked';
                              const isLocked = slot.status === 'locked';
                              const isPast = timing.isPast || slot.status === 'expired';
                              const isUrgent = timing.isUrgentTooClose;
                              const isClickable = !isBooked && !isLocked && !isPast && !isUrgent && !slot.disabled;

                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={!isClickable}
                                  onClick={() => {
                                    if (isClickable && onSelectSlotForWalkin) {
                                      onSelectSlotForWalkin(doc, slot, selectedDate);
                                    }
                                  }}
                                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center min-w-0 ${
                                    isBooked
                                      ? 'bg-blue-50/80 border-blue-200 text-blue-800 cursor-not-allowed opacity-80'
                                      : isPast
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                      : isUrgent
                                      ? 'bg-amber-50 border-amber-300 text-amber-800 cursor-not-allowed'
                                      : isLocked
                                      ? 'bg-amber-50/60 border-amber-200 text-amber-700 cursor-not-allowed'
                                      : 'bg-emerald-50/80 hover:bg-emerald-600 border-emerald-300 text-emerald-900 hover:text-white shadow-2xs hover:shadow-sm cursor-pointer group'
                                  }`}
                                  title={
                                    isBooked
                                      ? 'Đã có người đặt lịch'
                                      : isPast
                                      ? 'Khung giờ đã qua'
                                      : isUrgent
                                      ? 'Quá sát giờ (< 15p), không nhận khách vãng lai'
                                      : isLocked
                                      ? 'Bác sĩ tạm khóa'
                                      : 'Click để tiếp nhận khách vãng lai cho khung giờ này'
                                  }
                                >
                                  <span className="text-xs font-black tracking-tight">{slot.time}</span>
                                  <span className={`text-[9px] font-bold mt-0.5 ${
                                    isClickable ? 'text-emerald-700 group-hover:text-emerald-100 flex items-center gap-0.5' : 'opacity-80'
                                  }`}>
                                    {isBooked ? (
                                      'ĐÃ ĐẶT'
                                    ) : isPast ? (
                                      'ĐÃ QUA'
                                    ) : isUrgent ? (
                                      'SÁT GIỜ (<15P)'
                                    ) : isLocked ? (
                                      'TẠM KHÓA'
                                    ) : (
                                      <>
                                        <Zap size={9} /> ĐÓN KHÁCH
                                      </>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
