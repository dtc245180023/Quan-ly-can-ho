import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Phone,
  Mail,
  Home,
  FileSignature,
  Bell,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Pagination } from '../components/common/Pagination';
import {
  useGetBookingsQuery,
  useUpdateBookingStatusMutation,
  useCreateBookingMutation,
} from '../modules/bookings/services/bookingApi';
import { useGetApartmentsQuery } from '../modules/buildings/services/buildingApi';
import { IBooking, BookingStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const BookingsPage: React.FC = () => {
  const { isAdmin, isStaff, isAccountant } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New booking form
  const [aptId, setAptId] = useState(3);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [deposit, setDeposit] = useState(0);
  const [notes, setNotes] = useState('');

  const { data: bookings = [], isLoading } = useGetBookingsQuery(
    { status: selectedStatus },
    { pollingInterval: 3000 }
  );
  const { data: apartments = [] } = useGetApartmentsQuery({});

  const [updateBookingStatus] = useUpdateBookingStatusMutation();
  const [createBooking, { isLoading: isCreating }] = useCreateBookingMutation();
  const toast = useToast();
  const navigate = useNavigate();

  const handleStatusChange = async (id: number, status: BookingStatus) => {
    try {
      await updateBookingStatus({ id, status }).unwrap();
      toast.success('Cập nhật thành công', `Đã chuyển trạng thái booking sang ${status}`);
    } catch {
      toast.error('Lỗi', 'Không thể đổi trạng thái booking');
    }
  };

  const handleConvertToContract = (booking: IBooking) => {
    navigate(
      `/admin/contracts?action=create&aptId=${booking.apartmentId}&customerName=${encodeURIComponent(
        booking.customerName
      )}&customerPhone=${booking.customerPhone}&customerEmail=${encodeURIComponent(
        booking.customerEmail || ''
      )}&from=bookings`
    );
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const apt = apartments.find((a) => a.id === Number(aptId));
    try {
      await createBooking({
        apartmentId: Number(aptId),
        roomNumber: apt?.roomNumber || 'P.---',
        buildingName: apt?.buildingName || 'Dwell',
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        checkInDate: checkIn,
        depositAmount: Number(deposit),
        notes,
      }).unwrap();

      toast.success('Thành công', 'Đã tiếp nhận yêu cầu đặt phòng và chuyển căn hộ sang RESERVED!');
      setIsCreateModalOpen(false);
      setName('');
      setPhone('');
    } catch {
      toast.error('Lỗi', 'Không thể tạo booking');
    }
  };

  // Đề xuất luôn trên đầu: Sắp xếp các đơn PENDING (mới đặt lịch) lên đầu, tiếp theo là ID mới nhất
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      // 1. PENDING (mới đặt phòng) ưu tiên lên hàng đầu
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      // 2. Mới tạo nhất (ID giảm dần)
      return b.id - a.id;
    });
  }, [bookings]);

  // Danh sách các đơn vừa mới đặt lịch đang chờ duyệt
  const pendingBookings = useMemo(() => {
    return sortedBookings.filter((b) => b.status === 'PENDING');
  }, [sortedBookings]);

  const confirmedBookings = useMemo(() => {
    return sortedBookings.filter((b) => b.status === 'CONFIRMED');
  }, [sortedBookings]);

  const totalHeldDeposit = useMemo(() => {
    return bookings.reduce((sum, b) => sum + (Number(b.depositAmount) || 0), 0);
  }, [bookings]);

  // Đơn mới nhất để đề xuất trên đầu
  const latestPendingBooking = pendingBookings[0] || null;

  const filteredBookings = sortedBookings.filter((b) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.bookingCode.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.roomNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner - Large & Spacious matching Image 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">
            Khách Hàng & Đặt Phòng Trực Tuyến
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Đặt Phòng Online
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tiếp nhận yêu cầu đặt lịch xem phòng, duyệt cọc giữ chỗ và liên kết chuyển đổi sang hợp đồng thuê chính thức.
          </p>
        </div>

        {(isAdmin || isStaff) && (
          <Button
            variant="primary"
            size="md"
            className="h-11 px-5 text-sm font-bold shadow-xs shrink-0"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Tạo Đặt Phòng Mới
          </Button>
        )}
        {isAccountant && (
          <span className="text-xs font-semibold px-3 py-2 bg-slate-100 text-slate-600 rounded-xl border border-slate-200">
            Theo Dõi Cọc Giữ Chỗ (Chỉ Xem)
          </span>
        )}
      </div>

      {/* 4 Metric Cards Row (Matching Image 2 ERP style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tổng Yêu Cầu Đặt Chỗ
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
              {bookings.length} <span className="text-xs font-normal text-slate-400">hồ sơ</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Tiếp nhận trực tuyến hệ thống
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Chờ Xác Nhận Giữ Chỗ
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1.5">
              {String(pendingBookings.length).padStart(2, '0')}{' '}
              <span className="text-xs font-normal text-slate-400">yêu cầu</span>
            </div>
            <div className="text-xs text-amber-600 font-bold mt-1">
              Cần liên hệ khách xác nhận cọc
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/80">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Đã Giữ Chỗ Thành Công
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1.5">
              {String(confirmedBookings.length).padStart(2, '0')}{' '}
              <span className="text-xs font-normal text-slate-400">căn hộ</span>
            </div>
            <div className="text-xs text-emerald-600 font-bold mt-1">
              Sẵn sàng lập Hợp đồng thuê
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/80">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tiền Cọc Giữ Chỗ
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
              {formatCurrency(totalHeldDeposit)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Bảo đảm quỹ cọc giữ phòng
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/80">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Thanh thông báo & Đề xuất tài khoản mới đặt lịch trên đầu */}
      {latestPendingBooking && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border-2 border-amber-300 p-6 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    ĐỀ XUẤT XỬ LÝ MỚI NHẤT
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-950">
                    Tài khoản vừa đặt lịch giữ chỗ ({pendingBookings.length} yêu cầu cần xác nhận)
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-700">
                  <span className="font-black text-slate-900 text-base">
                    {latestPendingBooking.customerName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                    <Phone className="w-4 h-4 text-amber-600" />
                    {latestPendingBooking.customerPhone}
                  </span>
                  {latestPendingBooking.customerEmail && (
                    <span className="inline-flex items-center gap-1.5 text-slate-600 font-medium">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {latestPendingBooking.customerEmail}
                    </span>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-brand-700">
                    <Home className="w-4 h-4 text-brand-600" />
                    Căn {latestPendingBooking.roomNumber} ({latestPendingBooking.buildingName && latestPendingBooking.buildingName !== 'Sunshine Diamond Tower' && latestPendingBooking.buildingName !== 'Sunshine Homes' ? latestPendingBooking.buildingName : 'Dwell'})
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Dọn vào: <strong className="text-slate-900 font-bold">{formatDate(latestPendingBooking.checkInDate)}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-slate-700">
                    Cọc: {latestPendingBooking.depositAmount > 0 ? (
                      <strong className="text-emerald-700 font-bold">{formatCurrency(latestPendingBooking.depositAmount)}</strong>
                    ) : (
                      <span className="text-slate-500 font-normal">0 đ (Chưa cọc - Thu khi lập HĐ)</span>
                    )}
                  </span>
                </div>

                {latestPendingBooking.notes && (
                  <div className="mt-2.5 text-xs sm:text-sm text-slate-700 bg-white/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-amber-200/80 max-w-2xl leading-relaxed">
                    <span className="font-bold text-amber-800">Ghi chú từ khách:</span> {latestPendingBooking.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {(isAdmin || isStaff) && (
              <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
                <Button
                  variant="primary"
                  size="md"
                  className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs whitespace-nowrap px-4"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={() => handleStatusChange(latestPendingBooking.id, 'CONFIRMED')}
                >
                  Xác Nhận Giữ Chỗ
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="h-10 bg-white hover:bg-slate-50 text-slate-800 border-slate-300 font-bold whitespace-nowrap px-4"
                  leftIcon={<FileSignature className="w-4 h-4 text-brand-600" />}
                  onClick={() => handleConvertToContract(latestPendingBooking)}
                >
                  Lập Hợp Đồng
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search - Spacious & Comfortable */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: undefined, label: 'Tất cả' },
            { id: 'PENDING', label: 'Chờ xác nhận' },
            { id: 'CONFIRMED', label: 'Đã xác nhận giữ chỗ' },
            { id: 'CONVERTED', label: 'Đã lên hợp đồng' },
          ].map((st) => (
            <button
              key={st.label}
              onClick={() => {
                setSelectedStatus(st.id as any);
                setCurrentPage(1);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                selectedStatus === st.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo mã Booking, tên khách, căn hộ..."
            className="w-full h-11 bg-slate-50/80 border border-slate-200 rounded-xl pl-10 pr-4 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Bookings Table - Spacious ERP Frame */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Mã Booking</th>
                <th className="px-6 py-4">Khách Hàng Đặt Chỗ</th>
                <th className="px-6 py-4">Căn Hộ & Thời Gian Dọn Vào</th>
                <th className="px-6 py-4">Cọc Giữ Chỗ</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedBookings.map((b) => {
                const isPending = b.status === 'PENDING';
                const isTop = isPending && b.id === latestPendingBooking?.id;

                return (
                  <tr
                    key={b.id}
                    className={`transition-colors ${
                      isTop
                        ? 'bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500'
                        : isPending
                        ? 'bg-amber-50/25 hover:bg-amber-50/50 border-l-4 border-l-amber-400'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-6 py-4.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-3 py-1 rounded-lg border border-brand-200/80 inline-block shadow-2xs">
                          {b.bookingCode}
                        </span>
                        {isPending && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                              isTop
                                ? 'bg-amber-500 text-white'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            {isTop ? 'ĐỀ XUẤT ĐẦU' : 'MỚI'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium mt-1.5">
                        Tạo ngày: {formatDate(b.createdAt)}
                      </div>
                    </td>

                  <td className="px-6 py-4.5">
                    <div className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{b.customerName}</div>
                    <div className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5">{b.customerPhone}</div>
                    {b.customerEmail && <div className="text-xs text-slate-400 mt-0.5">{b.customerEmail}</div>}
                  </td>

                  <td className="px-6 py-4.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">Căn {b.roomNumber}</span>
                      <span className="text-xs text-slate-500 font-normal">
                        • {b.buildingName && b.buildingName !== 'Sunshine Diamond Tower' && b.buildingName !== 'Sunshine Homes' ? b.buildingName : 'Dwell'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-xs sm:text-sm">
                      <span className="font-bold text-brand-700">{formatCurrency(b.monthlyPrice)}/th</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-700 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Dọn vào: <strong className="text-slate-900 font-bold">{formatDate(b.checkInDate)}</strong></span>
                      </span>
                    </div>
                    {b.notes && (
                      <div className="text-xs sm:text-sm text-slate-700 font-medium mt-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200 max-w-md leading-relaxed">
                        {b.notes}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4.5">
                    <span className="font-black text-slate-900 text-sm sm:text-base">
                      {b.depositAmount > 0 ? (
                        <span className="text-emerald-700 font-black">{formatCurrency(b.depositAmount)}</span>
                      ) : (
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <span>0 đ</span>
                          <span className="text-xs text-slate-400 font-normal">(Chưa cọc)</span>
                        </span>
                      )}
                    </span>
                  </td>

                  <td className="px-6 py-4.5">
                    <Badge status={b.status} />
                  </td>

                  <td className="px-6 py-4.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(isAdmin || isStaff) && b.status === 'PENDING' && (
                        <button
                          onClick={() => handleStatusChange(b.id, 'CONFIRMED')}
                          className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 rounded-xl text-xs shadow-xs transition-colors"
                        >
                          Xác Nhận Giữ Chỗ
                        </button>
                      )}

                      {(isAdmin || isStaff) && b.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleConvertToContract(b)}
                          className="h-9 flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white px-4 rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          <FileSignature className="w-4 h-4" />
                          <span>Lập Hợp Đồng</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredBookings.length}
          pageSize={pageSize}
          itemLabel="đặt phòng"
          className="px-5 py-3 border-t border-slate-200"
        />
      </div>

      {/* Create Booking Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Tạo Mới Yêu Cầu Đặt Phòng & Giữ Chỗ"
        subtitle="Hệ thống tự động chuyển căn hộ sang RESERVED"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isCreating}
              onClick={handleCreateBooking}
            >
              Giữ Chỗ
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <Select
            label="Chọn Căn hộ trống (AVAILABLE)"
            value={aptId}
            onChange={(e) => setAptId(Number(e.target.value))}
            options={apartments
              .filter((a) => a.status === 'AVAILABLE')
              .map((a) => ({
                label: `${a.roomNumber} - ${a.buildingName} (${formatCurrency(a.price)}/th)`,
                value: a.id,
              }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Họ tên khách hàng"
              required
              placeholder="VD: Hoàng Thùy Linh"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Số điện thoại liên hệ"
              required
              placeholder="0903.***.***"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ngày dự kiến dọn vào"
              type="date"
              required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
            <Input
              label="Tiền cọc giữ chỗ (VNĐ)"
              type="number"
              required
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value))}
            />
          </div>

          <Input
            label="Ghi chú nhu cầu đặc biệt"
            placeholder="VD: Cần chuyển đồ vào cuối tuần..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
