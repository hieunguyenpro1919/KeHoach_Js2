'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  QrCode, 
  MapPin, 
  ShieldCheck,
  Printer,
  ChevronRight,
  AlertCircle,
  CreditCard,
  Sun,
  Sunset,
  Users,
  Paperclip,
  Trash2,
  FileText,
  HeartPulse,
  BadgeCheck,
  Phone,
  Info,
  CalendarDays
} from 'lucide-react';
import { api, AppointmentResponse, getAuthUser, getAuthToken } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import { useSingleTabLock } from '@/shared/hooks/useSingleTabLock';
import SingleTabLockOverlay from '@/shared/components/Feedback/SingleTabLockOverlay';
import { QrCodeImage } from '@/shared/components/QrCodeImage';
import { VietQrModal } from '@/shared/components/VietQrModal';

export default function BookingForm() {
  const { isBlocked, handleTakeOver } = useSingleTabLock({
    channelKey: 'patient_booking',
    moduleName: 'Đặt Lịch Khám Trực Tuyến',
  });

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [centers, setCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [isPaidOnline, setIsPaidOnline] = useState<boolean>(false);

  // Authentication & Role Check
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/booking&reason=auth_required');
      return;
    }

    const user = getAuthUser();
    setCurrentUser(user);
    const roles: string[] = user?.roles || [];
    if (roles.includes('ROLE_ADMIN')) {
      router.push('/admin');
      return;
    } else if (roles.includes('ROLE_DOCTOR')) {
      router.push('/doctor');
      return;
    } else if (roles.includes('ROLE_STAFF')) {
      router.push('/reception');
      return;
    }
    setAuthChecking(false);
  }, [router]);

  // Form selections
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Patient Profile Mode (Self vs Relative - Chuẩn YouMed)
  const [bookingFor, setBookingFor] = useState<'self' | 'relative'>('self');
  const [relativeInfo, setRelativeInfo] = useState({
    fullName: '',
    birthYear: '1995',
    gender: 'NAM',
    relationship: 'Ba / Mẹ',
    phone: '',
  });

  // Attachments (Tệp đính kèm kết quả xét nghiệm / đơn thuốc cũ)
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string }>>([]);

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

  const formatISODateToVN = (iso: string) => {
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
  };

  // Nếu hiện tại đã quá 14:30 chiều, tự động gợi ý ngày mai
  const isPastAllTodaySlots = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes > 14 * 60 + 30;
  };

  const [bookingDate, setBookingDate] = useState<string>(
    isPastAllTodaySlots() ? getTomorrowISODate() : getTodayISODate()
  );

  const [selectedSlot, setSelectedSlot] = useState<{ id: string; time: string; date: string }>({
    id: '',
    time: 'Chưa chọn',
    date: formatISODateToVN(isPastAllTodaySlots() ? getTomorrowISODate() : getTodayISODate()),
  });

  const [symptoms, setSymptoms] = useState('');
  const [aiPreview, setAiPreview] = useState<{ specialty: string; summary: string } | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const [c, s, docList] = await Promise.all([
          api.getMedicalCenters().catch(() => []),
          api.getSpecialties().catch(() => []),
          api.getDoctors().catch(() => []),
        ]);
        if (c && c.length > 0) {
          setCenters(c);
          setSelectedCenter(c[0].id);
        }
        if (s && s.length > 0) {
          setSpecialties(s);
          setSelectedSpecialty(s[0].id);
        }
        if (docList && docList.length > 0) {
          const mapped = docList.map((d: any) => ({
            id: d.id,
            name: formatDoctorFullName(d.academicTitle, d.fullName),
            rawName: d.fullName,
            academicTitle: d.academicTitle || 'Bác sĩ chuyên khoa',
            title: d.bio || `Bác sĩ ${d.specialtyName || ''}`,
            room: d.roomNumber || 'Phòng P.208',
            fee: Number(d.consultationFee) || 200000,
            specialty: d.specialtyName,
            specialtyId: d.specialtyId,
            centerId: d.medicalCenterId,
          }));
          setDoctors(mapped);
          setSelectedDoctor(mapped[0]);
        }
      } finally {
        setLoadingData(false);
      }
    }
    loadCategories();
  }, []);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) return;
    setAnalyzingAi(true);
    try {
      const res = await api.triageSymptoms(symptoms);
      setAiPreview(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: Array<{ name: string; size: string }> = [];
    for (let i = 0; i < files.length; i++) {
      if (attachments.length + newItems.length >= 5) break;
      const file = files[i];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      newItems.push({ name: file.name, size: sizeStr });
    }
    setAttachments((prev) => [...prev, ...newItems].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedSlot.id || timeSlots.find((s) => s.id === selectedSlot.id)?.disabled) {
      setError('Khung giờ bạn chọn đã qua hoặc không còn khả dụng. Vui lòng chọn khung giờ khác hoặc ngày khác.');
      return;
    }
    setSubmitting(true);

    try {
      let currentPatientProfileId = '';
      try {
        const profile = await api.getProfile();
        if (profile?.patientProfile?.profileId) {
          currentPatientProfileId = profile.patientProfile.profileId;
        }
      } catch {
        // Backend tự động phân giải từ JWT Session
      }

      let formattedSymptoms = symptoms.trim() || 'Khám kiểm tra sức khỏe định kỳ';
      if (bookingFor === 'relative') {
        const relPrefix = `[Khám cho người thân: ${relativeInfo.fullName || 'Người thân'} (${relativeInfo.birthYear}) - Quan hệ: ${relativeInfo.relationship} - SĐT: ${relativeInfo.phone || 'Chưa cung cấp'}]`;
        formattedSymptoms = `${relPrefix} ${formattedSymptoms}`;
      }
      if (attachments.length > 0) {
        formattedSymptoms = `${formattedSymptoms} [Có ${attachments.length} tệp tài liệu đính kèm: ${attachments.map((a) => a.name).join(', ')}]`;
      }

      const res = await api.bookAppointment({
        medicalCenterId: selectedCenter,
        patientProfileId: currentPatientProfileId,
        doctorId: selectedDoctor?.id || '',
        slotId: selectedSlot.id,
        symptoms: formattedSymptoms,
        medicalHistory: '',
      });
      setResult(res);
      setStep(4);
      setShowPaymentModal(true);
    } catch (err: any) {
      setError(err.message || 'Đặt lịch thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const BASE_TIME_SLOTS = [
    { id: 'sl000001-0000-0000-0000-000000000001', time: '08:00 - 08:30', startMinutes: 8 * 60, defaultStatus: 'available' },
    { id: 'sl000002-0000-0000-0000-000000000001', time: '08:30 - 09:00', startMinutes: 8 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000003-0000-0000-0000-000000000001', time: '09:00 - 09:30', startMinutes: 9 * 60, defaultStatus: 'available' },
    { id: 'sl000004-0000-0000-0000-000000000001', time: '09:30 - 10:00', startMinutes: 9 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000005-0000-0000-0000-000000000001', time: '10:00 - 10:30', startMinutes: 10 * 60, defaultStatus: 'available' },
    { id: 'sl000006-0000-0000-0000-000000000001', time: '10:30 - 11:00', startMinutes: 10 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000007-0000-0000-0000-000000000001', time: '13:30 - 14:00', startMinutes: 13 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000008-0000-0000-0000-000000000001', time: '14:00 - 14:30', startMinutes: 14 * 60, defaultStatus: 'available' },
    { id: 'sl000009-0000-0000-0000-000000000001', time: '14:30 - 15:00', startMinutes: 14 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000010-0000-0000-0000-000000000001', time: '15:00 - 15:30', startMinutes: 15 * 60, defaultStatus: 'available' },
    { id: 'sl000011-0000-0000-0000-000000000001', time: '15:30 - 16:00', startMinutes: 15 * 60 + 30, defaultStatus: 'available' },
  ];

  const [dynamicSlots, setDynamicSlots] = useState<Array<{
    id: string;
    time: string;
    startMinutes: number;
    status: string;
    label: string;
    disabled: boolean;
  }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const docId = selectedDoctor?.id;
    if (!docId) return;
    let isCancelled = false;
    setLoadingSlots(true);
    api.getDoctorAvailableSlots(docId, bookingDate)
      .then((data) => {
        if (!isCancelled && Array.isArray(data) && data.length > 0) {
          setDynamicSlots(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch doctor slots:', err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingSlots(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDoctor?.id, bookingDate]);

  const timeSlots = useMemo(() => {
    if (dynamicSlots.length > 0) {
      return dynamicSlots.map((s) => ({
        id: s.id,
        time: s.time,
        status: (s.status === 'full' ? 'full' : s.status === 'expired' ? 'expired' : s.status === 'locked' ? 'full' : 'available') as 'available' | 'full' | 'expired',
        label: s.label,
        disabled: s.disabled,
      }));
    }

    const isToday = bookingDate === getTodayISODate();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return BASE_TIME_SLOTS.map((slot) => {
      const isPast = isToday && slot.startMinutes <= currentMinutes;
      if (isPast) {
        return {
          id: slot.id,
          time: slot.time,
          status: 'expired' as const,
          label: 'Đã qua giờ',
          disabled: true,
        };
      }
      return {
        id: slot.id,
        time: slot.time,
        status: 'available' as const,
        label: 'Khả dụng',
        disabled: false,
      };
    });
  }, [bookingDate, dynamicSlots]);

  // Phân chia khung giờ Sáng & Chiều (Chuẩn YouMed - Ảnh 1 & Ảnh 3)
  const morningSlots = useMemo(() => {
    return timeSlots.filter((s) => {
      const hour = parseInt(s.time.split(':')[0], 10) || 0;
      return hour < 12;
    });
  }, [timeSlots]);

  const afternoonSlots = useMemo(() => {
    return timeSlots.filter((s) => {
      const hour = parseInt(s.time.split(':')[0], 10) || 0;
      return hour >= 12;
    });
  }, [timeSlots]);

  // Tự động chọn khung giờ khả dụng đầu tiên
  useEffect(() => {
    const firstAvailable = timeSlots.find((s) => !s.disabled);
    if (firstAvailable) {
      setSelectedSlot({
        id: firstAvailable.id,
        time: firstAvailable.time,
        date: formatISODateToVN(bookingDate),
      });
    } else {
      setSelectedSlot({
        id: '',
        time: 'Hết chỗ',
        date: formatISODateToVN(bookingDate),
      });
    }
  }, [bookingDate, timeSlots]);

  const activeCenterObj = useMemo(() => {
    return centers.find((c) => c.id === selectedCenter) || centers[0] || {
      name: 'Phòng Khám Đa Khoa MedSched',
      address: '210 Dương Bá Trạc, P.2, Q.8, TP.HCM',
    };
  }, [centers, selectedCenter]);

  if (authChecking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center py-16">
        <LoadingSpinner size={36} message="Đang kiểm tra quyền truy cập đặt lịch khám..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-3 sm:px-4">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              <Calendar size={14} />
              <span>Cổng Đặt Lịch Y Tế Trực Tuyến MedSched</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Đặt Lịch Khám Bác Sĩ Chuyên Khoa
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Quy trình chuẩn hóa Y tế: Chọn bác sĩ $\rightarrow$ Chọn khung giờ thông minh $\rightarrow$ Phân loại triệu chứng với <strong>Spring AI</strong> $\rightarrow$ Nhận số thứ tự (STT) và mã QR tiếp đón tức thì.
            </p>
          </div>
          {step < 4 && (
            <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl text-xs font-bold text-blue-800 shrink-0 shadow-2xs">
              Bước {step} / 3: {step === 1 ? 'Chọn Khoa & Chi Nhánh' : step === 2 ? 'Chọn Bác Sĩ & Ca Khám' : 'Thông Tin Bệnh Nhân'}
            </div>
          )}
        </div>

        {/* Stepper Wizard Progress */}
        {step < 4 && (
          <div className="grid grid-cols-3 gap-2 pb-6 border-b border-slate-100">
            <button
              onClick={() => setStep(1)}
              className={`p-2.5 sm:p-3 rounded-2xl text-left transition flex items-center gap-2 cursor-pointer ${
                step === 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 1 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>1</div>
              <div className="truncate">
                <span className="text-xs font-bold block truncate">1. Cơ Sở &amp; Khoa</span>
                <span className="text-[10px] opacity-80 hidden sm:block truncate">Chọn phòng khám</span>
              </div>
            </button>

            <button
              onClick={() => setStep(2)}
              className={`p-2.5 sm:p-3 rounded-2xl text-left transition flex items-center gap-2 cursor-pointer ${
                step === 2 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 2 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>2</div>
              <div className="truncate">
                <span className="text-xs font-bold block truncate">2. Bác Sĩ &amp; Giờ</span>
                <span className="text-[10px] opacity-80 hidden sm:block truncate">Ca sáng / ca chiều</span>
              </div>
            </button>

            <button
              onClick={() => setStep(3)}
              className={`p-2.5 sm:p-3 rounded-2xl text-left transition flex items-center gap-2 cursor-pointer ${
                step === 3 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 3 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>3</div>
              <div className="truncate">
                <span className="text-xs font-bold block truncate">3. Hồ Sơ Bệnh Nhân</span>
                <span className="text-[10px] opacity-80 hidden sm:block truncate">Triệu chứng &amp; Tài liệu</span>
              </div>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4">
            <AlertMessage type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Step 1: Cơ Sở & Chuyên Khoa */}
        {step === 1 && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-1.5">
                <Building2 size={15} className="text-blue-600" />
                <span>1. Chọn Chi Nhánh Phòng Khám MedSched:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {centers.map((center) => (
                  <div
                    key={center.id}
                    onClick={() => setSelectedCenter(center.id)}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      selectedCenter === center.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-800 text-sm">{center.name}</span>
                        {selectedCenter === center.id && <CheckCircle2 size={18} className="text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500 flex items-start gap-1">
                        <MapPin size={14} className="shrink-0 mt-0.5 text-slate-400" />
                        <span>{center.address}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-1.5">
                <Stethoscope size={15} className="text-blue-600" />
                <span>2. Chọn Chuyên Khoa Thăm Khám:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {specialties.map((spec) => (
                  <div
                    key={spec.id}
                    onClick={() => setSelectedSpecialty(spec.id)}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                      selectedSpecialty === spec.id
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="w-8 h-8 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
                        <Stethoscope size={15} />
                      </div>
                      <span className="font-medium text-xs sm:text-sm">{spec.name}</span>
                    </div>
                    {selectedSpecialty === spec.id && <CheckCircle2 size={16} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl transition shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer text-sm"
              >
                <span>Tiếp tục chọn Bác sĩ &amp; Khung giờ</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Steps 2 & 3: Layout 2 Cột Chuẩn YouMed Web (Ảnh 3 Desktop Experience) */}
        {(step === 2 || step === 3) && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Cột Trái: Doctor & Clinic Profile Card (Sticky Card - Ảnh 3) */}
            <div className="lg:col-span-4 bg-slate-50/80 rounded-3xl p-5 border border-slate-200 space-y-4 lg:sticky lg:top-6 shadow-2xs">
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-blue-600/20 shrink-0">
                  {selectedDoctor?.name ? selectedDoctor.name.charAt(selectedDoctor.name.length - 1) : 'BS'}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    {selectedDoctor?.academicTitle || 'Bác sĩ chuyên khoa'}
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-base leading-tight truncate">
                    {selectedDoctor?.name || 'BS. Hoàng Thị Bích Thủy'}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                    <Stethoscope size={12} className="text-blue-500" />
                    <span>{selectedDoctor?.specialty || 'Nội Khoa Tổng Hợp'}</span>
                  </span>
                </div>
              </div>

              {/* Chi tiết phòng khám & Địa chỉ */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">{activeCenterObj.name}</span>
                    <span className="text-[11px] text-slate-500">{activeCenterObj.address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building2 size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Buồng khám tiếp nhận:</span>
                    <span className="text-[11px] text-blue-700 font-semibold bg-blue-100/70 px-2 py-0.5 rounded-md">
                      {selectedDoctor?.room || 'Phòng P.208'}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Clock size={14} className="text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700 block">Giờ làm việc phòng khám:</span>
                    <span className="text-[11px] text-slate-500">Thứ 2 - Chủ Nhật (07:30 - 17:30)</span>
                  </div>
                </div>
              </div>

              {/* Bảng giá niêm yết minh bạch (Chuẩn Ảnh 2 & Ảnh 3) */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Chi Phí Khám Niêm Yết:
                </span>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Phí khám bác sĩ:</span>
                  <span className="font-bold text-slate-800">
                    {Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Phí tiện ích MedSched:</span>
                  <span className="font-semibold text-emerald-600">0 đ (Miễn phí)</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-extrabold text-sm text-blue-700">
                  <span>Tổng viện phí:</span>
                  <span>{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* Cam kết dịch vụ */}
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <BadgeCheck size={14} className="text-emerald-700" />
                  <span>Quyền lợi đặt trước MedSched:</span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-relaxed">
                  ✓ Được cấp số thứ tự ưu tiên khám đúng giờ.<br />
                  ✓ Bác sĩ trực tiếp tư vấn và kê đơn thuốc chuẩn Bộ Y Tế.
                </p>
              </div>
            </div>

            {/* Cột Phải: Form Thao Tác Chi Tiết */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Step 2: Chọn Ngày & Ca Khám (Phân ca Sáng / Chiều - Ảnh 1 & 3) */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Danh sách bác sĩ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      1. Chọn Bác Sĩ Phụ Trách:
                    </label>
                    <div className="space-y-2.5">
                      {doctors.length === 0 ? (
                        <div className="py-6 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Stethoscope size={28} className="mx-auto text-slate-400 mb-1.5" />
                          <p className="text-xs font-semibold text-slate-600">Chưa có bác sĩ thuộc khoa này</p>
                        </div>
                      ) : (
                        doctors.map((doc) => (
                          <div
                            key={doc.id}
                            onClick={() => setSelectedDoctor(doc)}
                            className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between ${
                              selectedDoctor?.id === doc.id
                                ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {doc.name.charAt(doc.name.length - 1)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">{doc.name}</h4>
                                <p className="text-[11px] text-slate-500">{doc.title} • {doc.room}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-blue-700 block">
                                {Number(doc.fee).toLocaleString('vi-VN')} đ
                              </span>
                              {selectedDoctor?.id === doc.id && (
                                <span className="text-[10px] font-bold text-emerald-600">Đang chọn</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 2. Chọn Ngày Khám Bệnh */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      2. Chọn Ngày Khám Bệnh:
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <input
                          type="date"
                          value={bookingDate}
                          min={getTodayISODate()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBookingDate(val);
                            const parts = val.split('-');
                            const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : val;
                            setSelectedSlot((prev) => ({ ...prev, date: formatted }));
                          }}
                          className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                        />
                        <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
                        Ngày đã chọn: <strong>Ngày {selectedSlot.date}</strong>
                      </span>
                    </div>
                  </div>

                  {/* 3. Phân nhóm Khung giờ Khám (Sáng vs Chiều - Chuẩn Ảnh 1 Screen 3) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        3. Chọn Khung Giờ Khám (Time-slot):
                      </label>
                      {loadingSlots && (
                        <span className="text-[11px] text-blue-600 animate-pulse font-medium">
                          Đang tải khung giờ thực tế...
                        </span>
                      )}
                    </div>

                    {/* Buổi Sáng */}
                    <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-1.5 text-amber-700">
                          <Sun size={15} className="text-amber-500" />
                          <span>Buổi Sáng (07:30 - 12:00)</span>
                        </div>
                        <span className="text-[11px] font-normal text-slate-500">
                          {morningSlots.filter((s) => !s.disabled).length} khung giờ còn trống
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {morningSlots.map((slot) => {
                          const isSelected = selectedSlot.id === slot.id;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={slot.disabled}
                              onClick={() => setSelectedSlot({ id: slot.id, time: slot.time, date: selectedSlot.date })}
                              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                                slot.disabled
                                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-75'
                                  : isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 cursor-pointer'
                                  : 'border-slate-200 bg-white hover:border-blue-400 text-slate-700 cursor-pointer'
                              }`}
                            >
                              <span className="text-xs font-extrabold">{slot.time}</span>
                              <span className={`text-[10px] mt-0.5 font-medium ${
                                isSelected ? 'text-blue-100' : slot.disabled ? 'text-slate-400' : 'text-emerald-600'
                              }`}>
                                {slot.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Buổi Chiều */}
                    <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-1.5 text-indigo-700">
                          <Sunset size={15} className="text-indigo-500" />
                          <span>Buổi Chiều (13:30 - 17:30)</span>
                        </div>
                        <span className="text-[11px] font-normal text-slate-500">
                          {afternoonSlots.filter((s) => !s.disabled).length} khung giờ còn trống
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {afternoonSlots.map((slot) => {
                          const isSelected = selectedSlot.id === slot.id;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={slot.disabled}
                              onClick={() => setSelectedSlot({ id: slot.id, time: slot.time, date: selectedSlot.date })}
                              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                                slot.disabled
                                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-75'
                                  : isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 cursor-pointer'
                                  : 'border-slate-200 bg-white hover:border-blue-400 text-slate-700 cursor-pointer'
                              }`}
                            >
                              <span className="text-xs font-extrabold">{slot.time}</span>
                              <span className={`text-[10px] mt-0.5 font-medium ${
                                isSelected ? 'text-blue-100' : slot.disabled ? 'text-slate-400' : 'text-emerald-600'
                              }`}>
                                {slot.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-4 flex justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowLeft size={16} /> Quay lại
                    </button>
                    <button
                      type="button"
                      disabled={!selectedDoctor || !selectedSlot.id}
                      onClick={() => setStep(3)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-2xl transition shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Tiếp tục: Hồ sơ &amp; Triệu chứng</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Hồ Sơ Người Khám & Triệu Chứng & Đính Kèm (Ảnh 1 & 3) */}
              {step === 3 && (
                <form onSubmit={handleBook} className="space-y-6">
                  
                  {/* Chọn Người Khám: Bản thân vs Người thân (Chuẩn YouMed - Ảnh 1 Screen 4) */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Users size={15} className="text-blue-600" />
                      <span>1. Chọn Hồ Sơ Người Đi Khám:</span>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBookingFor('self')}
                        className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center justify-between ${
                          bookingFor === 'self'
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            Tôi
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">
                              {currentUser?.fullName || 'Bản Thân Tôi'}
                            </span>
                            <span className="text-[10px] text-slate-500">{currentUser?.phone || 'Chủ tài khoản'}</span>
                          </div>
                        </div>
                        {bookingFor === 'self' && <CheckCircle2 size={16} className="text-blue-600" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setBookingFor('relative')}
                        className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center justify-between ${
                          bookingFor === 'relative'
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                            +
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">Người Thân Trong Gia Đình</span>
                            <span className="text-[10px] text-slate-500">Ba, Mẹ, Con, Vợ/Chồng</span>
                          </div>
                        </div>
                        {bookingFor === 'relative' && <CheckCircle2 size={16} className="text-blue-600" />}
                      </button>
                    </div>

                    {/* Nếu chọn Người thân, mở form điền thông tin người thân */}
                    {bookingFor === 'relative' && (
                      <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in duration-200 text-xs">
                        <span className="font-bold text-purple-900 block text-xs">
                          Thông Tin Người Thân Được Đặt Khám Hộ:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Họ và tên người khám *:
                            </label>
                            <input
                              type="text"
                              required={bookingFor === 'relative'}
                              value={relativeInfo.fullName}
                              onChange={(e) => setRelativeInfo({ ...relativeInfo, fullName: e.target.value })}
                              placeholder="Ví dụ: Hồ Gia Phúc"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Mối quan hệ:
                            </label>
                            <select
                              value={relativeInfo.relationship}
                              onChange={(e) => setRelativeInfo({ ...relativeInfo, relationship: e.target.value })}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                            >
                              <option value="Ba / Mẹ">Ba / Mẹ</option>
                              <option value="Con cái">Con cái</option>
                              <option value="Vợ / Chồng">Vợ / Chồng</option>
                              <option value="Anh / Chị / Em">Anh / Chị / Em</option>
                              <option value="Người thân khác">Người thân khác</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Năm sinh:
                            </label>
                            <input
                              type="number"
                              value={relativeInfo.birthYear}
                              onChange={(e) => setRelativeInfo({ ...relativeInfo, birthYear: e.target.value })}
                              placeholder="1994"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Số điện thoại liên hệ:
                            </label>
                            <input
                              type="tel"
                              value={relativeInfo.phone}
                              onChange={(e) => setRelativeInfo({ ...relativeInfo, phone: e.target.value })}
                              placeholder="0901234567"
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Mô Tả Triệu Chứng & Spring AI */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        2. Mô Tả Triệu Chứng &amp; Lý Do Đi Khám:
                      </label>
                      <button
                        type="button"
                        onClick={handleAnalyzeSymptoms}
                        disabled={analyzingAi || !symptoms.trim()}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles size={13} className={analyzingAi ? "animate-spin" : ""} />
                        <span>{analyzingAi ? 'AI Đang Phân Tích...' : 'Trợ Lý AI Phân Tích Gói Khám'}</span>
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      required
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Mô tả triệu chứng bệnh, tiền sử dị ứng thuốc hoặc cảm giác khó chịu cần bác sĩ tư vấn..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs sm:text-sm text-slate-800"
                    />

                    {/* AI Preview Alert nếu có */}
                    {aiPreview && (
                      <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 space-y-1.5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-purple-800">
                            <Sparkles size={14} className="text-purple-600" />
                            Đề Xuất Chuyên Môn Từ Spring AI:
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                            Đã Tối Ưu
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-[11px]">
                          {(aiPreview as any).clinicalSummary || aiPreview.summary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 3. Tệp Đính Kèm (Ảnh 1 & Ảnh 3: Tối đa 5 file) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                        <Paperclip size={14} className="text-blue-600" />
                        <span>3. Tệp Đính Kèm ({attachments.length}/5):</span>
                      </label>
                      <span className="text-[11px] text-slate-400">Kết quả xét nghiệm, đơn thuốc cũ, ảnh chụp X-Quang</span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={attachments.length >= 5}
                        className="px-4 py-2.5 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-blue-50/50 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        <FileText size={15} className="text-blue-600" />
                        <span>+ Thêm tệp hồ sơ (PNG, JPG, PDF)</span>
                      </button>

                      {attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs"
                        >
                          <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                          <span className="text-[10px] text-slate-400">({file.size})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="text-rose-500 hover:text-rose-700 p-0.5"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thanh Xác Nhận Tóm Tắt & Nút Đặt Khám (Ảnh 3 Sticky Footer) */}
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-slate-500">Khám cùng: </span>
                        <strong className="text-slate-800">{selectedDoctor?.name}</strong> • 
                        <span className="text-blue-700 font-bold"> {selectedSlot.time} (Ngày {selectedSlot.date})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500">Tổng thanh toán: </span>
                        <strong className="text-base text-blue-700 font-extrabold">
                          {Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ
                        </strong>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2 border-t border-blue-200/60">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-5 py-2.5 rounded-2xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5"
                      >
                        <ArrowLeft size={16} /> Quay lại
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-3 rounded-2xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Đang tạo vé khám...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Xác Nhận &amp; Xuất Vé Khám (STT)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Phiếu Hẹn Khám Điện Tử (Chuẩn E-Ticket YouMed - Ảnh 2 Screen 4) */}
        {step === 4 && result && (
          <div className="mt-6 max-w-2xl mx-auto space-y-6">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white p-6 rounded-t-3xl relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={22} className="text-cyan-300" />
                  <span className="font-extrabold tracking-wider text-xs sm:text-sm uppercase">HỆ THỐNG Y TẾ MEDSCHED</span>
                </div>
                <span className="text-[11px] bg-white/20 px-3 py-1 rounded-full font-mono font-bold tracking-wider">
                  ĐẶT KHÁM THÀNH CÔNG
                </span>
              </div>
              
              {/* STT Nổi Bật Siêu Lớn (Ảnh 2 Screen 4) */}
              <div className="mt-5 text-center relative z-10 bg-white/10 backdrop-blur-xs py-4 px-6 rounded-2xl border border-white/20">
                <span className="text-xs text-blue-100 uppercase tracking-widest font-bold">SỐ THỨ TỰ VÀO KHÁM (STT)</span>
                <div className="text-4xl sm:text-5xl font-black text-white mt-1 tracking-tight drop-shadow-sm">
                  STT: #{result.queueNumber ? String(result.queueNumber).padStart(4, '0') : '0003'}
                </div>
                <p className="text-xs text-cyan-200 mt-1.5 font-medium">
                  Mã phiếu khám: <strong className="font-mono text-white text-sm bg-black/20 px-2.5 py-0.5 rounded-md ml-1">{result.bookingCode}</strong>
                </p>
              </div>
            </div>

            {/* Thân Phiếu Khám & QR Code */}
            <div className="bg-white border-2 border-dashed border-slate-200 p-6 rounded-b-3xl -mt-6 pt-8 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-5 border-b border-slate-100">
                <div className="space-y-2.5 text-xs text-slate-700 flex-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bệnh nhân:</span>
                    <strong className="text-slate-900 text-sm font-bold">
                      {bookingFor === 'relative' && relativeInfo.fullName ? relativeInfo.fullName : result.patientName || currentUser?.fullName || 'Bệnh nhân'}
                    </strong>
                    {bookingFor === 'relative' && (
                      <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-semibold">
                        {relativeInfo.relationship}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Bác sĩ chuyên khoa:</span>
                    <strong className="text-slate-900 font-semibold">{selectedDoctor?.name || 'Bác sĩ chuyên khoa'}</strong>
                    <span className="text-slate-500 block text-[11px]">{selectedDoctor?.specialty}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Khung giờ hẹn &amp; Buồng khám:</span>
                    <span className="text-blue-700 font-bold text-sm block">{selectedSlot.time} • Ngày {selectedSlot.date}</span>
                    <span className="text-slate-600 text-[11px] font-medium">{selectedDoctor?.room || 'Phòng P.208'} - {activeCenterObj.name}</span>
                  </div>
                </div>

                {/* QR Code Check-in */}
                <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
                  <div className="w-28 h-28 bg-white border border-slate-300 rounded-xl p-1.5 flex items-center justify-center shadow-inner">
                    <QrCodeImage
                      value={typeof window !== 'undefined' ? `${window.location.origin}/checkin?code=${encodeURIComponent(result.bookingCode)}` : `/checkin?code=${encodeURIComponent(result.bookingCode)}`}
                      size={96}
                      className="rounded-lg"
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 mt-2 bg-slate-200/80 px-2.5 py-0.5 rounded">
                    {result.bookingCode}
                  </span>
                  <a
                    href={`/checkin?code=${encodeURIComponent(result.bookingCode)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold mt-1 hover:underline"
                  >
                    ✓ Quét Camera hoặc bấm mở tiếp đón
                  </a>
                </div>
              </div>

              {/* Chi tiết thanh toán */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Phí khám:</span>
                  <span className="font-semibold text-slate-800">{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Phí tiện ích:</span>
                  <span className="font-semibold text-emerald-600">0 đ (Miễn phí)</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-blue-700 text-sm">
                  <span>Tổng viện phí thanh toán:</span>
                  <span>{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* Thanh toán VietQR */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CreditCard size={15} />
                    <span>Thanh Toán Trực Tuyến Qua VietQR &amp; Ví MoMo:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isPaidOnline
                      ? '✓ Quý khách đã xác nhận thanh toán thành công.'
                      : 'Hỗ trợ quét mã VietQR chuyển khoản nhanh 24/7 để xác nhận giữ chỗ ưu tiên.'}
                  </p>
                </div>
                {isPaidOnline ? (
                  <span className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap">
                    <CheckCircle2 size={14} /> ĐÃ THANH TOÁN
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <QrCode size={15} />
                    <span>Quét Mã VietQR / MoMo</span>
                  </button>
                )}
              </div>

              {/* Lời dặn dò y tế nổi bật (Ảnh 2 Screen 4) */}
              <div className="text-xs text-amber-900 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 flex items-start gap-2.5">
                <span className="text-base leading-none">🔔</span>
                <span className="text-[11px] leading-relaxed">
                  <strong>Lời dặn dò tiếp đón:</strong> Bệnh nhân vui lòng đến trước giờ khám <strong>15 - 20 phút</strong> và xuất trình mã QR trên vé này hoặc thẻ CCCD tại Quầy Tiếp Đón để được hướng dẫn vào thẳng buồng khám.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Printer size={16} />
                  <span>In Phiếu / Lưu PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/appointments')}
                  className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Xem Danh Sách Lịch Hẹn</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setStep(1);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <Calendar size={16} />
                  <span>Đặt Ca Khám Mới</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Tab Lock Overlay */}
      <SingleTabLockOverlay
        isBlocked={isBlocked}
        moduleName="Cổng Đặt Lịch Khám Trực Tuyến"
        onTakeOver={handleTakeOver}
        description="Để tránh xung đột khóa giữ chỗ (Optimistic Slot Locking) và ngăn ngừa đặt trùng lịch hẹn, hệ thống chỉ cho phép bạn thao tác trên 1 tab duy nhất."
      />

      {/* VietQR Payment Modal */}
      {result && (
        <VietQrModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirmSuccess={() => setIsPaidOnline(true)}
          amount={Number(selectedDoctor?.fee) || 200000}
          appointmentId={result.id}
          bookingCode={result.bookingCode}
          patientName={result.patientName || 'Bệnh nhân'}
          description={`Thanh toán tiền khám bệnh phiếu ${result.bookingCode}`}
        />
      )}
    </div>
  );
}
