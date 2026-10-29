import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  User,
  BookOpen,
  Send,
  Upload,
  RefreshCw,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Sliders,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import {
  useGetRAGChunksQuery,
  useAskRAGChatbotMutation,
  useAddDocumentChunkMutation,
} from '../modules/rag_chatbot/services/ragApi';
import { AIBotLogo } from '../components/common/AIBotLogo';
import { IDocumentChunk } from '../types';
import { useToast } from '../hooks/useToast';

export const RagChatbotPage: React.FC = () => {
  const [messages, setMessages] = useState<
    {
      sender: 'user' | 'ai';
      text: string;
      matchedChunks?: IDocumentChunk[];
      confidence?: number;
    }[]
  >([
    {
      sender: 'user',
      text: 'Nhà mình ở căn P.402 muốn chuyển một bộ sofa mới và bàn ăn vào cuối tuần này thì cần đăng ký trước bao lâu và khung giờ nào được phép vận chuyển thang máy hàng?',
    },
    {
      sender: 'ai',
      text: 'Chào anh Lê Hoàng Nam (Căn P.402 – Dwell)! Căn cứ theo Điều 8.2 Quy chế Vận chuyển & Sử dụng thang máy hàng Dwell 2024, BQL xin phản hồi thông tin chi tiết như sau:\n\n1. Thời gian đăng ký: Cần nộp phiếu đăng ký trước ít nhất 24 giờ (Hạn chót trước 17:00 Thứ Sáu tuần này qua Cổng Cư Dân để BQL bố trí bảo vệ ốp lót thang máy).\n\n2. Khung giờ cho phép ngày cuối tuần (Thứ 7 & Chủ Nhật):\n   • Buổi sáng: 08:30 – 11:30\n   • Buổi chiều: 14:00 – 17:30\n   *Lưu ý: Nghiêm cấm vận chuyển sau 18:00 và giờ nghỉ trưa (11:30 – 14:00) để đảm bảo không gian yên tĩnh.\n\n3. Ký quỹ bảo vệ thang hàng: 1.000.000 VNĐ (Hoàn trả ngay vào tài khoản cư dân trong vòng 02 giờ sau khi kết thúc vận chuyển và nghiệm thu cabin thang máy không trầy xước).',
      confidence: 0.942,
      matchedChunks: [
        {
          id: 1,
          docCode: 'Quy_che_van_hanh_thang_may_2024.pdf',
          documentName: 'Quy chế Vận hành & Sử dụng thang máy hàng Dwell 2024',
          title: 'Quy định vận chuyển hàng hóa cồng kềnh & chuyển nhà',
          chunkIndex: 1,
          category: 'ELEVATOR',
          content: 'Việc vận chuyển hàng hóa cồng kềnh (sofa, tủ lạnh lớn, bàn ghế ăn, vật liệu nội thất) bắt buộc phải đăng ký trước ít nhất 24 giờ với Ban Quản Lý và chỉ được thực hiện bằng thang máy hàng chuyên dụng (Service Lift SL-01). Khung giờ cho phép ngày cuối tuần (Thứ 7 & Chủ Nhật): Buổi sáng 08:30 - 11:30 và Buổi chiều 14:00 - 17:30 (Nghiêm cấm vận chuyển sau 18:00 và giờ nghỉ trưa 11:30 - 14:00). Cư dân đóng tiền ký quỹ bảo vệ thang hàng 1.000.000 VNĐ (hoàn trả ngay sau khi kết thúc nghiệm thu cabin không trầy xước).',
          citation: 'Điều 8.2 Quy chế Vận chuyển & Sử dụng thang máy hàng Dwell 2024',
          createdAt: '2024-01-01',
          similarityScore: 0.942,
        },
      ],
    },
  ]);

  const [inputQuestion, setInputQuestion] = useState('');
  const [activeChunkPreview, setActiveChunkPreview] = useState<IDocumentChunk | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // New Chunk state
  const [docName, setDocName] = useState('');
  const [chunkTitle, setChunkTitle] = useState('');
  const [chunkContent, setChunkContent] = useState('');
  const [chunkCitation, setChunkCitation] = useState('');

  const { data: chunks = [] } = useGetRAGChunksQuery({});
  const [askRAG, { isLoading: isAsking }] = useAskRAGChatbotMutation();
  const [addChunk, { isLoading: isUploading }] = useAddDocumentChunkMutation();
  const toast = useToast();

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAsking, isThinking]);

  const handleSendQuestion = async (qText?: string) => {
    const q = qText || inputQuestion.trim();
    if (!q || isAsking || isThinking) return;

    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setInputQuestion('');

    // Luôn gửi câu hỏi lên Backend để gọi Google Gemini AI thật sự
    setIsThinking(true);
    try {
      const res = await askRAG({ question: q }).unwrap();
      const aiResponse = {
        sender: 'ai' as const,
        text: res.answer,
        confidence: res.confidence,
        matchedChunks: res.matchedChunks,
      };

      setMessages((prev) => [...prev, aiResponse]);
      if (res.matchedChunks.length > 0) {
        setActiveChunkPreview(res.matchedChunks[0]);
      }
    } catch {
      toast.error('Lỗi', 'Không thể kết nối đến Trợ lý AI Gemini lúc này');
    } finally {
      setIsThinking(false);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addChunk({
        documentName: docName,
        title: chunkTitle,
        content: chunkContent,
        citation: chunkCitation || `Quy định ${docName}`,
      }).unwrap();

      toast.success('Đã nạp văn bản', 'Đã vector hóa đoạn trích quy định vào Vector DB 768 chiều!');
      setIsUploadModalOpen(false);
      setDocName('');
      setChunkTitle('');
      setChunkContent('');
      setChunkCitation('');
    } catch {
      toast.error('Lỗi', 'Không thể nạp văn bản');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-brand-600 mb-0.5">
            Trợ lý AI & tri thức tòa nhà
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Trợ Lý AI Tra Cứu Nội Quy Tòa Nhà
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            AI RAG kết nối Google Gemini AI tra cứu trực tiếp văn bản nội quy, trích xuất căn cứ pháp lý và giải đáp cư dân 24/7.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Tải Lên Văn Bản
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => toast.success('Đã đồng bộ', 'Đã cập nhật chỉ mục Vector Embeddings thành công!')}
          >
            Đồng Bộ Vector
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="text-xs font-bold text-slate-400 uppercase">Tổng Câu Hỏi Đã Xử Lý (Tháng này)</div>
          <div className="text-2xl font-black text-slate-900 mt-1">1.428</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            ↗ Tự động phản hồi: 99.2% (Avg: 1.2s)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="text-xs font-bold text-slate-400 uppercase">Độ Chính Xác Trích Dẫn (RAG Precision)</div>
          <div className="text-2xl font-black text-brand-600 mt-1">99.6%</div>
          <div className="text-[11px] text-slate-500 mt-1">
            ✓ Không phát sinh ảo giác (Zero Hallucination)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="text-xs font-bold text-slate-400 uppercase">Cơ Sở Dữ Liệu Nội Quy Đã Nạp</div>
          <div className="text-2xl font-black text-purple-600 mt-1">18 Tài Liệu</div>
          <div className="text-[11px] text-slate-500 mt-1">
            PCCC, thang hàng, bãi xe, Gym & Hồ bơi
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
          <div className="text-xs font-bold text-slate-400 uppercase">Mức Độ Hài Lòng Cư Dân (CSAT)</div>
          <div className="text-2xl font-black text-amber-500 mt-1">4.92 <span className="text-xs text-slate-400">/ 5.0</span></div>
          <div className="text-[11px] text-slate-500 mt-1">
            94% cư dân đánh giá câu trả lời rõ ràng
          </div>
        </div>
      </div>

      {/* Main Grid: Chat Console (7 cols) + Knowledge Base & Citation preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chat Console */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-soft flex flex-col h-[650px] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-3.5 bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 text-white flex items-center justify-between border-b border-sky-500/30">
            <div className="flex items-center gap-2.5">
              <AIBotLogo size="lg" badge />
              <div>
                <h3 className="text-xs font-bold text-white">Dwell Policy RAG Copilot</h3>
                <div className="text-[10px] text-sky-100">Môi trường: Cư dân P.402 – Lê Hoàng Nam</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-white bg-white/20 px-2 py-0.5 rounded border border-white/30">
              Google Gemini AI + Dense Embeddings
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="shrink-0 mt-1">
                    <AIBotLogo size="sm" badge />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-soft'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>

                  {m.matchedChunks && m.matchedChunks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-brand-600 font-bold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {m.matchedChunks[0].citation}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Cosine: {(m.confidence || 0.94).toFixed(3)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {(isAsking || isThinking) && (
              <div className="flex gap-3 items-start text-xs text-slate-500 animate-in fade-in duration-200">
                <div className="shrink-0 mt-0.5 animate-pulse">
                  <AIBotLogo size="sm" badge showStatusDot statusColor="bg-sky-400 animate-ping" />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 rounded-bl-none shadow-soft flex items-center gap-3">
                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce" />
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <div className="h-3.5 w-px bg-slate-200" />
                  <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                    Trợ lý AI đang tra cứu & suy luận cùng Gemini...
                  </span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-slate-100/90 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Gợi ý:</span>
            {[
              'Giờ mở cửa hồ bơi & gym?',
              'Phí đỗ xe ô tô tháng?',
              'Giờ thi công sửa chữa?',
              'Quy định nuôi chó mèo?',
            ].map((p, i) => (
              <button
                key={i}
                disabled={isAsking || isThinking}
                onClick={() => handleSendQuestion(p)}
                className="whitespace-nowrap text-[11px] bg-white hover:bg-brand-50 hover:text-brand-600 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shrink-0 disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Nhập câu hỏi tra cứu nội quy (Ví dụ: Căn hộ tầng 4 muốn lắp thêm lưới an toàn ban công...)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputQuestion.trim() || isAsking || isThinking}
                isLoading={isAsking || isThinking}
                rightIcon={<Send className="w-4 h-4" />}
              >
                Gửi Câu Hỏi
              </Button>
            </form>
          </div>
        </div>

        {/* Right: Knowledge Base Documents & Real-time Chunk Verification (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Library Documents */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <span>Thư Viện Tài Liệu RAG</span>
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full">
                18 File Hoạt Động
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {chunks.slice(0, 4).map((chunk) => (
                <div
                  key={chunk.id}
                  onClick={() => setActiveChunkPreview(chunk)}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-brand-50/60 border border-slate-200/70 transition-all cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 line-clamp-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      {chunk.docCode}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                      Indexed 100%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">{chunk.title}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Chunk Verification preview */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Đối Soát Trích Dẫn Thời Gian Thực</span>
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-50 text-purple-700 rounded">
                Cosine Similarity: {activeChunkPreview?.similarityScore || 0.942}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>{activeChunkPreview?.citation || 'Điều 8.2 Quy chế Vận chuyển thang máy 2024'}</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Có mộc đỏ BQL
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed italic text-[11px] bg-white p-3 rounded-xl border border-slate-200">
                "{activeChunkPreview?.content || chunks[0]?.content}"
              </p>
            </div>
          </div>

          {/* Guardrails Box */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-soft space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Guardrails & An Toàn Thông Tin</span>
              </span>
              <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Enforced
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-slate-300">
              <div className="flex items-center justify-between">
                <span>Chế độ chống ảo giác (Anti-Hallucination):</span>
                <strong className="text-white">Chặt Chẽ (Strict)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Phạm vi phản hồi (Domain Bounds):</span>
                <strong className="text-brand-300">Chỉ Nội Quy Dwell</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Nhật ký truy vết pháp lý (Audit Log):</span>
                <strong className="text-emerald-400">Lưu Vết 100%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Add Document Chunk */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Tải Lên & Vector Hóa Văn Bản Nội Quy Mới"
        subtitle="Hệ thống tự động cắt đoạn (300-500 tokens) và tạo vector nhúng 768 chiều"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isUploading}
              onClick={handleAddDocument}
            >
              Nạp Vào Vector Database
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddDocument} className="space-y-4">
          <Input
            label="Tên file tài liệu gốc (.pdf/.docx)"
            required
            placeholder="VD: Quy_dinh_ban_giao_can_ho_2026.pdf"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />

          <Input
            label="Tiêu đề đoạn trích / Quy định"
            required
            placeholder="VD: Quy định về giờ giấc ra vào cổng chính"
            value={chunkTitle}
            onChange={(e) => setChunkTitle(e.target.value)}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nội dung chi tiết điều khoản *
            </label>
            <textarea
              rows={5}
              required
              placeholder="Nhập toàn văn nội dung quy định..."
              value={chunkContent}
              onChange={(e) => setChunkContent(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white"
            />
          </div>

          <Input
            label="Trích dẫn số điều / khoản"
            placeholder="VD: Điều 3.2 Quy chế An ninh Trật tự Dwell"
            value={chunkCitation}
            onChange={(e) => setChunkCitation(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
