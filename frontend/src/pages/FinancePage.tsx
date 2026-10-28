import React, { useState } from 'react';
import {
  Receipt,
  QrCode,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Printer,
  Calendar,
  CreditCard,
  Building,
  AlertTriangle,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { VietQRModal } from '../components/common/VietQRModal';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { Pagination } from '../components/common/Pagination';
import {
  useGetReceivablesQuery,
  useGetPaymentsQuery,
  useGetDebtLedgersQuery,
  useGenerateMonthlyReceivablesMutation,
  useRecordPaymentMutation,
} from '../modules/finance/services/financeApi';
import { useGetApartmentsQuery } from '../modules/buildings/services/buildingApi';
import { useGetTenantsQuery } from '../modules/tenants/services/tenantApi';
import { useGetContractsQuery } from '../modules/contracts/services/contractApi';
import { IReceivable, ReceivableStatus, IPayment } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { parseApiError } from '../utils/errorHandler';

export const FinancePage: React.FC = () => {
  const { isAdmin, isAccountant, isStaff } = useAuth();
  const currentNow = new Date();
  const [activeTab, setActiveTab] = useState<'RECEIVABLES' | 'DEBT_LEDGER' | 'PAYMENTS'>('RECEIVABLES');
  const [selectedStatus, setSelectedStatus] = useState<ReceivableStatus | undefined>(undefined);
  const [billingMonth, setBillingMonth] = useState<number>(0); // 0 = Tất cả các tháng (hiển thị toàn bộ hóa đơn CSDL)
  const [billingYear, setBillingYear] = useState<number>(currentNow.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modals state
  const [vietQRReceivable, setVietQRReceivable] = useState<IReceivable | null>(null);
  const [cashPaymentReceivable, setCashPaymentReceivable] = useState<IReceivable | null>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cashNote, setCashNote] = useState('');
  const [cashErrors, setCashErrors] = useState<Record<string, string>>({});
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<IPayment | null>(null);

  const { data: receivables = [], isLoading: isRecLoading } = useGetReceivablesQuery({
    month: billingMonth > 0 ? billingMonth : undefined,
    year: billingYear,
    status: selectedStatus,
  });

  const { data: debtLedgers = [] } = useGetDebtLedgersQuery();
  const { data: payments = [] } = useGetPaymentsQuery({});
  const { data: apartments = [] } = useGetApartmentsQuery({});
  const { data: tenants = [] } = useGetTenantsQuery();
  const { data: contracts = [] } = useGetContractsQuery();

  const [generateMonthly, { isLoading: isGenerating }] = useGenerateMonthlyReceivablesMutation();
  const [recordPayment, { isLoading: isRecording }] = useRecordPaymentMutation();
  const toast = useToast();

  const handleGenerateMonthly = async () => {
    try {
      const monthToGen = billingMonth > 0 ? billingMonth : (currentNow.getMonth() + 1);
      const res = await generateMonthly({ month: monthToGen, year: billingYear }).unwrap();
      toast.success(
        'Đã phát sinh hóa đơn',
        `Đã sinh tự động ${res.count} hóa đơn định kỳ T${monthToGen}/${billingYear} với tổng phải thu ${formatCurrency(res.totalAmount)}!`
      );
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể sinh khoản thu lúc này');
      toast.error('Lỗi', parsed.message);
    }
  };

  const handleRecordCash = async () => {
    if (!cashPaymentReceivable) return;
    const errors: Record<string, string> = {};

    if (Number(cashAmount) <= 0) {
      errors.cashAmount = 'Số tiền thu thực tế phải lớn hơn 0 VNĐ';
    } else if (Number(cashAmount) > cashPaymentReceivable.remainingDebt) {
      errors.cashAmount = `Số tiền nộp không được vượt quá số dư nợ (${formatCurrency(cashPaymentReceivable.remainingDebt)})`;
    }

    if (Object.keys(errors).length > 0) {
      setCashErrors(errors);
      toast.error('Lỗi nhập liệu', 'Vui lòng kiểm tra lại số tiền thu');
      return;
    }

    setCashErrors({});
    try {
      await recordPayment({
        receivableId: cashPaymentReceivable.id,
        amount: Number(cashAmount),
        paymentMethod: 'CASH',
        note: cashNote || `Thu tiền mặt cước phí căn ${cashPaymentReceivable.roomNumber}`,
      }).unwrap();

      toast.success('Ghi nhận thành công', `Đã xuất phiếu thu tiền mặt cho căn ${cashPaymentReceivable.roomNumber}!`);
      setCashPaymentReceivable(null);
      setCashErrors({});
    } catch (err: any) {
      const parsed = parseApiError(err, 'Không thể ghi nhận thu tiền mặt');
      setCashErrors({ general: parsed.message, ...parsed.fieldErrors });
      toast.error('Thu tiền thất bại', parsed.message);
    }
  };

  const handlePrintReceipt = (payment: IPayment) => {
    setSelectedPaymentForReceipt(payment);
  };

  const filteredReceivables = receivables.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchedContract = contracts.find((c) => c.id === r.contractId);
      const matchedApt = apartments.find((a) => a.id === r.apartmentId || a.id === matchedContract?.apartmentId);
      const matchedTenant = tenants.find((t) => t.id === r.tenantId || t.id === matchedContract?.tenantId);

      const roomName = (r.roomNumber || matchedApt?.roomNumber || matchedContract?.roomNumber || '').toLowerCase();
      const tName = (r.tenantName || matchedTenant?.fullName || matchedContract?.tenantName || '').toLowerCase();
      const bName = (r.buildingName || matchedApt?.buildingName || matchedContract?.buildingName || '').toLowerCase();

      return roomName.includes(q) || tName.includes(q) || bName.includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredReceivables.length / pageSize) || 1;
  const paginatedReceivables = filteredReceivables.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-brand-600 mb-0.5">
            Tài chính & hóa đơn
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Thu Chi, Hóa Đơn & Sổ Nợ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hóa đơn định kỳ hàng tháng, thanh toán VietQR Napas247 và đối soát công nợ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isAccountant) ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />}
              isLoading={isGenerating}
              onClick={handleGenerateMonthly}
            >
              Sinh Hóa Đơn T{billingMonth > 0 ? billingMonth : (currentNow.getMonth() + 1)}/{billingYear}
            </Button>
          ) : (
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
              Chế độ Tra Cứu Hóa Đơn & Sổ Nợ
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('RECEIVABLES')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'RECEIVABLES'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Danh Sách Hóa Đơn Kỳ Thu ({filteredReceivables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DEBT_LEDGER')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'DEBT_LEDGER'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Sổ Theo Dõi Công Nợ Cư Dân ({debtLedgers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'PAYMENTS'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Lịch Sử Phiếu Thu & Giao Dịch ({payments.length})</span>
        </button>
      </div>

      {/* TAB 1: Receivables */}
      {activeTab === 'RECEIVABLES' && (
        <div className="space-y-4">
          {/* Month selector & filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>Kỳ thu:</span>
                <select
                  value={billingMonth}
                  onChange={(e) => {
                    setBillingMonth(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent outline-none cursor-pointer font-extrabold text-brand-700"
                >
                  <option value={0}>Tất cả các tháng</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
                <span>/ {billingYear}</span>
              </div>

              {[
                { id: undefined, label: 'Tất cả' },
                { id: 'UNPAID', label: 'Chưa nộp' },
                { id: 'PAID', label: 'Đã thanh toán' },
                { id: 'OVERDUE', label: 'Quá hạn nộp' },
              ].map((st) => (
                <button
                  key={st.label}
                  onClick={() => {
                    setSelectedStatus(st.id as any);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedStatus === st.id
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {st.label}
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
                placeholder="Tìm phòng, tên khách..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Receivables Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3.5">Căn Hộ & Khách Thuê</th>
                    <th className="px-5 py-3.5">Tiền Phòng</th>
                    <th className="px-5 py-3.5">Điện / Nước / Dịch Vụ</th>
                    <th className="px-5 py-3.5">Tổng Phải Thu</th>
                    <th className="px-5 py-3.5">Đã Nộp / Còn Nợ</th>
                    <th className="px-5 py-3.5">Trạng Thái & Hạn Nộp</th>
                    <th className="px-5 py-3.5 text-right">Thanh Toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReceivables.map((r) => {
                    const matchedContract = contracts.find((c) => c.id === r.contractId);
                    const matchedApt = apartments.find((a) => a.id === r.apartmentId || a.id === matchedContract?.apartmentId);
                    const matchedTenant = tenants.find((t) => t.id === r.tenantId || t.id === matchedContract?.tenantId);

                    const roomDisplayName = (r.roomNumber && r.roomNumber.length >= 2 && !r.roomNumber.match(/^P\d$/))
                      ? r.roomNumber
                      : matchedApt?.roomNumber || matchedContract?.roomNumber || `P${r.apartmentId}`;

                    const tenantDisplayName = (r.tenantName && r.tenantName !== 'Cư dân' && !r.tenantName.startsWith('Cư dân #'))
                      ? r.tenantName
                      : matchedTenant?.fullName || matchedContract?.tenantName || 'Khách thuê';

                    const tenantDisplayPhone = r.tenantPhone || matchedTenant?.phone || matchedContract?.tenantPhone || '';

                    const buildingDisplayName = (r.buildingName && r.buildingName !== 'Sunshine Homes' && r.buildingName !== 'Sunshine Diamond Tower')
                      ? r.buildingName
                      : matchedApt?.buildingName || matchedContract?.buildingName || 'Dwell';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-extrabold text-slate-900 text-sm">{roomDisplayName}</div>
                          <div className="text-[11px] text-slate-500">
                            <span className="font-medium text-slate-700">{tenantDisplayName}</span>
                            {tenantDisplayPhone ? ` (${tenantDisplayPhone})` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400">{buildingDisplayName}</div>
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900">
                          {formatCurrency(r.roomAmount)}
                        </td>

                        <td className="px-5 py-4 space-y-0.5 text-[11px]">
                          <div>Điện: <strong>{formatCurrency(r.electricityCost)}</strong> ({r.electricityUsageKwh} kWh)</div>
                          <div>Nước: <strong>{formatCurrency(r.waterCost)}</strong> ({r.waterUsageM3} m³)</div>
                          <div className="text-slate-400">QL: {formatCurrency(r.managementCost)}</div>
                        </td>

                        <td className="px-5 py-4 font-extrabold text-brand-700 text-sm">
                          {formatCurrency(r.totalAmount)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-emerald-600 font-bold">
                            Đã nộp: {formatCurrency(r.paidAmount)}
                          </div>
                          {r.remainingDebt > 0 && (
                            <div className="text-rose-600 font-bold text-[11px] mt-0.5">
                              Còn nợ: {formatCurrency(r.remainingDebt)}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 space-y-1">
                          <Badge status={r.status} />
                          <div className="text-[10px] text-slate-400">Hạn nộp: {formatDate(r.dueDate)}</div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {r.remainingDebt > 0 && (
                              <>
                                <button
                                  onClick={() => setVietQRReceivable(r)}
                                  className="flex items-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs"
                                  title="Mở mã VietQR động"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>VietQR</span>
                                </button>

                                {(isAdmin || isAccountant) && (
                                  <button
                                    onClick={() => {
                                      setCashPaymentReceivable(r);
                                      setCashAmount(r.remainingDebt);
                                    }}
                                    className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs"
                                    title="Ghi nhận nộp tiền mặt"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                    <span>Thu Tiền Mặt</span>
                                  </button>
                                )}
                              </>
                            )}

                            {r.status === 'PAID' && (
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-4 h-4" /> Đã hoàn tất
                                </span>
                                {(() => {
                                  const pay = payments.find((p) => p.receivableId === r.id);
                                  if (pay) {
                                    return (
                                      <button
                                        onClick={() => handlePrintReceipt(pay)}
                                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-slate-200"
                                        title="Xem & in biên lai điện tử"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
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
              totalItems={filteredReceivables.length}
              pageSize={pageSize}
              itemLabel="hóa đơn"
              className="px-5 py-3 border-t border-slate-200"
            />
          </div>
        </div>
      )}

      {/* TAB 2: Debt Ledger */}
      {activeTab === 'DEBT_LEDGER' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Cư Dân & Căn Hộ</th>
                  <th className="px-5 py-3.5">Tổng Lũy Kế Phải Thu</th>
                  <th className="px-5 py-3.5">Tổng Lũy Kế Đã Nộp</th>
                  <th className="px-5 py-3.5">Số Dư Nợ Hiện Tại</th>
                  <th className="px-5 py-3.5">Tình Trạng Nợ</th>
                  <th className="px-5 py-3.5 text-right">Cập Nhật Gần Nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {debtLedgers.map((d) => {
                  const matchedTenant = tenants.find((t) => t.id === d.tenantId);
                  const matchedContract = contracts.find((c) => c.tenantId === d.tenantId && c.status === 'ACTIVE')
                    || contracts.find((c) => c.tenantId === d.tenantId);
                  const matchedApt = apartments.find((a) => a.id === matchedContract?.apartmentId);

                  const tenantDisplayName = (d.tenantName && !d.tenantName.startsWith('Cư dân #'))
                    ? d.tenantName
                    : matchedTenant?.fullName || matchedContract?.tenantName || `Cư dân #${d.tenantId}`;

                  const roomDisplayName = (d.roomNumber && d.roomNumber !== 'P101')
                    ? d.roomNumber
                    : matchedContract?.roomNumber || matchedApt?.roomNumber || (matchedTenant?.currentRoomNumber || 'Chưa nhận phòng');

                  const buildingDisplayName = (d.buildingName && d.buildingName !== 'Sunshine Homes' && d.buildingName !== 'Sunshine Diamond Tower')
                    ? d.buildingName
                    : matchedApt?.buildingName || matchedContract?.buildingName || 'Dwell';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{tenantDisplayName}</div>
                        <div className="text-[11px] text-slate-500">{roomDisplayName} • {buildingDisplayName}</div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{formatCurrency(d.totalReceivable)}</td>
                      <td className="px-5 py-4 font-semibold text-emerald-600">{formatCurrency(d.totalPaid)}</td>
                      <td className="px-5 py-4 font-black text-sm">
                        <span className={d.currentDebt > 0 ? 'text-rose-600' : 'text-slate-900'}>
                          {formatCurrency(d.currentDebt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {d.currentDebt > 0 ? (
                          <Badge status="OVERDUE" label="Còn dư nợ" />
                        ) : (
                          <Badge status="PAID" label="Tuyệt đối tốt" />
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-400">{formatDate(d.lastUpdated)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Payment Transactions */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Mã Phiếu Thu</th>
                  <th className="px-5 py-3.5">Người Nộp & Phòng</th>
                  <th className="px-5 py-3.5">Số Tiền Nộp</th>
                  <th className="px-5 py-3.5">Phương Thức</th>
                  <th className="px-5 py-3.5">Mã Giao Dịch</th>
                  <th className="px-5 py-3.5">Thời Điểm</th>
                  <th className="px-5 py-3.5 text-right">Biên Lai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const matchedReceivable = receivables.find((r) => r.id === p.receivableId);
                  const matchedContract = contracts.find((c) => c.id === matchedReceivable?.contractId || c.id === p.contractId);
                  const matchedTenant = tenants.find((t) => t.id === matchedReceivable?.tenantId || t.id === matchedContract?.tenantId);
                  const matchedApt = apartments.find((a) => a.id === matchedReceivable?.apartmentId || a.id === matchedContract?.apartmentId);

                  const payerDisplayName = (p.payerName && p.payerName !== 'Cư dân')
                    ? p.payerName
                    : matchedReceivable?.tenantName || matchedTenant?.fullName || matchedContract?.tenantName || 'Khách thuê';

                  const roomDisplayName = p.roomNumber
                    ? p.roomNumber
                    : matchedReceivable?.roomNumber || matchedApt?.roomNumber || matchedContract?.roomNumber || 'P101';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-brand-700">{p.receiptNumber}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{payerDisplayName}</div>
                        <div className="text-[11px] text-slate-500">{roomDisplayName}</div>
                      </td>
                      <td className="px-5 py-4 font-black text-emerald-600 text-sm">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                          {p.paymentMethod === 'BANK_TRANSFER' ? 'VietQR / CK' : 'Tiền Mặt'}
                        </span>
                      </td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-500">{p.transactionCode}</td>
                    <td className="px-5 py-4 text-slate-500">{p.paymentDate}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handlePrintReceipt(p)}
                        className="p-1.5 text-slate-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg border border-slate-200 hover:border-brand-300 transition-colors shadow-xs"
                        title="In biên lai thu tiền điện tử"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VietQR Dynamic Modal */}
      {vietQRReceivable && (
        <VietQRModal
          isOpen={!!vietQRReceivable}
          onClose={() => setVietQRReceivable(null)}
          receivableId={vietQRReceivable.id}
          amount={vietQRReceivable.remainingDebt}
          roomNumber={vietQRReceivable.roomNumber}
          tenantName={vietQRReceivable.tenantName}
          billMonth={vietQRReceivable.billingMonth}
          billYear={vietQRReceivable.billingYear}
        />
      )}

      {/* Cash Payment Modal */}
      {cashPaymentReceivable && (
        <Modal
          isOpen={!!cashPaymentReceivable}
          onClose={() => {
            setCashPaymentReceivable(null);
            setCashErrors({});
          }}
          title="Ghi Nhận Thu Tiền Mặt Trực Tiếp"
          subtitle={`Hóa đơn căn ${cashPaymentReceivable.roomNumber} • ${cashPaymentReceivable.tenantName}`}
          footer={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setCashPaymentReceivable(null);
                setCashErrors({});
              }}>
                Hủy
              </Button>
              <Button
                variant="success"
                size="sm"
                isLoading={isRecording}
                onClick={handleRecordCash}
              >
                Xác Nhận Thu Tiền & Xuất Phiếu Thu
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {cashErrors.general && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1 font-medium">{cashErrors.general}</div>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs flex justify-between items-center">
              <span className="text-slate-500">Số dư nợ còn lại:</span>
              <strong className="text-brand-700 text-sm">
                {formatCurrency(cashPaymentReceivable.remainingDebt)}
              </strong>
            </div>

            <Input
              label="Số tiền khách nộp thực tế (VNĐ)"
              type="number"
              value={cashAmount}
              error={cashErrors.cashAmount}
              onChange={(e) => {
                setCashAmount(Number(e.target.value));
                if (cashErrors.cashAmount) setCashErrors({ ...cashErrors, cashAmount: '' });
              }}
            />

            <Input
              label="Ghi chú nội dung nộp tiền"
              placeholder="VD: Cư dân nộp trực tiếp tại quầy lễ tân"
              value={cashNote}
              onChange={(e) => setCashNote(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* Electronic Receipt Print Modal */}
      {selectedPaymentForReceipt && (
        <ReceiptModal
          isOpen={!!selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
          payment={selectedPaymentForReceipt}
          receivable={receivables.find((r) => r.id === selectedPaymentForReceipt.receivableId)}
          contract={contracts.find(
            (c) =>
              c.id === selectedPaymentForReceipt.contractId ||
              c.id === receivables.find((r) => r.id === selectedPaymentForReceipt.receivableId)?.contractId
          )}
          tenant={tenants.find(
            (t) =>
              t.fullName === selectedPaymentForReceipt.payerName ||
              t.id === receivables.find((r) => r.id === selectedPaymentForReceipt.receivableId)?.tenantId
          )}
          apartment={apartments.find(
            (a) =>
              a.roomNumber === selectedPaymentForReceipt.roomNumber ||
              a.id === receivables.find((r) => r.id === selectedPaymentForReceipt.receivableId)?.apartmentId
          )}
        />
      )}
    </div>
  );
};
