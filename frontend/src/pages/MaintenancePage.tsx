import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  Image as ImageIcon,
  Building,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import {
  useGetMaintenanceRequestsQuery,
  useAssignTechnicianMutation,
  useCompleteAndInspectMaintenanceMutation,
  useCreateMaintenanceRequestMutation,
} from '../modules/maintenance/services/maintenanceApi';
import { useGetApartmentsQuery } from '../modules/buildings/services/buildingApi';
import { IMaintenanceRequest, MaintenancePriority, MaintenanceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { parseApiError } from '../utils/errorHandler';

export const MaintenancePage: React.FC = () => {
  const { isAdmin, isStaff, isAccountant } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = (searchParams.get('status') as MaintenanceStatus) || undefined;
  const urlSearch = searchParams.get('search') || '';
  const [selectedStatus, setSelectedStatus] = useState<MaintenanceStatus | undefined>(urlStatus);
  const [selectedPriority, setSelectedPriority] = useState<MaintenancePriority | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState(urlSearch);

  // Sync state when URL search params change
  useEffect(() => {
    const s = (searchParams.get('status') as MaintenanceStatus) || undefined;
    setSelectedStatus(s);
    const q = searchParams.get('search');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const handleSelectStatus = (stId?: MaintenanceStatus) => {
    setSelectedStatus(stId);
    if (stId) {
      setSearchParams({ status: stId });
    } else {
      setSearchParams({});
    }
  };

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignTicket, setAssignTicket] = useState<IMaintenanceRequest | null>(null);
  const [inspectTicket, setInspectTicket] = useState<IMaintenanceRequest | null>(null);

  // Error states
  const [createTicketErrors, setCreateTicketErrors] = useState<Record<string, string>>({});
  const [assignErrors, setAssignErrors] = useState<Record<string, string>>({});
  const [inspectErrors, setInspectErrors] = useState<Record<string, string>>({});

  // Form states
  const [techName, setTechName] = useState('KTV. Lê Văn Thắng');
  const [techPhone, setTechPhone] = useState('0988.123.456');
  const [inspectCost, setInspectCost] = useState<number>(150000);
  const [inspectRating, setInspectRating] = useState<number>(5);
  const [inspectFeedback, setInspectFeedback] = useState('Đã thay thế linh kiện mới, kiểm tra kín nước 100%');
  const [isPass, setIsPass] = useState(true);

  // New Request Form
  const [newAptId, setNewAptId] = useState(1);
  const [newReporter, setNewReporter] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<MaintenancePriority>('MEDIUM');
  const [newCategory, setNewCategory] = useState<'PLUMBING' | 'ELECTRICAL' | 'APPLIANCE' | 'DOOR_LOCK' | 'OTHER'>('PLUMBING');

  const { data: tickets = [], isLoading } = useGetMaintenanceRequestsQuery(
    {
      status: selectedStatus,
      priority: selectedPriority,
    },
    { pollingInterval: 3000, refetchOnMountOrArgChange: true }
  );

  const { data: apartments = [] } = useGetApartmentsQuery({});

  const [assignTechnician, { isLoading: isAssigning }] = useAssignTechnicianMutation();
  const [completeMaintenance, { isLoading: isCompleting }] = useCompleteAndInspectMaintenanceMutation();
  const [createTicket, { isLoading: isCreating }] = useCreateMaintenanceRequestMutation();

  const toast = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!newReporter.trim()) {
      errors.newReporter = 'Vui lòng nhập họ tên người báo hỏng';
    }
    if (!newPhone.trim()) {
      errors.newPhone = 'Vui lòng nhập số điện thoại liên hệ';
    } else if (!/^0\d{9,10}$/.test(newPhone.trim())) {
      errors.newPhone = 'Số điện thoại không hợp lệ (phải bắt đầu bằng số 0 và có 10-11 số)';
    }
    if (!newDesc.trim()) {
      errors.newDesc = 'Vui lòng mô tả tình trạng hư hỏng';
    } else if (newDesc.trim().length < 5) {
      errors.newDesc = 'Mô tả hư hỏng cần ít nhất 5 ký tự để KTV nắm bắt';
    }

    if (Object.keys(errors).length > 0) {
      setCreateTicketErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng kiểm tra lại thông tin báo hỏng');
      return;
    }

    setCreateTicketErrors({});
    const apt = apartments.find((a) => a.id === Number(newAptId));
    try {
      await createTicket({
        apartmentId: Number(newAptId),
        roomNumber: apt?.roomNumber || 'P101',
        buildingName: apt?.buildingName || 'Dwell',
        reporterName: newReporter.trim(),
        phone: newPhone.trim(),
        issueDescription: newDesc.trim(),
        priority: newPriority,
        category: newCategory,
      }).unwrap();

      toast.success('Thành công', 'Đã tiếp nhận phiếu báo hỏng và phân loại SLA!');
      setIsCreateModalOpen(false);
      setNewReporter('');
      setNewPhone('');
      setNewDesc('');
      setCreateTicketErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể tạo phiếu bảo trì');
      setCreateTicketErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Tạo phiếu thất bại', parsed.message);
    }
  };

  const handleOpenCreateModal = () => {
    setNewReporter('');
    setNewPhone('');
    setNewDesc('');
    setCreateTicketErrors({});
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateTicketErrors({});
  };

  const handleAssign = async () => {
    if (!assignTicket) return;
    const errors: Record<string, string> = {};

    if (!techName.trim()) {
      errors.techName = 'Vui lòng nhập tên kỹ thuật viên';
    }
    if (techPhone.trim() && !/^0\d{9,10}$/.test(techPhone.trim().replace(/\./g, ''))) {
      errors.techPhone = 'Số điện thoại không hợp lệ (phải bắt đầu bằng số 0)';
    }

    if (Object.keys(errors).length > 0) {
      setAssignErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng kiểm tra lại thông tin KTV');
      return;
    }

    setAssignErrors({});
    try {
      await assignTechnician({
        ticketId: assignTicket.id,
        technicianName: techName.trim(),
        technicianPhone: techPhone.trim(),
      }).unwrap();

      toast.success('Phân công thành công', `Đã điều phối ${techName} tiếp nhận xử lý phiếu #${assignTicket.ticketCode}!`);
      setAssignTicket(null);
      setAssignErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể phân công kỹ thuật viên');
      setAssignErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Lỗi phân công', parsed.message);
    }
  };

  const handleInspect = async () => {
    if (!inspectTicket) return;
    const errors: Record<string, string> = {};

    if (Number(inspectCost) < 0) {
      errors.inspectCost = 'Chi phí phát sinh không được là số âm';
    }
    if (!inspectFeedback.trim()) {
      errors.inspectFeedback = 'Vui lòng nhập biên bản hoàn công / phản hồi';
    }

    if (Object.keys(errors).length > 0) {
      setInspectErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng kiểm tra lại biên bản nghiệm thu');
      return;
    }

    setInspectErrors({});
    try {
      await completeMaintenance({
        ticketId: inspectTicket.id,
        cost: Number(inspectCost),
        rating: inspectRating,
        feedback: inspectFeedback.trim(),
        isPass,
      }).unwrap();

      toast.success('Nghiệm thu thành công', `Phiếu sự cố ${inspectTicket.ticketCode} đã được đóng và mở khóa phòng!`);
      setInspectTicket(null);
      setInspectErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể nghiệm thu phiếu');
      setInspectErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Lỗi nghiệm thu', parsed.message);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (selectedStatus && t.status !== selectedStatus) {
      return false;
    }
    if (selectedPriority && t.priority !== selectedPriority) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.ticketCode.toLowerCase().includes(q) ||
        t.roomNumber.toLowerCase().includes(q) ||
        t.issueDescription.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-brand-600 mb-0.5">
            Bảo trì & kỹ thuật
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Tiếp Nhận & Xử Lý Bảo Trì
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy trình tiếp nhận báo hỏng, phân công kỹ thuật viên và đóng phiếu nghiệm thu.
          </p>
        </div>

        {(isAdmin || isStaff) && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenCreateModal}
          >
            Tạo Phiếu Báo Hỏng
          </Button>
        )}
        {isAccountant && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
            Theo Dõi Chi Phí Sửa Chữa (Chỉ Xem)
          </span>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: undefined, label: 'Tất cả tiến độ' },
            { id: 'PENDING', label: 'Chờ tiếp nhận' },
            { id: 'IN_PROGRESS', label: 'Đang xử lý' },
            { id: 'COMPLETED', label: 'Đã hoàn tất' },
          ].map((st) => {
            const count = st.id
              ? tickets.filter((t) => t.status === st.id).length
              : tickets.length;
            const isActive = selectedStatus === st.id;

            return (
              <button
                key={st.label}
                onClick={() => handleSelectStatus(st.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{st.label}</span>
                <span
                  className={`text-[10.5px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã sự cố, phòng, mô tả..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Tickets List View */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Wrench className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            Không có phiếu báo hỏng nào ở trạng thái này
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {selectedStatus ? (
              <>
                Hiện tại không có phiếu nào đang ở trạng thái{' '}
                <strong className="text-slate-700">
                  {selectedStatus === 'PENDING'
                    ? 'Chờ tiếp nhận'
                    : selectedStatus === 'IN_PROGRESS'
                    ? 'Đang xử lý'
                    : 'Đã hoàn tất'}
                </strong>
                .
              </>
            ) : (
              'Chưa có phiếu báo hỏng nào trong hệ thống.'
            )}
          </p>
          {selectedStatus && (
            <button
              onClick={() => handleSelectStatus(undefined)}
              className="mt-4 px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Xem tất cả tiến độ
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTickets.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-soft hover:shadow-soft-lg transition-all duration-200 flex flex-col justify-between space-y-4"
          >
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-200">
                  {t.ticketCode}
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge status={t.priority} size="sm" />
                  <Badge status={t.status} size="sm" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="text-base font-extrabold text-slate-900">
                  Căn {t.roomNumber} <span className="text-xs font-normal text-slate-500">• {t.buildingName}</span>
                </h4>
                <span className="text-[11px] text-slate-400">SLA {t.slaMinutes}p</span>
              </div>

              <p className="text-xs text-slate-700 mt-2 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                "{t.issueDescription}"
              </p>

              {/* Photo preview if available */}
              {t.imageUrl && (
                <div className="mt-3 relative h-28 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={t.imageUrl}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80';
                    }}
                    alt="Ảnh sự cố"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 bg-slate-900/80 text-white text-[10px] rounded backdrop-blur-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Hiện trường
                  </span>
                </div>
              )}

              {/* Technician Info */}
              {t.technicianName && (
                <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={t.technicianAvatar || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80'}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80';
                      }}
                      alt={t.technicianName}
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{t.technicianName}</div>
                      <div className="text-[10px] text-slate-500">{t.technicianPhone}</div>
                    </div>
                  </div>
                  {t.rating && (
                    <div className="flex items-center gap-1 text-amber-600 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{t.rating}/5</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">
                Tạo lúc: {t.createdAt}
              </span>

              <div className="flex items-center gap-1.5">
                {(isAdmin || isStaff) && t.status === 'PENDING' && (
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                    onClick={() => setAssignTicket(t)}
                  >
                    Điều Phối Thợ
                  </Button>
                )}

                {(isAdmin || isStaff) && t.status === 'IN_PROGRESS' && (
                  <Button
                    size="sm"
                    variant="success"
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setInspectTicket(t);
                      setInspectCost(t.repairCost || 150000);
                    }}
                  >
                    Nghiệm Thu
                  </Button>
                )}

                {t.status === 'COMPLETED' && (
                  <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đã đóng phiếu ({formatCurrency(t.repairCost)})
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Modal Assign Technician */}
      {assignTicket && (
        <Modal
          isOpen={!!assignTicket}
          onClose={() => setAssignTicket(null)}
          title={`Điều Phối Thợ Kỹ Thuật • Phiếu #${assignTicket.ticketCode}`}
          subtitle={`Căn ${assignTicket.roomNumber} • Sự cố: ${assignTicket.issueDescription}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAssignTicket(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isAssigning}
                onClick={handleAssign}
              >
                Giao Việc & Chuyển IN_PROGRESS
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {assignErrors.general && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 font-medium">{assignErrors.general}</div>
              </div>
            )}

            <Select
              label="Chọn Kỹ thuật viên phụ trách"
              value={techName}
              onChange={(e) => {
                setTechName(e.target.value);
                if (e.target.value.includes('Thắng')) setTechPhone('0988.123.456');
                else setTechPhone('0977.888.999');
                if (assignErrors.techName) setAssignErrors({ ...assignErrors, techName: '' });
              }}
              options={[
                { label: 'KTV. Lê Văn Thắng (Điện - Nước - Khóa)', value: 'KTV. Lê Văn Thắng' },
                { label: 'KTV. Nguyễn Đình Trọng (Điện Lạnh & Smart Home)', value: 'KTV. Nguyễn Đình Trọng' },
                { label: 'KTV. Trần Văn Minh (Mộc & Sơn Sửa Căn Hộ)', value: 'KTV. Trần Văn Minh' },
              ]}
            />

            <Input
              label="Số điện thoại kỹ thuật viên"
              value={techPhone}
              error={assignErrors.techPhone}
              onChange={(e) => {
                setTechPhone(e.target.value);
                if (assignErrors.techPhone) setAssignErrors({ ...assignErrors, techPhone: '' });
              }}
            />
          </div>
        </Modal>
      )}

      {/* Modal Inspection Pass/Fail */}
      {inspectTicket && (
        <Modal
          isOpen={!!inspectTicket}
          onClose={() => {
            setInspectTicket(null);
            setInspectErrors({});
          }}
          title={`Nghiệm Thu Sửa Chữa & Đánh Giá Dịch Vụ 5 Sao`}
          subtitle={`Phiếu #${inspectTicket.ticketCode} • Căn ${inspectTicket.roomNumber}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setInspectTicket(null);
                setInspectErrors({});
              }}>
                Hủy
              </Button>
              <Button
                variant="success"
                size="sm"
                isLoading={isCompleting}
                onClick={handleInspect}
              >
                Xác Nhận Nghiệm Thu & Đóng Phiếu
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {inspectErrors.general && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 font-medium">{inspectErrors.general}</div>
              </div>
            )}

            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="radio"
                  name="passStatus"
                  checked={isPass}
                  onChange={() => setIsPass(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-emerald-700">✓ Nghiệm thu ĐẠT (Mở khóa phòng)</span>
              </label>

              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
                  type="radio"
                  name="passStatus"
                  checked={!isPass}
                  onChange={() => setIsPass(false)}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="text-rose-700">✗ KHÔNG ĐẠT (Yêu cầu làm lại)</span>
              </label>
            </div>

            <Input
              label="Chi phí vật tư sửa chữa phát sinh (VNĐ)"
              type="number"
              value={inspectCost}
              error={inspectErrors.inspectCost}
              onChange={(e) => {
                setInspectCost(Number(e.target.value));
                if (inspectErrors.inspectCost) setInspectErrors({ ...inspectErrors, inspectCost: '' });
              }}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Đánh giá chất lượng dịch vụ kỹ thuật (Sao)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setInspectRating(star)}
                    className="p-1 text-amber-500 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= inspectRating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-700 ml-2">{inspectRating}/5 Sao</span>
              </div>
            </div>

            <Input
              label="Ý kiến phản hồi & Biên bản hoàn công"
              value={inspectFeedback}
              error={inspectErrors.inspectFeedback}
              onChange={(e) => {
                setInspectFeedback(e.target.value);
                if (inspectErrors.inspectFeedback) setInspectErrors({ ...inspectErrors, inspectFeedback: '' });
              }}
            />
          </div>
        </Modal>
      )}

      {/* Modal Create Request */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Tiếp Nhận Phiếu Báo Hỏng Mới (Smart Ticket)"
        subtitle="Hệ thống tự động tính toán SLA và tạm khóa phòng nếu mức độ khẩn cấp"
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
              Gửi Phiếu Kỹ Thuật
            </Button>
          </div>
        }
      >
        {createTicketErrors.general && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 font-medium">{createTicketErrors.general}</div>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Chọn Căn hộ phát sinh sự cố"
              value={newAptId}
              onChange={(e) => setNewAptId(Number(e.target.value))}
              options={apartments.map((a) => ({
                label: `${a.roomNumber} - ${a.buildingName}`,
                value: a.id,
              }))}
            />

            <Select
              label="Phân loại hạng mục sự cố"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              options={[
                { label: 'Cấp thoát nước (Plumbing)', value: 'PLUMBING' },
                { label: 'Hệ thống điện & Chiếu sáng', value: 'ELECTRICAL' },
                { label: 'Thiết bị gia dụng (Tủ lạnh, Bếp)', value: 'APPLIANCE' },
                { label: 'Khóa cửa & An ninh', value: 'DOOR_LOCK' },
                { label: 'Hạng mục khác', value: 'OTHER' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Họ tên người báo"
              required
              placeholder="VD: Nguyễn Văn An"
              value={newReporter}
              error={createTicketErrors.newReporter}
              onChange={(e) => {
                setNewReporter(e.target.value);
                if (createTicketErrors.newReporter) setCreateTicketErrors({ ...createTicketErrors, newReporter: '' });
              }}
            />
            <Input
              label="Số điện thoại người báo"
              required
              placeholder="0912.***.***"
              value={newPhone}
              error={createTicketErrors.newPhone}
              onChange={(e) => {
                setNewPhone(e.target.value);
                if (createTicketErrors.newPhone) setCreateTicketErrors({ ...createTicketErrors, newPhone: '' });
              }}
            />
          </div>

          <Select
            label="Mức độ ưu tiên"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as any)}
            options={[
              { label: 'Bình thường (SLA 60 phút)', value: 'LOW' },
              { label: 'Trung bình (SLA 45 phút)', value: 'MEDIUM' },
              { label: 'Ưu tiên cao (SLA 30 phút)', value: 'HIGH' },
              { label: 'Khẩn cấp - Tạm khóa phòng (SLA 15 phút)', value: 'URGENT' },
            ]}
          />

          <Input
            label="Mô tả chi tiết tình trạng hư hỏng"
            required
            placeholder="VD: Rò rỉ van nước cấp bồn cầu phòng tắm, nước tràn ra sàn..."
            value={newDesc}
            error={createTicketErrors.newDesc}
            onChange={(e) => {
              setNewDesc(e.target.value);
              if (createTicketErrors.newDesc) setCreateTicketErrors({ ...createTicketErrors, newDesc: '' });
            }}
          />
        </form>
      </Modal>
    </div>
  );
};
