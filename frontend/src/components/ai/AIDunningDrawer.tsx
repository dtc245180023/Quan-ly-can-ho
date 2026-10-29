import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  QrCode,
  Shield,
  MessageSquare,
  Mail,
  Smartphone,
  Bell,
  Loader2,
} from 'lucide-react';
import { Button } from '../common/Button';
import { ISystemAlert } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  useRegenerateAIDraftMutation,
  useDispatchAlertChannelsMutation,
} from '../../modules/alerts_ai/services/alertApi';
import { useToast } from '../../hooks/useToast';

interface AIDunningDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alert: ISystemAlert;
}

const TONE_LABELS: Record<'EMPATHETIC' | 'STRICT' | 'CONCISE_SMS', string> = {
  EMPATHETIC: 'Thấu cảm',
  STRICT: 'Nghiêm nghị',
  CONCISE_SMS: 'SMS 160 ký tự',
};

const SCENARIO_ITEMS = [
  { id: 'FRIENDLY_REMINDER', label: 'Nhắc phí kỳ 1 (Thân thiện)', badge: '0 ngày' },
  { id: 'OVERDUE_WITH_PENALTY', label: 'Quá hạn đợt 2 (Kèm chế tài)', badge: '+5 ngày' },
  { id: 'CONTRACT_RENEWAL', label: 'Đề xuất gia hạn HĐ ưu đãi (SQ03)', badge: '30 ngày' },
  { id: 'SERVICE_SUSPENSION_WARNING', label: 'Cảnh báo tạm ngưng dịch vụ', badge: '+10 ngày' },
] as const;

