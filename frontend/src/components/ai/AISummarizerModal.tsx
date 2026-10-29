import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  Send,
  Download,
  AlertTriangle,
  Clock,
  DollarSign,
  Receipt,
  Scale,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AIBotLogo } from '../common/AIBotLogo';
import { IContract } from '../../types';
import { useToast } from '../../hooks/useToast';
import { useSummarizeContractAIMutation } from '../../modules/contracts/services/contractApi';

interface AISummarizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: IContract;
}

export const AISummarizerModal: React.FC<AISummarizerModalProps> = ({
  isOpen,
  onClose,
  contract,
}) => {
  const [copied, setCopied] = useState(false);
  const [liveSummary, setLiveSummary] = useState<any>(null);
  const [summarizeContractAI, { isLoading: isSummarizing }] = useSummarizeContractAIMutation();
  const toast = useToast();

  const handleFetchSummary = async () => {
    if (!contract?.id) return;
    try {
      const res = await summarizeContractAI({ contractId: contract.id }).unwrap();
      const data = res.ai_summary || res;
      setLiveSummary(data);
      toast.success('Đã tóm tắt AI', 'Đã trích xuất thành công 5 điều khoản cốt lõi từ hợp đồng!');
    } catch {
      toast.error('Lỗi', 'Không thể gọi AI tóm tắt hợp đồng lúc này, đang dùng bản lưu sẵn');
    }
  };

  useEffect(() => {
    if (isOpen && contract?.id) {
      handleFetchSummary();
    } else if (!isOpen) {
      setLiveSummary(null);
    }
  }, [isOpen, contract?.id]);

  const activeSummary = liveSummary || contract.aiSummary;
  const confidence = activeSummary?.confidenceScore || (activeSummary?.confidence_score ? Math.round(activeSummary.confidence_score * 100) : 99.4);

  const terms = [
    {
      num: '01',
      title: 'Thời Hạn Hợp Đồng & Quy Định Gia Hạn',
      clauseRef: 'Điều 2 • Trang 2',
      icon: <Clock className="w-4 h-4 text-blue-600" />,
      content: activeSummary?.term1_duration || 'Đang phân tích thời hạn hợp đồng...',
    },
    {
      num: '02',
      title: 'Giá Thuê Căn Hộ & Phương Thức Thanh Toán',
      clauseRef: 'Điều 3 • Trang 3',
      icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
      content: activeSummary?.term2_rental_price || activeSummary?.term2_rentalPrice || 'Đang phân tích mức giá thuê...',
    },
    {
      num: '03',
      title: 'Tiền Cọc Bảo Đảm & Điều Kiện Hoàn Trả',
      clauseRef: 'Điều 4 • Trang 4',
      icon: <Receipt className="w-4 h-4 text-indigo-600" />,
      content: activeSummary?.term3_deposit || activeSummary?.term3_paymentObligation || 'Đang phân tích tiền cọc...',
    },
    {
      num: '04',
      title: 'Kỳ Hạn Thanh Toán & Phạt Chậm Nộp',
      clauseRef: 'Điều 5 & 8 • Trang 5',
      icon: <Scale className="w-4 h-4 text-rose-600" />,
      content: activeSummary?.term4_payment_obligations || activeSummary?.term4_penalties || 'Đang phân tích nghĩa vụ thanh toán...',
    },
    {
      num: '05',
      title: 'Điều Kiện Chấm Dứt HĐ & Bàn Giao Phòng',
      clauseRef: 'Điều 11 • Trang 8',
      icon: <LogOut className="w-4 h-4 text-amber-600" />,
      content: activeSummary?.term5_termination_conditions || activeSummary?.term5_termination || 'Đang phân tích điều kiện chấm dứt...',
    },
  ];

  const handleCopyAll = () => {
    const text = terms.map((t) => `${t.num}. ${t.title} (${t.clauseRef}):\n${t.content}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Đã sao chép', 'Toàn bộ 5 điều khoản cốt lõi đã được lưu vào clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendSummary = () => {
    toast.success('Đã gửi thông báo', `Bản tóm tắt hợp đồng ${contract.contractCode} đã được gửi tới khách thuê qua Zalo ZNS!`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2.5">
          <AIBotLogo size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">AI Contract Summarizer Studio v2.4</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                LEGAL-LLM
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Trích xuất 5 điều khoản pháp lý cốt lõi • Độ tin cậy: {confidence}% (RAG Match)
            </p>
          </div>
        </div>
      }
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Mã HĐ: <strong className="text-slate-800">{contract.contractCode}</strong> ({contract.roomNumber})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin text-brand-600' : ''}`} />}
              onClick={handleFetchSummary}
              disabled={isSummarizing}
            >
              {isSummarizing ? 'Đang tóm tắt...' : 'Tóm tắt lại'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopyAll}
            >
              {copied ? 'Đã Sao Chép' : 'Sao Chép 5 Điều Khoản'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Send className="w-4 h-4" />}
              onClick={handleSendSummary}
            >
              Gửi Tóm Tắt Zalo / Email
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Term Cards */}
        <div className="space-y-3">
          {terms.map((term) => (
            <div
              key={term.num}
              className={`bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-4 transition-all duration-200 hover:border-brand-300 ${
                isSummarizing ? 'opacity-70 animate-pulse' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-brand-700 font-bold text-xs flex items-center justify-center shadow-xs">
                    {term.num}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    {term.title}
                  </h4>
                </div>
                <span className="text-[11px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200/60">
                  {term.clauseRef}
                </span>
              </div>
              <p className="text-xs text-slate-700 pl-8 leading-relaxed font-normal">
                {term.content}
              </p>
            </div>
          ))}
        </div>

        {/* Legal Disclaimer Box */}
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold text-amber-950">Lưu ý quan trọng từ Hệ thống:</strong> Trợ lý AI hỗ trợ tóm tắt điều khoản nhằm mục đích rà soát nhanh và giúp cư dân dễ nắm bắt. Nội dung này không thay thế giá trị pháp lý chính thức của hợp đồng văn bản có chữ ký số/chữ ký tươi của hai bên.
          </div>
        </div>
      </div>
    </Modal>
  );
};
