'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Clock,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  MessageCircle,
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lấy thông tin phiên từ URL params hoặc sessionStorage
  const [sessionToken, setSessionToken] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('0912***678');
  const [emailMasked, setEmailMasked] = useState('');
  const [devDemoOtp, setDevDemoOtp] = useState('');

  // Trạng thái 4 ô số
  const [digits, setDigits] = useState(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Đồng hồ đếm ngược hiệu lực (120 giây) & Cooldown gửi lại (60 giây)
  const [expiresSeconds, setExpiresSeconds] = useState(120);
  const [resendCooldown, setResendCooldown] = useState(60);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showZaloToast, setShowZaloToast] = useState(true);

  // Khởi tạo dữ liệu phiên khi load trang
  useEffect(() => {
    let token = searchParams.get('token');
    let phone = searchParams.get('phone');

    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('medsched_otp_session');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          token = token || parsed.sessionToken;
          phone = phone || parsed.phoneMasked;
          if (parsed.emailMasked) setEmailMasked(parsed.emailMasked);
          if (parsed.devDemoOtp) setDevDemoOtp(parsed.devDemoOtp);
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (token) setSessionToken(token);
    if (phone) setPhoneMasked(phone);

    // Auto-focus vào ô đầu tiên
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 150);
  }, [searchParams]);

  // Bộ đếm thời gian hiệu lực (120s) và gửi lại (60s)
  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format số giây thành mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Xử lý khi gõ từng ô số
  const handleDigitChange = (index: number, value: string) => {
    // Chỉ nhận chữ số
    const cleanChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);
    setError('');

    // Nếu vừa nhập số và chưa phải ô cuối -> tự động nhảy sang ô tiếp theo
    if (cleanChar && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Nếu đã nhập đủ cả 4 ô -> tự động kích hoạt xác thực
    const fullCode = newDigits.join('');
    if (fullCode.length === 4) {
      handleVerify(fullCode);
    }
  };

  // Xử lý phím Backspace để xóa lùi
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Ô hiện tại rỗng -> nhảy về ô trước và xóa
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs[index - 1].current?.focus();
      }
    }
  };

  // Xử lý khi người dùng Dán (Paste) mã 4 số
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const newDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    // Focus vào ô tiếp theo hoặc ô cuối
    const nextIdx = Math.min(pasted.length, 3);
    inputRefs[nextIdx].current?.focus();

    if (pasted.length === 4) {
      handleVerify(pasted);
    }
  };

  // Gửi xác thực mã OTP
  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join('');
    if (code.length < 4) {
      setError('Vui lòng nhập đủ 4 chữ số mã OTP.');
      return;
    }
    if (!sessionToken) {
      setError('Phiên xác thực không hợp lệ. Vui lòng quay lại trang Đăng ký.');
      return;
    }
    if (expiresSeconds <= 0) {
      setError('Mã xác thực đã hết hạn (quá 2 phút). Vui lòng nhấn "Gửi lại mã qua Zalo".');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.verifyOtp({
        sessionToken,
        otpCode: code,
      });

      setSuccess(true);
      setShowZaloToast(false);
      // Xóa thông tin phiên tạm sau khi kích hoạt thành công
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('medsched_otp_session');
      }

      // Chuyển hướng sau 1.2s
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch (err: any) {
      const msg = err.message || 'Mã xác thực chưa chính xác. Vui lòng thử lại.';
      setError(msg);

      // Trích xuất số lần thử nếu có
      const match = msg.match(/còn lại (\d+) lần thử/i);
      if (match && match[1]) {
        setAttemptsLeft(parseInt(match[1], 10));
      }

      // Xóa các ô và focus lại ô đầu tiên
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    if (!sessionToken) {
      setError('Phiên xác thực không hợp lệ. Vui lòng đăng ký lại.');
      return;
    }

    setResending(true);
    setError('');

    try {
      const res = await api.resendOtp({ sessionToken });
      setExpiresSeconds(res.expiresInSeconds || 120);
      setResendCooldown(res.resendCooldownSeconds || 60);
      if (res.devDemoOtp) {
        setDevDemoOtp(res.devDemoOtp);
        setShowZaloToast(true);
      }
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } catch (err: any) {
      setError(err.message || 'Gửi lại mã không thành công. Vui lòng thử lại sau.');
    } finally {
      setResending(false);
    }
  };

  // Điền nhanh mã Demo (Dành cho kiểm thử/đồ án)
  const handleQuickFillDemo = () => {
    if (!devDemoOtp || devDemoOtp.length !== 4) return;
    const parts = devDemoOtp.split('');
    setDigits(parts);
    handleVerify(devDemoOtp);
  };

  // Sao chép mã vào clipboard
  const handleCopyCode = () => {
    if (!devDemoOtp) return;
    navigator.clipboard.writeText(devDemoOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 relative">
      {/* ── WIDGET GIẢ LẬP TIN NHẮN ZALO OA (DEV / DEMO HELPER) ── */}
      {devDemoOtp && showZaloToast && !success && (
        <div className="w-full max-w-md mb-4 bg-gradient-to-r from-blue-600 via-sky-600 to-teal-600 p-0.5 rounded-2xl shadow-xl animate-fadeIn">
          <div className="bg-white rounded-[14px] p-3 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs">
                  Z
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-800">MedSched Clinic</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold">
                      ✓
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded-full border border-blue-200">
                      Zalo OA
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Vừa xong • Tin nhắn ZNS</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowZaloToast(false)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                title="Đóng thông báo"
              >
                ✕
              </button>
            </div>

            <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-2.5 text-xs text-slate-700 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] text-slate-600">
                  Mã xác thực đăng ký tài khoản MedSched của bạn là:
                </p>
                <span className="font-mono text-lg font-extrabold text-blue-700 tracking-wider">
                  {devDemoOtp}
                </span>
                <span className="text-[10px] text-slate-400 ml-2">(Hiệu lực 2 phút)</span>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleQuickFillDemo}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={11} /> Tự điền
                </button>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[10px] hover:bg-slate-50 transition flex items-center gap-1 justify-center cursor-pointer"
                >
                  {copied ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD CHÍNH: XÁC THỰC MÃ 4 CHỮ SỐ ── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl w-full max-w-sm sm:max-w-md border border-mint-light text-center relative overflow-hidden">
        {/* Họa tiết trang trí viền trên */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-teal-500 via-pine-teal to-blue-600" />

        {success ? (
          /* TRẠNG THÁI THÀNH CÔNG */
          <div className="py-6 space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900">Xác Thực Thành Công!</h2>
              <p className="text-xs text-slate-500">
                Tài khoản của bạn đã được kích hoạt. Đang chuyển hướng vào hệ thống...
              </p>
            </div>
            <div className="w-8 h-8 border-2 border-pine-teal border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          /* FORM NHẬP OTP */
          <div className="space-y-5">
            {/* Logo & Tiêu đề */}
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-pine-teal border border-mint-light mx-auto shadow-2xs">
                <ShieldCheck size={26} />
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Xác Thực Tài Khoản
              </h1>

              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Mã OTP 4 chữ số đã được gửi qua <strong className="text-blue-600 font-bold">Zalo</strong> &amp; Email đến số điện thoại:
              </p>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-mono font-bold border border-slate-200">
                <MessageCircle size={13} className="text-blue-600" />
                <span>{phoneMasked}</span>
              </div>
            </div>

            {/* Thông báo lỗi */}
            {error && (
              <AlertMessage
                type="error"
                message={error}
                className="py-2 text-xs text-left"
                onClose={() => setError('')}
              />
            )}

            {/* 4 Ô NHẬP SỐ CHUYÊN DỤNG (AUTO-FOCUS & PASTE SUPPORT) */}
            <div className="space-y-2">
              <div
                className="flex items-center justify-center gap-2.5 sm:gap-3"
                onPaste={handlePaste}
              >
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={loading || expiresSeconds <= 0}
                    className={`w-13 h-15 sm:w-15 sm:h-17 text-2xl sm:text-3xl font-mono font-black text-center rounded-2xl outline-none transition-all duration-200 ${
                      digit
                        ? 'bg-white border-2 border-pine-teal text-pine-teal shadow-sm scale-102 ring-2 ring-pine-teal/20'
                        : 'bg-mint-soft border border-mint-light text-slate-700 focus:bg-white focus:border-pine-teal focus:ring-2 focus:ring-pine-teal/20'
                    } ${expiresSeconds <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="•"
                  />
                ))}
              </div>

              {/* Đồng hồ đếm ngược hiệu lực */}
              <div className="flex items-center justify-center gap-1.5 text-xs">
                <Clock size={13} className={expiresSeconds <= 30 ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
                {expiresSeconds > 0 ? (
                  <span className={`font-mono font-bold ${expiresSeconds <= 30 ? 'text-rose-500' : 'text-slate-600'}`}>
                    Mã có hiệu lực trong: {formatTime(expiresSeconds)}
                  </span>
                ) : (
                  <span className="text-rose-500 font-bold">
                    Mã đã hết hạn. Vui lòng gửi lại mã mới.
                  </span>
                )}
              </div>
            </div>

            {/* Nút xác nhận */}
            <button
              type="button"
              onClick={() => handleVerify()}
              disabled={loading || digits.join('').length < 4 || expiresSeconds <= 0}
              className="w-full bg-pine-teal hover:bg-pine-teal-hover text-white font-bold py-2.5 sm:py-3 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Xác Nhận &amp; Kích Hoạt</span>
                </>
              )}
            </button>

            {/* Cơ chế gửi lại mã qua Zalo */}
            <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2 text-xs">
              <div className="text-slate-500">
                Chưa nhận được mã?{' '}
                {resendCooldown > 0 ? (
                  <span className="text-slate-400 font-medium">
                    Gửi lại qua Zalo sau ({resendCooldown}s)
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-pine-teal hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCw size={12} className={resending ? 'animate-spin' : ''} />
                    <span>Gửi lại mã qua Zalo</span>
                  </button>
                )}
              </div>

              {/* Nút quay lại trang Đăng ký */}
              <Link
                href="/register"
                className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs transition pt-1"
              >
                <ArrowLeft size={12} />
                <span>Quay lại trang Đăng ký</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-pine-teal border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
