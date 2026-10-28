import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileSignature,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Ban,
  Download,
  Search,
  Eye,
  FileText,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Users,
  UserPlus,
  CreditCard,
  QrCode,
  Lock,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { AISummarizerModal } from '../components/ai/AISummarizerModal';
import { Pagination } from '../components/common/Pagination';
import {
  useGetContractsQuery,
  useCreateContractMutation,
  useApproveAndActivateContractMutation,
  useRenewContractMutation,
  useTerminateAndSettleContractMutation,
  useReceiveDepositMutation,
  useGetDepositsQuery,
} from '../modules/contracts/services/contractApi';
import { useGetApartmentsQuery } from '../modules/buildings/services/buildingApi';
import {
  useGetTenantsQuery,
  useCreateTenantMutation,
} from '../modules/tenants/services/tenantApi';
import { IContract, ContractStatus } from '../types';
import { formatCurrency, formatDate, getDaysRemaining, isSamePersonName } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { parseApiError } from '../utils/errorHandler';

export const ContractsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAdmin, isStaff, isAccountant } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<ContractStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected contract for modals
  const [summarizerContract, setSummarizerContract] = useState<IContract | null>(null);
  const [renewContractData, setRenewContractData] = useState<IContract | null>(null);
  const [terminateContractData, setTerminateContractData] = useState<IContract | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form Validation Errors
  const [contractErrors, setContractErrors] = useState<Record<string, string>>({});
  const [renewErrors, setRenewErrors] = useState<Record<string, string>>({});
  const [terminateErrors, setTerminateErrors] = useState<Record<string, string>>({});

  // Tenant Selection Mode: Existing (picked from database) or New (first-time visitor)
  const [tenantMode, setTenantMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  // New Contract Form State
  const [aptId, setAptId] = useState<number>(1);
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [tenantCitizenId, setTenantCitizenId] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [rentalPrice, setRentalPrice] = useState<number>(8500000);
  const [depositAmount, setDepositAmount] = useState<number>(17000000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Renew Form State
  const [newEndDate, setNewEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newPrice, setNewPrice] = useState<number>(8500000);

  // Terminate & Settle Form State
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState('Nghiệm thu bàn giao phòng nguyên vẹn');

  const { data: allContracts = [], isLoading } = useGetContractsQuery(undefined, { pollingInterval: 3000 });
  const { data: apartments = [] } = useGetApartmentsQuery({}, { pollingInterval: 4000 });
  const { data: tenants = [] } = useGetTenantsQuery(undefined, { pollingInterval: 4000 });
  const { data: deposits = [] } = useGetDepositsQuery(undefined, { pollingInterval: 3000 });

  const [createContract, { isLoading: isCreating }] = useCreateContractMutation();
  const [createTenant] = useCreateTenantMutation();
  const [approveContract, { isLoading: isApproving }] = useApproveAndActivateContractMutation();
  const [receiveDeposit, { isLoading: isReceivingDeposit }] = useReceiveDepositMutation();
  const [renewContract, { isLoading: isRenewing }] = useRenewContractMutation();
  const [terminateContract, { isLoading: isTerminating }] = useTerminateAndSettleContractMutation();

  // Deposit Form State
  const [depositContract, setDepositContract] = useState<IContract | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState<number>(0);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [autoActivateAfterDeposit, setAutoActivateAfterDeposit] = useState<boolean>(true);

  const toast = useToast();

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  // Thống kê động 100% từ CSDL thật
  const activeContractsCount = allContracts.filter((c) => c.status === 'ACTIVE').length;
  const draftContractsCount = allContracts.filter((c) => c.status === 'DRAFT').length;
  const renewedContractsCount = allContracts.filter((c) => c.status === 'RENEWED').length;
  const terminatedContractsCount = allContracts.filter((c) => c.status === 'TERMINATED').length;
  const expiringCount = allContracts.filter(
    (c) => c.status === 'ACTIVE' && getDaysRemaining(c.endDate) <= 30 && getDaysRemaining(c.endDate) >= 0
  ).length;

  const totalOccupiedApts = apartments.filter((a) => a.status === 'OCCUPIED').length;
  const occupancyRate = apartments.length > 0
    ? ((totalOccupiedApts / apartments.length) * 100).toFixed(1)
    : '0';

  const totalHeldDeposit = allContracts
    .filter((c) => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + (c.depositAmount || 0), 0);

  const statusTabs: { id: ContractStatus | undefined; label: string; count: number }[] = [
    { id: undefined, label: 'Tất cả', count: allContracts.length },
    { id: 'ACTIVE', label: 'Đang hiệu lực', count: activeContractsCount },
    { id: 'DRAFT', label: 'Chờ kích hoạt', count: draftContractsCount },
    { id: 'RENEWED', label: 'Đã gia hạn', count: renewedContractsCount },
    { id: 'TERMINATED', label: 'Đã thanh lý', count: terminatedContractsCount },
  ];

  // Sắp xếp hợp đồng mới nhất lên đầu tiên (ID giảm dần)
  const sortedContracts = useMemo(() => {
    return [...allContracts].sort((a, b) => b.id - a.id);
  }, [allContracts]);

  const contractsByStatus = selectedStatus
    ? sortedContracts.filter((c) => c.status === selectedStatus)
    : sortedContracts;

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setIsCreateModalOpen(true);
      const paramAptId = searchParams.get('aptId') || searchParams.get('apartmentId');
      if (paramAptId) {
        setAptId(Number(paramAptId));
        const found = apartments.find((a) => a.id === Number(paramAptId));
        if (found) {
          setRentalPrice(found.price);
          setDepositAmount(found.depositDefault || found.price * 2);
        }
      }

      const paramTenantId = searchParams.get('tenantId');
      if (paramTenantId) {
        setSelectedTenantId(Number(paramTenantId));
        setTenantMode('EXISTING');
      }

      const custName = searchParams.get('customerName');
      const custPhone = searchParams.get('customerPhone');
      const custEmail = searchParams.get('customerEmail');
      if (custName || custPhone) {
        setTenantMode('NEW');
        setSelectedTenantId(null);
        if (custName) setTenantName(decodeURIComponent(custName));
        if (custPhone) setTenantPhone(custPhone);
        if (custEmail) setTenantEmail(decodeURIComponent(custEmail));
      }
    }
  }, [searchParams, apartments]);

  const filteredContracts = contractsByStatus.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchedTenant = tenants.find((t) => t.id === c.tenantId);
      const matchedApt = apartments.find((a) => a.id === c.apartmentId);
      const tName = (c.tenantName || matchedTenant?.fullName || '').toLowerCase();
      const rNum = (c.roomNumber || matchedApt?.roomNumber || '').toLowerCase();
      const cCode = (c.contractCode || '').toLowerCase();
      return cCode.includes(q) || tName.includes(q) || rNum.includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredContracts.length / pageSize) || 1;
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleBlurContractField = (field: string, value: string) => {
    const val = value.trim();
    if (!val) return;

    if (field === 'tenantCitizenId') {
      if (!/^\d{9,12}$/.test(val)) {
        setContractErrors((prev) => ({
          ...prev,
          tenantCitizenId: 'Số CMND/CCCD phải gồm 9 đến 12 chữ số hợp lệ',
        }));
      } else {
        const matched = tenants.find((t) => t.citizenId === val);
        if (matched && tenantName.trim() && !isSamePersonName(matched.fullName, tenantName.trim())) {
          setContractErrors((prev) => ({
            ...prev,
            tenantCitizenId: 'Số cccd đã tồn tại ! ',
          }));
        }
      }
    } else if (field === 'tenantPhone') {
      if (!/^0\d{9,10}$/.test(val)) {
        setContractErrors((prev) => ({
          ...prev,
          tenantPhone: 'Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có 10-11 số)',
        }));
      }
    } else if (field === 'tenantEmail') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setContractErrors((prev) => ({
          ...prev,
          tenantEmail: 'Định dạng email không đúng (VD: customer@email.com)',
        }));
      }
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    let finalTenantId = selectedTenantId;

    if (tenantMode === 'EXISTING') {
      if (!selectedTenantId) {
        errors.selectedTenantId = 'Vui lòng chọn một khách thuê có sẵn từ danh sách';
      }
    } else {
      if (!tenantName.trim()) {
        errors.tenantName = 'Vui lòng nhập họ tên khách thuê đại diện';
      }
      if (!tenantCitizenId.trim()) {
        errors.tenantCitizenId = 'Vui lòng nhập số CMND/CCCD';
      } else if (!/^\d{9,12}$/.test(tenantCitizenId.trim())) {
        errors.tenantCitizenId = 'Số CMND/CCCD phải gồm 9 đến 12 chữ số hợp lệ';
      } else {
        // Kiểm tra trùng CCCD nhưng khác họ tên
        const matchedCccd = tenants.find((t) => t.citizenId === tenantCitizenId.trim());
        if (matchedCccd && !isSamePersonName(matchedCccd.fullName, tenantName.trim())) {
          errors.tenantCitizenId = 'Số cccd đã tồn tại ! ';
        }
      }
      if (!tenantPhone.trim()) {
        errors.tenantPhone = 'Vui lòng nhập số điện thoại';
      } else if (!/^0\d{9,10}$/.test(tenantPhone.trim())) {
        errors.tenantPhone = 'Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10-11 số)';
      }
      if (tenantEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail.trim())) {
        errors.tenantEmail = 'Định dạng email không đúng (VD: customer@email.com)';
      }
    }

    if (Number(rentalPrice) <= 0) {
      errors.rentalPrice = 'Giá thuê phòng phải lớn hơn 0 VNĐ';
    }
    if (Number(depositAmount) < 0) {
      errors.depositAmount = 'Tiền cọc không được là số âm';
    }

    if (!startDate) {
      errors.startDate = 'Vui lòng chọn ngày bắt đầu hợp đồng';
    }
    if (!endDate) {
      errors.endDate = 'Vui lòng chọn ngày kết thúc hợp đồng';
    } else if (startDate && new Date(endDate) <= new Date(startDate)) {
      errors.endDate = 'Ngày kết thúc hợp đồng phải sau ngày bắt đầu';
    }

    const selectedApt = apartments.find((a) => a.id === Number(aptId));
    if (!selectedApt) {
      errors.aptId = 'Vui lòng chọn căn hộ hợp lệ';
    } else if (selectedApt.status !== 'AVAILABLE' && selectedApt.status !== 'RESERVED') {
      errors.aptId = `Căn hộ ${selectedApt.roomNumber} đang ở trạng thái ${selectedApt.status}, không thể lập hợp đồng mới!`;
    }

    if (Object.keys(errors).length > 0) {
      setContractErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    setContractErrors({});
    try {
      if (tenantMode === 'NEW') {
        const matchedCccd = tenants.find(
          (t) => t.citizenId === tenantCitizenId.trim()
        );

        if (matchedCccd) {
          if (!isSamePersonName(matchedCccd.fullName, tenantName.trim())) {
            toast.error(
              'Xung đột định danh CCCD',
              'Số cccd đã tồn tại ! '
            );
            setContractErrors({
              tenantCitizenId: 'Số cccd đã tồn tại ! ',
            });
            return;
          }
          finalTenantId = matchedCccd.id;
        } else {
          try {
            const createdT = await createTenant({
              fullName: tenantName.trim(),
              citizenId: tenantCitizenId.trim(),
              phone: tenantPhone.trim(),
              email: tenantEmail.trim() || undefined,
            }).unwrap();
            finalTenantId = createdT.id;
          } catch (tenantErr: any) {
            const parsed = parseApiError(tenantErr, 'Không thể tạo hồ sơ khách thuê mới');
            setContractErrors({
              general: parsed.message,
              ...(parsed.fieldErrors.citizen_id && { tenantCitizenId: parsed.fieldErrors.citizen_id }),
              ...(parsed.fieldErrors.full_name && { tenantName: parsed.fieldErrors.full_name }),
            });
            toast.error('Lỗi định danh khách thuê', parsed.message);
            return;
          }
        }
      }

      if (!finalTenantId) {
        throw new Error('Chưa xác định được ID khách thuê');
      }

      const targetApt = apartments.find((a) => a.id === Number(aptId));
      const fixedRentalPrice = targetApt ? targetApt.price : Number(rentalPrice);

      await createContract({
        apartmentId: Number(aptId),
        tenantId: finalTenantId,
        rentalPrice: Number(fixedRentalPrice),
        depositAmount: Number(depositAmount),
        startDate,
        endDate,
      }).unwrap();

      const customerLabel = tenantMode === 'EXISTING' ? selectedTenant?.fullName : tenantName.trim();
      toast.success(
        'Lập hợp đồng thành công',
        `Đã tạo HĐ dự thảo cho khách ${customerLabel} tại phòng ${selectedApt?.roomNumber} và phân tích AI 5 điều khoản!`
      );
      handleCloseCreateModal();

      // Chuyển hướng về bảng Hợp đồng & Tiền cọc và đưa về trang 1 để người dùng thấy ngay hợp đồng vừa tạo
      navigate('/admin/contracts', { replace: true });
      setCurrentPage(1);
      setSelectedStatus(undefined);
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể tạo hợp đồng');
      setContractErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Lập hợp đồng thất bại', parsed.message);
    }
  };

  const handleOpenCreateModal = () => {
    setContractErrors({});
    setSelectedTenantId(null); // Tuyệt đối không tự động chọn khách thuê
    setTenantMode('EXISTING');
    const availApt = apartments.find((a) => a.status === 'AVAILABLE' || a.status === 'RESERVED');
    if (availApt) {
      setAptId(availApt.id);
      setRentalPrice(availApt.price);
      setDepositAmount(availApt.depositDefault || availApt.price * 2);
    }
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setContractErrors({});
    setSelectedTenantId(null);
    setTenantName('');
    setTenantCitizenId('');
    setTenantPhone('');
    setTenantEmail('');
    if (searchParams.get('action') === 'create') {
      navigate('/admin/contracts', { replace: true });
    }
  };

  const handleOpenDepositModal = (c: IContract) => {
    setDepositContract(c);
    setDepositAmountInput(c.depositAmount);
    setDepositPaymentMethod('BANK_TRANSFER');
    setAutoActivateAfterDeposit(true);
  };

  const handleConfirmReceiveDeposit = async () => {
    if (!depositContract) return;
    try {
      await receiveDeposit({
        contractId: depositContract.id,
        amount: Number(depositAmountInput),
      }).unwrap();

      if (autoActivateAfterDeposit) {
        await approveContract({ contractId: depositContract.id }).unwrap();
        toast.success(
          'Thu cọc & Kích hoạt thành công',
          `Đã ghi nhận thu cọc ${formatCurrency(depositAmountInput)} (HELD) và kích hoạt Hợp đồng ${depositContract.contractCode} thành công!`
        );
      } else {
        toast.success(
          'Thu tiền cọc thành công',
          `Đã ghi nhận thu cọc ${formatCurrency(depositAmountInput)} (Trạng thái HELD) cho Hợp đồng ${depositContract.contractCode}.`
        );
      }
      setDepositContract(null);
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể thu tiền cọc');
      toast.error('Lỗi thu tiền cọc', parsed.message);
    }
  };

  const handleApprove = async (contract: IContract) => {
    const matchedDeposit = deposits.find((d) => d.contractId === contract.id);
    if (!matchedDeposit || matchedDeposit.status !== 'HELD') {
      handleOpenDepositModal(contract);
      return;
    }

    try {
      await approveContract({ contractId: contract.id }).unwrap();
      toast.success(
        'Đã duyệt hợp đồng',
        `Kích hoạt HĐ ${contract.contractCode} thành công! Tiền cọc đã ghi nhận lưu ký (HELD) và phòng chuyển sang OCCUPIED.`
      );
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể phê duyệt hợp đồng');
      toast.error('Lỗi phê duyệt', parsed.message);
    }
  };

  const handleRenew = async () => {
    if (!renewContractData) return;
    const errors: Record<string, string> = {};

    if (!newEndDate) {
      errors.newEndDate = 'Vui lòng chọn ngày kết thúc mới';
    } else if (new Date(newEndDate) <= new Date(renewContractData.endDate)) {
      errors.newEndDate = `Ngày kết thúc mới phải sau ngày hết hạn hiện tại (${formatDate(renewContractData.endDate)})`;
    }
    if (Number(newPrice) <= 0) {
      errors.newPrice = 'Giá thuê mới phải lớn hơn 0 VNĐ';
    }

    if (Object.keys(errors).length > 0) {
      setRenewErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng kiểm tra lại thông tin gia hạn');
      return;
    }

    setRenewErrors({});
    try {
      await renewContract({
        contractId: renewContractData.id,
        newEndDate,
        newPrice: Number(newPrice),
      }).unwrap();
      toast.success('Gia hạn thành công', `Hợp đồng ${renewContractData.contractCode} đã được gia hạn đến ${formatDate(newEndDate)}!`);
      setRenewContractData(null);
      setRenewErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể gia hạn hợp đồng');
      setRenewErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Lỗi', parsed.message);
    }
  };

  const handleTerminate = async () => {
    if (!terminateContractData) return;
    const errors: Record<string, string> = {};

    if (Number(deductionAmount) < 0) {
      errors.deductionAmount = 'Số tiền khấu trừ không được nhỏ hơn 0 VNĐ';
    } else if (Number(deductionAmount) > terminateContractData.depositAmount) {
      errors.deductionAmount = `Tiền phạt/khấu trừ không được vượt quá số tiền cọc (${formatCurrency(terminateContractData.depositAmount)})`;
    }

    if (Object.keys(errors).length > 0) {
      setTerminateErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng kiểm tra lại số tiền quyết toán');
      return;
    }

    setTerminateErrors({});
    try {
      const res = await terminateContract({
        contractId: terminateContractData.id,
        deductionAmount: Number(deductionAmount),
        deductionReason,
      }).unwrap();
      toast.success(
        'Thanh lý hoàn tất',
        `Hợp đồng đã thanh lý. Số tiền cọc hoàn trả thực tế cho khách: ${formatCurrency(res.refundAmount)}!`
      );
      setTerminateContractData(null);
      setTerminateErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể thanh lý hợp đồng');
      setTerminateErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Lỗi', parsed.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Quản Lý Hợp Đồng Cho Thuê
            </h1>
            {isAccountant && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                Phân hệ Kế toán & Cọc
              </span>
            )}
            {isStaff && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
                Phân hệ Vận hành
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAccountant
              ? 'Kiểm soát tiền cọc lưu ký, quyết toán hoàn cọc thanh lý (SQ04) và duyệt kích hoạt thu cọc.'
              : 'Quản lý dự thảo, duyệt ký hợp đồng, gia hạn thời hạn thuê (SQ03) và bàn giao căn hộ.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAccountant ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/finance')}
            >
              Đến Sổ Quỹ & Công Nợ
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenCreateModal}
            >
              Tạo Hợp Đồng Mới
            </Button>
          )}
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">HĐ đang hiệu lực</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
            {activeContractsCount} <span className="text-xs font-normal text-slate-400">hợp đồng</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Tỷ lệ lấp đầy: {occupancyRate}%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Bản nháp chờ duyệt</div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 mt-1">
            {draftContractsCount} <span className="text-xs font-normal text-slate-400">bản nháp</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Chờ ký điện tử E-Sign</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Sắp hết hạn (≤ 30 ngày)</div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">
            {expiringCount} <span className="text-xs font-normal text-rose-500">cần gia hạn</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Kích hoạt thông báo SQ03</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">Tổng tiền cọc bảo lưu</div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {totalHeldDeposit >= 1_000_000
              ? `${(totalHeldDeposit / 1_000_000).toLocaleString('vi-VN')} Tr`
              : formatCurrency(totalHeldDeposit)}{' '}
            <span className="text-xs font-normal text-slate-400">VNĐ</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Ký quỹ lưu ký tài khoản HELD</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {statusTabs.map((st) => (
            <button
              key={st.label}
              onClick={() => {
                setSelectedStatus(st.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedStatus === st.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st.label} ({st.count})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm mã HĐ, tên khách, số phòng..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Contracts Table View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5">Mã Hợp Đồng</th>
                <th className="px-5 py-3.5">Căn Hộ</th>
                <th className="px-5 py-3.5">Khách Thuê Đại Diện</th>
                <th className="px-5 py-3.5">Thời Hạn Thuê</th>
                <th className="px-5 py-3.5">Giá Thuê & Tiền Cọc</th>
                <th className="px-5 py-3.5">Trạng Thái</th>
                <th className="px-5 py-3.5 text-right">Thao Tác & AI Studio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedContracts.map((c) => {
                const daysLeft = getDaysRemaining(c.endDate);
                const isExpiringSoon = c.status === 'ACTIVE' && daysLeft <= 30 && daysLeft >= 0;

                const matchedTenant = tenants.find((t) => t.id === c.tenantId);
                const matchedApt = apartments.find((a) => a.id === c.apartmentId);

                const tenantDisplayName =
                  c.tenantName && !c.tenantName.startsWith('Cư dân #')
                    ? c.tenantName
                    : matchedTenant?.fullName || `Khách thuê #${c.tenantId}`;

                const tenantDisplayPhone = c.tenantPhone || matchedTenant?.phone || 'Chưa cập nhật';
                const tenantDisplayCitizenId = c.tenantCitizenId || matchedTenant?.citizenId || 'Chưa cập nhật';
                const roomDisplayName = c.roomNumber || matchedApt?.roomNumber || `P${c.apartmentId}`;
                const buildingDisplayName =
                  c.buildingName && c.buildingName !== 'Sunshine Homes' && c.buildingName !== 'Sunshine Diamond Tower'
                    ? c.buildingName
                    : matchedApt?.buildingName || 'Dwell';

                const contractItem: IContract = {
                  ...c,
                  tenantName: tenantDisplayName,
                  tenantPhone: tenantDisplayPhone,
                  tenantCitizenId: tenantDisplayCitizenId,
                  roomNumber: roomDisplayName,
                  buildingName: buildingDisplayName,
                };

                const contractDeposit = deposits.find((d) => d.contractId === c.id);
                const isDepositHeld = contractDeposit?.status === 'HELD';

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-brand-700">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.contractCode}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                        Ký ngày: {formatDate(c.createdAt)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-extrabold text-slate-900 text-sm">{roomDisplayName}</div>
                      <div className="text-[11px] text-slate-500">{buildingDisplayName}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{tenantDisplayName}</div>
                      <div className="text-[11px] text-slate-500">{tenantDisplayPhone}</div>
                      <div className="text-[10px] text-slate-400">CCCD: {tenantDisplayCitizenId}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">
                        {formatDate(c.startDate)} → {formatDate(c.endDate)}
                      </div>
                      {isExpiringSoon && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Còn {daysLeft} ngày - Cần gia hạn</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-brand-700 text-xs">
                        {formatCurrency(c.rentalPrice)}/th
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Cọc: <strong className="text-slate-700">{formatCurrency(c.depositAmount)}</strong>
                      </div>
                      {c.status === 'DRAFT' && (
                        <div className="mt-1">
                          {isDepositHeld ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cọc: Đã thu (HELD)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <AlertCircle className="w-3 h-3 text-amber-600" /> Cọc: Chờ nộp
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <Badge status={c.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* AI Summarizer Trigger Button */}
                        <button
                          onClick={() => setSummarizerContract(contractItem)}
                          className="flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs"
                          title="Trích xuất 5 điều khoản pháp lý cốt lõi bằng AI"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI Tóm Tắt 5 ĐK</span>
                        </button>

                        {/* Approval for DRAFT */}
                        {c.status === 'DRAFT' && (isAdmin || isStaff) && (
                          <button
                            onClick={() => handleApprove(contractItem)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 ${
                              isDepositHeld
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                            title={
                              isDepositHeld
                                ? 'Kích hoạt hợp đồng ngay (Tiền cọc đã ghi nhận HELD)'
                                : 'Thu tiền cọc và duyệt kích hoạt hợp đồng'
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isDepositHeld ? 'Kích Hoạt HĐ' : 'Duyệt HĐ'}</span>
                          </button>
                        )}

                        {/* Renew SQ03 - Only for Staff and Admin */}
                        {c.status === 'ACTIVE' && (isAdmin || isStaff) && (
                          <button
                            onClick={() => {
                              setRenewContractData(contractItem);
                              setNewPrice(c.rentalPrice);
                            }}
                            className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            title="Gia hạn hợp đồng (SQ03)"
                          >
                            Gia Hạn (SQ03)
                          </button>
                        )}

                        {/* Terminate SQ04 - Only for Accountant and Admin */}
                        {c.status === 'ACTIVE' && (isAdmin || isAccountant) && (
                          <button
                            onClick={() => {
                              setTerminateContractData(contractItem);
                              setDeductionAmount(0);
                            }}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            title="Thanh lý hợp đồng & Quyết toán cọc (SQ04)"
                          >
                            Thanh Lý (SQ04)
                          </button>
                        )}

                        {/* Quick Finance link for Accountant */}
                        {isAccountant && c.status === 'ACTIVE' && (
                          <button
                            onClick={() => navigate(`/admin/finance?search=${encodeURIComponent(contractItem.roomNumber || '')}`)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                            title="Xem công nợ & các khoản thu của phòng này"
                          >
                            Xem Thu Phí
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
          totalItems={filteredContracts.length}
          pageSize={pageSize}
          itemLabel="hợp đồng"
          className="px-5 py-3 border-t border-slate-200"
        />
      </div>

      {/* AI Summarizer Modal (5 Core Terms) */}
      {summarizerContract && (
        <AISummarizerModal
          isOpen={!!summarizerContract}
          onClose={() => setSummarizerContract(null)}
          contract={summarizerContract}
        />
      )}

      {/* Modal Create Contract */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        size="lg"
        title="Lập Hợp Đồng Thuê Căn Hộ & Thu Cọc Giữ Chỗ"
        subtitle="Hệ thống tự động kiểm tra trùng lịch và kích hoạt AI trích xuất 5 điều khoản pháp lý"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCloseCreateModal}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isCreating}
              onClick={handleCreateContract}
            >
              Tạo Bản Thảo HĐ & Phân Tích AI
            </Button>
          </div>
        }
      >
        {contractErrors.general && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 font-medium">{contractErrors.general}</div>
          </div>
        )}

        <form onSubmit={handleCreateContract} className="space-y-4">
          {/* Tenant Mode Selector */}
          <div className="bg-slate-100/80 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setTenantMode('EXISTING');
                setSelectedTenantId(null);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                tenantMode === 'EXISTING'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Chọn Khách Thuê Có Sẵn ({tenants.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTenantMode('NEW')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                tenantMode === 'NEW'
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Thêm Khách Mới Trực Tiếp</span>
            </button>
          </div>

          {/* Mode 1: Chọn khách thuê đã có */}
          {tenantMode === 'EXISTING' ? (
            <div className="space-y-3">
              <div>
                <Select
                  label="Khách thuê đại diện (Hồ sơ cư dân đã lưu)"
                  required
                  value={selectedTenantId || ''}
                  onChange={(e) => {
                    const tid = Number(e.target.value);
                    setSelectedTenantId(tid);
                    if (contractErrors.selectedTenantId) {
                      setContractErrors({ ...contractErrors, selectedTenantId: '' });
                    }
                  }}
                  options={[
                    { label: '-- Chọn khách thuê từ danh sách --', value: '' },
                    ...tenants.map((t) => ({
                      label: `${t.fullName} • CCCD: ${t.citizenId} • SĐT: ${t.phone} ${t.currentRoomNumber ? `(Đang ở ${t.currentRoomNumber})` : ''}`,
                      value: t.id,
                    })),
                  ]}
                />
                {contractErrors.selectedTenantId && (
                  <p className="text-xs text-rose-500 font-medium mt-1">{contractErrors.selectedTenantId}</p>
                )}
              </div>

              {Boolean(selectedTenantId) && selectedTenant && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50/50 border border-sky-200/80 flex items-start justify-between gap-3 text-xs animate-in fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{selectedTenant.fullName}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> VNeID Đã Xác Thực
                      </span>
                    </div>
                    <div className="text-slate-600">
                      CCCD: <strong className="text-slate-800 font-mono">{selectedTenant.citizenId}</strong> • SĐT: <strong className="text-slate-800 font-mono">{selectedTenant.phone}</strong>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Email: {selectedTenant.email || 'Chưa cung cấp'} • Quê quán: {selectedTenant.hometown || 'Chưa cập nhật'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 bg-white/80 px-2.5 py-1.5 rounded-lg border border-sky-100">
                    <div className="text-[10px] font-semibold text-slate-500">Điểm Tín Nhiệm</div>
                    <div className="text-sm font-extrabold text-emerald-600">{selectedTenant.creditScore}/100</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Thêm khách mới trực tiếp */
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-brand-600" />
                <span>Thông tin khách thuê mới (Hệ thống sẽ tự động tạo hồ sơ khách thuê)</span>
              </div>

              <Input
                label="Họ và tên đầy đủ theo CCCD"
                required
                placeholder="VD: Nguyễn Văn An"
                value={tenantName}
                error={contractErrors.tenantName}
                onChange={(e) => {
                  setTenantName(e.target.value);
                  if (contractErrors.tenantName) setContractErrors({ ...contractErrors, tenantName: '' });
                }}
                onBlur={() => {
                  if (tenantCitizenId.trim() && tenantName.trim()) {
                    const matched = tenants.find((t) => t.citizenId === tenantCitizenId.trim());
                    if (matched && !isSamePersonName(matched.fullName, tenantName.trim())) {
                      setContractErrors((prev) => ({
                        ...prev,
                        tenantCitizenId: 'Số cccd đã tồn tại ! ',
                      }));
                    }
                  }
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Số CCCD (9 - 12 chữ số)"
                  required
                  placeholder="001201008899"
                  value={tenantCitizenId}
                  error={contractErrors.tenantCitizenId}
                  onChange={(e) => {
                    setTenantCitizenId(e.target.value);
                    if (contractErrors.tenantCitizenId) setContractErrors({ ...contractErrors, tenantCitizenId: '' });
                  }}
                  onBlur={() => handleBlurContractField('tenantCitizenId', tenantCitizenId)}
                />
                <Input
                  label="Số điện thoại di động"
                  required
                  placeholder="0912.***.***"
                  value={tenantPhone}
                  error={contractErrors.tenantPhone}
                  onChange={(e) => {
                    setTenantPhone(e.target.value);
                    if (contractErrors.tenantPhone) setContractErrors({ ...contractErrors, tenantPhone: '' });
                  }}
                  onBlur={() => handleBlurContractField('tenantPhone', tenantPhone)}
                />
                <Input
                  label="Email nhận thông báo"
                  type="email"
                  placeholder="customer@dwell.vn"
                  value={tenantEmail}
                  error={contractErrors.tenantEmail}
                  onChange={(e) => {
                    setTenantEmail(e.target.value);
                    if (contractErrors.tenantEmail) setContractErrors({ ...contractErrors, tenantEmail: '' });
                  }}
                  onBlur={() => handleBlurContractField('tenantEmail', tenantEmail)}
                />
              </div>
            </div>
          )}

          {/* Chọn Căn hộ */}
          <div>
            <Select
              label="Chọn Căn hộ lập Hợp đồng"
              required
              value={aptId}
              onChange={(e) => {
                const newId = Number(e.target.value);
                setAptId(newId);
                const apt = apartments.find((a) => a.id === newId);
                if (apt) {
                  setRentalPrice(apt.price);
                  setDepositAmount(apt.depositDefault || apt.price * 2);
                }
                if (contractErrors.aptId) setContractErrors({ ...contractErrors, aptId: '' });
              }}
              options={[
                { label: '-- Chọn căn hộ còn trống --', value: '' },
                ...apartments
                  .filter((a) => a.status === 'AVAILABLE' || a.status === 'RESERVED' || a.id === Number(aptId))
                  .map((a) => ({
                    label: `${a.roomNumber} - ${a.buildingName} (${a.status === 'AVAILABLE' ? 'Phòng Trống' : a.status === 'RESERVED' ? 'Đang Giữ Chỗ' : a.status}) - ${formatCurrency(a.price)}/th`,
                    value: a.id,
                  })),
              ]}
            />
            {contractErrors.aptId && (
              <p className="text-xs text-rose-500 font-medium mt-1">{contractErrors.aptId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Giá thuê cố định theo phòng (VNĐ/tháng)"
              type="text"
              required
              disabled
              readOnly
              leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
              value={formatCurrency(rentalPrice)}
              helperText="Cố định theo giá căn hộ, không được phép chỉnh sửa"
              className="bg-slate-100/90 font-bold text-slate-700 cursor-not-allowed select-none"
            />
            <Input
              label="Số tiền cọc thỏa thuận (VNĐ)"
              type="number"
              required
              value={depositAmount}
              error={contractErrors.depositAmount}
              onChange={(e) => {
                setDepositAmount(Number(e.target.value));
                if (contractErrors.depositAmount) setContractErrors({ ...contractErrors, depositAmount: '' });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ngày bắt đầu hiệu lực"
              type="date"
              required
              value={startDate}
              error={contractErrors.startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (contractErrors.startDate) setContractErrors({ ...contractErrors, startDate: '' });
              }}
            />
            <Input
              label="Ngày kết thúc hợp đồng"
              type="date"
              required
              value={endDate}
              error={contractErrors.endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                if (contractErrors.endDate) setContractErrors({ ...contractErrors, endDate: '' });
              }}
            />
          </div>
        </form>
      </Modal>

      {/* Modal Renew Contract SQ03 */}
      {renewContractData && (
        <Modal
          isOpen={!!renewContractData}
          onClose={() => {
            setRenewContractData(null);
            setRenewErrors({});
          }}
          title={`Gia Hạn Hợp Đồng ${renewContractData.contractCode} (SQ03)`}
          subtitle={`Căn ${renewContractData.roomNumber} • Khách thuê: ${renewContractData.tenantName}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setRenewContractData(null);
                setRenewErrors({});
              }}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isRenewing}
                onClick={handleRenew}
              >
                Xác Nhận Gia Hạn Hợp Đồng
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {renewErrors.general && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 font-medium">{renewErrors.general}</div>
              </div>
            )}

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900">
              Quy trình gia hạn SQ03: Kế thừa toàn bộ thông tin tiền cọc đang lưu ký ({formatCurrency(renewContractData.depositAmount)}) và cập nhật chu kỳ hiệu lực mới.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ngày kết thúc hợp đồng mới"
                type="date"
                value={newEndDate}
                error={renewErrors.newEndDate}
                onChange={(e) => {
                  setNewEndDate(e.target.value);
                  if (renewErrors.newEndDate) setRenewErrors({ ...renewErrors, newEndDate: '' });
                }}
              />
              <Input
                label="Giá thuê áp dụng cho chu kỳ mới (VNĐ)"
                type="number"
                value={newPrice}
                error={renewErrors.newPrice}
                onChange={(e) => {
                  setNewPrice(Number(e.target.value));
                  if (renewErrors.newPrice) setRenewErrors({ ...renewErrors, newPrice: '' });
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Terminate & Settle Deposit SQ04 */}
      {terminateContractData && (
        <Modal
          isOpen={!!terminateContractData}
          onClose={() => {
            setTerminateContractData(null);
            setTerminateErrors({});
          }}
          title={`Thanh Lý HĐ & Quyết Toán Tiền Cọc (SQ04)`}
          subtitle={`HĐ ${terminateContractData.contractCode} • Căn ${terminateContractData.roomNumber}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setTerminateContractData(null);
                setTerminateErrors({});
              }}>
                Hủy
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isTerminating}
                onClick={handleTerminate}
              >
                Chốt Biên Bản & Quyết Toán Cọc
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {terminateErrors.general && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 font-medium">{terminateErrors.general}</div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Tiền cọc ban đầu đang lưu ký:</span>
                <strong className="text-slate-900">{formatCurrency(terminateContractData.depositAmount)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền đề xuất khấu trừ hư hại:</span>
                <strong className="text-rose-600">- {formatCurrency(deductionAmount)}</strong>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                <span className="text-slate-900">Số tiền cọc thực tế hoàn trả:</span>
                <span className="text-emerald-600">
                  {formatCurrency(Math.max(0, terminateContractData.depositAmount - deductionAmount))}
                </span>
              </div>
            </div>

            <Input
              label="Số tiền khấu trừ hư hại / vi phạm (VNĐ)"
              type="number"
              value={deductionAmount}
              error={terminateErrors.deductionAmount}
              onChange={(e) => {
                setDeductionAmount(Number(e.target.value));
                if (terminateErrors.deductionAmount) setTerminateErrors({ ...terminateErrors, deductionAmount: '' });
              }}
            />

            <Input
              label="Lý do chi tiết theo biên bản kiểm kê nghiệm thu bàn giao"
              value={deductionReason}
              onChange={(e) => setDeductionReason(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* Modal Nộp Tiền Cọc (PENDING -> HELD) */}
      <Modal
        isOpen={!!depositContract}
        onClose={() => !isReceivingDeposit && setDepositContract(null)}
        title="Ghi Nhận Nộp Tiền Cọc Hợp Đồng"
        subtitle="Xác nhận khách thuê đã hoàn tất nộp tiền cọc lưu ký (HELD) theo hợp đồng"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDepositContract(null)}
              disabled={isReceivingDeposit || isApproving}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isReceivingDeposit || isApproving}
              onClick={handleConfirmReceiveDeposit}
              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft"
            >
              {autoActivateAfterDeposit ? 'Thu Cọc & Kích Hoạt HĐ' : 'Xác Nhận Thu Cọc (HELD)'}
            </Button>
          </div>
        }
      >
        {depositContract && (
          <div className="space-y-4 py-1">
            {/* Context Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-brand-700 text-sm">{depositContract.contractCode}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Cọc Chờ Thu (PENDING)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                <div>
                  <span className="text-slate-500">Khách thuê:</span>{' '}
                  <strong className="text-slate-900 font-bold">{depositContract.tenantName || 'Khách thuê'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Căn hộ:</span>{' '}
                  <strong className="text-slate-900 font-bold">{depositContract.roomNumber || 'P101'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Giá thuê:</span>{' '}
                  <strong className="text-slate-800">{formatCurrency(depositContract.rentalPrice)}/th</strong>
                </div>
                <div>
                  <span className="text-slate-500">Cọc quy định:</span>{' '}
                  <strong className="text-emerald-700 font-bold">{formatCurrency(depositContract.depositAmount)}</strong>
                </div>
              </div>
            </div>

            {/* Input Amount */}
            <div>
              <Input
                label="Số tiền cọc thực thu (VNĐ)"
                required
                type="number"
                value={depositAmountInput}
                onChange={(e) => setDepositAmountInput(Number(e.target.value))}
                helperText={`Mặc định bằng số tiền cọc quy định trên hợp đồng (${formatCurrency(depositContract.depositAmount)})`}
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phương thức thu cọc
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDepositPaymentMethod('BANK_TRANSFER')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    depositPaymentMethod === 'BANK_TRANSFER'
                      ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Chuyển khoản (VietQR)</div>
                    <div className="text-[11px] text-slate-500">Napas 247 liên ngân hàng</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDepositPaymentMethod('CASH')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                    depositPaymentMethod === 'CASH'
                      ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Tiền mặt tại quầy</div>
                    <div className="text-[11px] text-slate-500">Thu trực tiếp tại ban quản lý</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Checkbox Auto-activate */}
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoActivateAfterDeposit}
                  onChange={(e) => setAutoActivateAfterDeposit(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 w-4 h-4"
                />
                <div className="text-xs text-emerald-950">
                  <span className="font-bold">Tự động duyệt và kích hoạt hợp đồng ngay sau khi thu cọc</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Hợp đồng sẽ chuyển sang <strong>Đang hiệu lực (ACTIVE)</strong> và căn hộ <strong>{depositContract.roomNumber}</strong> chuyển sang trạng thái <strong>Đang thuê (OCCUPIED)</strong>.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
