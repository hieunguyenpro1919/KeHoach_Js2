'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Sparkles,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bot,
  AlertCircle
} from 'lucide-react';
import { api } from '@/shared/lib/api';

export interface BookingMethodSelectorProps {
  isModal?: boolean;
  onClose?: () => void;
  initialMode?: 'select' | 'ai';
}

const COMMON_SYMPTOMS = [
  { label: '🔥 Sốt, ho, cảm cúm', query: 'Tôi bị sốt nhẹ, đau rát họng, ho có đờm và mệt mỏi toàn thân 2 hôm nay.' },
  { label: '🤢 Đau bụng, buồn nôn', query: 'Tôi bị đau âm ỉ vùng bụng trên rốn, ợ chua, buồn nôn và ăn uống khó tiêu.' },
  { label: '🤕 Đau đầu, chóng mặt', query: 'Tôi bị đau nhức nửa đầu, chóng mặt khi đứng lên ngồi xuống, mất ngủ.' },
  { label: '🔴 Ngứa, dị ứng da', query: 'Da tôi bị nổi mẩn đỏ, ngứa ngáy dữ dội ở vùng cổ và cánh tay sau khi ăn hải sản.' },
  { label: '🦷 Đau răng, sưng nướu', query: 'Tôi bị đau buốt răng hàm khi uống nước lạnh, nướu chân răng sưng đỏ và chảy máu.' },
  { label: '👁️ Mắt mờ, cộm rát', query: 'Mắt tôi bị đỏ, cộm xốn như có cát, chảy nước mắt nhiều và nhìn mờ.' },
];

