import React, { useState } from 'react';
import {
  Building,
  Building2,
  MapPin,
  User,
  ShieldCheck,
  Phone,
  Plus,
  Search,
  Filter,
  Layers,
  Home,
  CheckCircle2,
  Clock,
  Wrench,
  Ban,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Camera,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Pagination } from '../components/common/Pagination';
import {
  useGetBuildingsQuery,
  useGetApartmentsQuery,
  useUpdateApartmentStatusMutation,
  useCreateApartmentMutation,
} from '../modules/buildings/services/buildingApi';
import { ApartmentStatus, IApartment } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { parseApiError } from '../utils/errorHandler';

export const BuildingsPage: React.FC = () => {
  const { isAdmin, isStaff, isAccountant } = useAuth();
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<ApartmentStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedApartmentForInfo, setSelectedApartmentForInfo] = useState<IApartment | null>(null);
  const [isBuildingInfoModalOpen, setIsBuildingInfoModalOpen] = useState(false);

  // Form error state
  const [aptErrors, setAptErrors] = useState<Record<string, string>>({});

  // New Apartment Form state
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newFloor, setNewFloor] = useState(3);
  const [newArea, setNewArea] = useState(65);
  const [newPrice, setNewPrice] = useState(8500000);
  const [newBedrooms, setNewBedrooms] = useState(2);
  const [newBathrooms, setNewBathrooms] = useState(2);
  const [newViewDirection, setNewViewDirection] = useState('Đông Nam');
  const [newBuildingId, setNewBuildingId] = useState(1);

  const { data: buildings = [] } = useGetBuildingsQuery();
  const { data: apartments = [], isLoading } = useGetApartmentsQuery(
    {
      buildingId: selectedBuildingId,
      status: selectedStatus,
    },
    { pollingInterval: 3000, refetchOnMountOrArgChange: true }
  );

  const [updateApartmentStatus] = useUpdateApartmentStatusMutation();
  const [createApartment, { isLoading: isCreating }] = useCreateApartmentMutation();
  const toast = useToast();
  const navigate = useNavigate();

  const handleOpenBuildingInfo = (apt: IApartment) => {
    setSelectedApartmentForInfo(apt);
    setIsBuildingInfoModalOpen(true);
  };

  const activeBuilding =
    buildings.find((b) => b.id === (selectedApartmentForInfo?.buildingId || 1)) ||
    buildings[0] || {
      id: 1,
      name: 'Dwell',
      code: 'BLD-01',
      address: 'Số 16 Phạm Hùng, P. Mỹ Đình 2, Q. Nam Từ Liêm, Hà Nội',
      totalFloors: 18,
      totalApartments: 72,
      occupiedCount: 57,
      availableCount: 15,
      managerName: 'Hoàng Khánh Ly',
      contactPhone: '0904.123.456',
      status: 'ACTIVE',
    };

  const buildingApartments = apartments.filter(
    (a) => a.buildingId === (activeBuilding?.id || 1)
  );
  const totalAptsCount = buildingApartments.length || activeBuilding?.totalApartments || 21;
  const availableAptsCount = buildingApartments.filter((a) => a.status === 'AVAILABLE').length;
  const occupiedAptsCount = buildingApartments.filter((a) => a.status === 'OCCUPIED').length;
  const reservedAptsCount = buildingApartments.filter((a) => a.status === 'RESERVED').length;
  const occupiedTotal = occupiedAptsCount + reservedAptsCount;
  const occupancyRate = totalAptsCount > 0 ? Math.round((occupiedTotal / totalAptsCount) * 100) : 0;

  const filteredApartments = apartments.filter((a) => {
    if (selectedBuildingId && a.buildingId !== selectedBuildingId) {
      return false;
    }
    if (selectedStatus && a.status !== selectedStatus) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.roomNumber.toLowerCase().includes(q) ||
        a.buildingName.toLowerCase().includes(q) ||
        a.viewDirection.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredApartments.length / pageSize) || 1;
  const paginatedApartments = filteredApartments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleStatusChange = async (apt: IApartment, newStatus: ApartmentStatus) => {
    try {
      await updateApartmentStatus({ id: apt.id, status: newStatus }).unwrap();
      const statusLabels: Record<string, string> = {
        AVAILABLE: 'Căn trống (Sẵn sàng đón khách)',
        MAINTENANCE: 'Đang bảo trì',
        OCCUPIED: 'Đang thuê',
        RESERVED: 'Đã giữ chỗ',
      };
      toast.success(
        'Cập nhật thành công',
        `Căn hộ ${apt.roomNumber} đã chuyển sang trạng thái "${statusLabels[newStatus] || newStatus}"!`
      );
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể đổi trạng thái căn hộ');
      toast.error('Lỗi cập nhật', parsed.message);
    }
  };

  const handleCreateApartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!newRoomNumber.trim()) {
      errors.newRoomNumber = 'Vui lòng nhập số phòng (VD: P.508)';
    }
    if (Number(newFloor) <= 0) {
      errors.newFloor = 'Tầng phải lớn hơn 0';
    }
    if (Number(newArea) <= 0) {
      errors.newArea = 'Diện tích phải lớn hơn 0 m²';
    }
    if (Number(newPrice) <= 0) {
      errors.newPrice = 'Giá thuê phải lớn hơn 0 VNĐ';
    }

    if (Object.keys(errors).length > 0) {
      setAptErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    setAptErrors({});
    try {
      const selectedB = buildings.find((b) => b.id === Number(newBuildingId));
      await createApartment({
        roomNumber: newRoomNumber.trim(),
        buildingId: Number(newBuildingId),
        buildingName: selectedB?.name || 'Dwell',
        floor: Number(newFloor),
        areaSqm: Number(newArea),
        price: Number(newPrice),
        bedrooms: Number(newBedrooms),
        bathrooms: Number(newBathrooms),
        viewDirection: newViewDirection,
        status: 'AVAILABLE',
        description: `Căn hộ cao cấp tầng ${newFloor}, view ${newViewDirection}`,
      }).unwrap();

      toast.success('Thành công', `Đã khởi tạo căn hộ ${newRoomNumber} sẵn sàng cho thuê!`);
      setIsAddModalOpen(false);
      setNewRoomNumber('');
      setAptErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể tạo mới căn hộ');
      setAptErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Tạo căn hộ thất bại', parsed.message);
    }
  };

  const handleOpenAddModal = () => {
    setNewRoomNumber('');
    setNewFloor(1);
    setNewArea(50);
    setNewPrice(8500000);
    setAptErrors({});
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAptErrors({});
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white py-3 px-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-200/80 flex items-center justify-center text-brand-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                Quản Lý Tòa Nhà & Căn Hộ
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                {apartments.length} Căn hộ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tòa nhà Dwell • Số 16 Phạm Hùng, P. Mỹ Đình 2, Q. Nam Từ Liêm, Hà Nội
            </p>
          </div>
        </div>

        {(isAdmin || isStaff) && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenAddModal}
          >
            Thêm Căn Hộ Mới
          </Button>
        )}
        {isAccountant && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
              Chế độ Tra Cứu (Chỉ Xem)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/finance')}
            >
              Đến Sổ Thu Phí & Công Nợ
            </Button>
          </div>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white py-2 px-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {/* Status filters with live counts */}
          {[
            { id: undefined, label: 'Tất cả', count: apartments.length },
            { id: 'AVAILABLE', label: 'Còn trống', count: apartments.filter((a) => a.status === 'AVAILABLE').length },
            { id: 'RESERVED', label: 'Đã giữ chỗ', count: apartments.filter((a) => a.status === 'RESERVED').length },
            { id: 'OCCUPIED', label: 'Đang thuê', count: apartments.filter((a) => a.status === 'OCCUPIED').length },
            { id: 'MAINTENANCE', label: 'Đang bảo trì', count: apartments.filter((a) => a.status === 'MAINTENANCE').length },
          ].map((st) => (
            <button
              key={st.label}
              onClick={() => {
                setSelectedStatus(st.id as any);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedStatus === st.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              <span>{st.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedStatus === st.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {st.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm số phòng (P101, P201)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Apartment Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {paginatedApartments.map((apt) => (
          <div
            key={apt.id}
            onClick={() => handleOpenBuildingInfo(apt)}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            {/* Image & Badges */}
            <div
              className="relative aspect-[16/10] overflow-hidden bg-slate-100"
              title="Nhấp để xem thông tin chi tiết căn hộ"
            >
              <img
                src={apt.imageUrl}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=80';
                }}
                alt={apt.roomNumber}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-xs text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-brand-600" />
                  <span>Xem chi tiết</span>
                </span>
              </div>
              <div className="absolute top-2.5 left-2.5 z-10">
                <Badge status={apt.status} size="sm" />
              </div>
              <div className="absolute bottom-2.5 right-2.5 z-10 px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm rounded-lg text-white font-bold text-xs shadow-xs flex items-baseline gap-0.5">
                <span>{formatCurrency(apt.price)}</span>
                <span className="text-[10px] font-normal text-slate-300">/th</span>
              </div>
            </div>

            {/* Info details */}
            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {apt.roomNumber}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-md truncate max-w-[130px]">
                    {apt.buildingName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1 h-4" title={apt.description}>
                  {apt.description || 'Căn hộ tiêu chuẩn đầy đủ tiện nghi'}
                </p>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-slate-100 text-center">
                <div className="bg-slate-50/90 rounded-lg p-1.5 border border-slate-100/80">
                  <span className="text-slate-400 text-[10px] font-medium block uppercase tracking-wider">Diện tích</span>
                  <strong className="text-slate-800 text-[11.5px] font-bold block mt-0.5">{apt.areaSqm} m²</strong>
                </div>
                <div className="bg-slate-50/90 rounded-lg p-1.5 border border-slate-100/80">
                  <span className="text-slate-400 text-[10px] font-medium block uppercase tracking-wider">Phòng ngủ</span>
                  <strong className="text-slate-800 text-[11.5px] font-bold block mt-0.5">{apt.bedrooms} PN</strong>
                </div>
                <div className="bg-slate-50/90 rounded-lg p-1.5 border border-slate-100/80">
                  <span className="text-slate-400 text-[10px] font-medium block uppercase tracking-wider">Vị trí</span>
                  <strong className="text-slate-800 text-[11.5px] font-bold block mt-0.5">Tầng {apt.floor}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredApartments.length}
        pageSize={pageSize}
        itemLabel="căn hộ"
      />

      {/* Modal Add New Apartment */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Thêm Mới Căn Hộ Vào Khối Nhà"
        subtitle="Khởi tạo số phòng, diện tích, giá niêm yết và hướng ban công"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCloseAddModal}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isCreating}
              onClick={handleCreateApartment}
            >
              Lưu & Phát Hành Phòng
            </Button>
          </div>
        }
      >
        {aptErrors.general && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 font-medium">{aptErrors.general}</div>
          </div>
        )}

        <form onSubmit={handleCreateApartment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số phòng hiển thị (Mã căn)"
              required
              placeholder="VD: P.508"
              value={newRoomNumber}
              error={aptErrors.newRoomNumber}
              onChange={(e) => {
                setNewRoomNumber(e.target.value);
                if (aptErrors.newRoomNumber) setAptErrors({ ...aptErrors, newRoomNumber: '' });
              }}
            />

            <Select
              label="Thuộc Tòa nhà"
              value={newBuildingId}
              onChange={(e) => setNewBuildingId(Number(e.target.value))}
              options={buildings.map((b) => ({ label: b.name, value: b.id }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Tầng"
              type="number"
              required
              value={newFloor}
              error={aptErrors.newFloor}
              onChange={(e) => {
                setNewFloor(Number(e.target.value));
                if (aptErrors.newFloor) setAptErrors({ ...aptErrors, newFloor: '' });
              }}
            />
            <Input
              label="Diện tích (m²)"
              type="number"
              required
              value={newArea}
              error={aptErrors.newArea}
              onChange={(e) => {
                setNewArea(Number(e.target.value));
                if (aptErrors.newArea) setAptErrors({ ...aptErrors, newArea: '' });
              }}
            />
            <Input
              label="Giá thuê/tháng (VNĐ)"
              type="number"
              required
              value={newPrice}
              error={aptErrors.newPrice}
              onChange={(e) => {
                setNewPrice(Number(e.target.value));
                if (aptErrors.newPrice) setAptErrors({ ...aptErrors, newPrice: '' });
              }}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Số phòng ngủ"
              value={newBedrooms}
              onChange={(e) => setNewBedrooms(Number(e.target.value))}
              options={[
                { label: 'Studio', value: 1 },
                { label: '1 Phòng ngủ', value: 1 },
                { label: '2 Phòng ngủ', value: 2 },
                { label: '3 Phòng ngủ', value: 3 },
              ]}
            />
            <Select
              label="Số phòng vệ sinh (WC)"
              value={newBathrooms}
              onChange={(e) => setNewBathrooms(Number(e.target.value))}
              options={[
                { label: '1 WC', value: 1 },
                { label: '2 WC', value: 2 },
                { label: '3 WC', value: 3 },
              ]}
            />
            <Select
              label="Hướng ban công"
              value={newViewDirection}
              onChange={(e) => setNewViewDirection(e.target.value)}
              options={[
                { label: 'Đông Nam', value: 'Đông Nam' },
                { label: 'Đông Bắc', value: 'Đông Bắc' },
                { label: 'Tây Nam', value: 'Tây Nam' },
                { label: 'Tây Bắc', value: 'Tây Bắc' },
                { label: 'Công Viên Cây Xanh', value: 'Công Viên Cây Xanh' },
              ]}
            />
          </div>
        </form>
      </Modal>

      {/* Modal View Building & Apartment Info */}
      <Modal
        isOpen={isBuildingInfoModalOpen}
        onClose={() => setIsBuildingInfoModalOpen(false)}
        title="Thông Tin Tòa Nhà & Căn Hộ"
        subtitle={`Thông số quy hoạch, ban quản lý, tiện ích và chi tiết phòng ${selectedApartmentForInfo?.roomNumber || ''}`}
        footer={
          <div className="flex flex-wrap items-center justify-between w-full gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              onClick={() => {
                if (selectedApartmentForInfo) {
                  navigate(`/apartments/${selectedApartmentForInfo.id}`);
                }
              }}
            >
              Trang Chi Tiết Căn Hộ
            </Button>
            <div className="flex items-center gap-2">
              {(isAdmin || isStaff) && selectedApartmentForInfo?.status === 'AVAILABLE' && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Wrench className="w-3.5 h-3.5 text-amber-600" />}
                  className="text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => {
                    handleStatusChange(selectedApartmentForInfo, 'MAINTENANCE');
                    setIsBuildingInfoModalOpen(false);
                  }}
                >
                  Báo Bảo Trì
                </Button>
              )}
              {(isAdmin || isStaff) && selectedApartmentForInfo?.status === 'MAINTENANCE' && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    handleStatusChange(selectedApartmentForInfo, 'AVAILABLE');
                    setIsBuildingInfoModalOpen(false);
                  }}
                >
                  Hoàn Tất Bảo Trì
                </Button>
              )}
              {(isAdmin || isStaff) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (selectedApartmentForInfo) {
                      navigate(`/admin/contracts?action=create&aptId=${selectedApartmentForInfo.id}`);
                    }
                  }}
                >
                  Lập Hợp Đồng Thuê
                </Button>
              )}
              {isAccountant && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedApartmentForInfo) {
                      navigate(`/admin/finance?search=${encodeURIComponent(selectedApartmentForInfo.roomNumber)}`);
                    }
                  }}
                >
                  Xem Thu Phí Phòng Này
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsBuildingInfoModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        }
      >
        {selectedApartmentForInfo && (
          <div className="space-y-4">
            {/* Building Banner / Overview Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 via-sky-100/50 to-blue-50 border border-sky-200/90 relative overflow-hidden shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-sky-200 flex items-center justify-center shadow-xs shrink-0 select-none">
                      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                        <rect x="13" y="8" width="18" height="34" rx="2" fill="#0284c7" />
                        <rect x="25" y="16" width="13" height="26" rx="1.5" fill="#38bdf8" />
                        <rect x="16" y="12" width="3" height="3" rx="0.5" fill="white" />
                        <rect x="21" y="12" width="3" height="3" rx="0.5" fill="white" />
                        <rect x="16" y="18" width="3" height="3" rx="0.5" fill="white" />
                        <rect x="21" y="18" width="3" height="3" rx="0.5" fill="white" />
                        <rect x="16" y="24" width="3" height="3" rx="0.5" fill="white" />
                        <rect x="21" y="24" width="3" height="3" rx="0.5" fill="white" />
                        <rect x="16" y="30" width="3" height="3" rx="0.5" fill="white" />
                        <rect x="21" y="30" width="3" height="3" rx="0.5" fill="white" />
                        <rect x="28" y="20" width="2.5" height="2.5" rx="0.5" fill="#f0f9ff" />
                        <rect x="32" y="20" width="2.5" height="2.5" rx="0.5" fill="#f0f9ff" />
                        <rect x="28" y="26" width="2.5" height="2.5" rx="0.5" fill="#f0f9ff" />
                        <rect x="32" y="26" width="2.5" height="2.5" rx="0.5" fill="#f0f9ff" />
                        <rect x="28" y="32" width="2.5" height="2.5" rx="0.5" fill="#f0f9ff" />
                        <rect x="32" y="32" width="2.5" height="2.5" rx="0.5" fill="#f0f9ff" />
                        <path d="M9 42H39" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {activeBuilding?.name && activeBuilding.name !== 'Sunshine Diamond Tower'
                          ? activeBuilding.name
                          : 'Dwell'}
                      </h3>
                      <div className="text-[11px] text-brand-700 font-semibold">Mã khối: BLD-01 • Tiêu chuẩn Hạng A+</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{activeBuilding?.address || 'Số 16 Phạm Hùng, P. Mỹ Đình 2, Q. Nam Từ Liêm, Hà Nội'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 bg-emerald-100/90 text-emerald-800 border border-emerald-300 text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Đang vận hành
                  </span>
                </div>
              </div>

              {/* Building Stats Bar */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-sky-200/80 text-center">
                <div className="bg-white/95 rounded-lg p-2 border border-sky-100 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-semibold">Quy mô</div>
                  <div className="text-sm font-bold text-slate-900">{activeBuilding?.totalFloors || 18} Tầng</div>
                </div>
                <div className="bg-white/95 rounded-lg p-2 border border-sky-100 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-semibold">Tổng căn hộ</div>
                  <div className="text-sm font-bold text-slate-900">{totalAptsCount} Căn</div>
                </div>
                <div className="bg-white/95 rounded-lg p-2 border border-sky-100 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-semibold">Phòng trống</div>
                  <div className="text-sm font-bold text-emerald-700">{availableAptsCount} Căn</div>
                </div>
                <div className="bg-white/95 rounded-lg p-2 border border-sky-100 shadow-2xs">
                  <div className="text-[10px] text-slate-500 font-semibold">Tỷ lệ lấp đầy</div>
                  <div className="text-sm font-bold text-brand-700">{occupancyRate}%</div>
                </div>
              </div>
            </div>

            {/* Management & Building Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-600" />
                  <span>Ban Quản Lý Tòa Nhà</span>
                </h5>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trưởng ban QL:</span>
                    <strong className="text-slate-800">{activeBuilding?.managerName || 'Hoàng Khánh Ly'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hotline BQL:</span>
                    <strong className="text-brand-600">{activeBuilding?.contactPhone || '0904.123.456'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <strong className="text-slate-800">banquanly@dwell.vn</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Văn phòng BQL:</span>
                    <span className="text-slate-700">Tầng 1, Sảnh Dwell</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tiện Ích & Tiêu Chuẩn Kỹ Thuật</span>
                </h5>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>4 Thang máy Mitsubishi tốc độ cao, thẻ từ phân tầng</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>2 Hầm đỗ xe thông minh, nhận diện biển số tự động</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>PCCC tự động đạt chuẩn kiểm định CA Hà Nội</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Hệ thống camera CCTV & an ninh bảo vệ 24/7</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Currently Selected Apartment Details - Khớp với từng phòng */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
              {/* Header: Room Name, Floor, View & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 font-extrabold rounded-lg text-sm tracking-tight border border-brand-200/80">
                    Căn hộ {selectedApartmentForInfo.roomNumber}
                  </span>
                  <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                    <span>Tầng {selectedApartmentForInfo.floor}</span>
                    <span className="text-slate-300">•</span>
                    <span>Hướng ban công: <strong className="text-slate-800">{selectedApartmentForInfo.viewDirection || 'Đông Nam'}</strong></span>
                  </span>
                </div>
                <div>
                  <Badge status={selectedApartmentForInfo.status} size="md" />
                </div>
              </div>

              {/* Apartment Image & Quick Info Split */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
                {/* Real Photo */}
                <div className="sm:col-span-5 relative rounded-xl overflow-hidden bg-slate-100 aspect-[16/10] sm:aspect-auto border border-slate-200/80 min-h-[145px]">
                  <img
                    src={selectedApartmentForInfo.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80'}
                    alt={`Phòng ${selectedApartmentForInfo.roomNumber}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>Ảnh thực tế</span>
                  </div>
                </div>

                {/* 4 Key Specs Cards */}
                <div className="sm:col-span-7 grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                    <span className="text-[10.5px] text-slate-400 font-medium">Diện tích thông thủy</span>
                    <strong className="text-slate-900 text-sm font-bold mt-0.5">{selectedApartmentForInfo.areaSqm} m²</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                    <span className="text-[10.5px] text-slate-400 font-medium">Cấu trúc phòng</span>
                    <strong className="text-slate-900 text-sm font-bold mt-0.5">
                      {selectedApartmentForInfo.bedrooms} PN • {selectedApartmentForInfo.bathrooms} WC
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                    <span className="text-[10.5px] text-slate-400 font-medium">Giá thuê niêm yết</span>
                    <strong className="text-brand-600 text-sm font-bold mt-0.5">
                      {formatCurrency(selectedApartmentForInfo.price)}/th
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-center">
                    <span className="text-[10.5px] text-slate-400 font-medium">Tiền cọc giữ chỗ</span>
                    <strong className="text-emerald-700 text-sm font-bold mt-0.5">
                      {formatCurrency(selectedApartmentForInfo.depositDefault || selectedApartmentForInfo.price * 2)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                <span className="font-semibold text-slate-900">Mô tả chi tiết: </span>
                {selectedApartmentForInfo.description || `Căn hộ ${selectedApartmentForInfo.roomNumber} thiết kế hiện đại, đầy đủ nội thất cao cấp, sẵn sàng dọn vào ở.`}
              </div>

              {/* Amenities & Equipments */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                  <span>Trang thiết bị & Tiện nghi phòng:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Điều hòa Inverter Daikin',
                    'Tủ lạnh 2 cánh Panasonic',
                    'Khóa cửa vân tay Yale',
                    'Giường nệm cao cấp',
                    'Bếp điện từ âm',
                    'Bình nóng lạnh Ariston',
                    'Tủ quần áo âm tường',
                    'Wifi cáp quang tốc độ cao'
                  ].map((amenity, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>{amenity}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
