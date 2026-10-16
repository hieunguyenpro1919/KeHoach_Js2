'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Copy,
  ShieldCheck,
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Gift,
  Sparkles,
} from 'lucide-react';
import { QrCodeImage } from './QrCodeImage';
import { api } from '@/shared/lib/api';

export interface BankConfig {
  bankId: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  depositAmount: number;
}

// Cấu hình tài khoản ngân hàng chính thức của Trưởng nhóm (KienlongBank)
export const OFFICIAL_BANK_CONFIG: BankConfig = {
  bankId: 'KLB', // Mã VietQR chuẩn Napas 247 của KienlongBank (BIN: 970452)
  bankName: 'KienlongBank - Ngân Hàng TMCP Kiên Long',
  accountNo: '18112007',
  accountName: 'CHAU TUAN KIET',
  depositAmount: 2000,
};

interface VietQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSuccess?: (info?: { promoCode?: string }) => void;
  title?: string;
  amount: number;
  description?: string;
  bookingCode?: string;
  appointmentId?: string;
  patientName?: string;
}

export const VietQrModal: React.FC<VietQrModalProps> = ({
  isOpen,
  onClose,
  onConfirmSuccess,
  title = 'Thanh Toán Qua VietQR & Ví MoMo (Napas 247)',
  amount,
  description,
  bookingCode = 'MED-2026',
  appointmentId,
  patientName,
}) => {
  // 1. Tài khoản ngân hàng nhận tiền chính thức
  const bankConfig = OFFICIAL_BANK_CONFIG;

  // 2. Chế độ thanh toán: 'DEPOSIT' (Đặt cọc giữ chỗ) hoặc 'FULL' (Toàn phần)
  const [paymentType, setPaymentType] = useState<'DEPOSIT' | 'FULL'>('DEPOSIT');

  // 3. Trạng thái thanh toán và kiểm tra biến động số dư
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState<boolean>(false);
  const [paidDetails, setPaidDetails] = useState<{ amount: number; txnRef?: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isManualConfirming, setIsManualConfirming] = useState<boolean>(false);
  const [payOsData, setPayOsData] = useState<{
    accountNumber?: string;
    accountName?: string;
    bin?: string;
    checkoutUrl?: string;
    qrCode?: string;
  } | null>(null);

  // 4. Mã khuyến mãi / Voucher ưu đãi (Free cọc cho Giảng viên / Tester)
  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
    message: string;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const cleanBookingCode = (bookingCode || 'MED').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const transferContent = `MEDPAY ${cleanBookingCode}`;

  // Tính số tiền thực tế theo mode đã chọn và mã khuyến mãi
  const fullAmount = Math.max(0, Math.round(amount || 200000));
  const baseDepositAmount = OFFICIAL_BANK_CONFIG.depositAmount;
  const isDepositFree = appliedPromo !== null && paymentType === 'DEPOSIT';
  const depositAmount = isDepositFree ? 0 : baseDepositAmount;
  const activeAmount = paymentType === 'DEPOSIT' ? depositAmount : fullAmount;

  const handleApplyPromo = () => {
    setPromoError(null);
    const cleaned = promoInput.trim().toUpperCase();
    if (!cleaned) {
      setPromoError('Vui lòng nhập mã khuyến mãi');
      return;
    }
    const validCodes = ['GIAOVIEN', 'MEDFREE', 'GIAM100', 'TESTER', 'VIP', 'GV2026', 'BACSITHANH', 'KHOACNTT', 'DEMO'];
    if (validCodes.includes(cleaned) || cleaned.startsWith('GV') || cleaned.startsWith('TEST') || cleaned.startsWith('FREE')) {
      setAppliedPromo({
        code: cleaned,
        discountPercent: 100,
        message: 'Áp dụng mã thành công! Miễn phí 100% tiền đặt cọc giữ chỗ (0 đ).',
      });
      setPaymentType('DEPOSIT');
    } else {
      setPromoError('Mã không hợp lệ. Vui lòng thử mã "GIAOVIEN" hoặc "MEDFREE".');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  };

  const handleConfirmFreePromo = async () => {
    setIsManualConfirming(true);
    setCheckError(null);
    try {
      const res = await api.confirmRealPayment({
        appointmentId,
        bookingCode: cleanBookingCode,
        amount: 0,
        paymentType: 'PROMO_FREE',
        promoCode: appliedPromo?.code || 'GIAOVIEN',
      });

      if (res && res.success) {
        setIsPaidSuccess(true);
        setPaidDetails({
          amount: 0,
          txnRef: `VOUCHER_${appliedPromo?.code || 'GIAOVIEN'}`,
        });
        setTimeout(() => {
          if (onConfirmSuccess) onConfirmSuccess({ promoCode: appliedPromo?.code });
        }, 1500);
      } else {
        setCheckError(res?.message || 'Không thể xác nhận ưu đãi. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setCheckError(err.message || 'Lỗi kết nối khi xác nhận ưu đãi');
    } finally {
      setIsManualConfirming(false);
    }
  };

  // Tài khoản và ngân hàng động nhận tiền từ PayOS (Tài khoản định danh VietQR PRO)
  const effectiveAccountNo = payOsData?.accountNumber || bankConfig.accountNo;
  const effectiveAccountName = payOsData?.accountName || bankConfig.accountName;
  const effectiveBin = payOsData?.bin || bankConfig.bankId;

  // URL VietQR chuẩn Napas 247 tương thích tất cả App Ngân Hàng + Ví MoMo
  const vietQrUrl = `https://img.vietqr.io/image/${effectiveBin}-${effectiveAccountNo}-compact2.png?amount=${activeAmount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(effectiveAccountName)}`;

  // Tạo Payment Entity trên backend khi mở modal hoặc đổi chế độ thanh toán
  useEffect(() => {
    if (!isOpen) return;

    setIsPaidSuccess(false);
    setPaidDetails(null);
    setCheckError(null);

    // Gửi yêu cầu khởi tạo thanh toán pending tới backend và lấy Virtual Account của PayOS
    api.createRealPayment({
      appointmentId,
      bookingCode: cleanBookingCode,
      paymentType,
      amount: activeAmount,
      method: 'BANK_TRANSFER',
    }).then((res: any) => {
      if (res) {
        setPayOsData({
          accountNumber: res.accountNumber || undefined,
          accountName: res.accountName || undefined,
          bin: res.bin || undefined,
          checkoutUrl: res.checkoutUrl || undefined,
          qrCode: res.qrCode || undefined,
        });
      }
    }).catch((err) => {
      console.warn('Không thể khởi tạo bản ghi thanh toán backend:', err);
    });
  }, [isOpen, paymentType, activeAmount, appointmentId, cleanBookingCode]);

  // Polling tự động kiểm tra trạng thái thanh toán mỗi 2.8 giây
  useEffect(() => {
    if (!isOpen || isPaidSuccess) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await api.checkRealPaymentStatus({
          appointmentId,
          bookingCode: cleanBookingCode,
        });

        if (res.success && res.status === 'SUCCEEDED') {
          clearInterval(intervalId);
          setIsPaidSuccess(true);
          setCheckError(null);
          setPaidDetails({
            amount: res.amountPaid || activeAmount,
            txnRef: res.transactionRef,
          });

          // Thông báo thành công và gọi callback
          setTimeout(() => {
            if (onConfirmSuccess) onConfirmSuccess();
          }, 1800);
        }
      } catch (err) {
        // Im lặng trong quá trình polling
      }
    }, 2800);

    return () => clearInterval(intervalId);
  }, [isOpen, isPaidSuccess, appointmentId, cleanBookingCode, activeAmount, onConfirmSuccess]);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // Xác nhận trực tiếp khi người bệnh đã chuyển khoản vào tài khoản KienlongBank
  const handleManualConfirm = async () => {
    setIsManualConfirming(true);
    setCheckError(null);
    try {
      const res = await api.confirmRealPayment({
        appointmentId,
        bookingCode: cleanBookingCode,
        amount: activeAmount,
        paymentType,
      });

      if (res && res.success) {
        setIsPaidSuccess(true);
        setPaidDetails({
          amount: res.amountPaid || activeAmount,
          txnRef: (res as any).transactionRef,
        });
        setTimeout(() => {
          if (onConfirmSuccess) onConfirmSuccess();
        }, 1500);
      } else {
        setCheckError('Không thể hoàn tất xác nhận. Vui lòng kiểm tra lại kết nối.');
      }
    } catch (err: any) {
      setCheckError(err?.message || 'Lỗi xác nhận chuyển khoản. Vui lòng thử lại.');
    } finally {
      setIsManualConfirming(false);
    }
  };

  // Kiểm tra trạng thái thanh toán tự động qua Napas 247 & PayOS
  const handleCheckPaymentStatus = async () => {
    setCheckingStatus(true);
    setCheckError(null);

    try {
      const res = await api.checkRealPaymentStatus({
        appointmentId,
        bookingCode: cleanBookingCode,
      });

      if (res.success && res.status === 'SUCCEEDED') {
        setIsPaidSuccess(true);
        setPaidDetails({
          amount: res.amountPaid || activeAmount,
          txnRef: res.transactionRef,
        });
        setTimeout(() => {
          if (onConfirmSuccess) onConfirmSuccess();
        }, 1500);
      } else {
        setCheckError(
          `Hệ thống chưa ghi nhận biến động số dư cho khoản chuyển ${activeAmount.toLocaleString(
            'vi-VN'
          )} đ (nội dung: ${transferContent}). Nếu bạn vừa chuyển tiền, vui lòng đợi 5-10 giây để liên ngân hàng xử lý hoặc bấm "Kiểm Tra Ngay".`
        );
      }
    } catch (err: any) {
      setCheckError(err.message || 'Lỗi kiểm tra giao dịch từ hệ thống ngân hàng.');
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white shrink-0 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 size={18} className="text-emerald-300 shrink-0" />
            <span className="font-bold text-xs sm:text-sm tracking-tight truncate">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/15 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Màn hình thông báo thanh toán thành công */}
          {isPaidSuccess ? (
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800">Thanh Toán Đã Được Xác Nhận!</h3>
                <p className="text-xs text-slate-500">
                  Hệ thống MedSched đã xác thực tiền về tài khoản KienlongBank thành công qua Napas 247.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2 max-w-xs mx-auto text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã phiếu hẹn:</span>
                  <strong className="text-slate-800 font-mono font-bold">{cleanBookingCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hình thức:</span>
                  <strong className="text-emerald-800 font-semibold">
                    {appliedPromo && paidDetails?.amount === 0
                      ? `🎁 Ưu đãi (${appliedPromo.code} - Miễn phí)`
                      : paymentType === 'DEPOSIT' ? '🟢 Đặt cọc giữ chỗ' : '🔵 Trọn gói dịch vụ'}
                  </strong>
                </div>
                <div className="flex justify-between border-t border-emerald-200/60 pt-1.5">
                  <span className="text-slate-500">Số tiền thanh toán:</span>
                  <strong className="text-emerald-700 font-bold font-mono text-sm">
                    {(paidDetails?.amount || activeAmount).toLocaleString('vi-VN')} đ
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check size={13} /> {appliedPromo && paidDetails?.amount === 0 ? 'Đã Xác Nhận Giữ Chỗ' : 'Đã Khớp Số Dư'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onConfirmSuccess) onConfirmSuccess();
                  onClose();
                }}
                className="mt-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Hoàn tất &amp; Đóng
              </button>
            </div>
          ) : (
            <>
              {/* Tab Selector: 2 Chế Độ Thanh Toán */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>1. Chọn Chế Độ Thanh Toán:</span>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Napas 247 Realtime
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {/* Option 1: Giữ Chỗ (DEPOSIT) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('DEPOSIT');
                      setCheckError(null);
                    }}
                    className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                      paymentType === 'DEPOSIT'
                        ? 'bg-white text-emerald-800 shadow-sm border border-emerald-400 font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">🟢 Đặt cọc giữ chỗ</span>
                      {paymentType === 'DEPOSIT' && <Check size={14} className="text-emerald-600" />}
                    </div>
                    <div className="text-sm font-black text-emerald-700 font-mono mt-1 flex items-center gap-1">
                      <span>{depositAmount.toLocaleString('vi-VN')}</span>
                      <span className="text-xs font-normal">đ</span>
                      {isDepositFree && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans font-bold">
                          Free 100%
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">
                      {isDepositFree ? 'Miễn phí giữ chỗ bằng mã ưu đãi' : 'Giữ slot chắc chắn, phần còn lại trả tại quầy'}
                    </span>
                  </button>

                  {/* Option 2: Thanh Toán Đủ (FULL) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('FULL');
                      setCheckError(null);
                    }}
                    className={`p-2.5 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                      paymentType === 'FULL'
                        ? 'bg-white text-blue-800 shadow-sm border border-blue-400 font-bold'
                        : 'text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">🔵 Thanh toán trọn gói</span>
                      {paymentType === 'FULL' && <Check size={14} className="text-blue-600" />}
                    </div>
                    <div className="text-sm font-black text-blue-700 font-mono mt-1">
                      {fullAmount.toLocaleString('vi-VN')} <span className="text-xs font-normal">đ</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">
                      Trả đủ 100%, ưu tiên vào khám ngay
                    </span>
                  </button>
                </div>
              </div>

              {/* Khung Nhập Mã Khuyến Mãi / Voucher (Free Đặt Cọc cho Giảng Viên / Tester) */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                    <Gift size={14} className="text-emerald-700" />
                    <span>Mã Khuyến Mãi / Ưu Đãi Đặt Cọc:</span>
                  </span>
                  {appliedPromo && (
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold underline cursor-pointer"
                    >
                      Bỏ áp dụng
                    </button>
                  )}
                </div>

                {appliedPromo ? (
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-emerald-300 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-emerald-950 font-bold block">
                          Mã ưu đãi: <span className="font-mono text-emerald-700">{appliedPromo.code}</span>
                        </span>
                        <span className="text-[10px] text-emerald-700">Miễn phí 100% tiền đặt cọc giữ chỗ (0 đ)</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                      -2.000 đ
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPromo();
                          }
                        }}
                        placeholder="Nhập mã: GIAOVIEN hoặc MEDFREE"
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-mono uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-200"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                      >
                        Áp dụng
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[10px] text-rose-600 font-medium mt-1">{promoError}</p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <span>💡</span>
                      <span>Dành cho Giảng viên / Kiểm thử: Nhập <strong>GIAOVIEN</strong> hoặc <strong>MEDFREE</strong> để miễn phí cọc 0 đ.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Amount Display & Patient info */}
              <div className="text-center pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Số tiền cần thanh toán:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono mt-0.5">
                  {activeAmount.toLocaleString('vi-VN')}{' '}
                  <span className="text-base sm:text-lg font-bold">VNĐ</span>
                </div>
                {patientName && (
                  <div className="text-xs text-slate-600 mt-0.5 font-medium">
                    Bệnh nhân: <strong className="text-slate-800">{patientName}</strong>
                  </div>
                )}
              </div>

              {/* Trường hợp 1: Miễn phí đặt cọc qua mã khuyến mãi */}
              {isDepositFree ? (
                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-500/40 rounded-2xl p-4 text-center space-y-3 shadow-inner">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles size={24} className="text-emerald-600 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Ưu Đãi Giảng Viên &amp; Kiểm Thử</span>
                    <h4 className="text-base font-extrabold text-slate-800 mt-0.5">Miễn Phí 100% Tiền Đặt Cọc Giữ Chỗ</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Mã <strong className="font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{appliedPromo.code}</strong> đã kích hoạt. Bạn không cần chuyển khoản 2.000 đ tiền cọc.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Số tiền cọc cần nạp:</span>
                    <strong className="text-emerald-700 font-black text-sm">0 đ (Miễn phí)</strong>
                  </div>
                  <button
                    type="button"
                    disabled={isManualConfirming}
                    onClick={handleConfirmFreePromo}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-700/20 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isManualConfirming ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang xác nhận giữ chỗ...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Xác Nhận Giữ Chỗ Miễn Phí (0 đ)</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Trường hợp 2: Chuyển khoản VietQR bình thường */}
                  <div className="text-center">
                    <div className="bg-slate-50 border-2 border-dashed border-emerald-500/40 rounded-2xl p-3 inline-block shadow-inner relative group">
                      <img
                        src={vietQrUrl}
                        alt="Mã VietQR Thanh Toán Viện Phí"
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-xl mx-auto shadow-sm bg-white p-1"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallbackEl = document.getElementById('vietqr-offline-fallback');
                          if (fallbackEl) fallbackEl.style.display = 'block';
                        }}
                      />
                      <div id="vietqr-offline-fallback" style={{ display: 'none' }} className="py-2">
                        <QrCodeImage
                          value={`2|99|${bankConfig.accountNo}|${bankConfig.accountName}|${activeAmount}|${transferContent}`}
                          size={180}
                          className="mx-auto rounded-lg shadow-xs"
                        />
                        <span className="text-[10px] text-slate-400 block mt-1">Chế độ tạo mã QR ngoại tuyến</span>
                      </div>

                      <div className="text-[11px] text-slate-600 font-medium mt-2 flex items-center justify-center gap-1.5">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        <span>Mở <strong>App Ngân hàng</strong> hoặc <strong>Ví MoMo</strong> quét mã</span>
                      </div>
                    </div>

                    {/* Polling Liveness Badge */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-teal-700 font-medium mt-1.5">
                      <Loader2 size={12} className="animate-spin text-teal-600" />
                      <span>Đang tự động lắng nghe giao dịch từ tài khoản...</span>
                    </div>
                  </div>

                  {/* Account Details Box with 1-click Copy */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 text-left space-y-2 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Ngân hàng nhận:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 font-black rounded text-[10px]">
                          KLB
                        </span>
                        <strong className="text-slate-800 font-semibold">{bankConfig.bankName}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Số tài khoản:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                        <span className="text-sm text-emerald-800 font-black">{effectiveAccountNo}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(effectiveAccountNo, 'account')}
                          className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === 'account' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Chủ tài khoản:</span>
                      <strong className="text-slate-800 font-semibold uppercase">{effectiveAccountName}</strong>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">Nội dung CK:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800">
                        <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-xs border border-emerald-300">
                          {transferContent}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(transferContent, 'content')}
                          className="text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer"
                          title="Sao chép nội dung chuyển khoản"
                        >
                          {copiedField === 'content' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Cảnh báo khi người dùng bấm kiểm tra nhưng tiền chưa về */}
              {checkError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3.5 rounded-2xl text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                    <span>Chưa Nhận Được Thanh Toán Tự Động:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-700">{checkError}</p>

                  {/* Cứu cánh khi người dùng chuyển thẳng vào STK cá nhân 18112007 thay vì tài khoản PayOS */}
                  <div className="pt-1 border-t border-rose-200">
                    <button
                      type="button"
                      disabled={isManualConfirming}
                      onClick={handleManualConfirm}
                      className="text-xs text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-400 py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 w-full cursor-pointer shadow-xs"
                    >
                      {isManualConfirming ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Đang xác nhận lịch khám...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                          <span>Tôi đã chuyển {activeAmount.toLocaleString('vi-VN')} đ vào tài khoản KienlongBank ({bankConfig.accountNo})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Gợi ý test MoMo */}
              <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2">
                <span className="text-amber-600 text-sm leading-none shrink-0">💡</span>
                <span>
                  <strong>Hướng dẫn:</strong> Mở App MoMo hoặc App Ngân hàng ➔ Chọn <strong>Quét Mã</strong> ➔ Quét mã QR KienlongBank ở trên. Sau khi chuyển xong, hệ thống sẽ tự động xác nhận số dư.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isPaidSuccess && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2.5 shrink-0">
            {isDepositFree ? (
              <div className="flex items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Để Sau / Đóng
                </button>
                <button
                  type="button"
                  disabled={isManualConfirming}
                  onClick={handleConfirmFreePromo}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isManualConfirming ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Đang xác nhận...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Xác Nhận Giữ Chỗ (0 đ)</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <>
                {/* Thanh trạng thái tự động bắt giao dịch */}
                <div className="w-full py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-800 text-xs font-semibold">
                  <Loader2 size={15} className="animate-spin text-emerald-600 shrink-0" />
                  <span>Hệ thống đang tự động xác thực biến động số dư qua KienlongBank...</span>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Để Sau / Đóng
                  </button>
                  <button
                    type="button"
                    disabled={checkingStatus}
                    onClick={handleCheckPaymentStatus}
                    className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    title="Kiểm tra đối soát số dư tức thì từ PayOS &amp; KienlongBank"
                  >
                    {checkingStatus ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Đang đối soát...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        <span>Kiểm Tra Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