export default function BookingMethodSelector({
  isModal = false,
  onClose,
  initialMode = 'select',
}: BookingMethodSelectorProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'select' | 'ai'>(initialMode);
  const [symptomInput, setSymptomInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleChooseManual = () => {
    if (onClose) onClose();
    router.push('/booking');
  };

  const handleAnalyze = async (text?: string) => {
    const textToAnalyze = (text || symptomInput).trim();
    if (!textToAnalyze) return;

    setAnalyzing(true);
    try {
      const res = await api.triageSymptoms(textToAnalyze);
      setAiResult(res);
    } catch (err) {
      console.error('Error analyzing symptoms:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyAiAndBook = () => {
    if (onClose) onClose();
    const params = new URLSearchParams();
    if (aiResult?.specialtyCode) {
      params.set('specialtyCode', aiResult.specialtyCode);
    }
    const symptomsToPass = symptomInput.trim() || aiResult?.clinicalSummary || '';
    if (symptomsToPass) {
      params.set('symptoms', symptomsToPass);
    }
    router.push(`/booking?${params.toString()}`);
  };

  return (
    <div
      className="relative w-full max-w-2xl mx-auto"
      onClick={(e) => isModal && e.stopPropagation()}
    >
      {/* Nút đóng modal khi ở chế độ Modal */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          aria-label="Đóng bảng chọn"
          className="absolute -top-10 right-1 sm:-top-11 sm:right-0 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center shadow-md transition cursor-pointer"
        >
          <X size={16} />
        </button>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: CHỈ GIỮ LẠI 2 KHUNG SONG SONG (ĐẶT LỊCH TRỰC TIẾP VS TƯ VẤN CÙNG AI) */}
      {/* ========================================================================= */}
      {viewMode === 'select' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-5 w-full">
          {/* KHUNG 1: ĐẶT LỊCH TRỰC TIẾP */}
          <div
            onClick={handleChooseManual}
            className="group relative bg-white rounded-3xl p-3 sm:p-5 border-2 border-slate-200/90 hover:border-emerald-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              {/* Header card: Icon + Badge */}
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Calendar size={16} className="text-emerald-600 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 rounded-md bg-slate-100 text-slate-600">
                  Chủ động
                </span>
              </div>

              {/* Tên phương thức */}
              <h2 className="text-[12px] sm:text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors flex items-center gap-1 leading-tight">
                <span>🩺</span>
                <span>ĐẶT LỊCH TRỰC TIẾP</span>
              </h2>

              {/* Mô tả ngắn */}
              <p className="text-[9.5px] sm:text-xs text-slate-500 mt-1 leading-snug">
                Dành cho bạn đã biết rõ bác sĩ hoặc chuyên khoa cần khám.
              </p>

              {/* Các điểm nổi bật */}
              <ul className="mt-2.5 sm:mt-3 space-y-1 sm:space-y-1.5 text-[9.5px] sm:text-[11px] text-slate-600">
                <li className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span>Chọn khoa &amp; bác sĩ quen</span>
                </li>
                <li className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span>Chủ động ngày &amp; giờ khám</span>
                </li>
              </ul>
            </div>

            {/* Nút hành động */}
            <button
              type="button"
              className="mt-3.5 sm:mt-5 w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-[10.5px] sm:text-xs font-bold text-emerald-800 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white border border-emerald-200 group-hover:border-emerald-600 transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="hidden sm:inline">Chọn Bác Sĩ &amp; Giờ Khám</span>
              <span className="sm:hidden">Đặt Trực Tiếp</span>
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>

          {/* KHUNG 2: TƯ VẤN CÙNG TRỢ LÝ AI */}
          <div
            onClick={() => setViewMode('ai')}
            className="group relative bg-white rounded-3xl p-3 sm:p-5 border-2 border-purple-200 hover:border-purple-500 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 ring-2 ring-purple-100/60"
          >
            {/* Huy hiệu khuyên dùng nổi trên góc */}
            <div className="absolute -top-2.5 right-2 sm:right-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] sm:text-[10px] font-extrabold px-1.5 py-0.5 sm:px-2 rounded-full shadow-xs flex items-center gap-0.5">
              <Sparkles size={9} />
              <span>Khuyên Dùng</span>
            </div>

            <div>
              {/* Header card: Icon + Badge */}
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Sparkles size={16} className="text-purple-600 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 sm:px-2 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  AI Triage
                </span>
              </div>

              {/* Tên phương thức */}
              <h2 className="text-[12px] sm:text-base font-bold text-slate-800 group-hover:text-purple-700 transition-colors flex items-center gap-1 leading-tight">
                <span>✨</span>
                <span>TƯ VẤN CÙNG AI</span>
              </h2>

              {/* Mô tả ngắn */}
              <p className="text-[9.5px] sm:text-xs text-slate-500 mt-1 leading-snug">
                Chưa rõ chuyên khoa? AI lắng nghe &amp; gợi ý bác sĩ tốt.
              </p>

              {/* Các điểm nổi bật */}
              <ul className="mt-2.5 sm:mt-3 space-y-1 sm:space-y-1.5 text-[9.5px] sm:text-[11px] text-slate-600">
                <li className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 size={12} className="text-purple-500 shrink-0" />
                  <span>Lắng nghe triệu chứng</span>
                </li>
                <li className="flex items-center gap-1 sm:gap-1.5">
                  <CheckCircle2 size={12} className="text-purple-500 shrink-0" />
                  <span>Gợi ý đúng chuyên khoa</span>
                </li>
              </ul>
            </div>

            {/* Nút hành động */}
            <button
              type="button"
              className="mt-3.5 sm:mt-5 w-full py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-[10.5px] sm:text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-700 group-hover:to-indigo-700 transition-all flex items-center justify-center gap-1 shadow-sm shadow-purple-500/20 cursor-pointer"
            >
              <Bot size={13} className="shrink-0" />
              <span className="hidden sm:inline">Trò Chuyện Với AI Ngay</span>
              <span className="sm:hidden">Tư Vấn Với AI</span>
              <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: MÀN HÌNH TƯ VẤN TRIỆU CHỨNG TRỰC TIẾP VỚI TRỢ LÝ AI               */
        /* ========================================================================= */
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-full">
          {/* Header AI */}
          <div className="px-5 pt-4 pb-3 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setViewMode('select')}
                className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-700 transition cursor-pointer"
                title="Quay lại chọn phương thức"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                  Trợ Lý Y Tế AI MedSched
                  <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">
                    Spring AI
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500">Phân loại triệu chứng &amp; Định hướng chuyên khoa</p>
              </div>
            </div>
          </div>

          {/* Thân hộp thoại AI */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
            {/* Lời chào của AI */}
            <div className="flex items-start gap-2.5 bg-purple-50/70 p-3 rounded-2xl border border-purple-200/80">
              <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={13} />
              </div>
              <div className="text-[11px] text-slate-700 leading-relaxed">
                <p className="font-bold text-purple-900 mb-0.5">Dạ, MedSched chào bạn!</p>
                <p>Hãy cho em biết bạn đang gặp phải triệu chứng hoặc cảm giác khó chịu nào nhé. Em sẽ phân tích và gợi ý bác sĩ chuyên khoa phù hợp nhất!</p>
              </div>
            </div>

            {/* Bong bóng triệu chứng chọn nhanh (Quick-reply Chips) */}
            <div>
              <span className="text-[10.5px] font-bold text-slate-600 block mb-1.5">
                👉 Chạm chọn nhanh triệu chứng phổ biến:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SYMPTOMS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSymptomInput(item.query);
                      handleAnalyze(item.query);
                    }}
                    className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200/80 hover:border-purple-300 rounded-full transition cursor-pointer active:scale-95"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô nhập triệu chứng bằng tay */}
            <div className="space-y-1.5 pt-0.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Mô tả triệu chứng của bạn:
              </label>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  placeholder="Ví dụ: Tôi bị đau bụng âm ỉ vùng dưới rốn, người hơi gai sốt từ sáng nay..."
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-[11px] text-slate-800"
                />
                <button
                  type="button"
                  disabled={analyzing || !symptomInput.trim()}
                  onClick={() => handleAnalyze()}
                  className="px-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  {analyzing ? <Sparkles size={14} className="animate-spin" /> : 'Phân Tích'}
                </button>
              </div>
            </div>

            {/* KẾT QUẢ PHÂN TÍCH CỦA AI */}
            {aiResult && (
              <div className="p-3.5 bg-gradient-to-br from-purple-50/90 to-indigo-50/90 rounded-2xl border border-purple-200 space-y-2.5 animate-fadeIn">
                {/* Cảnh báo cấp cứu nếu có */}
                {aiResult.isEmergency && (
                  <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-red-800 text-[11px] font-bold flex items-start gap-1.5">
                    <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                    <span>{aiResult.emergencyWarning || '🚨 Cảnh báo: Triệu chứng có thể cần cấp cứu y tế khẩn cấp!'}</span>
                  </div>
                )}

                {/* Chuyên khoa khuyến nghị */}
                <div className="flex items-center justify-between pb-1.5 border-b border-purple-200/60">
                  <div>
                    <span className="text-[10px] text-purple-700 font-semibold block">Chuyên khoa khuyến nghị:</span>
                    <span className="text-xs sm:text-sm font-extrabold text-purple-950">
                      {aiResult.specialtyName || aiResult.specialty || 'Khoa Nội Tổng Quát'}
                    </span>
                  </div>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Khớp Triệu Chứng
                  </span>
                </div>

                {/* Tóm tắt lâm sàng */}
                <div className="text-[11px] text-slate-700 space-y-0.5">
                  <span className="font-bold text-slate-800 block">Định hướng y khoa:</span>
                  <p className="leading-relaxed bg-white/80 p-2 rounded-xl border border-purple-100">
                    {aiResult.clinicalSummary || aiResult.summary}
                  </p>
                </div>

                {/* Lời khuyên chuẩn bị */}
                {aiResult.preparationAdvice && (
                  <p className="text-[10px] text-purple-800 italic">
                    💡 {aiResult.preparationAdvice}
                  </p>
                )}

                {/* Nút hành động áp dụng và đặt lịch */}
                <button
                  type="button"
                  onClick={handleApplyAiAndBook}
                  className="w-full py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <span>Tiếp Tục Đặt Lịch Với Khoa Này</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
