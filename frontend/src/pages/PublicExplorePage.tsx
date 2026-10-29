import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, Search, SlidersHorizontal, Sparkles, BedDouble, 
  Maximize2, MapPin, Calendar, CheckCircle2, 
  Phone, Mail, ArrowRight, X, Heart, Bookmark, ChevronDown, 
  Camera, ShieldCheck, Flame, Tag, Clock, Share2, PlusCircle,
  Headphones, Send, Globe, LogOut,
  Lock, LogIn, UserCheck, RotateCcw, RefreshCw, AlertCircle
} from 'lucide-react';
import { useGetBuildingsQuery, useGetApartmentsQuery } from '../modules/buildings/services/buildingApi';
import { useCreateBookingMutation, useGetMyBookingsQuery } from '../modules/bookings/services/bookingApi';
import { formatCurrency } from '../utils/formatters';
import { IApartment, IBuilding } from '../types/entities';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { DwellLogo } from '../components/common/DwellLogo';
import { FooterInfoModal, FooterModalKey } from '../components/common/FooterInfoModal';
import { PropertyVideoShowcase } from '../components/common/PropertyVideoShowcase';
import { TimePicker24h } from '../components/common/TimePicker24h';
import { Badge } from '../components/common/Badge';
import { AIRoomMatcherModal } from '../components/ai/AIRoomMatcherModal';

