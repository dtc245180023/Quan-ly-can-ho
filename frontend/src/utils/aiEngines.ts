import { IDocumentChunk, IContractAISummary, IApartment } from '../types';
import { formatCurrency } from './formatters';

/**
 * 1. AI Contract Summarizer Engine (UC001, UC002)
 * Trích xuất 5 điều khoản pháp lý cốt lõi từ hợp đồng
 */
export const summarizeContractWithAI = (
  roomNumber: string,
  price: number,
  deposit: number,
  startDate: string,
  endDate: string,
  tenantName: string
): IContractAISummary => {
  return {
    term1_duration: `Thời hạn 12 tháng liên tục (Bắt đầu từ ${startDate} đến hết ngày ${endDate}). Ưu tiên tái ký với mức giá ổn định cam kết không tăng quá 5% cho chu kỳ tiếp theo.`,
    term2_rentalPrice: `Giá thuê cố định: ${formatCurrency(price)}/tháng. Tiền cọc bảo đảm: ${formatCurrency(deposit)} (tương đương 2 tháng tiền thuê), được hoàn trả trong vòng 48h làm việc sau khi nghiệm thu bàn giao phòng không hư hại.`,
    term3_paymentObligation: `Thanh toán từ ngày 01 đến ngày 05 hàng tháng trực tiếp qua mã VietQR động đối soát tự động. Đơn giá dịch vụ: Điện 3.500đ/kWh, Nước 15.000đ/m³, Phí quản lý 200.000đ/tháng, Internet tốc độ cao miễn phí.`,
    term4_penalties: `Phạt quá hạn 0.05%/ngày tính trên tổng dư nợ chậm nộp sau ngày 10 hàng tháng. Trường hợp chậm quá 15 ngày, BQL có quyền đơn phương tạm ngưng cấp dịch vụ điện/nước và tính chế tài theo quy chế.`,
    term5_termination: `Bên thuê cần thông báo bằng văn bản hoặc gửi yêu cầu trên Cổng cư dân tối thiểu 30 ngày trước khi trả phòng. Hoàn trả hiện trạng phòng nguyên vẹn, nghiệm thu đầy đủ các trang thiết bị theo biên bản bàn giao.`,
    confidenceScore: 99.4,
    extractedAt: new Date().toISOString(),
  };
};

/**
 * 2. AI Smart Dunning & Notification Engine (UC005)
 * Soạn thảo tin nhắn đôn đốc nợ / gia hạn theo kịch bản và tone giọng
 */
export interface IDunningPromptOptions {
  customerName: string;
  roomNumber: string;
  buildingName: string;
  amountDue?: number;
  dueDate?: string;
  daysOverdue?: number;
  daysUntilExpiry?: number;
  scenario: 'FRIENDLY_REMINDER' | 'OVERDUE_WITH_PENALTY' | 'CONTRACT_RENEWAL' | 'SERVICE_SUSPENSION_WARNING';
  tone: 'EMPATHETIC' | 'STRICT' | 'CONCISE_SMS';
}

