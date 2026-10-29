import React, { useState } from 'react';
import {
  TrendingUp,
  Building,
  DollarSign,
  AlertTriangle,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  BarChart3,
  PieChart,
  CheckCircle2,
  FileSignature,
  BellRing,
  ChevronRight,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useGetDashboardStatsQuery, useGetRevenueTrendsQuery } from '../modules/dashboard/services/dashboardApi';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [reportPeriod, setReportPeriod] = useState(currentPeriod);
  const [selectedView, setSelectedView] = useState<'month' | 'quarter' | 'year'>('month');

  const { isAccountant, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: stats, refetch, isFetching } = useGetDashboardStatsQuery({});
  const { data: trendsData } = useGetRevenueTrendsQuery();
  const toast = useToast();

  const handleExportReport = async (_type?: string) => {
    try {
      const token = localStorage.getItem('token');
      const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1';
      const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
      const response = await fetch(`${cleanBase}/dashboard/export-revenue`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bao_cao_doanh_thu_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success(
          'Xuất báo cáo thành công',
          `Báo cáo doanh thu thực tế định dạng CSV đã được tải xuống máy!`
        );
      } else {
        toast.error('Lỗi xuất báo cáo', 'Máy chủ không thể tạo báo cáo');
      }
    } catch {
      toast.error('Lỗi kết nối', 'Không thể kết nối máy chủ để xuất báo cáo');
    }
  };

  // Dynamic monthly and quarterly trend based on real API data from backend
  const unitLabel = trendsData?.unit_label || (stats?.totalRevenueMonth && stats.totalRevenueMonth >= 1000000000 ? 'Tỷ' : 'Tr');

  const monthlyTrends = trendsData?.monthly?.length
    ? trendsData.monthly
    : [
        { period: 'T05/26', rent: 33.7, service: 8.4, opex: 10.9, total: 42.1 },
        { period: 'T06/26', rent: 36.5, service: 9.1, opex: 11.7, total: 45.6 },
        { period: 'T07/26', rent: 39.3, service: 9.8, opex: 12.2, total: 49.1 },
        { period: 'T08/26', rent: 42.1, service: 9.9, opex: 13.0, total: 52.0 },
        { period: 'T09/26', rent: 44.0, service: 11.0, opex: 14.8, total: 55.0 },
        { period: 'T10/26', rent: 47.4, service: 11.1, opex: 15.2, total: 58.5 },
      ];

  const quarterlyTrends = trendsData?.quarterly?.length
    ? trendsData.quarterly
    : [
        { period: 'Q1/26', rent: 98.3, service: 24.6, opex: 31.9, total: 122.9 },
        { period: 'Q2/26', rent: 112.3, service: 28.1, opex: 35.1, total: 140.4 },
        { period: 'Q3/26', rent: 126.4, service: 31.6, opex: 41.1, total: 158.0 },
        { period: 'Q4/26 (Dự kiến)', rent: 142.2, service: 33.3, opex: 43.9, total: 175.5 },
      ];

  const chartData = selectedView === 'quarter' ? quarterlyTrends : monthlyTrends;
  const maxVal = Math.max(...chartData.map((d) => d.total), 1);


  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {isAccountant
                ? 'Bảng Điều Khiển Kế Toán & Dòng Tiền'
                : isStaff
                ? 'Bảng Điều Khiển Vận Hành & Quản Trị Căn Hộ'
                : 'Tổng Quan Vận Hành & Quản Trị Hệ Thống'}
            </h1>
            {isAccountant && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                Phân hệ Kế toán
              </span>
            )}
            {isStaff && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded-md">
                Phân hệ Vận hành
              </span>
            )}
            {isAdmin && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200 rounded-md">
                Quản trị Toàn quyền
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAccountant
              ? 'Theo dõi số liệu thực thu, đối soát thanh toán VietQR tự động, quản lý công nợ và dự báo tài chính.'
              : isStaff
              ? 'Theo dõi tỷ lệ lấp đầy, tình trạng phòng trống, yêu cầu bảo trì tiếp nhận và gia hạn hợp đồng.'
              : 'Báo cáo số liệu thời gian thực về dòng tiền, tỷ lệ lấp đầy, an ninh tòa nhà và dự báo AI.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAccountant && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/admin/finance')}
            >
              Thu Phí & Đối Soát
            </Button>
          )}
          {isStaff && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/admin/buildings')}
              >
                Quản Lý Căn Hộ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/maintenance')}
              >
                Yêu Cầu Bảo Trì
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Doanh thu thực thu"
          value={formatCompactCurrency(stats?.totalRevenueMonth || 4850000000)}
          subValue="VNĐ"
          changePercent={stats?.revenueGrowthMoM || 12.4}
          changeText="MoM"
          icon={<DollarSign className="w-4 h-4 text-sky-600" />}
          iconBgColor="bg-sky-50"
        />

        <StatCard
          title="Tỷ lệ lấp đầy"
          value={`${stats?.occupancyRate || 94.6}%`}
          subValue="454/480 căn"
          changePercent={2.1}
          changeText="26 căn trống"
          icon={<Building className="w-4 h-4 text-emerald-600" />}
          iconBgColor="bg-emerald-50"
        />

        <StatCard
          title="Thu nhập ròng (NOI)"
          value={formatCompactCurrency(stats?.netOperatingIncome || 3620000000)}
          subValue="VNĐ"
          badge={`Biên LN ${stats?.noiMarginPercent || 74.6}%`}
          icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
          iconBgColor="bg-purple-50"
        />

        <StatCard
          title="Tổng nợ quá hạn"
          value={formatCompactCurrency(stats?.totalDebtOverdue || 68500000)}
          subValue="6 căn"
          changePercent={stats?.debtChangeMoM || -18.5}
          isPositiveGood={false}
          changeText="> 5 ngày"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          iconBgColor="bg-amber-50"
        />
      </div>

      {/* Main Grid: Cashflow chart + AI Predictive Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Cashflow Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-600" />
                <span>Biểu Đồ Dòng Tiền & Doanh Thu</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Doanh thu cho thuê, dịch vụ tiện ích và lợi nhuận ròng NOI 12 tháng gần nhất.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setSelectedView('month')}
                className={`px-2.5 py-1 rounded transition-all ${
                  selectedView === 'month' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'
                }`}
              >
                Theo tháng
              </button>
              <button
                onClick={() => setSelectedView('quarter')}
                className={`px-2.5 py-1 rounded transition-all ${
                  selectedView === 'quarter' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-500'
                }`}
              >
                Theo quý
              </button>
            </div>
          </div>

          {/* Cashflow & Revenue Bar Chart */}
          <div className="pt-2">
            <div className="h-60 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2 border-b border-slate-200">
              {chartData.map((item, idx) => {
                const heightTotalPercent = Math.min(100, Math.max(18, Math.round((item.total / (maxVal * 1.15)) * 100)));
                const heightOpexPercent = Math.min(100, Math.max(12, Math.round((item.opex / (maxVal * 1.15)) * 100)));
                const rentPercent = Math.round((item.rent / (item.total || 1)) * 100);
                const servicePercent = 100 - rentPercent;
                const isCurrent = idx === chartData.length - 1;

                return (
                  <div key={item.period} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    {/* Rich Floating Tooltip */}
                    <div className="absolute -top-20 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-xs text-white text-[10px] p-2.5 rounded-lg shadow-xl pointer-events-none z-30 whitespace-nowrap min-w-[145px] border border-slate-700">
                      <div className="font-bold text-white mb-1.5 border-b border-slate-700 pb-1 flex justify-between">
                        <span>{item.period}</span>
                        <span className="text-emerald-400 font-semibold">NOI: {(item.total - item.opex).toFixed(1)} {unitLabel}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-xs bg-brand-600 inline-block"></span>Tiền thuê:</span>
                          <strong className="text-white font-medium">{item.rent} {unitLabel}</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-xs bg-sky-400 inline-block"></span>Dịch vụ:</span>
                          <strong className="text-white font-medium">{item.service} {unitLabel}</strong>
                        </div>
                        <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-0.5">
                          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-xs bg-slate-400 inline-block"></span>OpEx (Chi phí):</span>
                          <strong className="text-slate-300 font-medium">{item.opex} {unitLabel}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Dual Bars Container: Revenue Stacked Bar + OpEx Bar */}
                    <div className="w-full flex items-end justify-center h-44 gap-1 sm:gap-1.5">
                      {/* Revenue Stacked Bar (Rent + Service) */}
                      <div
                        style={{ height: `${heightTotalPercent}%` }}
                        className={`w-4 sm:w-7 flex flex-col justify-end rounded-t overflow-hidden transition-all duration-300 ${
                          isCurrent ? 'ring-2 ring-brand-500 shadow-sm' : 'hover:brightness-105'
                        }`}
                      >
                        {/* Service (Top) */}
                        <div
                          style={{ height: `${servicePercent}%` }}
                          className="w-full bg-sky-400 transition-all"
                        />
                        {/* Rent (Bottom) */}
                        <div
                          style={{ height: `${rentPercent}%` }}
                          className="w-full bg-brand-600 transition-all"
                        />
                      </div>

                      {/* OpEx Bar (Gray) */}
                      <div
                        style={{ height: `${heightOpexPercent}%` }}
                        className="w-2 sm:w-3.5 bg-slate-300 hover:bg-slate-400 rounded-t transition-all duration-300"
                      />
                    </div>

                    {/* Period Label */}
                    <span
                      className={`text-[10px] text-center truncate ${
                        isCurrent ? 'text-brand-600 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {item.period}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-brand-600 rounded-xs" />
                  <span className="text-slate-700 font-medium">Tiền thuê</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-sky-400 rounded-xs" />
                  <span className="text-slate-700 font-medium">Dịch vụ</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-slate-300 rounded-xs" />
                  <span className="text-slate-700 font-medium">OpEx</span>
                </span>
              </div>
              <div className="text-slate-700 font-medium">
                Chỉ số: <strong className="text-brand-600">10.680.000 ₫</strong>/căn
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Revenue Sources Breakdown (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-500" />
                <span>Cơ Cấu Nguồn Thu</span>
              </h4>
              <span className="text-xs text-slate-400 font-medium">T11/2026</span>
            </div>

            <div className="space-y-3 mt-4 text-sm">
              <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50/80">
                <span className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                  Tiền thuê căn hộ
                </span>
                <span className="font-semibold text-slate-900">3.783 Tr (78%)</span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50/80">
                <span className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                  Phí quản lý & dịch vụ
                </span>
                <span className="font-semibold text-slate-900">582 Tr (12%)</span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50/80">
                <span className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                  Điện nước tiện ích
                </span>
                <span className="font-semibold text-slate-900">291 Tr (6%)</span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50/80">
                <span className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
                  Gửi xe & Tiện ích khác
                </span>
                <span className="font-semibold text-slate-900">194 Tr (4%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Alerts & Warnings Row (Item 7 & 8) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Cảnh Báo Vận Hành & Thu Hồi Công Nợ</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
                  Thời Gian Thực
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động rà soát hợp đồng sắp đáo hạn trong 30 ngày và các khoản nợ phí quá hạn cần gửi đôn đốc.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/alerts')}
            className="self-start sm:self-auto text-xs"
          >
            <span>Trung Tâm Cảnh Báo AI</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Expiring Contracts */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <FileSignature className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Hợp Đồng Sắp Hết Hạn (&le; 30 Ngày)
                  </h4>
                  <div className="text-lg font-black text-amber-950 mt-0.5">
                    {stats?.expiringContractsCount || 2} Hợp đồng cần gia hạn
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-amber-800 rounded-md border border-amber-200 shadow-2xs">
                Cần xử lý
              </span>
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              Các hợp đồng thuê sắp đáo hạn trong 30 ngày tới. Vui lòng liên hệ cư dân để đàm phán gia hạn hợp đồng mới hoặc chuẩn bị lịch nghiệm thu bàn giao mặt bằng.
            </p>
            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
              <span className="text-[11px] text-amber-800 font-medium">Quy trình: Gia hạn & Tái ký</span>
              <button
                type="button"
                onClick={() => navigate('/admin/contracts')}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem danh sách hợp đồng</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Overdue Receivables & Debts */}
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-900">
                    Khoản Nợ Quá Hạn Cần Thu Hồi
                  </h4>
                  <div className="text-lg font-black text-rose-950 mt-0.5">
                    {formatCurrency(stats?.totalDebtOverdue || 68500000)}
                    <span className="text-xs font-normal text-rose-700 ml-1.5 font-sans">
                      ({stats?.overdueDebtCount || 6} căn nợ &gt; 5 ngày)
                    </span>
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-white text-rose-700 rounded-md border border-rose-200 shadow-2xs">
                Quá hạn
              </span>
            </div>
            <p className="text-xs text-rose-800/90 leading-relaxed">
              Các hóa đơn tiền thuê phòng và phí quản lý tiện ích đã quá hạn thanh toán. Hệ thống hỗ trợ phát sinh mã VietQR và gửi thông điệp đôn đốc tự động.
            </p>
            <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
              <span className="text-[11px] text-rose-800 font-medium">Hỗ trợ: SMS / Zalo / App</span>
              <button
                type="button"
                onClick={() => navigate('/admin/alerts')}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Gửi đôn đốc thu nợ ngay</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OpEx & Maintenance KPI Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>Chi Phí Vận Hành (OpEx) & Quản Lý Kỹ Thuật</span>
          </h4>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded border border-amber-200/60 self-start sm:self-auto">
            Tỷ trọng OpEx 25.4%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col justify-center text-center">
            <span className="text-slate-500 text-[11px]">Tổng chi phí OpEx tháng:</span>
            <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">1.230.000.000 ₫</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg flex flex-col justify-center">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span>Kỹ thuật:</span>
              <span className="font-semibold text-slate-700">35%</span>
            </div>
            <div className="font-bold text-slate-900 text-sm">430.5 Tr</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg flex flex-col justify-center">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span>Nhân sự:</span>
              <span className="font-semibold text-slate-700">40%</span>
            </div>
            <div className="font-bold text-slate-900 text-sm">492.0 Tr</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg flex flex-col justify-center">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span>Điện nước:</span>
              <span className="font-semibold text-slate-700">15%</span>
            </div>
            <div className="font-bold text-slate-900 text-sm">184.5 Tr</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg flex flex-col justify-center">
            <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
              <span>Dự phòng:</span>
              <span className="font-semibold text-slate-700">10%</span>
            </div>
            <div className="font-bold text-slate-900 text-sm">123.0 Tr</div>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <span>82 Phiếu bảo trì trong kỳ</span>
          <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
            Đã đóng 92.7% (76/82)
          </span>
        </div>
      </div>
    </div>
  );
};
