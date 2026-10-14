'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  QrCode, 
  ShieldCheck, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Menu, 
  X,
  Stethoscope,
  Calendar,
  BarChart3,
  FileText,
  ClipboardList,
  DoorOpen,
  Phone,
  Clock,
  Sparkles
} from 'lucide-react';
import { getAuthToken, getAuthUser, clearAuthSession, api } from '@/shared/lib/api';

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Xóa triệt để các dấu vết localStorage cũ trên trình duyệt
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
    }
    const token = getAuthToken();
    const authUser = getAuthUser();
    if (token && authUser) {
      setUser(authUser);
      const userRoles: string[] = authUser.roles || [];
      if (userRoles.includes('ROLE_ADMIN')) {
        if (pathname === '/' || pathname === '/booking' || pathname === '/reception' || pathname === '/doctor' || pathname === '/my-appointments') {
          router.push('/admin');
        }
      } else if (userRoles.includes('ROLE_DOCTOR')) {
        if (pathname === '/' || pathname === '/booking' || pathname === '/reception' || pathname === '/admin' || pathname === '/my-appointments') {
          router.push('/doctor');
        }
      } else if (userRoles.includes('ROLE_STAFF')) {
        if (pathname === '/' || pathname === '/booking' || pathname === '/doctor' || pathname === '/admin' || pathname === '/my-appointments') {
          router.push('/reception');
        }
      }
      // Tự động đồng bộ thông tin mới nhất từ API backend để cập nhật tiếng Việt và quyền
      api.getProfile().then((freshProfile: any) => {
        if (freshProfile && freshProfile.fullName) {
          const storedRoom = typeof window !== 'undefined' ? sessionStorage.getItem('medsched_doctor_active_room') : null;
          const updatedUser = {
            ...authUser,
            fullName: freshProfile.fullName,
            phone: freshProfile.phone || authUser.phone,
            roles: freshProfile.roles || authUser.roles,
            roomNumber: authUser.roomNumber || storedRoom || null,
          };
          setUser((prev: any) => ({
            ...updatedUser,
            roomNumber: prev?.roomNumber || updatedUser.roomNumber,
          }));
          if (typeof window !== "undefined") {
            sessionStorage.setItem("user", JSON.stringify(updatedUser));
          }
          if (updatedUser.roles?.includes('ROLE_ADMIN')) {
            if (pathname === '/' || pathname === '/booking' || pathname === '/reception' || pathname === '/doctor' || pathname === '/my-appointments') {
              router.push('/admin');
            }
          } else if (updatedUser.roles?.includes('ROLE_DOCTOR')) {
            if (pathname === '/' || pathname === '/booking' || pathname === '/reception' || pathname === '/admin' || pathname === '/my-appointments') {
              router.push('/doctor');
            }
          } else if (updatedUser.roles?.includes('ROLE_STAFF')) {
            if (pathname === '/' || pathname === '/booking' || pathname === '/doctor' || pathname === '/admin' || pathname === '/my-appointments') {
              router.push('/reception');
            }
          }
        }
      }).catch(() => {});
      if (userRoles.includes('ROLE_DOCTOR')) {
        const storedRoom = typeof window !== 'undefined' ? sessionStorage.getItem('medsched_doctor_active_room') : null;
        if (storedRoom) {
          setUser((prev: any) => prev ? { ...prev, roomNumber: storedRoom } : prev);
        } else {
          api.getDoctors().then((docs) => {
            if (Array.isArray(docs)) {
              const matched = docs.find((d: any) =>
                (authUser.id && d.userId === authUser.id) ||
                (authUser.fullName && d.fullName?.toLowerCase() === authUser.fullName?.toLowerCase()) ||
                (authUser.email && d.email?.toLowerCase() === authUser.email?.toLowerCase())
              );
              if (matched?.roomNumber) {
                setUser((prev: any) => prev ? { ...prev, roomNumber: matched.roomNumber } : prev);
              }
            }
          }).catch(() => {});
        }
      }
    } else {
      setUser(null);
    }

    const handleRoomChanged = (e: any) => {
      const room = e?.detail?.roomNumber || sessionStorage.getItem('medsched_doctor_active_room');
      if (room) {
        setUser((prev: any) => prev ? { ...prev, roomNumber: room } : prev);
      }
    };
    window.addEventListener("medsched:doctor_room_changed", handleRoomChanged);

    const handleKickout = () => {
      setUser(null);
    };
    window.addEventListener("medsched:concurrent_kickout", handleKickout);
    return () => {
      window.removeEventListener("medsched:doctor_room_changed", handleRoomChanged);
      window.removeEventListener("medsched:concurrent_kickout", handleKickout);
    };
  }, [pathname, router]);

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    router.push('/login');
  };

  const roles: string[] = user?.roles || [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isDoctor = roles.includes('ROLE_DOCTOR');
  const isStaff = roles.includes('ROLE_STAFF');

  // Phân quyền thanh điều hướng tách bạch theo từng vai trò nghiệp vụ:
  // - Admin: Quản trị người dùng & Cấp tài khoản
  // - Bác sĩ: Buồng khám ca trực & Hồ sơ chuyên môn (KHÔNG thấy Đặt lịch hay Phiếu khám cá nhân)
  // - Lễ tân: Quầy tiếp đón & Hồ sơ cá nhân (KHÔNG thấy Đặt lịch hay Phiếu khám cá nhân)
  // - Bệnh nhân / Vãng lai: Trang chủ, Đặt lịch khám, Phiếu khám của tôi
  let navLinks = [
    { href: '/', label: 'Trang Chủ', icon: Building2 },
    { href: '/#about', label: 'Về MedSched', icon: Sparkles },
    { href: '/#specialties', label: 'Chuyên Khoa', icon: Stethoscope },
    { href: '/#workflow', label: 'Quy Trình', icon: ShieldCheck },
    { href: '/booking', label: 'Đặt Lịch Khám', icon: Calendar },
    { href: '/my-appointments', label: 'Phiếu Khám', icon: ClipboardList },
  ];

  if (isAdmin) {
    navLinks = [
      { href: '/admin', label: 'Quản Trị Người Dùng', icon: ShieldCheck },
      { href: '/admin/catalog', label: 'Danh Mục & Phòng Khám', icon: DoorOpen },
      { href: '/admin/create-user', label: 'Cấp Tài Khoản Mới', icon: UserPlus },
      { href: '/statistics', label: 'Báo Cáo Thống Kê', icon: BarChart3 },
    ];
  } else if (isDoctor) {
    navLinks = [
      { href: '/doctor', label: 'Buồng Khám Bác Sĩ', icon: Stethoscope },
      { href: '/doctor/schedule', label: 'Lịch Trực Bác Sĩ', icon: Calendar },
      { href: '/doctor/history', label: 'Lịch Sử Khám & Đơn Thuốc', icon: FileText },
      { href: '/statistics', label: 'Thống Kê Khám Bệnh', icon: BarChart3 },
    ];
  } else if (isStaff) {
    navLinks = [
      { href: '/reception', label: 'Quầy Tiếp Đón', icon: QrCode },
      { href: '/reception/history', label: 'Lịch Sử Tiếp Đón', icon: ClipboardList },
      { href: '/statistics', label: 'Thống Kê Tiếp Đón', icon: BarChart3 },
    ];
  }

  const logoHref = isAdmin ? "/admin" : isDoctor ? "/doctor" : isStaff ? "/reception" : "/";
  const portalSubtitle = isAdmin 
    ? 'Admin Portal' 
    : isDoctor 
    ? 'Doctor Console' 
    : isStaff 
    ? 'Reception Desk' 
    : 'Smart Healthcare';

  return (
    <header className="bg-white border-b border-mint-light text-slate-800 sticky top-0 z-50 shadow-xs">
      {/* Top Bar Tiện Ích Chuẩn Phòng Khám Quốc Tế */}
      <div className="bg-[#0a1e36] text-slate-300 text-[11px] border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-12 sm:h-11 flex items-center justify-between">
          {/* Logo MedSched */}
          <Link href={logoHref} className="flex items-center gap-2 sm:gap-2.5 group shrink-0 py-0.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-xs border border-white/20 group-hover:scale-105 transition overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="MedSched Online Medical Services Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="flex flex-col justify-center leading-none">
                <span className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-mint-light transition-colors leading-tight">
                  MedSched
                </span>
                <span className="text-[9px] sm:text-[10px] text-teal-300/80 font-medium tracking-tight mt-0.5">
                  Phiên bản v1.0.0
                </span>
              </div>
              <span className="text-[9px] text-teal-300 font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md bg-white/10 hidden sm:inline self-center">
                {portalSubtitle}
              </span>
            </div>
          </Link>

          {/* Mobile Right Side: Nút Hamburger */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-white hover:bg-white/15 transition cursor-pointer flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Desktop Navigation Links (Ẩn trên mobile để tiết kiệm diện tích màn hình) */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Desktop Navigation Links - Trải rộng thông thoáng */}
          <div className="flex items-center">
            <nav className="flex items-center gap-1 lg:gap-2 shrink-0">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 lg:px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                      isActive
                        ? 'bg-mint-light text-pine-teal font-bold'
                        : 'text-slate-700 hover:text-pine-teal hover:bg-mint-light/60'
                    }`}
                  >
                    <Icon size={15} className="shrink-0" />
                    <span className="whitespace-nowrap">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Auth State / Buttons */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                <Link
                  href="/profile"
                  title="Xem thông tin cá nhân & Hồ sơ chuyên môn"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition ${
                    pathname === '/profile'
                      ? 'bg-mint-light border-teal-primary text-pine-teal shadow-xs'
                      : 'bg-mint-soft/80 border-mint-light text-slate-700 hover:border-teal-primary/40 hover:bg-mint-light/50'
                  }`}
                >
                  <User size={15} className="text-teal-primary shrink-0" />
                  <span className="max-w-[120px] lg:max-w-[180px] truncate font-semibold">
                    {user.fullName || user.email}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-mint-light text-pine-teal border border-teal-primary/30 font-bold shrink-0">
                    {isAdmin ? 'ADMIN' : isDoctor ? 'BÁC SĨ' : isStaff ? 'LỄ TÂN' : 'BỆNH NHÂN'}
                  </span>
                  {isDoctor && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold shrink-0 flex items-center gap-1 shadow-2xs"
                      title="Buồng khám trực hiện tại của bạn"
                    >
                      <DoorOpen size={11} className="text-blue-600" />
                      {user.roomNumber ? `Phòng ${user.roomNumber}` : 'Buồng Khám'}
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('medsched_doctor_active_room');
                    }
                    handleLogout();
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-xl hover:bg-red-50 transition font-medium cursor-pointer whitespace-nowrap shrink-0"
                  title="Đăng xuất"
                >
                  <LogOut size={15} />
                  <span>Thoát</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-semibold text-pine-teal hover:bg-mint-light border border-teal-primary/30 px-3.5 py-2 rounded-xl transition whitespace-nowrap shrink-0"
                >
                  <LogIn size={15} />
                  <span className="whitespace-nowrap">Đăng Nhập</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 text-xs font-semibold bg-pine-teal hover:bg-pine-teal-hover text-white px-3.5 py-2 rounded-xl transition shadow-xs whitespace-nowrap shrink-0"
                >
                  <UserPlus size={15} />
                  <span className="whitespace-nowrap">Đăng Ký</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-mint-light px-4 pt-3 pb-5 space-y-1 shadow-lg animate-fadeIn">

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isActive ? 'bg-mint-light text-pine-teal' : 'text-slate-700 hover:bg-mint-soft'
                }`}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          {user ? (
            <div className="pt-2 border-t border-mint-light mt-2 space-y-2">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-800 bg-mint-soft"
              >
                <span>Hồ sơ: {user.fullName || user.email}</span>
                <span className="text-xs bg-mint-light text-pine-teal px-2 py-0.5 rounded font-bold">
                  {roles[0]?.replace('ROLE_', '') || 'USER'}
                </span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                <LogOut size={16} />
                <span>Đăng Xuất</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-mint-light mt-2 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold text-pine-teal bg-mint-light border border-teal-primary/30 rounded-xl"
              >
                Đăng Nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold text-white bg-pine-teal rounded-xl"
              >
                Đăng Ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