export const PublicExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const noticeParam = searchParams.get('notice');
  const [showNoContractNotice, setShowNoContractNotice] = useState(noticeParam === 'no_active_contract');
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [isRoomMatcherOpen, setIsRoomMatcherOpen] = useState(false);

  const { showSuccessToast, showErrorToast } = useToast();
  const { isAuthenticated, isTenant, isAdmin, isStaff, switchRole, user, logout } = useAuth();

  const { data: myBookings = [] } = useGetMyBookingsQuery(undefined, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    if (noticeParam === 'no_active_contract') {
      setShowNoContractNotice(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('notice');
      setSearchParams(nextParams, { replace: true });
    }
  }, [noticeParam]);
  
  const { data: buildings = [] } = useGetBuildingsQuery();
  const { 
    data: apartments = [], 
    isLoading: isApartmentsLoading, 
    isError: isApartmentsError, 
    refetch: refetchApartments 
  } = useGetApartmentsQuery({ status: 'AVAILABLE' });
  const [createBooking, { isLoading: isBookingLoading }] = useCreateBookingMutation();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [selectedBedrooms, setSelectedBedrooms] = useState<string>('ALL');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'AREA_DESC'>('DEFAULT');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [isSavedSearch, setIsSavedSearch] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [footerModalKey, setFooterModalKey] = useState<FooterModalKey | null>(null);

  const handleSubscribeNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    showSuccessToast(`Cảm ơn bạn! Đã đăng ký nhận tin căn hộ mới nhất qua email ${newsletterEmail}.`);
    setNewsletterEmail('');
  };

  // Booking Modal State (Image 2 style)
  const [bookingModalApartment, setBookingModalApartment] = useState<IApartment | null>(null);
  const [bookingForm, setBookingForm] = useState({
    name: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '14:00',
    depositAmount: 0,
    notes: 'Tôi muốn hẹn xem căn phòng này.'
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  const handleInitiateBooking = (apt: IApartment) => {
    setBookingForm({
      name: user?.fullName || '',
      phone: user?.phone || '',
      email: user?.email || '',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '14:00',
      depositAmount: 0,
      notes: 'Tôi muốn hẹn xem căn phòng này.'
    });
    setBookingModalApartment(apt);
  };

  const toggleFavorite = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.includes(id);
      if (!isFav) {
        showSuccessToast('Đã lưu căn hộ vào danh sách yêu thích!');
      }
      return isFav ? prev.filter(item => item !== id) : [...prev, id];
    });
  };

  const handleSaveSearch = () => {
    setIsSavedSearch(!isSavedSearch);
    if (!isSavedSearch) {
      showSuccessToast('Đã lưu tiêu chí tìm kiếm! Hệ thống sẽ thông báo khi có căn mới.');
    } else {
      showSuccessToast('Đã hủy lưu tìm kiếm.');
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModalApartment) return;

    if (!bookingForm.name.trim() || !bookingForm.phone.trim()) {
      showErrorToast('Vui lòng điền họ tên và số điện thoại liên hệ!');
      return;
    }

    try {
      await createBooking({
        apartmentId: bookingModalApartment.id,
        customerName: bookingForm.name,
        customerPhone: bookingForm.phone,
        customerEmail: bookingForm.email,
        roomNumber: bookingModalApartment.roomNumber,
        buildingName: bookingModalApartment.buildingName,
        monthlyPrice: bookingModalApartment.price,
        depositAmount: bookingForm.depositAmount,
        checkInDate: bookingForm.date,
        notes: `[Khung giờ hẹn xem: ${bookingForm.time || '14:00'}] ${bookingForm.notes}`
      }).unwrap();

      const roomDisplay = bookingModalApartment.roomNumber?.startsWith('P')
        ? bookingModalApartment.roomNumber
        : `P${bookingModalApartment.roomNumber}`;

      const actionText = bookingForm.depositAmount > 0 
        ? `đặt cọc giữ chỗ ưu tiên (${formatCurrency(bookingForm.depositAmount)})` 
        : 'hẹn xem phòng trực tiếp (0 đ)';

      showSuccessToast(
        `Đã ${actionText} căn ${roomDisplay} lúc ${bookingForm.time || '14:00'} ngày ${formatDate(bookingForm.date)} thành công! Ban quản lý Dwell Living sẽ liên hệ xác nhận.`
      );
      setBookingModalApartment(null);
    } catch (err: any) {
      const errorMsg = err?.data?.detail || err?.data?.message || 'Không thể đặt lịch. Vui lòng thử lại!';
      showErrorToast(errorMsg);
    }
  };

  // Dynamic counts for filter badges and select options based on real available apartments
  const availableApts = useMemo(() => apartments.filter(apt => apt.status === 'AVAILABLE'), [apartments]);
  const count1PN = useMemo(() => availableApts.filter(a => a.bedrooms === 1).length, [availableApts]);
  const count2PN = useMemo(() => availableApts.filter(a => a.bedrooms === 2).length, [availableApts]);
  const count3PN = useMemo(() => availableApts.filter(a => a.bedrooms === 3).length, [availableApts]);

  const countUnder12M = useMemo(() => availableApts.filter(a => a.price <= 12000000).length, [availableApts]);
  const count12M15M = useMemo(() => availableApts.filter(a => a.price > 12000000 && a.price <= 15000000).length, [availableApts]);
  const count15M20M = useMemo(() => availableApts.filter(a => a.price > 15000000 && a.price <= 20000000).length, [availableApts]);
  const countOver20M = useMemo(() => availableApts.filter(a => a.price > 20000000).length, [availableApts]);

  // Filter logic - Chỉ cho phép căn hộ còn trống (AVAILABLE) xuất hiện ở phía khách vãng lai
  const filteredApartments = useMemo(() => {
    const rawTerm = searchTerm.trim().toLowerCase();
    const cleanTerm = rawTerm.replace(/[.\s-]/g, '');

    return apartments.filter(apt => {
      // Chỉ hiển thị căn hộ còn trống
      if (apt.status !== 'AVAILABLE') return false;

      const roomClean = (apt.roomNumber || '').toLowerCase().replace(/[.\s-]/g, '');
      const bld = buildings.find(b => b.id === apt.buildingId);
      const bldAddress = (bld?.address || '').toLowerCase();
      const bldName = (bld?.name || apt.buildingName || '').toLowerCase();

      const matchesSearch = !rawTerm ||
                            roomClean.includes(cleanTerm) ||
                            (apt.roomNumber || '').toLowerCase().includes(rawTerm) ||
                            (apt.description || '').toLowerCase().includes(rawTerm) ||
                            bldName.includes(rawTerm) ||
                            bldAddress.includes(rawTerm);

      const matchesBuilding = selectedBuildingId === 'ALL' || (apt.buildingId != null && apt.buildingId.toString() === selectedBuildingId);
      const matchesBedrooms = selectedBedrooms === 'ALL' || (apt.bedrooms != null && apt.bedrooms.toString() === selectedBedrooms);
      
      let matchesPrice = true;
      if (selectedPriceRange === 'UNDER_10M' || selectedPriceRange === 'UNDER_12M') {
        matchesPrice = apt.price <= 12000000;
      } else if (selectedPriceRange === '12M_15M') {
        matchesPrice = apt.price > 12000000 && apt.price <= 15000000;
      } else if (selectedPriceRange === '10M_15M') {
        matchesPrice = apt.price >= 10000000 && apt.price <= 15000000;
      } else if (selectedPriceRange === '15M_20M') {
        matchesPrice = apt.price > 15000000 && apt.price <= 20000000;
      } else if (selectedPriceRange === 'OVER_20M') {
        matchesPrice = apt.price > 20000000;
      }

      return Boolean(matchesSearch && matchesBuilding && matchesBedrooms && matchesPrice);
    });
  }, [apartments, buildings, searchTerm, selectedBuildingId, selectedBedrooms, selectedPriceRange]);

  // Sort logic
  const sortedApartments = useMemo(() => {
    const list = [...filteredApartments];
    if (sortBy === 'PRICE_ASC') return list.sort((a, b) => a.price - b.price);
    if (sortBy === 'PRICE_DESC') return list.sort((a, b) => b.price - a.price);
    if (sortBy === 'AREA_DESC') return list.sort((a, b) => b.areaSqm - a.areaSqm);
    return list.sort((a, b) => (a.roomNumber || '').localeCompare(b.roomNumber || '', undefined, { numeric: true }));
  }, [filteredApartments, sortBy]);

  // Hiển thị toàn bộ căn hộ, kéo cuộn từ trên xuống dưới (không phân trang)
  const displayedApartments = sortedApartments;

  const getBuildingName = (buildingId: number) => {
    const b = buildings.find(item => item.id === buildingId);
    return b ? b.name : 'Dwell';
  };

  const getBuildingAddress = (buildingId: number) => {
    const b = buildings.find(item => item.id === buildingId);
    return b ? b.address : 'Số 16 Phạm Hùng, Mỹ Đình 2, Nam Từ Liêm, Hà Nội';
  };

  const formatPriceVND = (price: number) => {
    if (price >= 1000000) {
      const millions = price / 1000000;
      return `${millions % 1 === 0 ? millions : millions.toFixed(1)} triệu/tháng`;
    }
    return `${price.toLocaleString('vi-VN')} đ/tháng`;
  };

  return (
    <div className="min-h-screen bg-[#f7f8f9] text-slate-800 font-sans">
      {/* 1. Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <DwellLogo badge="Hệ Thống Thuê Căn Hộ" badgeVariant="sky" size="xl" />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-bold text-slate-900 leading-tight">{user.fullName}</span>
                  <span className="text-[11px] font-semibold text-brand-600">
                    {user.roleCode === 'TENANT' && user.hasActiveContract
                      ? `Cư dân ${user.roomNumber ? `• Căn ${user.roomNumber}` : 'căn hộ'}`
                      : user.roleCode === 'ADMIN'
                      ? 'Quản trị viên'
                      : user.roleCode === 'ACCOUNTANT'
                      ? 'Kế toán trưởng'
                      : user.roleCode === 'STAFF'
                      ? 'Nhân viên vận hành'
                      : 'Khách vãn lai'}
                  </span>
                </div>

                {/* Nếu là cư dân đã có hợp đồng được duyệt */}
                {user.roleCode === 'TENANT' && user.hasActiveContract ? (
                  <button
                    onClick={() => navigate('/tenant-portal')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Vào Cổng Cư Dân</span>
                  </button>
                ) : user.roleCode === 'ADMIN' || user.roleCode === 'STAFF' || user.roleCode === 'ACCOUNTANT' ? (
                  <button
                    onClick={() => navigate(user.roleCode === 'ACCOUNTANT' ? '/admin/finance' : '/admin/dashboard')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all"
                  >
                    <span>Vào Quản Trị</span>
                  </button>
                ) : (
                  // Khách vãn lai (chưa có hợp đồng được duyệt)
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsMyBookingsOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs sm:text-sm font-semibold rounded-xl transition-all"
                      title="Xem danh sách yêu cầu hẹn giờ của bạn"
                    >
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <span>Lịch hẹn của tôi ({myBookings.length})</span>
                    </button>
                    <button
                      onClick={() => {
                        showErrorToast('Bạn chưa có hợp đồng thuê được kích hoạt nên chưa thể vào Cổng Cư Dân. Hãy gửi yêu cầu hẹn giờ để được Ban quản lý duyệt hợp đồng!');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-400 border border-slate-200 text-xs sm:text-sm font-medium rounded-xl cursor-not-allowed hover:bg-slate-100 transition-all opacity-85"
                      title="Cổng cư dân chỉ mở sau khi hợp đồng thuê được Ban Quản Lý phê duyệt kích hoạt"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden md:inline">Cổng Cư Dân</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-normal">Chờ duyệt HĐ</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all"
                  title="Đăng nhập tài khoản hoặc quyền khác"
                >
                  Đổi quyền
                </button>
                <button
                  onClick={logout}
                  title="Đăng xuất"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-xs hover:shadow-md transition-all"
                >
                  <span>Đăng Nhập</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Body Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-3.5 space-y-3.5">
        {/* ================= THANH TÌM KIẾM & BỘ LỌC TINH GỌN ================= */}
        <section aria-label="Bộ lọc tìm kiếm" className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-2.5">
          {/* Main Filter Inputs: Search, Bedroom, Price in 1 sleek aligned row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* 1. Từ khóa tìm kiếm */}
            <div className="md:col-span-4 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm số phòng (P.101), tên tòa nhà, địa chỉ..."
                className="w-full text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                  title="Xóa từ khóa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 2. Cấu trúc phòng ngủ */}
            <div className="md:col-span-3 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-600">
                <BedDouble className="w-4 h-4" />
              </div>
              <select
                value={selectedBedrooms}
                onChange={(e) => setSelectedBedrooms(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2 font-medium text-slate-700 appearance-none focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 cursor-pointer transition-all"
              >
                <option value="ALL">Tất cả số phòng ngủ ({availableApts.length} căn)</option>
                <option value="1">1 Phòng ngủ ({count1PN} căn)</option>
                <option value="2">2 Phòng ngủ ({count2PN} căn)</option>
                <option value="3">3 Phòng ngủ ({count3PN} căn)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 3. Khoảng giá thuê */}
            <div className="md:col-span-3 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-600">
                <Tag className="w-4 h-4" />
              </div>
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="w-full text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl pl-9 pr-8 py-2 font-medium text-slate-700 appearance-none focus:outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/10 cursor-pointer transition-all"
              >
                <option value="ALL">Tất cả mức giá ({availableApts.length} căn)</option>
                <option value="UNDER_12M">Dưới 12 triệu / tháng ({countUnder12M} căn)</option>
                <option value="12M_15M">Từ 12 – 15 triệu / tháng ({count12M15M} căn)</option>
                <option value="15M_20M">Từ 15 – 20 triệu / tháng ({count15M20M} căn)</option>
                <option value="OVER_20M">Trên 20 triệu / tháng ({countOver20M} căn)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* 4. Nút bấm nổi bật Trợ lý AI Tìm Phòng */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setIsRoomMatcherOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95"
                title="Mở trợ lý AI Room Matcher đề xuất căn hộ thông minh"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                <span className="truncate">Tìm phòng với Trợ lý AI</span>
              </button>
            </div>
          </div>

          {/* Dải chọn nhanh, Đếm số lượng căn hộ & Đặt lại bộ lọc */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Chọn nhanh Phòng ngủ */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <BedDouble className="w-3.5 h-3.5 text-brand-600" />
                  Phòng ngủ:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'ALL', label: `Tất cả (${availableApts.length})` },
                    { id: '1', label: `1 PN (${count1PN})` },
                    { id: '2', label: `2 PN (${count2PN})` },
                    { id: '3', label: `3 PN (${count3PN})` },
                  ].map((item) => {
                    const isSelected = selectedBedrooms === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedBedrooms(item.id)}
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chọn nhanh Mức giá */}
              <div className="flex items-center gap-1.5 pl-2 sm:border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Tag className="w-3.5 h-3.5 text-brand-600" />
                  Mức giá:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'UNDER_12M', label: '< 12tr' },
                    { id: '12M_15M', label: '12 - 15tr' },
                    { id: '15M_20M', label: '15 - 20tr' },
                    { id: 'OVER_20M', label: '> 20tr' },
                  ].map((item) => {
                    const isSelected = selectedPriceRange === item.id || (item.id === 'UNDER_12M' && selectedPriceRange === 'UNDER_10M');
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedPriceRange(item.id)}
                        className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right side: Results counter & Reset button */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="text-slate-600 font-medium flex items-center gap-1.5 text-xs">
                {sortedApartments.length > 0 ? (
                  <>
                    <span>Hiển thị tất cả</span>
                    <strong className="text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md font-bold">
                      {sortedApartments.length}
                    </strong>
                    <span>căn hộ trống cho thuê</span>
                  </>
                ) : (
                  <span className="text-rose-600 font-medium">Không tìm thấy căn hộ trống phù hợp</span>
                )}
              </div>

              {(searchTerm || selectedBedrooms !== 'ALL' || selectedPriceRange !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBuildingId('ALL');
                    setSelectedBedrooms('ALL');
                    setSelectedPriceRange('ALL');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1 transition-colors pl-2.5 border-l border-slate-200"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ================= KHU VỰC DANH SÁCH CĂN HỘ ================= */}
        <div className="space-y-3.5 flex flex-col justify-between">

            {/* Apartment Cards */}
            {isApartmentsLoading ? (
              /* Skeleton Loader */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="w-full h-36 bg-slate-200" />
                    <div className="p-3.5 space-y-2.5">
                      <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                      <div className="h-6 bg-slate-100 rounded-lg w-full mt-2" />
                      <div className="h-8 bg-slate-200 rounded-xl w-full mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isApartmentsError ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-rose-200 shadow-2xs p-6">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">Không thể kết nối đến máy chủ dữ liệu</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Vui lòng kiểm tra lại dịch vụ backend hoặc bấm nút bên dưới để thử lại.
                </p>
                <button
                  type="button"
                  onClick={() => refetchApartments()}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tải lại dữ liệu</span>
                </button>
              </div>
            ) : sortedApartments.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">Không tìm thấy căn hộ phù hợp</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Vui lòng điều chỉnh lại mức giá hoặc chọn cấu trúc phòng ngủ khác ở bộ lọc phía trên.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBuildingId('ALL');
                    setSelectedBedrooms('ALL');
                    setSelectedPriceRange('ALL');
                  }}
                  className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : (
              <>
                {viewMode === 'GRID' ? (
                  /* ================= MODE 1: GRID CĂN HỘ ================= */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedApartments.map((apt) => {
                  const buildingName = apt.buildingName || getBuildingName(apt.buildingId);
                  const address = getBuildingAddress(apt.buildingId);
                  const isAvailable = apt.status === 'AVAILABLE';

                  return (
                    <div
                      key={apt.id}
                      onClick={() => navigate(`/apartments/${apt.id}`)}
                      className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:shadow-soft hover:border-brand-400 transition-all flex flex-col group cursor-pointer"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-full h-36 relative bg-slate-100 overflow-hidden shrink-0">
                        <img
                          src={apt.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80';
                          }}
                          alt={apt.roomNumber}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />

                        {/* Status Badge: Căn hộ còn trống */}
                        <div className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 backdrop-blur-xs shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
                          <span>Còn trống</span>
                        </div>

                        {/* Bottom Photo Count Badge */}
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 backdrop-blur-xs">
                          <Camera className="w-3 h-3" />
                          <span>{6 + (apt.id % 4)}</span>
                        </div>
                      </div>

                      {/* Content Details Area */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Title */}
                          <h2 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1 leading-snug">
                            Căn hộ {apt.roomNumber?.startsWith('P') ? apt.roomNumber : `P${apt.roomNumber}`} - {buildingName}
                          </h2>

                          {/* Location */}
                          <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{address}</span>
                          </div>

                          {/* Specs Row */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-semibold mt-2 py-1 px-2 bg-slate-50 rounded-lg">
                            <span>{apt.areaSqm} m²</span>
                            <span className="text-slate-300">•</span>
                            <span>{apt.bedrooms} PN</span>
                            <span className="text-slate-300">•</span>
                            <span>{apt.bathrooms} WC</span>
                            <span className="text-slate-300">•</span>
                            <span>Tầng {apt.floor}</span>
                          </div>
                        </div>

                        {/* Bottom Row: Price & Actions */}
                        <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <div className="text-sm sm:text-base font-extrabold text-brand-700 leading-tight">
                              {formatPriceVND(apt.price)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Cọc: {formatCurrency(apt.depositDefault)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInitiateBooking(apt);
                            }}
                            className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
                          >
                            Đặt lịch
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ================= MODE 2: DANH SÁCH SIÊU GỌN ================= */
              <div className="space-y-2">
                {displayedApartments.map((apt) => {
                  const buildingName = apt.buildingName || getBuildingName(apt.buildingId);
                  const address = getBuildingAddress(apt.buildingId);
                  const isAvailable = apt.status === 'AVAILABLE';

                  return (
                    <div
                      key={apt.id}
                      onClick={() => navigate(`/apartments/${apt.id}`)}
                      className="bg-white border border-slate-200/90 rounded-xl p-2.5 hover:shadow-soft hover:border-brand-300 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      {/* Left: Image thumbnail */}
                      <div className="w-24 sm:w-28 h-20 shrink-0 relative rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={apt.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80';
                          }}
                          alt={apt.roomNumber}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                        {/* Status Badge: Căn hộ còn trống */}
                        <div className="absolute top-1 left-1 bg-emerald-600/90 text-white text-[9px] px-1.5 py-0.2 rounded-full font-semibold flex items-center gap-0.5 backdrop-blur-xs shadow-xs">
                          <span className="w-1 h-1 rounded-full bg-emerald-200 animate-pulse" />
                          <span>Còn trống</span>
                        </div>
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors truncate">
                          {apt.roomNumber?.startsWith('P') ? apt.roomNumber : `P${apt.roomNumber}`} - {buildingName}
                        </h2>
                        <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{address}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium mt-1">
                          <span>{apt.areaSqm} m²</span>
                          <span>•</span>
                          <span>{apt.bedrooms} PN</span>
                          <span>•</span>
                          <span>{apt.bathrooms} WC</span>
                          <span>•</span>
                          <span>Tầng {apt.floor}</span>
                        </div>
                      </div>

                      {/* Right: Price & Button */}
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <div className="text-xs sm:text-sm font-extrabold text-brand-700">
                            {formatPriceVND(apt.price)}
                          </div>
                          <div className="text-[10px] text-slate-400 hidden sm:block">
                            Cọc: {formatCurrency(apt.depositDefault)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInitiateBooking(apt);
                          }}
                          className="px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                        >
                          Đặt lịch
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}

          </div>
        {/* ================= PHẦN HỖ TRỢ CHO CUỐI TRANG ================= */}
      </main>

      {/* 3. Full-Width Video Showcase Section with Dwell Logo */}
      <PropertyVideoShowcase />

      {/* 4. Comprehensive Real-Estate Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 text-slate-700">
        {/* Top Contact Strip */}
        <div className="border-b border-slate-200/80 bg-slate-50/70">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Brand Logo */}
              <div className="md:col-span-4 flex items-center">
                <DwellLogo badge="Living 4.0" badgeVariant="sky" size="md" />
              </div>

              {/* Contact Pill 1: Hotline */}
              <div className="md:col-span-3 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">Hotline tư vấn</div>
                  <a href="tel:19008899" className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors">
                    1900 8899 - 0912 345 678
                  </a>
                </div>
              </div>

              {/* Contact Pill 2: Resident Support */}
              <div className="md:col-span-3 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">Hỗ trợ khách hàng</div>
                  <a href="mailto:trogiup@dwell.vn" className="text-sm font-bold text-slate-900 hover:text-brand-600 transition-colors">
                    trogiup@dwell.vn
                  </a>
                </div>
              </div>

              {/* Contact Pill 3: Partnerships */}
              <div className="md:col-span-2 flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 uppercase font-semibold tracking-wider">Chăm sóc khách hàng</div>
                  <a href="mailto:hotro@dwell.vn" className="text-sm font-bold text-slate-900 hover:text-[#00a680] transition-colors">
                    hotro@dwell.vn
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Links & Info Grid */}
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 text-xs">
            {/* Column 1: Company Profile (4 cols) */}
            <div className="lg:col-span-4 space-y-3.5">
              <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                CÔNG TY CỔ PHẦN CÔNG NGHỆ BẤT ĐỘNG SẢN DWELL VIỆT NAM
              </h4>

              <div className="flex items-start space-x-2 text-slate-600 leading-relaxed">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Tầng 12, Tòa nhà Dwell, Số 16 Phạm Hùng, Phường Mỹ Đình 2, Quận Nam Từ Liêm, TP. Hà Nội, Việt Nam
                </span>
              </div>

              <div className="flex items-center space-x-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>(024) 3562 5939 - (028) 7300 8899</span>
              </div>
            </div>

            {/* Column 2: Guide & Services (3 cols) */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                HƯỚNG DẪN & DỊCH VỤ
              </h4>
              <ul className="space-y-2 text-slate-600">
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('ABOUT_US')}>Về chúng tôi (Dwell Living)</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('PRICING_FEES')}>Báo giá thuê phòng & chi phí dịch vụ</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('AI_CONTRACT_PROCESS')}>Quy trình ký hợp đồng điện tử AI</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('VIETQR_PAYMENT_GUIDE')}>Hướng dẫn thanh toán VietQR Napas247</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('FAQ_RESIDENTS')}>Câu hỏi thường gặp (FAQ cư dân)</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('FEEDBACK_REPORT')}>Góp ý & báo lỗi kỹ thuật</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('FLOOR_PLANS')}>Sơ đồ mặt bằng các tòa nhà</span></li>
              </ul>
            </div>

            {/* Column 3: Regulations & Legal (2 cols) */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                QUY ĐỊNH & PHÁP LÝ
              </h4>
              <ul className="space-y-2 text-slate-600">
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('BUILDING_RULES')}>Nội quy quản lý tòa nhà</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('RESIDENCE_REGISTRATION')}>Quy định đăng ký tạm trú số</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('LEASE_TERMS')}>Điều khoản thỏa thuận thuê</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('PRIVACY_POLICY')}>Chính sách bảo mật thông tin</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('DISPUTE_RESOLUTION')}>Giải quyết khiếu nại cư dân</span></li>
                <li><span className="hover:text-[#00c5a0] transition-colors cursor-pointer" onClick={() => setFooterModalKey('LEGAL_COMPLIANCE')}>Pháp lý ký số hợp đồng AI</span></li>
              </ul>
            </div>

            {/* Column 4: Newsletter & Language (3 cols) */}
            <div className="lg:col-span-3 space-y-3.5">
              <h4 className="font-bold text-slate-900 uppercase text-xs tracking-wider">
                ĐĂNG KÝ NHẬN TIN ƯU ĐÃI
              </h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Nhận thông báo tự động khi có căn hộ mới trống hoặc chính sách giảm giá thuê đặc biệt.
              </p>

              <form onSubmit={handleSubscribeNewsletter} className="flex items-center">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  className="flex-1 bg-slate-50 border border-slate-300 border-r-0 rounded-l-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00c5a0]"
                />
                <button
                  type="submit"
                  title="Gửi đăng ký nhận tin"
                  className="bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-2 rounded-r-lg transition-colors flex items-center justify-center shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="pt-2">
                <label className="font-bold text-slate-900 uppercase text-[11px] tracking-wider block mb-1.5">
                  QUỐC GIA & NGÔN NGỮ
                </label>
                <div className="relative">
                  <select className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 appearance-none focus:outline-none focus:border-brand-500">
                    <option value="vi">Việt Nam (Tiếng Việt)</option>
                    <option value="en">English (US)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Bottom Tech Stack */}
        <div className="border-t border-slate-200 bg-slate-100/60 py-4 text-center text-xs text-slate-500">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 flex items-center justify-center">
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span>Hỗ trợ RAG AI Copilot</span>
              <span>•</span>
              <span>Thanh toán VietQR Napas247</span>
              <span>•</span>
              <span>Giám sát IoT</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Schedule Modal (Image 2 style) */}
      {bookingModalApartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200">
            <div className="px-5 py-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="font-bold text-sm">
                  Hẹn Xem Căn {bookingModalApartment.roomNumber?.startsWith('P') ? bookingModalApartment.roomNumber : `P${bookingModalApartment.roomNumber}`}
                </h3>
                <p className="text-[11px] text-sky-100">
                  {(bookingModalApartment.buildingName && !bookingModalApartment.buildingName.toLowerCase().includes('sunshine'))
                    ? bookingModalApartment.buildingName
                    : 'Dwell'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingModalApartment(null)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ tên của bạn *</label>
                <input
                  type="text"
                  required
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                  placeholder="Ví dụ: Lê Văn A"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại liên hệ *</label>
                <input
                  type="tel"
                  required
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                  placeholder="Ví dụ: 0978293173"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày hẹn xem *</label>
                  <input
                    type="date"
                    required
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giờ hẹn xem phòng *</label>
                  <TimePicker24h
                    required
                    value={bookingForm.time}
                    onChange={(time) => setBookingForm({ ...bookingForm, time })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hình thức đăng ký & Giữ chỗ *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, depositAmount: 0 })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      bookingForm.depositAmount === 0
                        ? 'bg-sky-50/80 border-sky-500 ring-2 ring-sky-500/20 shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Hẹn xem trực tiếp</span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">0 đ</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Chưa cọc - Xếp lịch tham quan thực tế</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingForm({ ...bookingForm, depositAmount: 2000000 })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      bookingForm.depositAmount === 2000000
                        ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">Đặt cọc giữ chỗ ưu tiên</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">2.000.000 đ</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 mt-1">Khóa phòng ưu tiên - Trừ vào cọc HĐ</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  placeholder="Tôi muốn hẹn xem căn phòng này."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setBookingModalApartment(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isBookingLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-sky-600/30 transition-colors"
                >
                  {isBookingLoading ? 'Đang gửi...' : bookingForm.depositAmount > 0 ? 'Xác Nhận Giữ Chỗ (2.000.000 đ)' : 'Xác Nhận Hẹn Xem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thông Báo Chưa Kích Hoạt Hợp Đồng */}
      {showNoContractNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100 shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Thông Báo Cổng Cư Dân</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tài khoản của bạn hiện là <strong className="text-slate-900 font-semibold">Khách vãn lai</strong> và chưa có hợp đồng thuê căn hộ nào ở trạng thái đã kích hoạt (ACTIVE).
            </p>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 text-left space-y-1.5">
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Quy trình mở quyền Cổng Cư Dân:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-500 text-[11px] leading-relaxed">
                <li>Gửi yêu cầu hẹn giờ xem phòng trên hệ thống.</li>
                <li>Ban Quản Lý xét duyệt yêu cầu hẹn giờ và liên hệ tư vấn.</li>
                <li>Sau khi ký và kích hoạt hợp đồng, tài khoản sẽ tự động được cấp quyền vào Cổng Cư Dân!</li>
              </ol>
            </div>
            <button
              onClick={() => setShowNoContractNotice(false)}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              Tôi Đã Hiểu & Tiếp Tục Xem Phòng
            </button>
          </div>
        </div>
      )}

      {/* Modal Lịch Hẹn Của Tôi (Khách Vãn Lai) */}
      {isMyBookingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm">Yêu Cầu Hẹn Giờ Của Tôi</h3>
                  <p className="text-[11px] text-slate-300">Theo dõi tiến trình phê duyệt từ Ban quản lý</p>
                </div>
              </div>
              <button
                onClick={() => setIsMyBookingsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3.5 divide-y divide-slate-100">
              {myBookings.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Bạn chưa gửi yêu cầu hẹn giờ xem phòng nào.</p>
                  <p className="text-[11px] text-slate-400">Hãy chọn một căn hộ ưng ý và ấn "Gửi Yêu Cầu Hẹn Giờ" để đặt lịch nhé!</p>
                </div>
              ) : (
                myBookings.map((b) => (
                  <div key={b.id} className="pt-3.5 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-md border border-brand-200">
                        {b.bookingCode}
                      </span>
                      <Badge status={b.status} />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold text-slate-900">Căn {b.roomNumber} - {b.buildingName || 'Dwell Living'}</span>
                      <span className="text-xs font-semibold text-brand-600">{formatCurrency(b.monthlyPrice)}/tháng</span>
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ngày hẹn xem: <strong className="text-slate-800">{formatDate(b.checkInDate)}</strong></span>
                    </div>
                    {b.notes && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {b.notes}
                      </div>
                    )}
                    <div className="text-[11px] pt-1">
                      {b.status === 'PENDING' && (
                        <span className="text-amber-600 font-medium">⏳ Đang chờ Ban quản lý xét duyệt lịch hẹn...</span>
                      )}
                      {b.status === 'CONFIRMED' && (
                        <span className="text-emerald-600 font-medium">✅ Ban quản lý đã duyệt lịch hẹn. Quản lý sẽ sớm liên hệ hướng dẫn xem phòng!</span>
                      )}
                      {b.status === 'CONVERTED' && (
                        <span className="text-sky-700 font-medium">📄 Đã lên hợp đồng thuê. Khi hợp đồng được duyệt kích hoạt, bạn sẽ được vào Cổng Cư Dân!</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex justify-end">
              <button
                onClick={() => setIsMyBookingsOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Room Matcher Modal */}
      {isRoomMatcherOpen && (
        <AIRoomMatcherModal
          isOpen={isRoomMatcherOpen}
          onClose={() => setIsRoomMatcherOpen(false)}
          apartments={apartments}
          onSelectApartment={(apt) => {
            handleInitiateBooking(apt);
          }}
        />
      )}

      {/* Footer Information Modal */}
      <FooterInfoModal
        modalKey={footerModalKey}
        onClose={() => setFooterModalKey(null)}
        onOpenAIChat={() => window.dispatchEvent(new CustomEvent('open-rag-chatbot'))}
      />
    </div>
  );
};
