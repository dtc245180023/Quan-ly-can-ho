import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Building,
  ShieldCheck,
  QrCode,
  Wrench,
  Users,
  CheckCircle2,
  AlertTriangle,
  Download,
  Star,
  Home,
  Receipt,
  FileSignature,
  FileText,
  UserPlus,
  Phone,
  Image as ImageIcon,
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Printer,
  Sparkles,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { VietQRModal } from '../components/common/VietQRModal';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { AISummarizerModal } from '../components/ai/AISummarizerModal';
import { useGetApartmentsQuery } from '../modules/buildings/services/buildingApi';
import { useGetContractsQuery, useRenewContractMutation } from '../modules/contracts/services/contractApi';
import { useGetReceivablesQuery, useRecordPaymentMutation, useGetPaymentsQuery } from '../modules/finance/services/financeApi';
import { IPayment, ITenant, IContract } from '../types';
import {
  useGetMaintenanceRequestsQuery,
  useCreateMaintenanceRequestMutation,
  useCompleteAndInspectMaintenanceMutation,
} from '../modules/maintenance/services/maintenanceApi';
import { useGetTenantsQuery, useAddRoommateMutation } from '../modules/tenants/services/tenantApi';
import { formatCurrency, formatDate, numberToVietnameseWords } from '../utils/formatters';
import { generateVietQRUrl, DEFAULT_BUILDING_BANK_ACCOUNT } from '../utils/vietqr';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

export type PortalTab = 'overview' | 'apartment' | 'contract' | 'billing' | 'maintenance';