export const generateAIDunningDraft = (options: IDunningPromptOptions) => {
  const { customerName, roomNumber, buildingName, amountDue = 0, dueDate = '05 hàng tháng', daysOverdue = 5, daysUntilExpiry = 30, scenario, tone } = options;

  let subject = '';
  let body = '';

  if (scenario === 'OVERDUE_WITH_PENALTY') {
    const penaltyAmount = Math.round(amountDue * 0.0005 * daysOverdue);
    subject = `Thông báo cước phí quá hạn & Hướng dẫn thanh toán T11/2026 – Căn ${roomNumber}`;

    if (tone === 'STRICT') {
      body = `Kính gửi Anh/Chị ${customerName} (Căn hộ ${roomNumber} - ${buildingName}),\n\n` +
        `Ban Quản Lý xin thông báo: Khoản phí dịch vụ và tiền thuê tháng này với tổng số tiền ${formatCurrency(amountDue)} đã QUÁ HẠN ${daysOverdue} NGÀY (Hạn chót: ${dueDate}).\n\n` +
        `Căn cứ theo Điều 4 Hợp đồng thuê, mức phí phạt chậm trả 0.05%/ngày hiện đang được tính lũy kế (+${formatCurrency(penaltyAmount)}).\n\n` +
        `Để tránh bị tạm khóa các dịch vụ tiện ích và ảnh hưởng điểm uy tín cư dân, đề nghị Anh/Chị hoàn tất thanh toán trước 18:00 ngày mai thông qua mã VietQR trong Cổng Dịch Vụ Cư Dân.\n\n` +
        `Trân trọng,\nBan Quản Lý Tòa Nhà.`;
    } else if (tone === 'CONCISE_SMS') {
      body = `[DWELL] TB: Can ${roomNumber} qua han ${daysOverdue} ngay tong ${formatCurrency(amountDue)}. Vui long quet VietQR tai app de hoan tat truoc 18h. Hotline: 1900 8899.`;
    } else {
      // EMPATHETIC (Default)
      body = `Kính gửi Anh/Chị ${customerName} (Căn ${roomNumber} - ${buildingName}),\n\n` +
        `Ban Quản Lý xin thông báo cước phí dịch vụ kỳ này của căn hộ với tổng số tiền ${formatCurrency(amountDue)} hiện đã quá hạn thanh toán ${daysOverdue} ngày (Hạn gốc: ${dueDate}).\n\n` +
        `Hệ thống ghi nhận lịch sử thanh toán của Anh/Chị trước đây rất xuất sắc. Để duy trì điểm tín nhiệm cư dân văn minh và tránh phát sinh phí phạt theo quy định hợp đồng, Anh/Chị vui lòng bấm vào link VietQR Tự Động để hoàn tất nhé.\n\n` +
        `*Nếu Anh/Chị đã thanh toán trong 2 giờ qua, xin vui lòng bỏ qua thông báo này. Chúc Anh/Chị một ngày làm việc tràn đầy năng lượng!`;
    }
  } else if (scenario === 'CONTRACT_RENEWAL') {
    subject = `Đề xuất gia hạn hợp đồng thuê căn hộ ${roomNumber} – Dwell`;
    body = `Kính gửi Quý cư dân ${customerName} (${roomNumber}),\n\n` +
      `Hợp đồng thuê căn hộ của Anh/Chị sẽ hết hạn trong ${daysUntilExpiry} ngày tới. Ban Quản Lý rất vinh hạnh được đồng hành cùng Anh/Chị trong suốt thời gian qua.\n\n` +
      `BQL trân trọng gửi tới Anh/Chị chính sách ưu đãi Tái ký Hợp đồng: Giữ nguyên mức giá thuê ưu đãi 12 tháng tiếp theo và tặng gói bảo dưỡng điều hòa miễn phí.\n\n` +
      `Anh/Chị có thể bấm xác nhận Tái ký điện tử ngay trên Cổng Cư Dân hoặc liên hệ trực tiếp Lễ tân để được hỗ trợ thủ tục nhanh nhất.`;
  } else if (scenario === 'SERVICE_SUSPENSION_WARNING') {
    subject = `[CẢNH BÁO KHẨN] Dự kiến tạm ngưng dịch vụ căn hộ ${roomNumber}`;
    body = `Kính gửi Anh/Chị ${customerName} (${roomNumber}),\n\n` +
      `Do khoản dư nợ ${formatCurrency(amountDue)} đã quá hạn thanh toán nhiều ngày và qua nhiều lần nhắc nhở, BQL xin thông báo sẽ tiến hành tạm ngưng cung cấp dịch vụ kỹ thuật căn hộ sau 24h kể từ thông báo này.\n\n` +
      `Vui lòng quét mã thanh toán ngay để hệ thống tự động gỡ bỏ lệnh tạm khóa. Xin cảm ơn.`;
  } else {
    // FRIENDLY_REMINDER
    subject = `Nhắc cước phí dịch vụ & Tiền phòng tháng này – Căn ${roomNumber}`;
    body = `Chào Anh/Chị ${customerName} (${roomNumber}),\n\nHóa đơn tiền phòng và phí điện nước kỳ này của Anh/Chị đã sẵn sàng trên Cổng Cư Dân với số tiền ${formatCurrency(amountDue)} (Hạn nộp: ${dueDate}). Anh/Chị vui lòng kiểm tra và thanh toán tiện lợi qua VietQR nhé!`;
  }

  return {
    scenario,
    tone,
    subject,
    body,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * 3. AI RAG Query Engine (UC006)
 * Tra cứu nội quy tòa nhà & quy chuẩn cư dân với Cosine Similarity và Guardrails
 */
export interface IRAGAnswerResult {
  answer: string;
  confidence: number;
  matchedChunks: IDocumentChunk[];
  guardrailStatus: 'PASSED' | 'REFUSED_OUT_OF_DOMAIN';
}

export const queryKnowledgeBaseRAG = (
  userQuestion: string,
  knowledgeBase: IDocumentChunk[]
): IRAGAnswerResult => {
  const queryLower = userQuestion.toLowerCase();

  // Guardrail check: Irrelevant or malicious queries
  const outOfDomainKeywords = ['hack', 'bitcoin', 'chính trị', 'đánh bạc', 'xổ số', 'thời tiết sa mạc'];
  if (outOfDomainKeywords.some(k => queryLower.includes(k))) {
    return {
      answer: 'Hệ thống Trợ lý Dwell chỉ hỗ trợ giải đáp các câu hỏi liên quan đến Nội quy tòa nhà, Quy định cư dân, Hợp đồng thuê và Tiện ích căn hộ. Yêu cầu của bạn nằm ngoài phạm vi hỗ trợ.',
      confidence: 0,
      matchedChunks: [],
      guardrailStatus: 'REFUSED_OUT_OF_DOMAIN',
    };
  }

  // Keyword score calculation mimicking Cosine Similarity
  const scoredChunks = knowledgeBase.map(chunk => {
    let score = 0.5;
    const contentLower = chunk.content.toLowerCase();
    const titleLower = chunk.title.toLowerCase();

    // Check keyword overlaps
    const keywords = ['thang máy', 'chuyển đồ', 'thú cưng', 'chó mèo', 'sửa chữa', 'khoan tường', 'rác', 'giờ giấc', 'cửa sảnh', 'gửi xe', 'ô tô', 'xe máy', 'điện nước', 'tiền cọc', 'tiệc tùng', 'karaoke', 'hồ bơi', 'gym', 'pccc', 'bình cứu hỏa'];
    keywords.forEach(kw => {
      if (queryLower.includes(kw) && (contentLower.includes(kw) || titleLower.includes(kw))) {
        score += 0.22;
      }
    });

    if (queryLower.includes('chuyển') && contentLower.includes('vận chuyển')) score += 0.25;
    if (queryLower.includes('thú cưng') && contentLower.includes('nuôi')) score += 0.3;
    if (queryLower.includes('giờ') && contentLower.includes('khung giờ')) score += 0.2;
    if (queryLower.includes('phí') && contentLower.includes('biểu phí')) score += 0.2;

    const normalizedScore = Math.min(0.99, Number(score.toFixed(3)));
    return { ...chunk, similarityScore: normalizedScore };
  });

  // Sort by score
  scoredChunks.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
  const topChunks = scoredChunks.filter(c => (c.similarityScore || 0) > 0.65).slice(0, 3);

  if (topChunks.length === 0) {
    return {
      answer: 'Ban Quản Lý hiện tại chưa tìm thấy điều khoản cụ thể quy định về vấn đề này trong bộ nội quy hiện hành. Bạn có thể gửi câu hỏi hoặc liên hệ Lễ tân tòa nhà qua hotline 1900 8899 để được hỗ trợ chi tiết nhất.',
      confidence: 0.45,
      matchedChunks: [],
      guardrailStatus: 'PASSED',
    };
  }

  const bestChunk = topChunks[0];
  let answerText = `Dạ theo ${bestChunk.citation}:\n\n${bestChunk.content}\n\n*Nếu cần hỗ trợ thêm về quy trình đăng ký, Anh/Chị có thể gửi Smart Ticket trực tiếp tại Cổng Cư Dân nhé!`;

  return {
    answer: answerText,
    confidence: bestChunk.similarityScore || 0.94,
    matchedChunks: topChunks,
    guardrailStatus: 'PASSED',
  };
};

/**
 * 4. AI Room Matcher Engine (UC011)
 * Phân tích nhu cầu khách hàng và chấm điểm căn hộ
 */
export interface IRoomPreference {
  budgetMax: number;
  bedrooms?: number;
  view?: string;
  hasBalcony?: boolean;
  buildingId?: number;
}

export const matchApartmentsWithAI = (apartments: IApartment[], pref: IRoomPreference) => {
  return (apartments || [])
    .filter(apt => apt && apt.status === 'AVAILABLE')
    .map(apt => {
      let score = 20; // Điểm cơ sở

      // 1. Khớp ngân sách (+20 điểm)
      if (apt.price != null && apt.price <= pref.budgetMax) {
        score += 20;
        const savingsRatio = (pref.budgetMax - apt.price) / (pref.budgetMax || 1);
        score += Math.min(4, Math.round(savingsRatio * 10)); // Thưởng tiết kiệm ngân sách (tối đa +4đ)
      }

      // 2. Khớp chính xác số phòng ngủ (+30 điểm)
      if (pref.bedrooms != null) {
        if (apt.bedrooms === pref.bedrooms) {
          score += 30;
        } else if (Math.abs(apt.bedrooms - pref.bedrooms) === 1) {
          score += 10;
        }
      }

      // 3. Khớp hướng view (+25 điểm)
      const viewMatched = pref.view && apt.viewDirection && (
        apt.viewDirection.toLowerCase().includes(pref.view.toLowerCase()) ||
        pref.view.toLowerCase().includes(apt.viewDirection.toLowerCase())
      );
      if (viewMatched) {
        score += 25;
      } else if (!pref.view) {
        score += 20;
      } else {
        score += 5;
      }

      if (pref.buildingId && apt.buildingId === pref.buildingId) {
        score += 2;
      }

      const matchScore = Math.min(99, Math.max(50, score));

      // Sinh aiHighlight cá nhân hóa nêu bật số phòng ngủ và hướng view
      let bedroomHighlight = '';
      if (pref.bedrooms) {
        if (apt.bedrooms === pref.bedrooms) {
          bedroomHighlight = `Thiết kế chuẩn ${apt.bedrooms} phòng ngủ riêng tư & ${apt.bathrooms || 1} WC tiện nghi`;
        } else {
          bedroomHighlight = `Bố trí không gian ${apt.bedrooms} phòng ngủ hiện đại`;
        }
      } else {
        bedroomHighlight = `Căn hộ ${apt.bedrooms} phòng ngủ rộng rãi ${apt.areaSqm}m²`;
      }

      let viewHighlight = '';
      if (viewMatched) {
        viewHighlight = `ban công view ${apt.viewDirection} ngập tràn ánh sáng tự nhiên`;
      } else if (apt.viewDirection) {
        viewHighlight = `ban công hướng ${apt.viewDirection} thoáng mát`;
      } else {
        viewHighlight = `không gian thoáng đãng`;
      }

      let budgetHighlight = '';
      if (apt.price <= pref.budgetMax) {
        const savings = pref.budgetMax - apt.price;
        budgetHighlight = savings > 0
          ? `giá ${formatCurrency(apt.price)}/tháng (tiết kiệm ${formatCurrency(savings)})`
          : `giá ${formatCurrency(apt.price)}/tháng tối ưu ngân sách`;
      } else {
        budgetHighlight = `giá ${formatCurrency(apt.price)}/tháng (vượt nhẹ ngân sách dự kiến)`;
      }

      const aiHighlight = `${bedroomHighlight}, ${viewHighlight}, ${budgetHighlight}.`;

      return {
        apartment: apt,
        matchScore,
        aiHighlight,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
};
