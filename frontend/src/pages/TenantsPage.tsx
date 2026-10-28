import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  UserPlus,
  ShieldCheck,
  Phone,
  Mail,
  Home,
  FileText,
  FileSignature,
  AlertCircle,
  CreditCard,
  Building,
  CheckCircle2,
  MoreVertical,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Pagination } from '../components/common/Pagination';
import {
  useGetTenantsQuery,
  useCreateTenantMutation,
  useAddRoommateMutation,
  useAddEmergencyContactMutation,
  useDeleteTenantMutation,
} from '../modules/tenants/services/tenantApi';
import { useGetContractsQuery } from '../modules/contracts/services/contractApi';
import { ITenant } from '../types';
import { formatCurrency, formatDate, isSamePersonName } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { parseApiError } from '../utils/errorHandler';

export const TenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, isStaff, isAccountant } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<ITenant | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddRoommateModalOpen, setIsAddRoommateModalOpen] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);

  // Validation errors
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [rmErrors, setRmErrors] = useState<Record<string, string>>({});
  const [ctErrors, setCtErrors] = useState<Record<string, string>>({});

  // Create Form
  const [fullName, setFullName] = useState('');
  const [citizenId, setCitizenId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [hometown, setHometown] = useState('');

  // Roommate Form
  const [rmName, setRmName] = useState('');
  const [rmCitizenId, setRmCitizenId] = useState('');
  const [rmPhone, setRmPhone] = useState('');
  const [rmRelation, setRmRelation] = useState('Bạn cùng phòng');

  // Contact Form
  const [ctName, setCtName] = useState('');
  const [ctPhone, setCtPhone] = useState('');
  const [ctRelation, setCtRelation] = useState('Người thân');

  const { data: tenants = [], isLoading } = useGetTenantsQuery({ search: searchQuery });
  const { data: contracts = [] } = useGetContractsQuery({});
  const [createTenant, { isLoading: isCreating }] = useCreateTenantMutation();
  const [addRoommate, { isLoading: isAddingRm }] = useAddRoommateMutation();
  const [addContact, { isLoading: isAddingCt }] = useAddEmergencyContactMutation();
  const [deleteTenant, { isLoading: isDeleting }] = useDeleteTenantMutation();
  const [tenantToDelete, setTenantToDelete] = useState<ITenant | null>(null);
  const toast = useToast();
  const totalPages = Math.ceil(tenants.length / pageSize) || 1;
  const paginatedTenants = tenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteTenant = async () => {
    if (!tenantToDelete) return;
    try {
      await deleteTenant(tenantToDelete.id).unwrap();
      toast.success('Xóa khách thuê thành công', `Đã xóa hồ sơ khách thuê ${tenantToDelete.fullName} khỏi hệ thống.`);
      setTenantToDelete(null);
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể xóa khách thuê');
      toast.error('Lỗi khi xóa khách thuê', parsed.message);
    }
  };

  const handleBlurField = (field: string, value: string) => {
    const val = value.trim();
    if (!val) return;

    if (field === 'citizenId') {
      if (!/^\d{9,12}$/.test(val)) {
        setCreateErrors((prev) => ({ ...prev, citizenId: 'Số CMND/CCCD phải gồm 9 đến 12 chữ số hợp lệ' }));
      } else {
        const matched = tenants.find((t) => t.citizenId === val);
        if (matched && fullName.trim() && !isSamePersonName(matched.fullName, fullName.trim())) {
          setCreateErrors((prev) => ({
            ...prev,
            citizenId: 'Số cccd đã tồn tại ! ',
          }));
        }
      }
    } else if (field === 'phone') {
      if (!/^0\d{9,10}$/.test(val)) {
        setCreateErrors((prev) => ({ ...prev, phone: 'Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có 10-11 số)' }));
      }
    } else if (field === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setCreateErrors((prev) => ({ ...prev, email: 'Định dạng email chưa đúng (VD: example@email.com)' }));
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Vui lòng nhập họ và tên khách thuê';
    }
    if (!citizenId.trim()) {
      errors.citizenId = 'Vui lòng nhập số CMND/CCCD';
    } else if (!/^\d{9,12}$/.test(citizenId.trim())) {
      errors.citizenId = 'Số CMND/CCCD phải gồm 9 đến 12 chữ số hợp lệ';
    } else {
      const matched = tenants.find((t) => t.citizenId === citizenId.trim());
      if (matched && !isSamePersonName(matched.fullName, fullName.trim())) {
        errors.citizenId = 'Số cccd đã tồn tại ! ';
      }
    }

    if (!phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại di động';
    } else if (!/^0\d{9,10}$/.test(phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có 10-11 số)';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Định dạng email chưa đúng (VD: example@email.com)';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    setCreateErrors({});
    try {
      await createTenant({
        fullName: fullName.trim(),
        citizenId: citizenId.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        hometown: hometown.trim() || undefined,
      }).unwrap();

      toast.success('Thành công', 'Đã khởi tạo hồ sơ cư dân mới!');
      setIsCreateModalOpen(false);
      setFullName('');
      setCitizenId('');
      setPhone('');
      setEmail('');
      setHometown('');
      setCreateErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể tạo hồ sơ khách thuê');
      const backendFieldErrors: Record<string, string> = { ...parsed.fieldErrors };
      if (parsed.fieldErrors.citizen_id) backendFieldErrors.citizenId = parsed.fieldErrors.citizen_id;
      if (parsed.fieldErrors.full_name) backendFieldErrors.fullName = parsed.fieldErrors.full_name;
      if (parsed.fieldErrors.phone) backendFieldErrors.phone = parsed.fieldErrors.phone;
      backendFieldErrors.general = parsed.message;
      setCreateErrors(backendFieldErrors);
      toast.error('Lưu thất bại', parsed.message);
    }
  };

  const handleAddRoommate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    const errors: Record<string, string> = {};

    if (!rmName.trim()) {
      errors.rmName = 'Vui lòng nhập họ tên người ở cùng';
    }
    if (!rmCitizenId.trim()) {
      errors.rmCitizenId = 'Vui lòng nhập số CMND/CCCD người ở cùng';
    } else if (!/^\d{9,12}$/.test(rmCitizenId.trim())) {
      errors.rmCitizenId = 'Số CMND/CCCD phải gồm 9 đến 12 chữ số hợp lệ';
    }
    if (rmPhone.trim() && !/^0\d{9,10}$/.test(rmPhone.trim())) {
      errors.rmPhone = 'Số điện thoại phải bắt đầu bằng số 0 và có 10-11 số';
    }

    if (Object.keys(errors).length > 0) {
      setRmErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng kiểm tra các trường báo đỏ');
      return;
    }

    setRmErrors({});
    try {
      await addRoommate({
        tenantId: selectedTenant.id,
        roommate: {
          apartmentId: selectedTenant.currentApartmentId || 1,
          fullName: rmName.trim(),
          citizenId: rmCitizenId.trim(),
          phone: rmPhone.trim() || '',
          relationship: rmRelation.trim() || 'Bạn cùng phòng',
          isRegisteredTemp: true,
          registeredDate: new Date().toISOString().split('T')[0],
        },
      }).unwrap();

      toast.success('Đã thêm người ở cùng', `Đã liên kết ${rmName} và gửi đăng ký tạm trú DVC!`);
      setIsAddRoommateModalOpen(false);
      setRmName('');
      setRmCitizenId('');
      setRmPhone('');
      setRmErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể thêm người ở cùng');
      setRmErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Lưu thất bại', parsed.message);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    const errors: Record<string, string> = {};

    if (!ctName.trim()) {
      errors.ctName = 'Vui lòng nhập họ tên người liên hệ khẩn cấp';
    }
    if (!ctPhone.trim()) {
      errors.ctPhone = 'Vui lòng nhập số điện thoại liên hệ';
    } else if (!/^0\d{9,10}$/.test(ctPhone.trim())) {
      errors.ctPhone = 'Số điện thoại phải bắt đầu bằng số 0 và có 10-11 số';
    }

    if (Object.keys(errors).length > 0) {
      setCtErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng kiểm tra các trường báo đỏ');
      return;
    }

    setCtErrors({});
    try {
      await addContact({
        tenantId: selectedTenant.id,
        contact: {
          fullName: ctName.trim(),
          phone: ctPhone.trim(),
          relationship: ctRelation.trim() || 'Người thân',
        },
      }).unwrap();

      toast.success('Đã thêm liên hệ khẩn cấp', `Đã lưu thông tin người liên hệ: ${ctName}!`);
      setIsAddContactModalOpen(false);
      setCtName('');
      setCtPhone('');
      setCtErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể thêm liên hệ');
      setCtErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Lưu thất bại', parsed.message);
    }
  };

  const handleOpenCreateModal = () => {
    setFullName('');
    setCitizenId('');
    setPhone('');
    setEmail('');
    setHometown('');
    setCreateErrors({});
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateErrors({});
    setFullName('');
    setCitizenId('');
    setPhone('');
    setEmail('');
    setHometown('');
  };

  const handleOpenRoommateModal = (t: ITenant) => {
    setSelectedTenant(t);
    setRmName('');
    setRmCitizenId('');
    setRmPhone('');
    setRmRelation('Bạn cùng phòng');
    setRmErrors({});
    setIsAddRoommateModalOpen(true);
  };

  const handleCloseRoommateModal = () => {
    setIsAddRoommateModalOpen(false);
    setRmErrors({});
    setRmName('');
    setRmCitizenId('');
    setRmPhone('');
  };

  const handleOpenContactModal = (t: ITenant) => {
    setSelectedTenant(t);
    setCtName('');
    setCtPhone('');
    setCtRelation('Người thân');
    setCtErrors({});
    setIsAddContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setIsAddContactModalOpen(false);
    setCtErrors({});
    setCtName('');
    setCtPhone('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Quản Lý Khách Thuê & Cư Dân
            </h1>
            {isAccountant && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                Phân hệ Kế toán & Sổ nợ
              </span>
            )}
            {isStaff && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
                Phân hệ Tiếp nhận & Hồ sơ
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAccountant
              ? 'Theo dõi danh sách cư dân đại diện, đối soát nghĩa vụ tài chính và công nợ định kỳ.'
              : 'Lý lịch khách đại diện, CCCD/VNeID và danh sách người ở cùng.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAccountant ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/finance')}
            >
              Xem Sổ Nợ Toàn Tòa
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenCreateModal}
            >
              Thêm Khách Mới
            </Button>
          )}
        </div>
      </div>

      {/* Search toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo CCCD, Họ tên, SĐT, số phòng..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Tổng cộng: <strong className="text-slate-900">{tenants.length}</strong> khách thuê
        </div>
      </div>

      {/* Tenants Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedTenants.map((t) => {
          const tenantContract =
            contracts.find((c) => c.tenantId === t.id && c.status === 'ACTIVE') ||
            contracts.find((c) => c.tenantId === t.id && c.status === 'DRAFT');
          const roomNumber = t.currentRoomNumber || tenantContract?.roomNumber;
          const buildingName = t.buildingName || tenantContract?.buildingName;

          return (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all duration-200 space-y-3"
          >
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 flex items-center justify-center text-white font-extrabold text-sm shadow-soft">
                  {t.fullName.split(' ').slice(-1)[0][0]}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900">{t.fullName}</h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> VNeID
                    </span>
                    {(t.userId || t.email) && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded-full">
                        TK Portal: {t.email || t.username}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    CCCD: {t.citizenId} • Quê: {t.hometown || 'Chưa cập nhật'}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                {roomNumber ? (
                  <>
                    <div className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                      {roomNumber.startsWith('P') ? roomNumber : `Phòng ${roomNumber}`}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 max-w-[130px] truncate">
                      {buildingName || 'Tòa nhà Dwell'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      Chưa thuê phòng
                    </div>
                    <div className="text-[10px] text-amber-600 mt-1 font-medium">
                      Chờ ký hợp đồng
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Roommates sub-panel */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <span>Người Ở Cùng ({t.roommates?.length || 0})</span>
              </div>

              {t.roommates && t.roommates.length > 0 ? (
                <div className="space-y-1.5">
                  {t.roommates.map((rm) => (
                    <div
                      key={rm.id}
                      className="bg-white p-2 rounded-lg border border-slate-200/70 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <strong className="text-slate-900">{rm.fullName}</strong>
                        <span className="text-slate-400"> ({rm.relationship})</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {rm.isRegisteredTemp ? 'Đã duyệt tạm trú' : 'Chưa duyệt'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-[11px] italic">1 người ở (Khách đại diện đứng tên)</div>
              )}
            </div>

            {/* Emergency contacts sub-panel */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <span>Liên Hệ Khẩn Cấp ({t.emergencyContacts?.length || 0})</span>
              </div>

              {t.emergencyContacts && t.emergencyContacts.length > 0 ? (
                <div className="space-y-1">
                  {t.emergencyContacts.map((ct) => (
                    <div key={ct.id} className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-800">
                        {ct.fullName} ({ct.relationship}):
                      </span>
                      <strong className="text-brand-700">{ct.phone}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-400 text-[11px] italic">Chưa cấu hình liên hệ khẩn cấp</div>
              )}
            </div>

            {/* Bottom stats & Quick Action */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2 flex-wrap">
                <div>SĐT: <strong className="text-slate-800 font-mono">{t.phone}</strong></div>
              </div>
              
              <div className="flex items-center gap-1.5 relative">
                {isAccountant ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/finance?search=${encodeURIComponent(t.fullName)}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1 transition-all"
                    title="Xem chi tiết các khoản thu và sổ nợ của khách này"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Xem Công Nợ</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/contracts?action=create&tenantId=${t.id}`)}
                      className="px-2.5 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs border border-brand-200/80 flex items-center gap-1 transition-all"
                      title="Lập hợp đồng thuê căn hộ cho khách này"
                    >
                      <FileSignature className="w-3 h-3" />
                      <span>Lập HĐ</span>
                    </button>

                    {/* More actions dropdown */}
                    <button
                      type="button"
                      onClick={() => setActiveDropdownId(activeDropdownId === t.id ? null : t.id)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all"
                      title="Thêm người ở cùng hoặc liên hệ khẩn cấp"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {activeDropdownId === t.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setActiveDropdownId(null)}
                        />
                        <div className="absolute right-0 bottom-full mb-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownId(null);
                              handleOpenRoommateModal(t);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700 flex items-center gap-2 font-medium"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                            <span>Thêm người ở cùng</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDropdownId(null);
                              handleOpenContactModal(t);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-brand-50 hover:text-brand-700 flex items-center gap-2 font-medium"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>Thêm liên hệ khẩn cấp</span>
                          </button>

                          {(isAdmin || isStaff) && (
                            <>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setTenantToDelete(t);
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                <span>Xóa khách thuê</span>
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {/* Pagination Bar */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={tenants.length}
        pageSize={pageSize}
        itemLabel="khách thuê"
      />

      {/* Modal Add Tenant */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Thêm Mới Hồ Sơ Khách Thuê Đại Diện"
        subtitle="Lưu trữ lý lịch định danh và liên hệ khách thuê"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCloseCreateModal}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isCreating}
              onClick={handleCreate}
            >
              Lưu Hồ Sơ Khách
            </Button>
          </div>
        }
      >
        {createErrors.general && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 font-medium">{createErrors.general}</div>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Họ và tên đầy đủ theo CCCD"
            required
            placeholder="VD: Nguyễn Văn An"
            value={fullName}
            error={createErrors.fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (createErrors.fullName) setCreateErrors({ ...createErrors, fullName: '' });
            }}
            onBlur={() => {
              if (citizenId.trim() && fullName.trim()) {
                const matched = tenants.find((t) => t.citizenId === citizenId.trim());
                if (matched && !isSamePersonName(matched.fullName, fullName.trim())) {
                  setCreateErrors((prev) => ({
                    ...prev,
                    citizenId: 'Số cccd đã tồn tại ! ',
                  }));
                }
              }
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số CCCD (9 - 12 chữ số)"
              required
              placeholder="001201008899"
              value={citizenId}
              error={createErrors.citizenId}
              onChange={(e) => {
                setCitizenId(e.target.value);
                if (createErrors.citizenId) setCreateErrors({ ...createErrors, citizenId: '' });
              }}
              onBlur={() => handleBlurField('citizenId', citizenId)}
            />
            <Input
              label="Số điện thoại di động"
              required
              placeholder="0912.***.***"
              value={phone}
              error={createErrors.phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (createErrors.phone) setCreateErrors({ ...createErrors, phone: '' });
              }}
              onBlur={() => handleBlurField('phone', phone)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email liên hệ"
              type="email"
              placeholder="customer@dwell.vn"
              value={email}
              error={createErrors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (createErrors.email) setCreateErrors({ ...createErrors, email: '' });
              }}
              onBlur={() => handleBlurField('email', email)}
            />
            <Input
              label="Quê quán / Thường trú"
              placeholder="VD: Thái Bình"
              value={hometown}
              onChange={(e) => setHometown(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Modal Add Roommate */}
      {selectedTenant && (
        <Modal
          isOpen={isAddRoommateModalOpen}
          onClose={handleCloseRoommateModal}
          title={`Đăng Ký Người Ở Cùng • Khách ${selectedTenant.fullName}`}
          subtitle={`Căn ${selectedTenant.currentRoomNumber || 'P101'} • Đăng ký danh sách cư dân lưu trú`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCloseRoommateModal}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isAddingRm}
                onClick={handleAddRoommate}
              >
                Lưu & Đăng Ký Tạm Trú
              </Button>
            </div>
          }
        >
          {rmErrors.general && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium">{rmErrors.general}</div>
            </div>
          )}

          <form onSubmit={handleAddRoommate} className="space-y-4">
            <Input
              label="Họ và tên người ở cùng"
              required
              placeholder="VD: Trần Thị Mai"
              value={rmName}
              error={rmErrors.rmName}
              onChange={(e) => {
                setRmName(e.target.value);
                if (rmErrors.rmName) setRmErrors({ ...rmErrors, rmName: '' });
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Số CCCD người ở cùng"
                required
                placeholder="001201008888"
                value={rmCitizenId}
                error={rmErrors.rmCitizenId}
                onChange={(e) => {
                  setRmCitizenId(e.target.value);
                  if (rmErrors.rmCitizenId) setRmErrors({ ...rmErrors, rmCitizenId: '' });
                }}
              />
              <Input
                label="Số điện thoại"
                placeholder="0913.***.***"
                value={rmPhone}
                error={rmErrors.rmPhone}
                onChange={(e) => {
                  setRmPhone(e.target.value);
                  if (rmErrors.rmPhone) setRmErrors({ ...rmErrors, rmPhone: '' });
                }}
              />
            </div>

            <Input
              label="Mối quan hệ với khách đại diện"
              placeholder="VD: Vợ / Chồng / Con / Bạn bè"
              value={rmRelation}
              onChange={(e) => setRmRelation(e.target.value)}
            />
          </form>
        </Modal>
      )}

      {/* Modal Add Emergency Contact */}
      {selectedTenant && (
        <Modal
          isOpen={isAddContactModalOpen}
          onClose={handleCloseContactModal}
          title={`Thêm Người Liên Hệ Khẩn Cấp • ${selectedTenant.fullName}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCloseContactModal}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isAddingCt}
                onClick={handleAddContact}
              >
                Lưu Liên Hệ Khẩn Cấp
              </Button>
            </div>
          }
        >
          {ctErrors.general && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium">{ctErrors.general}</div>
            </div>
          )}

          <form onSubmit={handleAddContact} className="space-y-4">
            <Input
              label="Họ tên người liên hệ khẩn cấp"
              required
              placeholder="VD: Nguyễn Văn Bình"
              value={ctName}
              error={ctErrors.ctName}
              onChange={(e) => {
                setCtName(e.target.value);
                if (ctErrors.ctName) setCtErrors({ ...ctErrors, ctName: '' });
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Số điện thoại khẩn cấp"
                required
                placeholder="0903.***.***"
                value={ctPhone}
                error={ctErrors.ctPhone}
                onChange={(e) => {
                  setCtPhone(e.target.value);
                  if (ctErrors.ctPhone) setCtErrors({ ...ctErrors, ctPhone: '' });
                }}
              />
              <Input
                label="Mối quan hệ"
                required
                placeholder="VD: Bố đẻ / Mẹ đẻ / Anh trai"
                value={ctRelation}
                onChange={(e) => setCtRelation(e.target.value)}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirm Delete Tenant */}
      <Modal
        isOpen={!!tenantToDelete}
        onClose={() => !isDeleting && setTenantToDelete(null)}
        title="Xác Nhận Xóa Khách Thuê"
        subtitle="Gỡ bỏ hồ sơ định danh khách thuê khỏi hệ thống Dwell"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTenantToDelete(null)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteTenant}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Xác Nhận Xóa
            </Button>
          </div>
        }
      >
        {tenantToDelete && (
          <div className="space-y-3 py-1">
            <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 leading-relaxed">
                Bạn có chắc chắn muốn xóa hồ sơ khách thuê <strong className="font-bold text-rose-950">{tenantToDelete.fullName}</strong>?
                {tenantToDelete.currentRoomNumber && (
                  <span className="block mt-1 text-slate-700">
                    Phòng hiện tại: <strong className="text-brand-700 font-bold">{tenantToDelete.currentRoomNumber}</strong>
                  </span>
                )}
                <span className="block mt-1 text-slate-600">
                  CCCD: <span className="font-mono font-medium">{tenantToDelete.citizenId}</span> • SĐT: <span className="font-mono font-medium">{tenantToDelete.phone}</span>
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic">
              * Lưu ý: Hệ thống sẽ từ chối xóa nếu khách đang có hợp đồng thuê có hiệu lực. Mọi dữ liệu người ở cùng và liên hệ khẩn cấp liên kết sẽ được tự động xóa kèm theo.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

