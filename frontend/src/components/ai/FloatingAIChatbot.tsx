import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ExternalLink,
  ChevronDown,
  ShieldAlert,
  FileText,
  RotateCcw,
  Loader2,
  Zap,
} from 'lucide-react';
import { useAskRAGChatbotMutation } from '../../modules/rag_chatbot/services/ragApi';
import { IDocumentChunk } from '../../types';
import { AIBotLogo } from '../common/AIBotLogo';
import {
  normalizeQuestion,
  initializeChatbotCache,
} from '../../modules/rag_chatbot/utils/chatbotCache';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  matchedChunks?: IDocumentChunk[];
  confidence?: number;
  timestamp: string;
  isCached?: boolean;
}

export const FloatingAIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Chào Quý cư dân! Tôi là Trợ lý AI. Tôi có thể hỗ trợ giải đáp mọi thắc mắc của bạn về đời sống, nội quy tòa nhà, giờ giấc chuyển đồ, biểu phí và các tiện ích sinh hoạt thường ngày.',
      timestamp: 'Vừa xong',
    },
  ]);

  // Client-side Cache lưu câu trả lời theo câu hỏi đã chuẩn hóa (bỏ dấu câu, viết thường)
  const cacheRef = useRef<Map<string, any>>(initializeChatbotCache());

  const [askRAG, { isLoading }] = useAskRAGChatbotMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isThinking]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-rag-chatbot', handleOpen);
    return () => window.removeEventListener('open-rag-chatbot', handleOpen);
  }, []);

  const handleSend = async (questionText?: string) => {
    const q = questionText || inputMessage.trim();
    if (!q || isLoading || isThinking) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // Chuẩn hóa câu hỏi: bỏ dấu câu, chữ thường, bỏ khoảng trắng thừa
    const normKey = normalizeQuestion(q);

    // Kiểm tra Client Cache: nếu đã có, hiển thị phản hồi ngay lập tức trong 0ms
    if (cacheRef.current.has(normKey)) {
      const cached = cacheRef.current.get(normKey);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: cached.text,
        matchedChunks: cached.matchedChunks,
        confidence: cached.confidence,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isCached: true,
      };
      setMessages((prev) => [...prev, aiMsg]);
      return;
    }

    // Nếu chưa có trong cache, gọi RAG backend và hiển thị spinner/typing dots
    setIsThinking(true);
    try {
      const response = await askRAG({ question: q }).unwrap();
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.answer,
        matchedChunks: response.matchedChunks,
        confidence: response.confidence,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      // Lưu câu trả lời vào Client Cache để các lần hỏi sau đạt 0ms
      cacheRef.current.set(normKey, {
        text: response.answer,
        matchedChunks: response.matchedChunks,
        confidence: response.confidence,
        isCached: true,
      });

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Xin lỗi, hiện tại tôi đang gặp chút gián đoạn kết nối. Bạn vui lòng thử lại sau giây lát hoặc liên hệ Ban Quản Lý nhé.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const samplePrompts = [
    'Giờ được phép chuyển đồ thang máy?',
    'Tòa nhà có cho nuôi chó mèo không?',
    'Biểu phí gửi xe ô tô bao nhiêu?',
    'Thủ tục đăng ký khoan tường sửa chữa?',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white px-3.5 py-2.5 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl border border-white/20 active:scale-95"
          title="Trợ lý AI (Hỏi đáp 24/7)"
        >
          <div className="relative">
            <AIBotLogo size="sm" badge showStatusDot statusColor="bg-emerald-400" />
          </div>
          <span className="text-xs font-semibold">Trợ lý AI</span>
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[540px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-700 text-white px-4 py-3 flex items-center justify-between border-b border-sky-500/30 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AIBotLogo size="md" />
              <div>
                <h4 className="text-sm font-bold text-white tracking-wide">
                  Trợ lý AI
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: '1',
                      sender: 'ai',
                      text: 'Hộp thoại đã được làm mới. Tôi là Trợ lý AI, tôi có thể hỗ trợ gì thêm cho bạn?',
                      timestamp: 'Vừa xong',
                    },
                  ])
                }
                className="text-sky-200 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
                title="Làm mới hội thoại"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sky-200 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="shrink-0 mt-0.5">
                    <AIBotLogo size="sm" badge />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-soft'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* If AI message contains matched citations */}
                  {msg.matchedChunks && msg.matchedChunks.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3 text-brand-600" />
                        <span>Trích dẫn nguồn xác thực:</span>
                      </div>
                      {msg.matchedChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="bg-brand-50/70 border border-brand-100 rounded-lg p-2 text-[11px] text-brand-900"
                        >
                          <div className="font-semibold text-brand-700">{chunk.citation}</div>
                          <div className="text-slate-500 text-[10px] line-clamp-2 mt-0.5">
                            "{chunk.content}"
                          </div>
                          {chunk.similarityScore && (
                            <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                              <span>Độ khớp Cosine: {(chunk.similarityScore * 100).toFixed(1)}%</span>
                              <span className="text-emerald-600 font-semibold">✓ Đã đối soát</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    className={`mt-1.5 flex items-center justify-between gap-2 text-[9px] ${
                      msg.sender === 'user' ? 'text-blue-100 justify-end' : 'text-slate-400'
                    }`}
                  >
                    {msg.sender === 'ai' && msg.isCached ? (
                      <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 inline-flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
                        0ms Cache
                      </span>
                    ) : (
                      <span />
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {(isLoading || isThinking) && (
              <div className="flex gap-2.5 items-start text-xs text-slate-500 animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 p-0.5 flex items-center justify-center shrink-0">
                  <AIBotLogo size="sm" badge />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-2.5 rounded-bl-none shadow-soft flex items-center gap-3">
                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <div className="h-3 w-px bg-slate-200" />
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" />
                    Trợ lý AI đang tra cứu...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 bg-slate-100/80 border-t border-slate-200/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                disabled={isLoading || isThinking}
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap text-[11px] bg-white hover:bg-brand-50 hover:text-brand-600 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Nhập câu hỏi tra cứu nội quy, biểu phí..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || isThinking}
                className="bg-brand-600 hover:bg-brand-700 text-white p-2.5 rounded-xl disabled:opacity-40 transition-colors shrink-0 shadow-soft"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
