import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Building2,
  CalendarCheck,
  FileText,
  Users,
  CreditCard,
  Wrench,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useRedux';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useGetBookingsQuery } from '../../modules/bookings/services/bookingApi';
import { DwellLogo } from '../common/DwellLogo';
import clsx from 'clsx';

export const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { sidebarOpen } = useAppSelector((state) => state.global);
  const { isAccountant, isStaff, logout } = useAuth();
  const { data: bookings = [] } = useGetBookingsQuery({}, { pollingInterval: 4000 });
  const pendingBookingCount = bookings.filter((b) => b.status === 'PENDING').length;

  const handleLogout = () => {
    logout();
    toast.success('Đăng xuất thành công', 'Hẹn gặp lại bạn!');
    navigate('/login');
  };

  // Danh sách đầy đủ 8 chức năng chuẩn của Trang Quản Trị Hệ Thống
  // "Hợp đồng & Tiền cọc" nằm ngay phía trên "Khách thuê & Liên hệ"
  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Thống kê & Tổng quan',
      icon: <LayoutGrid className="w-5 h-5" />,
    },
    {
      to: '/admin/buildings',
      label: 'Căn hộ & Tòa nhà',
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      to: '/admin/bookings',
      label: 'Đặt lịch & Giữ chỗ',
      icon: <CalendarCheck className="w-5 h-5" />,
    },
    {
      to: '/admin/tenants',
      label: 'Khách thuê & Liên hệ',
      icon: <Users className="w-5 h-5" />,
    },
    {
      to: '/admin/contracts',
      label: 'Hợp đồng & Tiền cọc',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      to: '/admin/finance',
      label: 'Thanh toán & Công nợ',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      to: '/admin/maintenance',
      label: 'Yêu cầu bảo trì',
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      to: '/admin/alerts',
      label: 'Cảnh báo quá hạn & HĐ',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ];

  return (
    <aside
      className={clsx(
        'fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-300 shrink-0 select-none shadow-xs',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <DwellLogo
            badge={isAccountant ? 'Kế Toán' : isStaff ? 'Vận Hành' : 'ADMIN'}
            badgeVariant={isAccountant ? 'emerald' : isStaff ? 'slate' : 'blue'}
            showSubtitles={false}
          />
        </div>

        {/* Navigation links list */}
        <nav className="p-3 space-y-1.5 overflow-y-auto flex-1">
          {navItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.to}
              end={item.to === '/admin/dashboard'}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150',
                  isActive
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={clsx(
                        'transition-colors shrink-0',
                        isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-700'
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="text-[14px] leading-tight whitespace-nowrap">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {item.to === '/admin/bookings' && pendingBookingCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                        {pendingBookingCount}
                      </span>
                    )}
                    {isActive && (
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-400 shadow-xs shrink-0" />
                    )}
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-slate-100 mt-auto bg-white">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all duration-150 group cursor-pointer"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-5 h-5 text-rose-500 group-hover:text-rose-600 transition-colors shrink-0" />
            <span className="text-[14px]">Đăng Xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