export const ResidentPortalPage: React.FC = () => {
  const toast = useToast();
  const { user, isManagement } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Queries
  const { data: apartments = [] } = useGetApartmentsQuery({});
  const { data: contracts = [] } = useGetContractsQuery({});
  const { data: receivables = [] } = useGetReceivablesQuery({});
  const { data: payments = [] } = useGetPaymentsQuery({});
  const { data: maintenanceList = [] } = useGetMaintenanceRequestsQuery({});
  const { data: tenants = [] } = useGetTenantsQuery({});

  // Mutations
  const [recordPayment, { isLoading: isPaying }] = useRecordPaymentMutation();
  const [createMaintenance, { isLoading: isReporting }] = useCreateMaintenanceRequestMutation();
  const [completeMaintenance, { isLoading: isInspecting }] = useCompleteAndInspectMaintenanceMutation();
  const [renewContract, { isLoading: isRenewing }] = useRenewContractMutation();
  const [addRoommate, { isLoading: isAddingRm }] = useAddRoommateMutation();

  const navigate = useNavigate();

  // Tìm hồ sơ tenant thực tế của user (không gán bừa hồ sơ người khác cho user thường)
  const realTenant = tenants.find(
    (t) => (user?.id && t.userId === user.id) || (user?.phone && t.phone === user.phone) || (user?.email && t.email === user.email)
  );

  const realContract = realTenant
    ? contracts.find((c) => c.tenantId === realTenant.id && c.status === 'ACTIVE')
    : undefined;

  const isResidentAuthorized = Boolean(isManagement || (realTenant && realContract));

  const fallbackTenant: ITenant = {
    id: 0,
    fullName: user?.fullName || 'Khách vãn lai',
    currentRoomNumber: '',
    phone: user?.phone || '',
    roommates: [],
    citizenId: '',
    email: user?.email || '',
    hometown: '',
    emergencyContacts: [],
    totalHeldDeposit: 0,
    creditScore: 0,
    isBadDebt: false,
    createdAt: '',
  };

  const fallbackContract: IContract = {
    id: 0,
    contractCode: '',
    apartmentId: 0,
    roomNumber: '',
    buildingName: '',
    tenantId: 0,
    tenantName: user?.fullName || '',
    tenantCitizenId: '',
    tenantPhone: user?.phone || '',
    tenantEmail: user?.email || '',
    startDate: '',
    endDate: '',
    rentalPrice: 0,
    depositAmount: 0,
    paymentCycleMonths: 1,
    paymentDueDay: 5,
    status: 'ACTIVE',
    createdBy: 0,
    createdAt: '',
    aiSummary: {
      term1_duration: '',
      term2_rentalPrice: '',
      term3_paymentObligation: '',
      term4_penalties: '',
      term5_termination: '',
      confidenceScore: 0,
      extractedAt: '',
    },
  };

  // Active Resident Context: Nếu user không có quyền, guard bên dưới sẽ chặn hiển thị
  const currentTenant: ITenant = isManagement
    ? (realTenant || tenants.find((t) => t.fullName === 'Nguyễn Văn An') || tenants[0] || fallbackTenant)
    : (realTenant || fallbackTenant);

  const activeContract: IContract = isManagement
    ? (realContract || contracts.find((c) => c.status === 'ACTIVE') || contracts[0] || fallbackContract)
    : (realContract || fallbackContract);

  const activeApartment = apartments.find((a) => a.id === activeContract.apartmentId || a.roomNumber === activeContract.roomNumber)
    || (isManagement ? apartments[0] : undefined);

  const activeBill = receivables.find((r) => (r.contractId === activeContract.id || r.tenantId === currentTenant.id || (activeApartment?.roomNumber && r.roomNumber === activeApartment.roomNumber)) && r.status !== 'PAID')
    || receivables.find((r) => r.contractId === activeContract.id || r.tenantId === currentTenant.id || (activeApartment?.roomNumber && r.roomNumber === activeApartment.roomNumber))
    || (isManagement ? receivables[0] : undefined);
  const myTickets = maintenanceList.filter((m) =>
    m.apartmentId === activeApartment?.id ||
    m.roomNumber === activeApartment?.roomNumber ||
    (currentTenant?.id && m.tenantId === currentTenant?.id)
  );
  const activeTicket = myTickets.find((m) => m.status === 'IN_PROGRESS')
    || myTickets.find((m) => m.status === 'PENDING')
    || myTickets[0];

  // Tab State with URL query synchronization
  const rawParamTab = searchParams.get('tab');
  const paramTab = (rawParamTab === 'explore' ? 'apartment' : rawParamTab) as PortalTab | null;
  const validTabs: PortalTab[] = ['overview', 'apartment', 'contract', 'billing', 'maintenance'];
  const [activeTab, setActiveTabState] = useState<PortalTab>(
    paramTab && validTabs.includes(paramTab) ? paramTab : 'overview'
  );

  const setActiveTab = (tab: PortalTab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const rawTab = searchParams.get('tab');
    const tab = (rawTab === 'explore' ? 'apartment' : rawTab) as PortalTab | null;
    if (tab && validTabs.includes(tab) && tab !== activeTab) {
      setActiveTabState(tab);
    }
  }, [searchParams]);

  // Modals state
  const [isVietQROpen, setIsVietQROpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isAddRoommateOpen, setIsAddRoommateOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isAISummarizerOpen, setIsAISummarizerOpen] = useState(false);

  // New Ticket State
  const [newCategory, setNewCategory] = useState<'PLUMBING' | 'ELECTRICAL' | 'APPLIANCE' | 'DOOR_LOCK' | 'OTHER'>('PLUMBING');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');

  // Roommate state
  const [rmName, setRmName] = useState('');
  const [rmCitizenId, setRmCitizenId] = useState('');
  const [rmPhone, setRmPhone] = useState('');
  const [rmRelation, setRmRelation] = useState('Vợ / Chồng');

  // Rating state
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('Kỹ thuật viên nhiệt tình, xử lý nhanh chóng.');

  const qrUrl = generateVietQRUrl({
    bankId: 'MB',
    accountNo: DEFAULT_BUILDING_BANK_ACCOUNT.accountNo,
    accountName: DEFAULT_BUILDING_BANK_ACCOUNT.accountName,
    amount: activeBill?.remainingDebt || 15725000,
    description: `${(activeContract?.contractCode || 'HD2026P101').replace(/-/g, '')} T${activeBill?.billingMonth || 10}`,
    template: 'compact2',
  });

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;
    try {
      await createMaintenance({
        apartmentId: activeApartment?.id || 1,
        roomNumber: activeApartment?.roomNumber || 'P101',
        buildingName: activeApartment?.buildingName || 'Dwell',
        reporterName: currentTenant.fullName,
        phone: currentTenant.phone,
        issueDescription: newDesc,
        category: newCategory,
        priority: newPriority,
        tenantId: currentTenant?.id,
      }).unwrap();

      toast.success('Đã gửi yêu cầu', 'Bộ phận kỹ thuật tòa nhà đã tiếp nhận và sẽ liên hệ xử lý!');
      setNewDesc('');
    } catch (err: any) {
      toast.error('Lỗi', err?.data?.detail || err?.message || 'Không thể gửi yêu cầu lúc này');
    }
  };

  const handleInspectTicket = async () => {
    if (!activeTicket) return;
    try {
      await completeMaintenance({
        ticketId: activeTicket.id,
        cost: activeTicket.repairCost || 150000,
        rating,
        feedback: ratingComment,
        isPass: true,
      }).unwrap();

      toast.success('Nghiệm thu thành công', 'Cảm ơn Quý khách đã xác nhận hoàn thành công việc!');
      setIsInspectModalOpen(false);
    } catch {
      toast.error('Lỗi', 'Không thể nghiệm thu lúc này');
    }
  };

  const handleAddRoommate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmName.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập họ và tên người ở cùng');
      return;
    }
    if (!rmCitizenId.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập số CCCD 12 chữ số');
      return;
    }

    try {
      await addRoommate({
        tenantId: currentTenant.id,
        roommate: {
          apartmentId: activeApartment?.id || activeContract?.apartmentId || 1,
          fullName: rmName.trim(),
          citizenId: rmCitizenId.trim(),
          phone: rmPhone.trim(),
          relationship: rmRelation.trim() || 'Người ở cùng',
          isRegisteredTemp: true,
          registeredDate: new Date().toISOString().split('T')[0],
        },
      }).unwrap();

      toast.success('Khai báo thành công', `Hồ sơ tạm trú của ${rmName.trim()} đã được cập nhật thành công!`);
      setIsAddRoommateOpen(false);
      setRmName('');
      setRmCitizenId('');
      setRmPhone('');
      setRmRelation('Vợ / Chồng');
    } catch (err: any) {
      const errMsg = err?.data?.detail || err?.error || err?.message || 'Không thể thêm thành viên';
      toast.error('Lỗi', typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    }
  };

  const handleDirectTransferConfirm = async () => {
    if (!activeBill) return;
    try {
      await recordPayment({
        receivableId: activeBill.id,
        amount: activeBill.remainingDebt,
        paymentMethod: 'BANK_TRANSFER',
        note: 'Thanh toán chuyển khoản từ Cổng Cư Dân',
      }).unwrap();

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success('Thanh toán thành công', 'Hóa đơn đã được ghi nhận thanh toán thành công!');
    } catch {
      toast.error('Lỗi', 'Không thể xác nhận giao dịch');
    }
  };

  if (!isResidentAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Chưa Kích Hoạt Cổng Cư Dân</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tài khoản <strong className="text-slate-800">{user?.fullName || user?.username}</strong> ({user?.phone}) chưa có hợp đồng thuê căn hộ ở trạng thái kích hoạt (ACTIVE).
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 text-left space-y-2">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Quy trình kích hoạt cư dân:</span>
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-500 text-[11px] leading-relaxed">
              <li>Khách vãn lai chọn căn hộ và gửi yêu cầu hẹn giờ xem phòng.</li>
              <li>Nhân viên & Ban Quản Lý phê duyệt lịch hẹn và liên hệ tư vấn.</li>
              <li>Ban Quản Lý lập và kích hoạt hợp đồng thuê căn hộ.</li>
              <li>Hệ thống tự động mở quyền Cổng Cư Dân cho tài khoản của bạn!</li>
            </ol>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/explore')}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Quay Lại Trang Tìm Căn Hộ & Đặt Lịch</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 0. BQL SIMULATION NOTICE (Only shown when Admin/Staff/Accountant visits) */}
      {isManagement && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <span>Chế độ Xem Trước Dành Cho Ban Quản Lý</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  {user?.roleCode}
                </span>
              </div>
              <p className="text-amber-800 text-xs mt-0.5">
                Bạn đang xem giao diện thực tế của Khách thuê <strong>{currentTenant.fullName}</strong> tại căn hộ <strong>{activeApartment?.roomNumber} - {activeApartment?.buildingName}</strong>.
              </p>
            </div>
          </div>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 font-bold text-slate-800 hover:text-brand-700 bg-white px-3.5 py-2 rounded-xl shadow-xs border border-amber-300 hover:border-brand-300 transition-all text-xs shrink-0 self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Bảng Quản Trị</span>
          </Link>
        </div>
      )}

      {/* 1. TOP WELCOME BANNER (Enlarged with subtle blurred apartment complex background) */}
      <div className="relative overflow-hidden bg-white p-6 sm:p-8 md:p-9 rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm min-h-[175px] sm:min-h-[195px] flex flex-col justify-center">
        {/* Background Image of Luxury Apartment Complex - Richer, Darker & Vivid */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <img
            src="/resident-banner-bg.jpg"
            alt="Dwell Complex Background"
            className="w-full h-full object-cover object-right md:object-center opacity-85"
          />
          {/* Soft protective gradient on the left, rich building view across center and right */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 bg-slate-100/90 backdrop-blur-xs text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200/60 shadow-2xs">
              <Home className="w-3.5 h-3.5 text-brand-600" />
              <span>Cổng Thông Tin Cư Dân</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight drop-shadow-2xs">
              {isManagement ? (
                <span>Xem trước Cổng Cư Dân: <span className="text-brand-700">{currentTenant.fullName}</span></span>
              ) : (
                <span>Xin chào, <span className="text-brand-700">{currentTenant.fullName}</span>!</span>
              )}
            </h1>

            <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 font-medium shadow-2xs">
                <Building className="w-3.5 h-3.5 text-brand-600" />
                Căn hộ {activeApartment?.roomNumber || 'P101'} (Tầng {activeApartment?.floor || 1}, {activeApartment?.buildingName || 'Dwell'})
              </span>
              <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-200 font-medium shadow-2xs">
                <FileSignature className="w-3.5 h-3.5 text-brand-600" />
                Hợp đồng: {activeContract?.contractCode || 'HD-2026-P101'} (Hạn: {formatDate(activeContract?.endDate || '2026-12-31')})
              </span>
            </div>

            {/* Unpaid alert */}
            {activeBill && activeBill.status !== 'PAID' && (
              <div className="inline-flex items-center gap-2 bg-amber-50/95 backdrop-blur-xs border border-amber-200 text-amber-950 px-3.5 py-2 rounded-xl text-xs font-semibold mt-1 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Hóa đơn cước phí Tháng {activeBill.billingMonth} chưa thanh toán (Hạn đóng: {formatDate(activeBill.dueDate)})</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. TAB WORKSPACE */}
      <div className="space-y-6">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* 4 Clean Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 1: Căn hộ */}
              <div
                onClick={() => setActiveTab('apartment')}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-soft transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Căn Hộ Đang Thuê</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-900 leading-tight">
                    Phòng {activeApartment?.roomNumber || 'P101'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    {activeApartment?.areaSqm || 65.5} m² • {activeApartment?.bedrooms || 2} PN • Tầng {activeApartment?.floor || 1}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Chi tiết đồ đạc bàn giao</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform text-slate-400" />
                </div>
              </div>

              {/* Card 2: Hóa đơn */}
              <div
                onClick={() => setActiveTab('billing')}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-amber-300 hover:shadow-soft transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cước Phí Tháng {activeBill?.billingMonth || 9}</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-900 leading-tight">
                    {formatCurrency(activeBill?.remainingDebt || 21100000)}
                  </div>
                  <div className="text-xs mt-1 truncate">
                    {activeBill?.status === 'PAID' ? (
                      <span className="text-emerald-600 font-bold">● Đã thanh toán</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">● Hạn đóng: {formatDate(activeBill?.dueDate || '2026-09-10')}</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-brand-700">
                  <span>Thanh toán VietQR</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform text-slate-400" />
                </div>
              </div>

              {/* Card 3: Hợp đồng */}
              <div
                onClick={() => setActiveTab('contract')}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-soft transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hợp Đồng Thuê Nhà</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-900 leading-tight truncate">
                    {activeContract?.contractCode || 'HD-2026-P101'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    Thời hạn: Đến {formatDate(activeContract?.endDate || '2027-07-27')}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Xem điều khoản hợp đồng</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform text-slate-400" />
                </div>
              </div>

              {/* Card 4: Kỹ thuật */}
              <div
                onClick={() => setActiveTab('maintenance')}
                className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-soft transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bảo Trì & Kỹ Thuật</span>
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                      <Wrench className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-xl font-black text-slate-900 leading-tight">
                    {activeTicket?.status === 'IN_PROGRESS' ? '01 Phiếu đang sửa' : 'Hệ Thống Tốt'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    {activeTicket?.status === 'IN_PROGRESS' ? activeTicket.issueDescription : 'Không có sự cố nào'}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Gửi yêu cầu sửa chữa</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-1 transition-transform text-slate-400" />
                </div>
              </div>
            </div>

            {/* 2 Balanced Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Box 1: Căn hộ & Trang thiết bị (7 cols) */}
              <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Hồ Sơ Căn Hộ & Cư Dân</h3>
                      <div className="text-[11px] text-slate-500">Phòng {activeApartment?.roomNumber || 'P101'} • Tầng {activeApartment?.floor || 1}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('apartment')}
                    className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
                  >
                    <span>Xem chi tiết</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {(activeApartment?.amenities && activeApartment.amenities.length > 0 ? activeApartment.amenities : [
                    { id: 1, name: 'Điều hòa Inverter', category: 'Thiết bị làm mát', status: 'GOOD', quantity: 2 },
                    { id: 2, name: 'Tủ lạnh 2 cánh', category: 'Thiết bị bếp', status: 'GOOD', quantity: 1 },
                    { id: 3, name: 'Khóa cửa vân tay', category: 'An ninh', status: 'GOOD', quantity: 1 },
                  ]).slice(0, 3).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-900">{item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}</div>
                        <div className="text-[10px] text-slate-400">{item.category || 'Trang thiết bị'}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-[10px] rounded-full">
                        ● Hoạt động tốt
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Thành viên cư trú: <strong>{1 + (currentTenant.roommates?.length || 0)} người</strong>
                  </span>
                  <button
                    onClick={() => setIsAddRoommateOpen(true)}
                    className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Khai báo tạm trú</span>
                  </button>
                </div>
              </div>

              {/* Box 2: Hóa đơn & VietQR (5 cols) */}
              <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Hóa Đơn Tháng {activeBill?.billingMonth || 9}</h3>
                      <div className="text-[11px] text-slate-500">Mã phiếu thu: #PT-{activeBill?.id || '001'}</div>
                    </div>
                  </div>
                  {activeBill?.status === 'PAID' ? (
                    <Badge status="PAID" label="ĐÃ THU" />
                  ) : (
                    <Badge status="UNPAID" label="CHƯA THU" />
                  )}
                </div>

                <div className="flex items-center gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="w-20 h-20 bg-white p-1 rounded-lg border border-slate-200 shrink-0 shadow-2xs">
                    <img src={qrUrl} alt="VietQR" className="w-full h-full object-cover rounded" />
                  </div>
                  <div className="min-w-0 space-y-1 text-xs">
                    <div className="text-slate-500 text-[11px]">Tổng cước phí cần nộp:</div>
                    <div className="text-lg font-black text-slate-900">
                      {formatCurrency(activeBill?.remainingDebt || 21100000)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Napas247 • MBBank • STK: <strong className="font-mono text-slate-800">{DEFAULT_BUILDING_BANK_ACCOUNT.accountNo}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('billing')}
                  >
                    Bảng Phân Bổ Chi Phí
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<QrCode className="w-3.5 h-3.5" />}
                    onClick={() => setIsVietQROpen(true)}
                  >
                    Mã VietQR Thanh Toán
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: APARTMENT ================= */}
        {activeTab === 'apartment' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs shrink-0 bg-slate-100 ring-2 ring-white">
                    <img
                      src={activeApartment?.imageUrl || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80'}
                      alt={activeApartment?.roomNumber || 'Căn hộ'}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Căn Hộ {activeApartment?.roomNumber || 'P101'} – {activeApartment?.description || 'Căn hộ tiêu chuẩn'}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Tầng {activeApartment?.floor || 1} • {activeApartment?.buildingName || 'Dwell'} • Hướng {activeApartment?.viewDirection || 'Đông Nam'}
                    </div>
                  </div>
                </div>
                <Badge status={activeApartment?.status || 'OCCUPIED'} label="ĐANG THUÊ CHÍNH THỨC" />
              </div>

              {/* Room specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Diện tích thông thủy</span>
                  <strong className="text-slate-900 text-base font-black">{activeApartment?.areaSqm || 65.5} m²</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Phòng ngủ</span>
                  <strong className="text-slate-900 text-base font-black">0{activeApartment?.bedrooms || 2} PN</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Phòng vệ sinh</span>
                  <strong className="text-slate-900 text-base font-black">0{activeApartment?.bathrooms || 1} WC</strong>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] block">Giá thuê hợp đồng</span>
                  <strong className="text-brand-700 text-base font-black">{formatCurrency(activeContract?.rentalPrice || activeApartment?.price || 14000000)}</strong>
                </div>
              </div>

              {/* Handover Equipment List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Danh Mục Trang Thiết Bị Bàn Giao Ký Nhận</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Biên bản bàn giao hiện trạng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(activeApartment?.amenities && activeApartment.amenities.length > 0 ? activeApartment.amenities : [
                    { id: 1, name: 'Điều hòa Inverter', category: 'Thiết bị làm mát', status: 'GOOD', quantity: 2 },
                    { id: 2, name: 'Tủ lạnh 2 cánh', category: 'Thiết bị bếp', status: 'GOOD', quantity: 1 },
                    { id: 3, name: 'Bếp từ đôi âm mặt kính', category: 'Thiết bị bếp', status: 'GOOD', quantity: 1 },
                    { id: 4, name: 'Khóa cửa vân tay Smart Lock', category: 'An ninh', status: 'GOOD', quantity: 1 },
                  ]).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-900">{item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}</div>
                        <div className="text-[10px] text-slate-400">{item.category || 'Trang thiết bị'} • Căn {activeApartment?.roomNumber || 'P101'}</div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold text-[10px] rounded-full">
                        ● Tốt - Bình thường
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roommates List & VNeID */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-700" />
                    <span>Danh Sách Thành Viên Ở Cùng ({1 + (currentTenant.roommates?.length || 0)} người)</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    VNeID Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold mx-auto flex items-center justify-center text-xs">
                      {currentTenant.fullName.split(' ').pop()?.slice(0, 2).toUpperCase() || 'AN'}
                    </div>
                    <div className="font-bold text-slate-900 mt-1.5 text-xs">{currentTenant.fullName}</div>
                    <div className="text-[10px] text-slate-400">Chủ hộ / Đại diện hợp đồng</div>
                  </div>

                  {currentTenant.roommates && currentTenant.roommates.length > 0 ? (
                    currentTenant.roommates.map((rm) => (
                      <div key={rm.id || rm.citizenId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                        <div className="w-9 h-9 rounded-full bg-slate-700 text-white font-bold mx-auto flex items-center justify-center text-xs">
                          {rm.fullName.split(' ').pop()?.slice(0, 2).toUpperCase() || 'TV'}
                        </div>
                        <div className="font-bold text-slate-900 mt-1.5 text-xs">{rm.fullName}</div>
                        <div className="text-[10px] text-emerald-700 font-semibold">{rm.relationship || 'Người thân'} • {rm.isRegisteredTemp ? 'Đã duyệt tạm trú' : 'Chờ duyệt'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center col-span-2 flex items-center justify-center text-slate-400 text-xs">
                      Chưa đăng ký thêm thành viên lưu trú
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-slate-400">
                    Khai báo thông tin lưu trú trực tuyến kết nối Ban Quản Lý và Cổng DVC.
                  </span>
                  <button
                    onClick={() => setIsAddRoommateOpen(true)}
                    className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1.5 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 self-start sm:self-auto"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Thêm Người / Khai Báo Tạm Trú</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CONTRACT (Full Official Electronic Lease Agreement) ================= */}
        {activeTab === 'contract' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Action Bar (Hidden when printing) */}
            <div className="no-print bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 border border-brand-200">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      Hợp Đồng Thuê Căn Hộ Điện Tử
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Đang có hiệu lực
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Mã số: <strong className="font-mono text-slate-800 font-bold">{activeContract?.contractCode || 'HD-2026-P101'}</strong> • Thời hạn: Đến {formatDate(activeContract?.endDate || '2027-07-27')}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100"
                  leftIcon={<Sparkles className="w-4 h-4 text-sky-600" />}
                  onClick={() => setIsAISummarizerOpen(true)}
                >
                  Tóm Tắt AI (5 Điều Khoản)
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={() => window.print()}
                >
                  In Hợp Đồng (Print / PDF)
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FileSignature className="w-4 h-4" />}
                  onClick={() => setIsRenewModalOpen(true)}
                >
                  Gửi Yêu Cầu Gia Hạn HĐ
                </Button>
              </div>
            </div>

            {/* Official Legal Contract Paper Document */}
            <div
              id="dwell-printable-contract"
              className="bg-white mx-auto max-w-4xl p-8 sm:p-12 md:p-14 rounded-2xl shadow-sm border border-slate-200/90 text-slate-800 font-sans space-y-7 leading-relaxed print:shadow-none print:border-none print:p-0 print:m-0"
            >
              {/* National Emblem & Title */}
              <div className="text-center space-y-1.5 pb-4 border-b border-slate-200">
                <div className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-900">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-xs sm:text-sm font-semibold tracking-wider text-slate-800">
                  Độc lập - Tự do - Hạnh phúc
                </div>
                <div className="text-xs text-slate-400 font-mono tracking-widest">
                  ------------------o0o------------------
                </div>

                <div className="pt-4 space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    HỢP ĐỒNG THUÊ CĂN HỘ NHÀ Ở
                  </h1>
                  <div className="font-mono text-xs font-bold text-brand-700">
                    Số: {activeContract?.contractCode || 'HD-2026-P101'} / HĐTN-DWELL
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    (Căn cứ Bộ luật Dân sự 2015, Luật Nhà ở 2023 & Nghị định 123/2020/NĐ-CP)
                  </p>
                </div>
              </div>

              {/* Preamble */}
              <div className="text-xs sm:text-[13px] text-slate-600 italic">
                Hôm nay, ngày {formatDate(activeContract?.startDate || '2026-01-01')}, tại Văn phòng Ban Quản Lý Tòa nhà Dwell Living, chúng tôi gồm các bên dưới đây thống nhất ký kết Hợp đồng thuê căn hộ:
              </div>

              {/* Two Parties Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50/90 rounded-xl border border-slate-200 text-xs sm:text-[13px]">
                {/* Party A */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-900 uppercase text-xs tracking-wider pb-1 border-b border-slate-200 text-brand-800">
                    BÊN CHO THUÊ (BÊN A)
                  </div>
                  <div><strong className="text-slate-900">CÔNG TY TNHH QUẢN LÝ TÒA NHÀ DWELL LIVING</strong></div>
                  <div><span className="text-slate-500">Đại diện:</span> <strong className="text-slate-800">Bà Hoàng Khánh Ly</strong> (Trưởng ban vận hành)</div>
                  <div><span className="text-slate-500">Địa chỉ:</span> Tòa nhà Dwell Tower, Quận 7, TP. Hồ Chí Minh</div>
                  <div><span className="text-slate-500">Mã số thuế:</span> <span className="font-mono font-medium">0317899688</span></div>
                  <div><span className="text-slate-500">Hotline:</span> 1900 8888 • <span className="text-slate-500">Email:</span> contact@dwell.vn</div>
                </div>

                {/* Party B */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-900 uppercase text-xs tracking-wider pb-1 border-b border-slate-200 text-brand-800">
                    BÊN THUÊ (BÊN B)
                  </div>
                  <div><strong className="text-slate-900">ÔNG/BÀ: {currentTenant.fullName}</strong></div>
                  <div><span className="text-slate-500">Số CCCD / Hộ chiếu:</span> <strong className="font-mono text-slate-900">{currentTenant.citizenId || '079095012345'}</strong></div>
                  <div><span className="text-slate-500">Số điện thoại:</span> <span className="font-mono">{currentTenant.phone || '0912.888.999'}</span></div>
                  <div><span className="text-slate-500">Email:</span> {currentTenant.email || 'an.nguyen@dwell.vn'}</div>
                  <div><span className="text-slate-500">Đại diện thuê căn hộ:</span> <strong className="text-brand-700">{activeApartment?.roomNumber || 'P101'}</strong> ({activeApartment?.buildingName || 'Dwell'})</div>
                </div>
              </div>

              {/* Contract Clauses */}
              <div className="space-y-5 text-xs sm:text-[13px] text-slate-700">
                {/* Clause 1 */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    ĐIỀU 1: ĐỐI TƯỢNG VÀ THÔNG SỐ CĂN HỘ CHO THUÊ
                  </h4>
                  <p>
                    1.1. Bên A đồng ý cho Bên B thuê căn hộ số <strong className="text-slate-900 font-bold">{activeApartment?.roomNumber || 'P101'}</strong>, Tầng {activeApartment?.floor || 1}, thuộc Tòa nhà {activeApartment?.buildingName || 'Dwell Living Tower'}.
                  </p>
                  <p>
                    1.2. Diện tích sử dụng thực tế: <strong className="text-slate-900 font-bold">{activeApartment?.areaSqm || 65.5} m²</strong>, gồm 0{activeApartment?.bedrooms || 2} phòng ngủ, 0{activeApartment?.bathrooms || 1} phòng vệ sinh, ban công hướng {activeApartment?.viewDirection || 'Đông Nam'}.
                  </p>
                  <p>
                    1.3. Mục đích thuê: Dùng làm nơi ở và sinh hoạt cư dân hợp pháp, tuân thủ đúng nội quy quản lý chung cư.
                  </p>
                  <p>
                    1.4. Tình trạng bàn giao: Đầy đủ nội thất cao cấp và trang thiết bị gắn liền căn hộ (Điều hòa Inverter, Tủ lạnh, Bếp từ, Khóa vân tay thông minh Smart Lock) theo đúng Biên bản bàn giao hiện trạng đã ký nhận.
                  </p>
                </div>

                {/* Clause 2 */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    ĐIỀU 2: THỜI HẠN THUÊ VÀ BÀN GIAO CĂN HỘ
                  </h4>
                  <p>
                    2.1. Thời hạn thuê căn hộ là <strong className="text-slate-900 font-bold">{activeContract?.paymentCycleMonths ? `${activeContract.paymentCycleMonths * 12} tháng` : '12 tháng'}</strong>, bắt đầu từ ngày <strong className="text-slate-900">{formatDate(activeContract?.startDate || '2026-01-01')}</strong> đến hết ngày <strong className="text-slate-900">{formatDate(activeContract?.endDate || '2027-07-27')}</strong>.
                  </p>
                  <p>
                    2.2. Khi hết hạn hợp đồng, nếu Bên B có nguyện vọng tiếp tục thuê và luôn thực hiện nghiêm túc các nghĩa vụ, Bên B sẽ được ưu tiên gia hạn hợp đồng thuê theo biểu giá và điều kiện mới thỏa thuận.
                  </p>
                </div>

                {/* Clause 3 */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    ĐIỀU 3: GIÁ THUÊ, TIỀN ĐẶT CỌC VÀ PHƯƠNG THỨC THANH TOÁN
                  </h4>
                  <p>
                    3.1. Giá thuê căn hộ: <strong className="text-brand-700 text-sm font-black">{formatCurrency(activeContract?.rentalPrice || 14000000)} / tháng</strong>.
                  </p>
                  <p className="italic text-slate-600 pl-4 border-l-2 border-brand-500">
                    Bằng chữ: <strong>{numberToVietnameseWords(activeContract?.rentalPrice || 14000000)}</strong>
                  </p>
                  <p>
                    3.2. Tiền đặt cọc bảo đảm thực hiện hợp đồng: <strong className="text-emerald-700 text-sm font-black">{formatCurrency(activeContract?.depositAmount || 28000000)}</strong>.
                  </p>
                  <p className="italic text-slate-600 pl-4 border-l-2 border-emerald-500">
                    Bằng chữ: <strong>{numberToVietnameseWords(activeContract?.depositAmount || 28000000)}</strong>
                  </p>
                  <p>
                    3.3. <strong className="text-slate-900 font-semibold">Cam kết hoàn trả tiền đặt cọc:</strong> Bên A cam kết hoàn trả 100% số tiền đặt cọc trên cho Bên B trong vòng 48 giờ làm việc kể từ thời điểm hai bên hoàn tất việc nghiệm thu bàn giao lại căn hộ mà không có hư hỏng kết cấu hoặc nợ cước dịch vụ chưa thanh toán.
                  </p>
                  <p>
                    3.4. Thời gian thanh toán: Bên B thanh toán định kỳ từ ngày 01 đến ngày 05 hàng tháng qua hệ thống chuyển khoản VietQR tự động hoặc thanh toán trực tiếp tại quầy Ban Quản Lý.
                  </p>
                </div>

                {/* Clause 4 */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    ĐIỀU 4: TRÁCH NHIỆM VÀ NGHĨA VỤ CỦA CÁC BÊN
                  </h4>
                  <p>
                    4.1. <strong className="text-slate-900 font-semibold">Bên A có trách nhiệm:</strong> Bàn giao căn hộ đúng thời gian; bảo đảm quyền sử dụng trọn vẹn của Bên B; duy trì hệ thống an ninh 24/7, phòng cháy chữa cháy, thang máy và hỗ trợ kỹ thuật sửa chữa kịp thời các sự cố phát sinh.
                  </p>
                  <p>
                    4.2. <strong className="text-slate-900 font-semibold">Bên B có trách nhiệm:</strong> Sử dụng căn hộ đúng mục đích để ở; thanh toán tiền thuê và cước điện nước đúng hạn; tuân thủ nội quy chung cư; đăng ký tạm trú đầy đủ; thông báo trước tối thiểu 30 ngày nếu có nhu cầu chấm dứt hoặc gia hạn hợp đồng.
                  </p>
                </div>

                {/* Clause 5 */}
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 uppercase text-xs">
                    ĐIỀU 5: HIỆU LỰC HỢP ĐỒNG & CHỨNG TỰ ĐIỆN TỬ
                  </h4>
                  <p>
                    5.1. Hợp đồng này được lập dưới dạng chứng thư điện tử có giá trị pháp lý tương đương văn bản giấy theo Luật Giao dịch điện tử 2023 và Nghị định 123/2020/NĐ-CP của Chính phủ.
                  </p>
                  <p>
                    5.2. Hai bên đã đọc kỹ, hiểu rõ toàn bộ nội dung và đồng ý ký số xác thực để cùng thực hiện.
                  </p>
                </div>
              </div>

              {/* Signature & Digital Stamp Block */}
              <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                {/* Tenant Signature */}
                <div className="flex flex-col justify-between h-44">
                  <div>
                    <p className="font-bold text-slate-900 uppercase tracking-wider">ĐẠI DIỆN BÊN B (BÊN THUÊ)</p>
                    <p className="text-[11px] text-slate-500 italic">(Ký số điện tử định danh VNeID)</p>
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ĐÃ KÝ SỐ VNeID MỨC 2</span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm pt-1">{currentTenant.fullName}</div>
                    <div className="text-[10px] text-slate-500">Thời gian ký: {formatDate(activeContract?.startDate || '2026-01-01')}</div>
                  </div>
                </div>

                {/* Landlord Seal & Signature */}
                <div className="flex flex-col justify-between h-44 relative">
                  <div>
                    <p className="font-bold text-slate-900 uppercase tracking-wider">ĐẠI DIỆN BÊN A (CHO THUÊ)</p>
                    <p className="text-[11px] text-slate-500 italic">(Ký số & Đóng dấu điện tử)</p>
                  </div>

                  {/* Red Seal Stamp */}
                  <div className="absolute inset-x-0 bottom-6 flex flex-col items-center justify-center pointer-events-none select-none">
                    <div className="w-28 h-28 border-2 border-red-600 rounded-full flex flex-col items-center justify-center text-red-600 p-1 rotate-[-3deg] opacity-90 shadow-xs bg-red-50/20">
                      <div className="w-24 h-24 border border-red-500 rounded-full flex flex-col items-center justify-center text-center p-1">
                        <span className="text-[7.5px] font-extrabold uppercase leading-tight tracking-tighter">
                          CÔNG TY TNHH QUẢN LÝ
                        </span>
                        <span className="text-[7.5px] font-extrabold uppercase leading-tight tracking-tighter">
                          TÒA NHÀ DWELL
                        </span>
                        <div className="my-0.5 text-red-600 flex items-center gap-0.5 text-[8px]">
                          ★ <span className="font-black text-[9px] tracking-wider">ĐÃ KÝ SỐ</span> ★
                        </div>
                        <span className="text-[7px] font-semibold">TP. HỒ CHÍ MINH</span>
                        <span className="text-[6.5px] font-mono text-red-500">
                          {activeContract?.startDate || '2026-01-01'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5 z-10">
                    <div className="font-bold text-slate-900 text-sm">Hoàng Khánh Ly</div>
                    <div className="text-[10px] text-slate-500">Đại diện BQL Tòa nhà Dwell Living</div>
                    <div className="text-[10px] text-red-600 font-semibold">Chứng thư số điện tử hợp lệ</div>
                  </div>
                </div>
              </div>

              {/* Bottom Verification Banner */}
              <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center text-slate-700 shrink-0">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Tra cứu hợp đồng điện tử gốc</div>
                    <div>Mã hợp đồng: <span className="font-mono font-bold text-brand-700">{activeContract?.contractCode || 'HD-2026-P101'}</span></div>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  Lưu trữ trên Hệ thống Dwell Cloud theo tiêu chuẩn an toàn bảo mật dữ liệu quốc gia.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: BILLING ================= */}
        {activeTab === 'billing' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Hóa Đơn Căn Hộ & Dịch Vụ Tháng {activeBill?.billingMonth || 9}/{activeBill?.billingYear || 2026}
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Mã phiếu thu: #PT-{activeBill?.id || '001'} • Hạn thanh toán: {formatDate(activeBill?.dueDate || '2026-09-10')}
                    </div>
                  </div>
                </div>

                {activeBill?.status === 'PAID' ? (
                  <Badge status="PAID" label="ĐÃ THANH TOÁN" />
                ) : (
                  <Badge status="UNPAID" label={`CHƯA THANH TOÁN (Hạn ${formatDate(activeBill?.dueDate || '2026-09-10')})`} />
                )}
              </div>

              {/* Split breakdown + VietQR */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Cost breakdown items (7 cols) */}
                <div className="lg:col-span-7 space-y-2.5 text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Bảng Phân Bổ Chi Phí Tháng {activeBill?.billingMonth || 9}
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <div>
                      <strong className="text-slate-900 text-xs">1. Tiền thuê căn hộ {activeApartment?.roomNumber || 'P101'}</strong>
                    </div>
                    <span className="font-extrabold text-slate-900 text-xs">{formatCurrency(activeBill?.roomAmount || activeContract?.rentalPrice || 14000000)}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <div>
                      <strong className="text-slate-900 text-xs">2. Tiền Điện Sinh Hoạt</strong>
                      <div className="text-[10px] text-slate-400">Đơn giá 3.500 đ/kWh</div>
                    </div>
                    <span className="font-extrabold text-slate-900 text-xs">{formatCurrency(activeBill?.electricityCost || 850000)}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <div>
                      <strong className="text-slate-900 text-xs">3. Tiền Nước Sạch</strong>
                      <div className="text-[10px] text-slate-400">Đơn giá 15.000 đ/m³</div>
                    </div>
                    <span className="font-extrabold text-slate-900 text-xs">{formatCurrency(activeBill?.waterCost || 240000)}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <div>
                      <strong className="text-slate-900 text-xs">4. Phí Quản Lý Dịch Vụ & Rác Thải</strong>
                    </div>
                    <span className="font-extrabold text-slate-900 text-xs">{formatCurrency(activeBill?.serviceAmount || 635000)}</span>
                  </div>

                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <div>
                      <strong className="text-slate-900 text-xs">5. Internet Wi-Fi Căn Hộ</strong>
                    </div>
                    <span className="font-bold text-emerald-700 text-xs">0 ₫ (Tài trợ trọn gói)</span>
                  </div>

                  {/* Total amount */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        TỔNG CỘNG CẦN THANH TOÁN
                      </span>
                      <span className="text-[11px] text-slate-400">Phiếu thu: PT-{activeBill?.id || '001'}</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {formatCurrency(activeBill?.remainingDebt || activeBill?.totalAmount || 21100000)}
                    </div>
                  </div>
                </div>

                {/* Dynamic VietQR Snapshot (5 cols) */}
                <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <span>Thanh Toán Chuyển Khoản VietQR</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 max-w-[180px]">
                    <img src={qrUrl} alt="Mã VietQR" className="w-full h-auto rounded-lg" />
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div>Ngân hàng: <strong className="text-slate-900">MBBank</strong></div>
                    <div>Số tài khoản: <strong className="text-slate-900 font-mono font-bold">{DEFAULT_BUILDING_BANK_ACCOUNT.accountNo}</strong></div>
                    <div>Chủ tài khoản: <strong className="text-slate-900">{DEFAULT_BUILDING_BANK_ACCOUNT.accountName}</strong></div>
                    <div>Cú pháp: <span className="font-mono text-brand-700 font-bold">{(activeContract?.contractCode || 'HD2026P101').replace(/-/g, '')} T{activeBill?.billingMonth || 9}</span></div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<QrCode className="w-3.5 h-3.5" />}
                    onClick={() => setIsVietQROpen(true)}
                    className="w-full"
                  >
                    Xem Mã QR Phóng To
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => setIsReceiptOpen(true)}
                >
                  In Biên Lai Điện Tử
                </Button>

                <Button
                  variant="success"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  isLoading={isPaying}
                  disabled={activeBill?.status === 'PAID'}
                  onClick={handleDirectTransferConfirm}
                >
                  {activeBill?.status === 'PAID' ? 'Đã Thanh Toán Thành Công' : 'Xác Nhận Đã Chuyển Khoản'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: MAINTENANCE ================= */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Báo Hỏng & Sửa Chữa Thiết Bị
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Đội ngũ kỹ thuật tòa nhà trực hỗ trợ 24/7 • SLA xử lý 15-30 phút
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-semibold self-start sm:self-auto">
                  SLA 15-30 PHÚT
                </span>
              </div>

              {/* Active Ticket Tracking */}
              {activeTicket && (activeTicket.status === 'IN_PROGRESS' || activeTicket.status === 'PENDING') && (
                <div className={`border rounded-2xl p-5 space-y-3 ${
                  activeTicket.status === 'IN_PROGRESS'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-sky-50/70 border-sky-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-white rounded-lg text-xs font-bold ${
                        activeTicket.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-sky-600'
                      }`}>
                        {activeTicket.status === 'IN_PROGRESS' ? 'ĐANG XỬ LÝ' : 'CHỜ TIẾP NHẬN'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        Phiếu #{activeTicket.ticketCode}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {activeTicket.status === 'IN_PROGRESS' ? 'Dự kiến xong: Hôm nay' : 'SLA: 15-30 phút'}
                    </span>
                  </div>

                  <div className="text-sm text-slate-800 font-semibold flex items-center gap-2">
                    <Wrench className={`w-4 h-4 shrink-0 ${activeTicket.status === 'IN_PROGRESS' ? 'text-amber-600' : 'text-sky-600'}`} />
                    <span>Hiện trạng: {activeTicket.issueDescription}</span>
                  </div>

                  {activeTicket.status === 'IN_PROGRESS' ? (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          KT
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{activeTicket.technicianName || 'Kỹ thuật viên tòa nhà'}</div>
                          <div className="text-xs text-slate-500">Bộ phận Cơ - Điện • ĐT: {activeTicket.technicianPhone || '0912 345 678'}</div>
                        </div>
                      </div>

                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => setIsInspectModalOpen(true)}
                        className="self-start sm:self-auto"
                      >
                        Nghiệm Thu & Đóng Phiếu
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white/80 p-3 rounded-xl border border-sky-200 text-xs text-sky-900 flex items-center justify-between">
                      <span>Phiếu báo hỏng đã được ghi nhận. Bộ phận kỹ thuật tòa nhà sẽ liên hệ qua SĐT <strong className="font-semibold">{activeTicket.phone || currentTenant.phone}</strong> trong vòng 15-30 phút.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Form Create Ticket */}
              <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
                <div className="text-xs font-bold text-slate-800">
                  Tạo Yêu Cầu Sửa Chữa Mới
                </div>

                {/* Category picker */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                  {[
                    { id: 'PLUMBING', label: 'Hệ thống Nước' },
                    { id: 'ELECTRICAL', label: 'Hệ thống Điện' },
                    { id: 'APPLIANCE', label: 'Đồ Gia dụng' },
                    { id: 'OTHER', label: 'Sự cố Khác' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewCategory(cat.id as any)}
                      className={`py-2.5 rounded-xl border font-semibold transition-all text-xs ${
                        newCategory === cat.id
                          ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Mô tả sự cố (VD: Đèn phòng tắm không sáng, vòi nước bồn rửa bị rỉ...)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => toast.info('Chụp ảnh', 'Đã mở camera để đính kèm ảnh hiện trường')}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600"
                    title="Chụp ảnh hiện trường"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        checked={newPriority === 'MEDIUM'}
                        onChange={() => setNewPriority('MEDIUM')}
                      />
                      <span>Bình thường (24h)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-rose-600 font-bold">
                      <input
                        type="radio"
                        name="priority"
                        checked={newPriority === 'URGENT'}
                        onChange={() => setNewPriority('URGENT')}
                      />
                      <span>Khẩn cấp (&lt;30 phút)</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isReporting}
                    leftIcon={<Wrench className="w-4 h-4" />}
                  >
                    Gửi Yêu Cầu Sửa Chữa
                  </Button>
                </div>
              </form>

              {/* Ticket History */}
              {myTickets.length > 0 && (
                <div className="pt-5 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Lịch Sử Phiếu Bảo Trì & Sửa Chữa ({myTickets.length})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Căn hộ {activeApartment?.roomNumber || 'P101'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {myTickets.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{t.ticketCode}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-800'
                                : t.status === 'CANCELLED'
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-sky-100 text-sky-800'
                            }`}>
                              {t.status === 'COMPLETED' ? 'Đã hoàn thành' : t.status === 'IN_PROGRESS' ? 'Đang xử lý' : t.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ tiếp nhận'}
                            </span>
                            {t.priority === 'URGENT' && (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold">
                                Khẩn cấp
                              </span>
                            )}
                          </div>
                          <div className="text-slate-700 font-medium">{t.issueDescription}</div>
                          <div className="text-[11px] text-slate-400">
                            Ngày gửi: {formatDate(t.createdAt)} {t.repairCost > 0 ? `• Chi phí: ${formatCurrency(t.repairCost)}` : ''}
                          </div>
                        </div>

                        {t.status === 'IN_PROGRESS' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => setIsInspectModalOpen(true)}
                            className="self-start sm:self-auto shrink-0 text-xs"
                          >
                            Nghiệm thu
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic VietQR Modal */}
      {activeBill && (
        <VietQRModal
          isOpen={isVietQROpen}
          onClose={() => setIsVietQROpen(false)}
          receivableId={activeBill.id}
          amount={activeBill.remainingDebt}
          roomNumber={activeApartment?.roomNumber || 'P101'}
          tenantName={currentTenant.fullName}
          billMonth={activeBill.billingMonth}
          billYear={activeBill.billingYear}
        />
      )}

      {/* Modal Renew Contract */}
      <Modal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        title="Gửi Yêu Cầu Tái Ký & Gia Hạn Hợp Đồng Thuê"
        subtitle="Ban Quản Lý sẽ liên hệ để xác nhận và tiến hành thủ tục gia hạn"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsRenewModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isRenewing}
              onClick={async () => {
                try {
                  await renewContract({
                    contractId: activeContract.id,
                    newEndDate: '2027-12-31',
                  }).unwrap();
                  toast.success('Thành công', 'Đã gửi yêu cầu gia hạn hợp đồng tới Ban Quản Lý!');
                  setIsRenewModalOpen(false);
                } catch {
                  toast.error('Lỗi', 'Không thể gửi yêu cầu');
                }
              }}
            >
              Xác Nhận Đăng Ký Gia Hạn
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-800 leading-relaxed">
            Hợp đồng hiện tại: <strong>{activeContract?.contractCode || 'HD-2026-P101'}</strong> (Hạn chót: {formatDate(activeContract?.endDate || '2026-12-31')}). Khi xác nhận, Ban Quản Lý sẽ lập dự thảo phụ lục hợp đồng gia hạn thêm 12 tháng với giá thuê giữ nguyên <strong>{formatCurrency(activeContract?.rentalPrice || 14000000)}/tháng</strong>.
          </div>
        </div>
      </Modal>

      {/* Modal Add Roommate */}
      <Modal
        isOpen={isAddRoommateOpen}
        onClose={() => setIsAddRoommateOpen(false)}
        title="Khai Báo Thành Viên Ở Cùng & Tạm Trú"
        subtitle="Thông tin sẽ được đồng bộ lên hồ sơ lưu trú căn hộ"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddRoommateOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isAddingRm}
              onClick={handleAddRoommate}
            >
              Lưu Thông Tin Lưu Trú
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddRoommate} className="space-y-4">
          <Input
            label="Họ và tên người ở cùng"
            required
            placeholder="VD: Trần Thị Mai"
            value={rmName}
            onChange={(e) => setRmName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Số CCCD 12 chữ số"
              required
              placeholder="001201008888"
              value={rmCitizenId}
              onChange={(e) => setRmCitizenId(e.target.value)}
            />
            <Input
              label="Số điện thoại"
              placeholder="0913.***.***"
              value={rmPhone}
              onChange={(e) => setRmPhone(e.target.value)}
            />
          </div>

          <Input
            label="Mối quan hệ với chủ hộ"
            placeholder="VD: Vợ / Chồng / Con / Bạn bè"
            value={rmRelation}
            onChange={(e) => setRmRelation(e.target.value)}
          />
        </form>
      </Modal>

      {/* Modal Inspect & 5-Star Rating */}
      <Modal
        isOpen={isInspectModalOpen}
        onClose={() => setIsInspectModalOpen(false)}
        title="Nghiệm Thu Sửa Chữa & Đánh Giá Dịch Vụ"
        subtitle={`Phiếu #${activeTicket?.ticketCode || 'BT-2024-042'} • Kỹ thuật viên: ${activeTicket?.technicianName || 'Lê Văn Thắng'}`}
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsInspectModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="success"
              size="sm"
              isLoading={isInspecting}
              onClick={handleInspectTicket}
            >
              Xác Nhận Đã Hoàn Tất
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="text-center py-2">
            <div className="text-xs font-bold text-slate-700 mb-2">
              Bạn có hài lòng với chất lượng xử lý sự cố?
            </div>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-600 mt-1 inline-block">
              {rating === 5 ? 'Rất hài lòng (5/5 sao)' : `${rating}/5 sao`}
            </span>
          </div>

          <Input
            label="Nhận xét hoặc góp ý"
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
          />
        </div>
      </Modal>

      {/* Electronic Receipt Modal */}
      {isReceiptOpen && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          payment={
            payments.find(
              (p) => p.receivableId === activeBill?.id || (activeContract && p.contractId === activeContract.id)
            ) || {
              id: activeBill?.id || 1,
              receivableId: activeBill?.id || 1,
              contractId: activeContract?.id || 1,
              receiptNumber: `PT-2026-${String(activeBill?.id || 1).padStart(4, '0')}`,
              amount:
                activeBill?.paidAmount && activeBill.paidAmount > 0
                  ? activeBill.paidAmount
                  : activeBill?.totalAmount || 15725000,
              paymentMethod: 'BANK_TRANSFER',
              transactionCode: `MBB2026${activeBill?.id || 101}X${(activeContract?.contractCode || 'HD101').replace(/[^a-zA-Z0-9]/g, '')}`,
              paymentDate: activeBill?.createdAt ? formatDate(activeBill.createdAt) : '2026-10-02',
              note: `Thanh toán cước tiền phòng căn ${activeApartment?.roomNumber || 'P101'} và phí dịch vụ tháng ${activeBill?.billingMonth || 9}/${activeBill?.billingYear || 2026}`,
              handledBy: 1,
              handledByName: 'Hoàng Khánh Ly',
              payerName: currentTenant?.fullName || 'Nguyễn Văn An',
              roomNumber: activeApartment?.roomNumber || 'P101',
            }
          }
          receivable={activeBill}
          contract={activeContract}
          tenant={currentTenant as any}
          apartment={activeApartment}
        />
      )}

      {/* AI Contract Summarizer Modal */}
      {isAISummarizerOpen && activeContract && (
        <AISummarizerModal
          isOpen={isAISummarizerOpen}
          onClose={() => setIsAISummarizerOpen(false)}
          contract={activeContract}
        />
      )}
    </div>
  );
};
