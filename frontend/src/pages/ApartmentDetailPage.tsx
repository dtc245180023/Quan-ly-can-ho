import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, BedDouble, Maximize2, MapPin, Calendar, CheckCircle2, 
  ArrowLeft, Sparkles, FileText, 
  Wrench, AlertCircle, Phone, X, Bath, Lock,
  Banknote, Compass, Layers, Sofa, Key, ExternalLink
} from 'lucide-react';
import { useGetApartmentByIdQuery, useGetBuildingsQuery } from '../modules/buildings/services/buildingApi';
import { useGetContractsQuery } from '../modules/contracts/services/contractApi';
import { useGetMaintenanceRequestsQuery } from '../modules/maintenance/services/maintenanceApi';
import { useCreateBookingMutation } from '../modules/bookings/services/bookingApi';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { RealEstateFooter } from '../components/common/RealEstateFooter';
import { TimePicker24h } from '../components/common/TimePicker24h';

export const ApartmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isStaff, isAdmin, isAuthenticated } = useAuth();
  const { showSuccessToast, showErrorToast } = useToast();

  const numId = id ? parseInt(id, 10) : 0;
  const { data: apartment, isLoading: isAptLoading } = useGetApartmentByIdQuery(numId);
  const { data: buildings = [] } = useGetBuildingsQuery();
  const { data: contracts = [] } = useGetContractsQuery({});
  const { data: maintenanceList = [] } = useGetMaintenanceRequestsQuery({});
  const [createBooking, { isLoading: isBookingLoading }] = useCreateBookingMutation();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DESCRIPTION' | 'SPECS' | 'AMENITIES'>('OVERVIEW');
  const [showFullPhone, setShowFullPhone] = useState(false);

  const formatPriceVND = (price: number) => {
    if (price >= 1000000) {
      const millions = price / 1000000;
      return `${millions % 1 === 0 ? millions : millions.toFixed(1)} triệu/tháng`;
    }
    return `${price.toLocaleString('vi-VN')} đ/tháng`;
  };

  const [bookingForm, setBookingForm] = useState({
    name: user?.fullName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '14:00',
    depositAmount: 0,
    notes: 'Tôi muốn hẹn xem căn phòng này.'
  });

  const building = buildings.find(b => b.id === apartment?.buildingId);
  const buildingDisplayName = (building?.name && !building.name.toLowerCase().includes('sunshine'))
    ? building.name
    : (apartment?.buildingName && !apartment.buildingName.toLowerCase().includes('sunshine'))
      ? apartment.buildingName
      : 'Dwell';
  const activeContract = contracts.find(c => c.apartmentId === numId && c.status === 'ACTIVE');
  const aptMaintenance = maintenanceList.filter(m => m.apartmentId === numId);

  if (isAptLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Đang tải thông tin chi tiết căn hộ...</p>
        </div>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">Không tìm thấy căn hộ</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">Căn hộ không tồn tại hoặc đã bị xóa khỏi hệ thống Dwell Living.</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const images = apartment.imageUrl 
    ? [apartment.imageUrl, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80']
    : ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'];

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.name.trim() || !bookingForm.phone.trim()) {
      showErrorToast('Vui lòng điền họ tên và số điện thoại liên hệ!');
      return;
    }
    try {
      await createBooking({
        apartmentId: apartment.id,
        customerName: bookingForm.name,
        customerPhone: bookingForm.phone,
        customerEmail: bookingForm.email,
        roomNumber: apartment.roomNumber,
        buildingName: apartment.buildingName,
        monthlyPrice: apartment.price,
        depositAmount: bookingForm.depositAmount,
        checkInDate: bookingForm.date,
        notes: `[Khung giờ hẹn xem: ${bookingForm.time || '14:00'}] ${bookingForm.notes}`
      }).unwrap();

      const actionText = bookingForm.depositAmount > 0 
        ? `đặt cọc giữ chỗ ưu tiên (${formatCurrency(bookingForm.depositAmount)})` 
        : 'hẹn xem phòng trực tiếp (0 đ)';
      showSuccessToast(`Đã ghi nhận yêu cầu ${actionText} căn ${apartment.roomNumber} lúc ${bookingForm.time || '14:00'} ngày ${formatDate(bookingForm.date)} thành công! Ban quản lý Dwell Living sẽ liên hệ xác nhận.`);
      setIsBookingModalOpen(false);
    } catch (err: any) {
      const errorMsg = err?.data?.detail || err?.data?.message || 'Không thể đặt lịch. Vui lòng thử lại!';
      showErrorToast(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Mã căn:</span>
            <span className="text-sm font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
              {apartment.roomNumber}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 pt-6">
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 mb-4">
          <span className="hover:text-sky-600 cursor-pointer" onClick={() => navigate('/explore')}>Trang chủ</span>
          <span>/</span>
          <span>{buildingDisplayName}</span>
          <span>/</span>
          <span className="text-slate-800 font-medium">Căn hộ {apartment.roomNumber}</span>
        </div>

        {/* Gallery & Quick Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Gallery (2 Cols) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900">
              <img
                src={images[activeImageIndex]}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80';
                }}
                alt={`Căn hộ ${apartment.roomNumber}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md ${
                  apartment.status === 'AVAILABLE' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-amber-500 text-white'
                }`}>
                  {apartment.status === 'AVAILABLE' ? '● Căn hộ đang trống' : '● Đang có người thuê'}
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-14 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      activeImageIndex === idx ? 'border-sky-600 scale-105 shadow' : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&auto=format&fit=crop&q=80';
                      }}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Card (1 Col) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-sky-700 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-600 shrink-0" />
                  {buildingDisplayName}
                </span>
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-bold">
                  Tầng {apartment.floor}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                Căn hộ {apartment.roomNumber}
              </h1>
              <p className="text-sm text-slate-500 mb-5 leading-relaxed">
                {building?.address || 'Hệ thống căn hộ cao cấp Dwell Living'}
              </p>

              {/* Đoạn mô tả căn hộ */}
              <div className="space-y-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed mb-6">
                <p>
                  Nằm tại vị trí đắc địa tại khu vực {building?.address ? building.address.split(',').slice(-2).join(',').trim() : 'trung tâm Hà Nội'}, căn hộ <strong className="text-slate-900 font-bold">{apartment.roomNumber}</strong> thuộc chuỗi căn hộ cao cấp <strong className="text-slate-900 font-bold">{buildingDisplayName}</strong> mang đến trải nghiệm sống tiện nghi và đẳng cấp. Với diện tích <strong className="text-slate-900 font-bold">{apartment.areaSqm}m²</strong>, căn hộ {apartment.bedrooms} phòng ngủ, {apartment.bathrooms} phòng vệ sinh được bố trí tối ưu công năng, trang bị đầy đủ nội thất cao cấp cùng ban công đón gió hướng <strong className="text-slate-900 font-bold">{apartment.viewDirection || 'Đông Nam'}</strong> thoáng mát, là lựa chọn lý tưởng cho những ai mong muốn tận hưởng không gian sống riêng tư, hiện đại và ngập tràn ánh sáng tự nhiên.
                </p>
                <p>
                  Tiện ích nội khu chuẩn quốc tế, hệ thống an ninh 24/7 cùng sự riêng tư tuyệt đối hứa hẹn một cuộc sống tiện nghi, sang trọng và đầy đủ dịch vụ ngay giữa lòng thành phố.
                </p>
                <p className="font-bold text-sky-800 text-base">
                  Đừng bỏ lỡ cơ hội sở hữu không gian sống mơ ước tại {buildingDisplayName}!
                </p>
              </div>

              {/* Price block */}
              <div className="p-5 bg-gradient-to-br from-sky-50 via-sky-50/80 to-blue-50/50 rounded-2xl border border-sky-100 shadow-2xs mb-6">
                <span className="text-xs sm:text-sm text-sky-800 block font-bold uppercase tracking-wider">
                  Giá thuê niêm yết
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-sky-900 tracking-tight">
                    {formatCurrency(apartment.price)}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-sky-700">/ tháng</span>
                </div>
                <div className="mt-3.5 pt-3 border-t border-sky-200/60 flex items-center justify-between text-sm sm:text-[15px] text-sky-900">
                  <span className="font-medium text-slate-600">Tiền đặt cọc:</span>
                  <strong className="font-extrabold text-sky-950 text-base sm:text-lg">
                    {formatCurrency(apartment.depositDefault)}
                  </strong>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 divide-x divide-slate-200/90 text-center p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/80 mb-6 shadow-2xs">
                <div className="px-2">
                  <BedDouble className="w-6 h-6 text-sky-600 mx-auto mb-1.5" />
                  <span className="text-base sm:text-lg font-extrabold text-slate-900 block">{apartment.bedrooms} PN</span>
                  <span className="text-xs text-slate-500 font-medium">Phòng ngủ</span>
                </div>
                <div className="px-2">
                  <Bath className="w-6 h-6 text-sky-600 mx-auto mb-1.5" />
                  <span className="text-base sm:text-lg font-extrabold text-slate-900 block">{apartment.bathrooms} WC</span>
                  <span className="text-xs text-slate-500 font-medium">Vệ sinh</span>
                </div>
                <div className="px-2">
                  <Maximize2 className="w-6 h-6 text-sky-600 mx-auto mb-1.5" />
                  <span className="text-base sm:text-lg font-extrabold text-slate-900 block">{apartment.areaSqm} m²</span>
                  <span className="text-xs text-slate-500 font-medium">Diện tích</span>
                </div>
              </div>
            </div>

            {/* Hỗ Trợ Xem Phòng 24/7 (Đẩy từ ảnh 2 vào thay cho ảnh 1) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#1d4ed8] shadow-xs shrink-0">
                  <Phone className="w-6 h-6 text-[#1d4ed8]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Hỗ Trợ Xem Phòng 24/7
                  </h3>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Quản lý tòa nhà trực tuyến
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Quản lý tòa nhà luôn sẵn sàng hỗ trợ bạn tham quan căn hộ trực tiếp hoặc xem qua video 360 độ.
              </p>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <span className="text-xs sm:text-sm text-slate-600 font-semibold block">
                  Hotline Quản Lý Tòa Nhà:
                </span>
                <strong className="text-[#1d4ed8] text-xl sm:text-2xl font-black tracking-tight">
                  0912.888.999
                </strong>
              </div>

              {apartment.status === 'AVAILABLE' ? (
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="w-full py-3 sm:py-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm sm:text-base font-bold rounded-xl shadow-md shadow-blue-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Gửi Yêu Cầu Hẹn Giờ</span>
                </button>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs sm:text-sm text-amber-800 font-medium">
                  Căn hộ hiện đang có hợp đồng thuê hoạt động
                </div>
              )}

              {(isAdmin || isStaff) && (
                <button
                  onClick={() => navigate('/admin/contracts')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                  <span>Quản Lý Hợp Đồng Căn Này</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className={`grid grid-cols-1 ${isAdmin || isStaff ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
          {/* Main Info */}
          <div className={`${isAdmin || isStaff ? 'lg:col-span-2' : 'col-span-1'} space-y-6`}>
            {/* Navigation Tabs (Image 2 style) */}
            <div className="flex items-center space-x-6 border-b border-slate-200 pb-1 text-xs font-bold text-slate-500">
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className={`pb-2 transition-colors relative outline-none focus:outline-none focus:ring-0 ${
                  activeTab === 'OVERVIEW'
                    ? 'text-[#1d4ed8] font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1d4ed8]'
                    : 'hover:text-slate-900'
                }`}
              >
                Tổng quan
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DESCRIPTION')}
                className={`pb-2 transition-colors relative outline-none focus:outline-none focus:ring-0 ${
                  activeTab === 'DESCRIPTION'
                    ? 'text-[#1d4ed8] font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1d4ed8]'
                    : 'hover:text-slate-900'
                }`}
              >
                Mô tả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SPECS')}
                className={`pb-2 transition-colors relative outline-none focus:outline-none focus:ring-0 ${
                  activeTab === 'SPECS'
                    ? 'text-[#1d4ed8] font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1d4ed8]'
                    : 'hover:text-slate-900'
                }`}
              >
                Đặc điểm
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AMENITIES')}
                className={`pb-2 transition-colors relative outline-none focus:outline-none focus:ring-0 ${
                  activeTab === 'AMENITIES'
                    ? 'text-[#1d4ed8] font-extrabold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1d4ed8]'
                    : 'hover:text-slate-900'
                }`}
              >
                Tiện nghi & Bản đồ
              </button>
            </div>

            {/* Filter banner if not showing overview */}
            {activeTab !== 'OVERVIEW' && (
              <div className="flex items-center justify-between bg-sky-50/80 border border-sky-200/80 px-4 py-2.5 rounded-xl text-xs text-sky-800">
                <span>
                  Đang lọc hiển thị: <strong>
                    {activeTab === 'DESCRIPTION' && 'Mô tả căn hộ'}
                    {activeTab === 'SPECS' && 'Đặc điểm thông số bất động sản'}
                    {activeTab === 'AMENITIES' && 'Tiện nghi thiết bị & Bản đồ vị trí'}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('OVERVIEW')}
                  className="text-xs text-sky-700 hover:text-sky-900 font-bold hover:underline"
                >
                  Xem tất cả (Tổng quan)
                </button>
              </div>
            )}

            {/* Comprehensive Description Card (Image 2 format) */}
            {(activeTab === 'OVERVIEW' || activeTab === 'DESCRIPTION') && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    Thông tin mô tả Căn hộ Dwell Living - {buildingDisplayName} ({building?.address || 'Dwell, Hà Nội'})
                  </h2>
                  <p className="text-xs sm:text-[13px] text-slate-700 font-semibold mt-1.5 leading-relaxed">
                    Căn hộ {apartment.roomNumber?.startsWith('P') ? apartment.roomNumber : `P${apartment.roomNumber}`}. Chuỗi căn hộ cho thuê Dwell Living ({buildingDisplayName}), {apartment.bedrooms} phòng ngủ full đồ
                  </p>
                </div>

                {/* Bullet details */}
                <div className="space-y-1.5 text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                  <p>- Diện tích: <strong>{apartment.areaSqm}m²</strong> - đầy đủ đồ cao cấp, thiết kế hiện đại.</p>
                  <p>- Gồm: <strong>{apartment.bedrooms} ngủ, {apartment.bathrooms} WC, 1 khách, 1 bếp</strong>.</p>
                  <p>- full tiện ích của toà nhà (thang máy thẻ từ, an ninh bảo vệ 24/7, hầm để xe rộng rãi, rác tầng sạch sẽ).</p>
                  <p>- Phù hợp hộ gia đình vs chuyên gia nước ngoài, nhân viên văn phòng ở dài hạn.</p>
                  <p>- Chỉ với: <strong className="text-brand-700 text-sm">{formatPriceVND(apartment.price)}</strong> (bao phí quản lý internet tốc độ cao).</p>
                  <p>- Tiền đặt cọc: <strong>{formatCurrency(apartment.depositDefault)}</strong> (hoàn lại 100% khi thanh lý hợp đồng).</p>
                </div>

                {/* Contact line with Toggle Phone button */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-slate-800">
                  <span>
                    Liên hệ: <strong>{building?.managerName || 'Hoàng Khánh Ly (Quản lý Dwell)'}</strong> -{' '}
                    <span className="font-semibold text-slate-700 tracking-wide">
                      {showFullPhone ? (building?.contactPhone || '0912.888.999') : '0912.888.***'}
                    </span>
                  </span>
                  {!showFullPhone ? (
                    <button
                      type="button"
                      onClick={() => setShowFullPhone(true)}
                      className="px-3.5 py-1 bg-[#00a884] hover:bg-[#008f70] text-white text-xs font-bold rounded-full transition-all shadow-2xs"
                    >
                      Hiện số
                    </button>
                  ) : (
                    <a
                      href={`tel:${building?.contactPhone || '0912888999'}`}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Gọi điện</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Real Estate Specifications (Đặc điểm bất động sản - Image 2 table) */}
            {(activeTab === 'OVERVIEW' || activeTab === 'SPECS') && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <h2 className="text-base font-bold text-slate-900 mb-4">
                  Đặc điểm bất động sản
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-8 text-xs sm:text-[13px]">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Banknote className="w-4 h-4 text-slate-400" />
                      <span>Mức giá</span>
                    </div>
                    <span className="font-bold text-slate-800">{formatPriceVND(apartment.price)}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Maximize2 className="w-4 h-4 text-slate-400" />
                      <span>Diện tích</span>
                    </div>
                    <span className="font-bold text-slate-800">{apartment.areaSqm} m²</span>
                  </div>

                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <BedDouble className="w-4 h-4 text-slate-400" />
                      <span>Số phòng ngủ</span>
                    </div>
                    <span className="font-bold text-slate-800">{apartment.bedrooms} phòng</span>
                  </div>

                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Bath className="w-4 h-4 text-slate-400" />
                      <span>Số phòng WC</span>
                    </div>
                    <span className="font-bold text-slate-800">{apartment.bathrooms} phòng</span>
                  </div>

                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Layers className="w-4 h-4 text-slate-400" />
                      <span>Tầng số</span>
                    </div>
                    <span className="font-bold text-slate-800">Tầng {apartment.floor}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Compass className="w-4 h-4 text-slate-400" />
                      <span>Hướng ban công</span>
                    </div>
                    <span className="font-bold text-slate-800">{apartment.viewDirection || 'Đông Nam'}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Sofa className="w-4 h-4 text-slate-400" />
                      <span>Nội thất</span>
                    </div>
                    <span className="font-bold text-slate-800">Đầy đủ (Full nội thất)</span>
                  </div>

                  <div className="flex items-center justify-between pb-2.5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Key className="w-4 h-4 text-slate-400" />
                      <span>Tiền đặt cọc</span>
                    </div>
                    <span className="font-bold text-slate-800">{formatCurrency(apartment.depositDefault)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Amenities & Features */}
            {(activeTab === 'OVERVIEW' || activeTab === 'AMENITIES') && (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tiện Nghi & Trang Thiết Bị Đi Kèm</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {apartment.amenities && apartment.amenities.length > 0 ? (
                      apartment.amenities.map((amenity, idx) => (
                        <div key={idx} className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          <span className="font-medium">{amenity.name} ({amenity.brand})</span>
                        </div>
                      ))
                    ) : (
                      ['Khóa cửa thông minh', 'Điều hòa Inverter', 'Tủ lạnh 2 cánh', 'Sofa cao cấp', 'Bếp từ đôi'].map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          <span className="font-medium">{item}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Building Location & Google Maps */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-sky-600" />
                        <span>Vị Trí & Bản Đồ Tòa Nhà</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {building?.address || `${buildingDisplayName}, Hà Nội`}
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(building?.address || '16 Phạm Hùng, Hà Nội')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-lg border border-sky-200 transition-colors w-fit"
                    >
                      <span>Xem trên Google Maps</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative shadow-inner">
                    <iframe
                      title={`Bản đồ ${buildingDisplayName}`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src="https://maps.google.com/maps?q=21.028511,105.778000&t=&z=16&ie=UTF8&iwloc=&output=embed"
                      className="w-full h-full"
                      loading="lazy"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Active Contract Info (If Admin/Staff/Tenant) */}
            {activeContract && (isAdmin || isStaff || user?.id === activeContract.tenantId) && (activeTab === 'OVERVIEW' || activeTab === 'SPECS') && (
              <div className="bg-white rounded-2xl border border-sky-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>Hợp Đồng Thuê Hiện Tại ({activeContract.contractCode})</span>
                  </h2>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                    Đang Hiệu Lực
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl">
                  <div>
                    <span className="text-slate-400 block">Thời hạn hợp đồng:</span>
                    <strong className="text-slate-800">{formatDate(activeContract.startDate)} → {formatDate(activeContract.endDate)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tiền thuê hàng tháng:</span>
                    <strong className="text-sky-700 font-bold">{formatCurrency(activeContract.rentalPrice)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Ngày thanh toán định kỳ:</span>
                    <strong className="text-slate-800">Ngày {activeContract.paymentDueDay} hàng tháng</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tiền cọc ký gửi:</span>
                    <strong className="text-slate-800">{formatCurrency(activeContract.depositAmount)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Maintenance Info (Staff/Admin) */}
          {(isAdmin || isStaff) && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>Lịch Sử Bảo Trì Căn Hộ ({aptMaintenance.length})</span>
                </h3>
                {aptMaintenance.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có sự cố bảo trì nào ghi nhận.</p>
                ) : (
                  <div className="space-y-2">
                    {aptMaintenance.slice(0, 3).map(m => (
                      <div key={m.id} className="p-2.5 bg-slate-50 rounded-lg text-xs border border-slate-100">
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-slate-800 truncate">{m.ticketCode}</span>
                          <span className="text-[10px] text-slate-500">{formatDate(m.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{m.issueDescription}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Real Estate Footer (Image 3 - Thư Viện Nhà Đất format) */}
      <RealEstateFooter />

      {/* Booking Schedule Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200">
            <div className="px-5 py-4 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="font-bold text-sm">Hẹn Xem Căn {apartment.roomNumber}</h3>
                <p className="text-[11px] text-sky-100">{apartment.buildingName}</p>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBooking} className="p-5 space-y-3.5">
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
                  placeholder="Ghi chú yêu cầu đặc biệt hoặc thời gian thuận tiện nhất..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isBookingLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-sky-600/30"
                >
                  {isBookingLoading ? 'Đang gửi...' : bookingForm.depositAmount > 0 ? 'Xác Nhận Giữ Chỗ (2.000.000 đ)' : 'Xác Nhận Hẹn Xem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
