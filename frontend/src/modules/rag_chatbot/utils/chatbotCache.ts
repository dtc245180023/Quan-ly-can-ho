import { IDocumentChunk } from '../../../types';

/**
 * Chuẩn hóa chuỗi câu hỏi: loại bỏ dấu câu, chuyển chữ thường, loại bỏ khoảng trắng thừa
 */
export const normalizeQuestion = (q: string): string => {
  return q
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export interface ICachedRAGAnswer {
  text: string;
  confidence?: number;
  matchedChunks?: IDocumentChunk[];
}

/**
 * Danh mục câu hỏi FAQ mẫu
 */
export const PRESET_FAQ_CACHE: {
  question: string;
  text: string;
  citation: string;
  category: string;
  confidence: number;
}[] = [];

/**
 * Khởi tạo Map cache sẵn sàng.
 * Trả về new Map() rỗng - Mọi câu hỏi của người dùng (kể cả nút gợi ý)
 * đều bắt buộc gửi trực tiếp lên Backend tới Google Gemini AI thật sự!
 */
export const initializeChatbotCache = (): Map<string, any> => {
  return new Map<string, any>();
};
