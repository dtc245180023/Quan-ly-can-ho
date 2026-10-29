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
  isCached?: boolean;
}

/**
 * Danh mục câu hỏi & trả lời phổ biến được nạp sẵn vào Client-side Cache
 * Cho phép phản hồi tức thì 0ms khi người dùng bấm gợi ý hoặc hỏi các câu hỏi thông dụng
 */
export const PRESET_FAQ_CACHE: {
  question: string;
  text: string;
  citation: string;
  category: string;
  confidence: number;
}[] = [
  {
    question: 'Giờ được phép chuyển đồ thang máy?',
    text: 'Căn cứ Điều 8.2 Quy chế Vận chuyển & Sử dụng thang máy hàng Dwell 2024:\n\n• Ngày trong tuần (Thứ 2 – Thứ 6): 09:00 – 11:30 & 13:30 – 17:00.\n• Ngày cuối tuần (Thứ 7 & Chủ Nhật): 08:30 – 11:30 & 14:00 – 17:30.\n• Lưu ý: Nghiêm cấm vận chuyển sau 18:00 và giờ nghỉ trưa (11:30 – 14:00) để đảm bảo không gian yên tĩnh.\n• Cần đăng ký trước 24 giờ qua Cổng cư dân và đặt cọc ký quỹ cabin 1.000.000 VNĐ (hoàn trả ngay sau khi nghiệm thu không trầy xước).',
    citation: 'Điều 8.2 Quy chế Vận chuyển & Thang máy hàng Dwell 2024',
    category: 'ELEVATOR',
    confidence: 0.985,
  },
  {
    question: 'Tòa nhà có cho nuôi chó mèo không?',
    text: 'Căn cứ Điều 4.1 Quy định Thú cưng Tòa nhà Dwell:\n\n• Cư dân được phép nuôi chó cảnh, mèo cảnh trọng lượng dưới 15kg (tối đa 02 con/căn hộ).\n• Bắt buộc khai báo thông tin vi-chip và tiêm phòng dại định kỳ tại Văn phòng BQL.\n• Khi di chuyển qua khu vực chung (hành lang, sảnh, thang máy hàng): Bắt buộc rọ mõm, dây xích ngắn hoặc lồng vận chuyển chuyên dụng.',
    citation: 'Điều 4.1 Quy chế Thú cưng Khu căn hộ Dwell',
    category: 'PETS',
    confidence: 0.99,
  },
  {
    question: 'Biểu phí gửi xe ô tô bao nhiêu?',
    text: 'Căn cứ Biểu phí Dịch vụ Trông giữ Phương tiện Dwell 2026:\n\n• Ô tô (tầng hầm B1/B2): 1.250.000 VNĐ/tháng (xe thứ nhất); 1.500.000 VNĐ/tháng (xe thứ hai theo biểu quyết tòa nhà).\n• Xe máy / Xe máy điện: 120.000 VNĐ/tháng (đã bao gồm bảo hiểm cháy nổ & trạm sạc có kiểm soát nhiệt an toàn).\n• Xe đạp / Xe đạp điện: 40.000 VNĐ/tháng.',
    citation: 'Biểu phí Gửi xe & Phương tiện Dwell 2026',
    category: 'PARKING',
    confidence: 0.992,
  },
  {
    question: 'Thủ tục đăng ký khoan tường sửa chữa?',
    text: 'Căn cứ Quy chuẩn Thi công & Cải tạo Căn hộ Dwell:\n\n1. Nộp hồ sơ bản vẽ/nội dung sửa chữa và cam kết thi công cho BQL trước 03 ngày làm việc.\n2. Đóng tiền ký quỹ bảo đảm thi công (từ 5.000.000 – 20.000.000 VNĐ tùy quy mô).\n3. Khung giờ được phép phát tiếng ồn: Sáng 08:00 – 11:30, Chiều 13:30 – 17:00 (Thứ 2 đến Thứ 6). Nghiêm cấm thi công Thứ 7, CN và ngày Lễ.',
    citation: 'Quy chuẩn Thi công & Hoàn thiện Nội thất Căn hộ Dwell',
    category: 'REPAIR',
    confidence: 0.98,
  },
  {
    question: 'Giờ mở cửa hồ bơi & gym?',
    text: 'Căn cứ Nội quy Tiện ích Tầng 5 Dwell Living:\n\n• Hồ bơi bốn mùa & Phòng Gym mở cửa liên tục từ 05:30 đến 21:30 hàng ngày (kể cả Thứ 7, CN và ngày Lễ).\n• Cư dân sử dụng FaceID hoặc quẹt thẻ căn hộ tại cổng kiểm soát an ninh tự động.\n• Miễn phí 100% cho cư dân sinh sống tại tòa nhà.',
    citation: 'Điều 2.1 Nội quy Tiện ích Thể thao Dwell',
    category: 'AMENITY',
    confidence: 0.99,
  },
  {
    question: 'Phí đỗ xe ô tô tháng?',
    text: 'Căn cứ Biểu phí Dịch vụ Trông giữ Phương tiện Dwell 2026:\n\n• Ô tô hầm B1/B2: 1.250.000 VNĐ/tháng cho xe thứ nhất; 1.500.000 VNĐ/tháng cho xe thứ hai.\n• Thẻ xe định danh tự động nhận diện biển số tại barrier vào/ra hầm.',
    citation: 'Biểu phí Gửi xe & Phương tiện Dwell 2026',
    category: 'PARKING',
    confidence: 0.992,
  },
  {
    question: 'Giờ thi công sửa chữa?',
    text: 'Khung giờ cho phép thi công, khoan đục phát sinh tiếng ồn:\n\n• Buổi sáng: 08:00 – 11:30\n• Buổi chiều: 13:30 – 17:00\n• Áp dụng từ Thứ Hai đến Thứ Sáu. Thứ Bảy, Chủ Nhật và Ngày Lễ tuyệt đối không thi công gây ồn để đảm bảo trật tự sinh hoạt.',
    citation: 'Điều 5 Quy định Kiểm soát Tiếng ồn & Thi công Dwell',
    category: 'REPAIR',
    confidence: 0.985,
  },
  {
    question: 'Quy định nuôi chó mèo?',
    text: 'Căn cứ Quy định Thú cưng Tòa nhà Dwell:\n\n• Được phép nuôi chó, mèo cảnh dưới 15kg (tối đa 2 con/căn hộ).\n• Bắt buộc đăng ký thông tin với BQL và tiêm phòng dại hàng năm.\n• Khi ra khu vực công cộng phải có rọ mõm, dây dắt hoặc lồng chuyên dụng và chỉ sử dụng thang máy hàng.',
    citation: 'Điều 4.1 Quy chế Thú cưng Khu căn hộ Dwell',
    category: 'PETS',
    confidence: 0.99,
  },
];

/**
 * Khởi tạo Map cache sẵn sàng với các mục FAQ
 */
export const initializeChatbotCache = (): Map<string, any> => {
  const cache = new Map<string, any>();
  PRESET_FAQ_CACHE.forEach((item, index) => {
    const key = normalizeQuestion(item.question);
    cache.set(key, {
      text: item.text,
      confidence: item.confidence,
      isCached: true,
      matchedChunks: [
        {
          id: 1000 + index,
          docCode: `${item.category}_RULES_2026.pdf`,
          documentName: item.citation,
          title: item.question,
          chunkIndex: 1,
          category: item.category,
          content: item.text,
          citation: item.citation,
          createdAt: '2026-01-01',
          similarityScore: item.confidence,
        },
      ],
    });
  });
  return cache;
};