export const AIDunningDrawer: React.FC<AIDunningDrawerProps> = ({
  isOpen,
  onClose,
  alert,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<
    'FRIENDLY_REMINDER' | 'OVERDUE_WITH_PENALTY' | 'CONTRACT_RENEWAL' | 'SERVICE_SUSPENSION_WARNING'
  >(alert?.aiDraftContent?.scenario || 'OVERDUE_WITH_PENALTY');

  const [selectedTone, setSelectedTone] = useState<'EMPATHETIC' | 'STRICT' | 'CONCISE_SMS'>(
    alert?.aiDraftContent?.tone || 'EMPATHETIC'
  );

  const [selectedChannels, setSelectedChannels] = useState<('ZALO' | 'SMS' | 'EMAIL' | 'APP_PUSH')[]>([
    'ZALO',
    'APP_PUSH',
  ]);

  const [subject, setSubject] = useState(alert?.aiDraftContent?.subject || '');
  const [editableBody, setEditableBody] = useState(alert?.aiDraftContent?.body || '');

  const [regenerateAIDraft, { isLoading: isRegenerating }] = useRegenerateAIDraftMutation();
  const [dispatchAlertChannels, { isLoading: isDispatching }] = useDispatchAlertChannelsMutation();
  const toast = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (alert) {
      setSelectedScenario(alert.aiDraftContent?.scenario || 'OVERDUE_WITH_PENALTY');
      setSelectedTone(alert.aiDraftContent?.tone || 'EMPATHETIC');
      setEditableBody(alert.aiDraftContent?.body || '');
      setSubject(
        alert.aiDraftContent?.subject ||
          (alert.alertType === 'EXPIRED_CONTRACT'
            ? `Thông báo gia hạn hợp đồng thuê căn hộ ${alert.roomNumber || 'P101'}`
            : `Thông báo nhắc thanh toán tiền phòng & dịch vụ căn ${alert.roomNumber || 'P101'}`)
      );
    }
  }, [alert?.id, isOpen]);

  if (!isOpen) return null;

  const triggerRegenerate = async (
    targetScenario: typeof selectedScenario,
    targetTone: typeof selectedTone
  ) => {
    if (isRegenerating || !alert) return;

    const prevScenario = selectedScenario;
    const prevTone = selectedTone;

    setSelectedScenario(targetScenario);
    setSelectedTone(targetTone);

    try {
      const res = await regenerateAIDraft({
        alertId: alert.id,
        promptOptions: {
          customerName: alert.targetName,
          roomNumber: alert.roomNumber,
          buildingName: alert.buildingName,
          amountDue: alert.amountDue,
          daysOverdue: alert.daysOverdue,
          daysUntilExpiry: alert.daysUntilExpiry,
          scenario: targetScenario,
          tone: targetTone,
        },
      }).unwrap();

      if (!isMountedRef.current) return;

      setEditableBody(res.aiDraftContent.body);
      if (res.aiDraftContent.subject) {
        setSubject(res.aiDraftContent.subject);
      }
      const scenarioLabel = SCENARIO_ITEMS.find((s) => s.id === targetScenario)?.label || targetScenario;
      const toneLabel = TONE_LABELS[targetTone] || targetTone;
      toast.info('AI đã cập nhật', `Đã áp dụng: ${scenarioLabel} • ${toneLabel}`);
    } catch {
      if (!isMountedRef.current) return;
      // Revert state on failure so UI remains consistent and user can retry
      setSelectedScenario(prevScenario);
      setSelectedTone(prevTone);
      toast.error('Lỗi', 'Không thể sinh lại nội dung lúc này. Vui lòng thử lại!');
    }
  };

  const handleToneChange = (newTone: typeof selectedTone) => {
    if (isRegenerating || newTone === selectedTone) return;
    triggerRegenerate(selectedScenario, newTone);
  };

  const handleScenarioChange = (newScenario: typeof selectedScenario) => {
    if (isRegenerating || newScenario === selectedScenario) return;
    triggerRegenerate(newScenario, selectedTone);
  };

  const toggleChannel = (channel: 'ZALO' | 'SMS' | 'EMAIL' | 'APP_PUSH') => {
    if (isRegenerating || isDispatching) return;
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter((c) => c !== channel));
      }
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleDispatch = async () => {
    if (isRegenerating || isDispatching || !editableBody.trim()) return;
    try {
      await dispatchAlertChannels({
        alertId: alert.id,
        channels: selectedChannels,
        editedBody: editableBody.trim(),
      }).unwrap();
      toast.success(
        'Phát lệnh thành công',
        `Thông báo đôn đốc đã được gửi tới ${alert.targetName} qua ${selectedChannels.join(', ')}!`
      );
      onClose();
    } catch (err: any) {
      const errorMsg =
        err?.data?.detail ||
        err?.data?.message ||
        (typeof err?.data === 'string' ? err.data : null) ||
        'Không thể gửi thông báo lúc này';
      toast.error('Thất bại', errorMsg);
    }
  };

  const currentScenarioLabel = SCENARIO_ITEMS.find((s) => s.id === selectedScenario)?.label || selectedScenario;
  const currentToneLabel = TONE_LABELS[selectedTone] || selectedTone;
  const displaySubject = subject || alert?.aiDraftContent?.subject || (selectedScenario === 'CONTRACT_RENEWAL' ? 'Thông báo gia hạn hợp đồng thuê căn hộ' : 'Thông báo nhắc thanh toán tiền phòng & dịch vụ');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={isDispatching ? undefined : onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sky-500/20 bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs border border-white/25 flex items-center justify-center text-white shadow-soft">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Smart Notification Assistant</h3>
              <p className="text-xs text-sky-100/90 mt-0.5">
                Mô hình fine-tuned CRM-LLM chuyên biệt cho thu hồi công nợ & CSKH
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDispatching}
            className="text-white/80 hover:text-white hover:bg-white/15 p-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          {/* Tenant Context Banner */}
          <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <Shield className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong>Phân tích hồ sơ cư dân {alert.roomNumber}:</strong> Khách{' '}
              <strong className="text-brand-900">{alert.targetName}</strong> ({alert.targetPhone}).
              {alert.amountDue && (
                <> Dư nợ: <strong className="text-rose-700">{formatCurrency(alert.amountDue)}</strong>.</>
              )}{' '}
              Hệ thống đề xuất áp dụng tone giọng <em>Lịch thiệp & Thấu cảm (Empathetic Professional)</em> để giữ trải nghiệm khách hàng cao cấp nhưng vẫn đảm bảo thu nợ đúng hạn.
            </div>
          </div>

          {/* 1. Scenario Templates */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Lựa chọn kịch bản đôn đốc (Scenario Template)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {SCENARIO_ITEMS.map((item) => {
                const isSelected = selectedScenario === item.id;
                return (
                  <button
                    key={item.id}
                    disabled={isRegenerating}
                    onClick={() => handleScenarioChange(item.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs text-left transition-all ${
                      isRegenerating ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      isSelected
                        ? 'bg-brand-50 border-brand-500 text-brand-900 font-semibold shadow-xs ring-1 ring-brand-500'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="line-clamp-1 flex items-center gap-1.5">
                      {isSelected && isRegenerating && (
                        <Loader2 className="w-3 h-3 text-brand-600 animate-spin shrink-0" />
                      )}
                      <span>{item.label}</span>
                    </span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 rounded text-slate-600">
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Omnichannel Routing */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Kênh phát hành đa kênh (Omnichannel Routing)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'ZALO', label: 'Zalo ZNS', sub: 'Official OA', icon: <MessageSquare className="w-4 h-4 text-blue-600" /> },
                { id: 'SMS', label: 'SMS Brand', sub: 'DWELL_VN', icon: <Smartphone className="w-4 h-4 text-emerald-600" /> },
                { id: 'EMAIL', label: 'Email Billing', sub: 'PDF đính kèm', icon: <Mail className="w-4 h-4 text-purple-600" /> },
                { id: 'APP_PUSH', label: 'App Resident', sub: 'Push Alert', icon: <Bell className="w-4 h-4 text-amber-600" /> },
              ].map((channel) => {
                const isSelected = selectedChannels.includes(channel.id as any);
                return (
                  <button
                    key={channel.id}
                    disabled={isRegenerating || isDispatching}
                    onClick={() => toggleChannel(channel.id as any)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isRegenerating || isDispatching ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      isSelected
                        ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500'
                        : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {channel.icon}
                    <span className="text-xs font-bold text-slate-800 mt-1">{channel.label}</span>
                    <span className="text-[10px] text-slate-400">{channel.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. AI Generated Content Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Nội dung AI cá nhân hóa theo ngữ cảnh</span>
              </label>

              {/* Action and Tone switcher */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={() => triggerRegenerate(selectedScenario, selectedTone)}
                  title="Soạn lại nội dung AI"
                  className={`text-xs text-brand-600 hover:text-brand-700 font-semibold inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-brand-200/80 hover:bg-brand-50 transition-colors ${
                    isRegenerating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin text-brand-600' : ''}`} />
                  <span className="hidden sm:inline">Soạn lại</span>
                </button>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  {(['EMPATHETIC', 'STRICT', 'CONCISE_SMS'] as const).map((toneKey) => {
                    const isSelected = selectedTone === toneKey;
                    return (
                      <button
                        key={toneKey}
                        disabled={isRegenerating}
                        onClick={() => handleToneChange(toneKey)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-md font-medium transition-all ${
                          isSelected
                            ? 'bg-white text-brand-700 font-bold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        } ${isRegenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {isSelected && isRegenerating && (
                          <Loader2 className="w-2.5 h-2.5 animate-spin text-brand-600" />
                        )}
                        <span>{TONE_LABELS[toneKey]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <div>
                  Tiêu đề:{' '}
                  <span className="font-normal text-slate-900">
                    {isRegenerating ? (
                      <span className="text-slate-400 italic">Đang cập nhật tiêu đề...</span>
                    ) : (
                      displaySubject
                    )}
                  </span>
                </div>
                {isRegenerating && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200/60 animate-pulse">
                    <Sparkles className="w-3 h-3 text-brand-600" />
                    Đang soạn thảo
                  </span>
                )}
              </div>

              {isRegenerating ? (
                <div className="w-full min-h-[160px] bg-gradient-to-b from-sky-50/60 via-brand-50/30 to-slate-50/80 border border-brand-200/80 rounded-xl p-5 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                  <div className="relative z-10 flex flex-col items-center text-center space-y-3 w-full">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center shadow-xs">
                        <Sparkles className="w-6 h-6 animate-pulse text-brand-600" />
                      </div>
                      <Loader2 className="w-14 h-14 text-brand-500/50 animate-spin absolute" />
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                        <span>Trợ lý AI đang soạn thảo nội dung mới...</span>
                      </div>
                      <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 mt-1 text-[11px] text-brand-700 font-medium">
                        <span>
                          Kịch bản: <span className="font-bold underline decoration-brand-400 underline-offset-2">{currentScenarioLabel}</span>
                        </span>
                        <span>•</span>
                        <span>
                          Văn phong: <span className="font-bold underline decoration-brand-400 underline-offset-2">{currentToneLabel}</span>
                        </span>
                      </div>
                    </div>

                    {/* Skeleton lines mimicking draft lines */}
                    <div className="w-full max-w-sm space-y-2 pt-1 animate-pulse">
                      <div className="h-2.5 bg-brand-200/60 rounded-full w-4/5 mx-auto" />
                      <div className="h-2.5 bg-slate-200 rounded-full w-full" />
                      <div className="h-2.5 bg-slate-200 rounded-full w-11/12 mx-auto" />
                      <div className="h-2.5 bg-brand-200/50 rounded-full w-2/3 mx-auto" />
                    </div>
                  </div>
                </div>
              ) : (
                <textarea
                  rows={6}
                  value={editableBody}
                  onChange={(e) => setEditableBody(e.target.value)}
                  placeholder="Nội dung thông báo do AI soạn thảo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white font-sans transition-colors"
                />
              )}
            </div>

            {/* Embedded VietQR snapshot info */}
            {alert.amountDue && alert.amountDue > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-brand-600" />
                  <div>
                    <div className="font-bold text-slate-900">VietQR Động Khớp Lệnh Tự Động</div>
                    <div className="text-[11px] text-slate-500">STK: 09128889999 • MBBank</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-brand-700">{formatCurrency(alert.amountDue)}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Napas247</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Hạn chế tối đa 2 lần nhắc/tuần trong khung giờ 08:00 - 19:30.
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isDispatching}>
              Hủy
            </Button>
            <Button
              variant="ai"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
              isLoading={isDispatching}
              disabled={isRegenerating || isDispatching || !editableBody.trim()}
              onClick={handleDispatch}
            >
              Phát Lệnh Gửi Đa Kênh Ngay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
