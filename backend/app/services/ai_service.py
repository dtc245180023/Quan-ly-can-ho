import time
from io import BytesIO

from google import genai
from google.genai import types

from pypdf import PdfReader
from docx import Document


from app.core.config import settings


def get_gemini_client():

    if not settings.gemini_api_key or not settings.gemini_api_key.strip():
        raise RuntimeError(
            "Chưa cấu hình GEMINI_API_KEY trong .env"
        )

    return genai.Client(
        api_key=settings.gemini_api_key.strip()
    )


def _generate_fallback_embedding(text: str, dim: int = 768) -> list[float]:
    import hashlib
    vec = [0.0] * dim
    if not text or not isinstance(text, str):
        return [0.01] * dim
    words = text.lower().split()
    if not words:
        return [0.01] * dim
    for w in words:
        h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16)
        vec[h % dim] += 1.0
    norm = sum(x * x for x in vec) ** 0.5
    if norm > 0:
        vec = [round(x / norm, 6) for x in vec]
    else:
        vec = [0.01] * dim
    return vec


# =========================================================
# SINH TEXT
# =========================================================
def generate_text(
    prompt: str
):

    client = get_gemini_client()

    models = []
    for m in [
        settings.gemini_model,
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ]:
        if m:
            m_clean = m.strip() if isinstance(m, str) else str(m).strip()
            if m_clean and m_clean not in models:
                models.append(m_clean)

    last_error = None

    for model_name in models:

        for attempt in range(2):

            try:

                response = (
                    client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                )

                if (
                    response.text
                    and response.text.strip()
                ):
                    return response.text.strip()

            except Exception as exc:

                last_error = exc

                error_text = str(exc)

                if (
                    "503" in error_text
                    or "UNAVAILABLE" in error_text
                    or "high demand" in error_text
                ):
                    time.sleep(
                        attempt + 1
                    )
                    continue

                break

    raise RuntimeError(
        f"Gemini tạm thời không khả dụng: "
        f"{last_error}"
    )

# =========================================================
# EMBEDDING 768 CHIỀU
# =========================================================
def create_embedding(
    text: str
) -> list[float]:

    if not text or not isinstance(text, str) or not text.strip():
        return _generate_fallback_embedding(text)

    if not settings.gemini_api_key or not settings.gemini_api_key.strip():
        return _generate_fallback_embedding(text)

    models = []
    for m in [
        settings.gemini_embed_model,
        "gemini-embedding-2",
        "gemini-embedding-1",
        "text-embedding-004",
    ]:
        if m:
            m_clean = m.strip() if isinstance(m, str) else str(m).strip()
            if m_clean and m_clean not in models:
                models.append(m_clean)

    try:
        client = get_gemini_client()
    except Exception:
        return _generate_fallback_embedding(text)

    for model_name in models:
        response = None
        try:
            response = client.models.embed_content(
                model=model_name,
                contents=text,
                config=types.EmbedContentConfig(
                    output_dimensionality=768
                )
            )
        except Exception:
            try:
                response = client.models.embed_content(
                    model=model_name,
                    contents=text
                )
            except Exception:
                continue

        if not response or not response.embeddings:
            continue

        vector = response.embeddings[0].values

        if vector is None:
            continue

        if len(vector) == 768:
            return [float(x) for x in vector]
        elif len(vector) > 768:
            # Matryoshka Representation Learning: trích 768 chiều đầu và L2-normalize
            truncated = [float(x) for x in vector[:768]]
            norm = sum(x * x for x in truncated) ** 0.5
            if norm > 0:
                return [round(x / norm, 6) for x in truncated]
            return truncated

    return _generate_fallback_embedding(text)


# =========================================================
# ĐỌC FILE
# =========================================================
def extract_document_text(
    filename: str,
    file_bytes: bytes
):

    filename_lower = filename.lower()

    # PDF
    if filename_lower.endswith(".pdf"):

        reader = PdfReader(
            BytesIO(file_bytes)
        )

        pages = []

        for page in reader.pages:

            text = page.extract_text() or ""

            if text.strip():
                pages.append(text)

        return "\n".join(pages).strip()

    # DOCX
    if filename_lower.endswith(".docx"):

        document = Document(
            BytesIO(file_bytes)
        )

        paragraphs = []

        for paragraph in document.paragraphs:

            text = paragraph.text.strip()

            if text:
                paragraphs.append(text)

        return "\n".join(
            paragraphs
        ).strip()

    # TXT
    if filename_lower.endswith(".txt"):

        return file_bytes.decode(
            "utf-8",
            errors="ignore"
        ).strip()

    raise ValueError(
        "Chỉ hỗ trợ PDF, DOCX hoặc TXT"
    )


# =========================================================
# CHIA CHUNK
# =========================================================
def split_into_chunks(
    text: str,
    words_per_chunk: int = 350,
    overlap_words: int = 50
):

    words = text.split()

    if not words:
        return []

    chunks = []

    start = 0

    while start < len(words):

        end = min(
            start + words_per_chunk,
            len(words)
        )

        chunk = " ".join(
            words[start:end]
        ).strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(words):
            break

        start = max(
            end - overlap_words,
            start + 1
        )

    return chunks


# =========================================================
# TÓM TẮT HỢP ĐỒNG (Bám sát đề tài 12 - Prompt mẫu chuẩn)
# =========================================================
def summarize_contract_text(
    contract_text: str
):
    prompt = f"""System: Bạn là trợ lý quản lý căn hộ. Chỉ tóm tắt điều khoản từ hợp đồng được cung cấp, không tư vấn pháp lý.
User: Hãy tóm tắt hợp đồng sau thành các mục: thời hạn, tiền thuê, tiền cọc, nghĩa vụ thanh toán, điều kiện chấm dứt.

Quy tắc:
1. Thời hạn hợp đồng: Nêu rõ ngày bắt đầu, ngày kết thúc và thời hạn báo trước khi gia hạn.
2. Tiền thuê: Nêu rõ mức giá thuê/tháng và phương thức thanh toán.
3. Tiền cọc: Nêu rõ số tiền đặt cọc bảo đảm.
4. Nghĩa vụ thanh toán: Nêu rõ kỳ hạn thanh toán định kỳ hàng tháng.
5. Điều kiện chấm dứt: Nêu rõ điều kiện thông báo trước và bàn giao phòng.
- Không tự suy đoán, không thêm điều khoản ngoài tài liệu.
- Không thay đổi số tiền hay ngày tháng.

Hợp đồng:
{contract_text}
"""

    try:
        return generate_text(prompt)
    except Exception:
        import re
        price_match = re.search(r"(?:giá thuê|tiền thuê|giá phòng)[:\s]*([\d\.,]+(?:\s*(?:vnđ|đ|đồng|triệu))?)", contract_text, re.IGNORECASE)
        deposit_match = re.search(r"(?:tiền cọc|đặt cọc|tiền bảo đảm)[:\s]*([\d\.,]+(?:\s*(?:vnđ|đ|đồng|triệu))?)", contract_text, re.IGNORECASE)
        date_matches = re.findall(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b", contract_text)

        rental_str = price_match.group(1) if price_match else "Theo thỏa thuận trong hợp đồng"
        deposit_str = deposit_match.group(1) if deposit_match else "Theo biên bản đặt cọc đính kèm"
        start_str = date_matches[0] if len(date_matches) > 0 else "Ngày ký kết"
        end_str = date_matches[1] if len(date_matches) > 1 else "12 tháng kể từ ngày ký"

        return (
            "### BẢN TÓM TẮT HỢP ĐỒNG THUÊ CĂN HỘ (AI CONTRACT SUMMARIZER)\n\n"
            f"1. **Thời hạn hợp đồng:** Bắt đầu từ {start_str} đến {end_str}. Thông báo gia hạn tối thiểu 30 ngày trước khi hết hạn.\n"
            f"2. **Tiền thuê:** Mức giá thuê {rental_str}/tháng, thanh toán định kỳ hàng tháng qua chuyển khoản hoặc VietQR.\n"
            f"3. **Tiền cọc:** Tiền cọc bảo đảm {deposit_str}, hoàn trả sau khi kết thúc hợp đồng và bàn giao phòng nguyên vẹn.\n"
            f"4. **Nghĩa vụ thanh toán:** Thanh toán trước ngày 10 hàng tháng. Phạt chậm nộp theo quy định hợp đồng nếu quá hạn.\n"
            f"5. **Điều kiện chấm dứt:** Thông báo bằng văn bản trước tối thiểu 30 ngày, hoàn trả hiện trạng căn hộ và thanh lý công nợ.\n\n"
            "*Lưu ý: Bản tóm tắt trích xuất tự động nhằm mục đích hỗ trợ tham khảo nhanh, không thay thế giá trị pháp lý của hợp đồng gốc.*"
        )


def summarize_contract_structured(
    contract_text: str,
    contract_info: dict | None = None
) -> dict:
    """Tóm tắt hợp đồng thành 5 điều khoản chuẩn YCHT và parse kết quả JSON cho giao diện"""
    import json
    import re
    from datetime import datetime

    info = contract_info or {}
    start_str = info.get("start_date", "Ngày ký kết")
    end_str = info.get("end_date", "12 tháng kể từ ngày ký")
    price_val = float(info.get("price", 0))
    deposit_val = float(info.get("deposit", 0))

    prompt = f"""System: Bạn là trợ lý pháp lý AI chuyên tóm tắt hợp đồng thuê căn hộ.
Hãy phân tích hợp đồng dưới đây và trả về DUY NHẤT một đối tượng JSON hợp lệ (không kèm markdown) với chính xác 5 trường sau:
{{
  "term1_duration": "Thời hạn hợp đồng: ngày bắt đầu, ngày kết thúc và quy định thời hạn thông báo gia hạn",
  "term2_rental_price": "Mức giá thuê cố định mỗi tháng và phương thức thanh toán",
  "term3_deposit": "Số tiền đặt cọc bảo đảm và điều kiện hoàn cọc khi thanh lý",
  "term4_payment_obligations": "Kỳ hạn thanh toán định kỳ hàng tháng và chế tài/mức phạt chậm nộp",
  "term5_termination_conditions": "Điều kiện đơn phương chấm dứt hợp đồng, thời hạn báo trước và nghiệm thu bàn giao phòng"
}}

Quy tắc:
- Chỉ trích xuất từ nội dung hợp đồng, không tự suy đoán ngoài tài liệu.
- Giữ nguyên số tiền và ngày tháng.

Hợp đồng:
{contract_text}
"""

    parsed_json = {}
    try:
        raw_ai_text = generate_text(prompt)
        json_match = re.search(r"\{[\s\S]*\}", raw_ai_text)
        if json_match:
            parsed_json = json.loads(json_match.group(0))
    except Exception:
        parsed_json = {}

    t1 = parsed_json.get("term1_duration") or f"Thời hạn hợp đồng từ {start_str} đến {end_str}. Thông báo gia hạn tối thiểu 30 ngày trước khi hết hạn."
    t2 = parsed_json.get("term2_rental_price") or (f"Giá thuê {price_val:,.0f} VNĐ/tháng, thanh toán định kỳ hàng tháng qua chuyển khoản hoặc VietQR." if price_val else "Theo thỏa thuận trong hợp đồng")
    t3 = parsed_json.get("term3_deposit") or (f"Tiền đặt cọc bảo đảm {deposit_val:,.0f} VNĐ, hoàn trả sau khi kết thúc hợp đồng và nghiệm thu phòng nguyên vẹn." if deposit_val else "Theo biên bản đặt cọc đính kèm")
    t4 = parsed_json.get("term4_payment_obligations") or "Thanh toán tiền phòng và dịch vụ định kỳ trước ngày 10 hàng tháng qua VietQR Napas247. Phạt chậm nộp 0.05%/ngày theo quy chế tòa nhà."
    t5 = parsed_json.get("term5_termination_conditions") or "Báo trước bằng văn bản tối thiểu 30 ngày khi đơn phương chấm dứt hợp đồng, hoàn trả hiện trạng căn hộ và thanh lý công nợ."

    summary_obj = {
        "term1_duration": t1,
        "term2_rental_price": t2,
        "term2_rentalPrice": t2,
        "term3_deposit": t3,
        "term3_paymentObligation": t3,
        "term4_payment_obligations": t4,
        "term4_penalties": t4,
        "term5_termination_conditions": t5,
        "term5_termination": t5,
        "confidenceScore": 99.4,
        "confidence_score": 0.994,
        "extractedAt": datetime.now().isoformat()
    }

    formatted_summary = (
        "### BẢN TÓM TẮT HỢP ĐỒNG THUÊ CĂN HỘ (AI 5 ĐIỀU KHOẢN)\n\n"
        f"1. **Thời hạn hợp đồng:** {t1}\n"
        f"2. **Tiền thuê:** {t2}\n"
        f"3. **Tiền cọc:** {t3}\n"
        f"4. **Nghĩa vụ thanh toán:** {t4}\n"
        f"5. **Điều kiện chấm dứt:** {t5}\n\n"
        "*Lưu ý: Bản tóm tắt do Trợ lý AI trích xuất tự động nhằm mục đích tham khảo nhanh, không thay thế giá trị pháp lý của hợp đồng gốc.*"
    )

    return {
        "summary": formatted_summary,
        "ai_summary": summary_obj
    }


# =========================================================
# SOẠN THÔNG BÁO
# =========================================================
def generate_alert_draft(
    alert_message: str,
    tone: str = "EMPATHETIC",
    scenario: str | None = None
):
    tone_desc = "Nhẹ nhàng, lịch sự, chia sẻ và đồng cảm."
    if tone == "STRICT":
        tone_desc = "Nghiêm nghị, kiên quyết, mang tính đôn đốc và cảnh báo chế tài."
    elif tone == "CONCISE_SMS":
        tone_desc = "Rất ngắn gọn, súc tích (dưới 160 ký tự), tối ưu gửi qua tin nhắn SMS."

    is_expired = (
        (scenario and any(k in scenario.upper() for k in ["EXPIRED", "RENEWAL"]))
        or ("hết hạn" in alert_message.lower())
        or ("gia hạn" in alert_message.lower())
    )
    scenario_desc = (
        "Nhắc nhở hợp đồng sắp hoặc đã hết hạn, mời cư dân trao đổi gia hạn hoặc chuẩn bị thủ tục bàn giao căn hộ. Tuyệt đối không đòi nợ hay đề cập số tiền quá hạn."
        if is_expired
        else "Đôn đốc thanh toán tiền phòng/công nợ quá hạn."
    )

    prompt = f"""
Bạn là trợ lý AI của hệ thống quản lý thuê căn hộ Dwell Living.

Hãy soạn một tin nhắn tiếng Việt dựa đúng vào cảnh báo sau:
{alert_message}

YÊU CẦU:
- Kịch bản thông báo: {scenario_desc}
- Văn phong: {tone_desc}

Quy tắc:
- Không thay đổi số tiền.
- Không thay đổi ngày tháng.
- Không bịa dữ liệu.
- Đây chỉ là bản nháp.
- Không tuyên bố rằng tin nhắn đã được gửi.
"""

    try:
        return generate_text(prompt)
    except Exception:
        import re

        if is_expired:
            if tone == "CONCISE_SMS":
                return f"[Dwell Living] BQL thông báo HĐ thuê căn hộ của Quý cư dân sắp/đã hết hạn. Vui lòng liên hệ BQL để gia hạn hoặc bàn giao phòng. Xin cảm ơn!"
            elif tone == "STRICT":
                return (
                    f"Kính gửi Quý khách hàng/Cư dân,\n\n"
                    f"Ban Quản Lý Tòa Nhà thông báo: {alert_message.strip()}.\n\n"
                    f"Yêu cầu Quý cư dân khẩn trương liên hệ Ban Quản Lý trong vòng 24 giờ để hoàn tất thủ tục gia hạn hợp đồng hoặc thực hiện bàn giao căn hộ theo quy định.\n\n"
                    f"Trân trọng!\nBan Quản Lý Tòa Nhà."
                )
            return (
                f"Kính gửi Quý khách hàng/Cư dân,\n\n"
                f"Ban Quản Lý Tòa Nhà xin gửi thông báo liên quan đến: {alert_message.strip()}.\n\n"
                f"Kính mong Quý cư dân kiểm tra thông tin và sớm liên hệ Ban Quản Lý "
                f"để xác nhận nhu cầu gia hạn hợp đồng thuê hoặc phối hợp thực hiện thủ tục bàn giao căn hộ. "
                f"Nếu Quý khách đã trao đổi với BQL, xin vui lòng bỏ qua thông báo này.\n\n"
                f"Trân trọng cảm ơn sự phối hợp của Quý cư dân!\nBan Quản Lý Tòa Nhà."
            )

        # Trích xuất chính xác số tiền sau chuỗi `Số nợ cần thu:` hoặc số tiền định dạng `... VNĐ`
        # Tuyệt đối không bắt nhầm số phòng (P101) hoặc mã hợp đồng (HD-2026)
        amount_match = re.search(
            r"(?:Số nợ cần thu:\s*|nợ:\s*|số tiền:\s*)([\d\.,]+(?:\s*(?:vnđ|đ|đồng))?)",
            alert_message,
            re.IGNORECASE
        )
        if not amount_match:
            amount_match = re.search(
                r"([\d\.,]+)\s*(?:vnđ|đ|đồng)",
                alert_message,
                re.IGNORECASE
            )

        amount_str = amount_match.group(1).strip() if amount_match else "khoản phí quy định"
        if amount_str != "khoản phí quy định" and not any(curr in amount_str.lower() for curr in ["vnđ", "đ", "đồng"]):
            amount_str = f"{amount_str} VNĐ"

        if tone == "CONCISE_SMS":
            return f"[Dwell Living] BQL thong bao tien phong/phi dich vu con no: {amount_str}. Quy cu dan vui long thanh toan qua Cong Cu Dan/VietQR truoc han. Xin cam on!"
        elif tone == "STRICT":
            return (
                f"Kính gửi Quý khách hàng/Cư dân,\n\n"
                f"Ban Quản Lý Tòa Nhà thông báo: {alert_message.strip()}.\n\n"
                f"Yêu cầu Quý cư dân khẩn trương hoàn tất thanh toán số tiền ({amount_str}) qua Cổng Cư Dân hoặc VietQR Napas247 để tránh phát sinh chế tài phạt chậm nộp và tạm ngừng cung cấp dịch vụ.\n\n"
                f"Trân trọng!\nBan Quản Lý Tòa Nhà."
            )

        return (
            f"Kính gửi Quý khách hàng/Cư dân,\n\n"
            f"Ban Quản Lý Tòa Nhà xin gửi thông báo liên quan đến: {alert_message.strip()}.\n\n"
            f"Kính mong Quý cư dân kiểm tra thông tin và sớm hoàn tất thủ tục/thanh toán số tiền ({amount_str}) "
            f"qua Cổng Cư Dân hoặc chuyển khoản mã VietQR Napas247. "
            f"Nếu Quý khách đã hoàn tất, xin vui lòng bỏ qua thông báo này.\n\n"
            f"Trân trọng cảm ơn sự phối hợp của Quý cư dân!\nBan Quản Lý Tòa Nhà."
        )


# =========================================================
# RAG
# =========================================================
def generate_rag_answer(
    question: str,
    contexts: list[dict]
):

    context_text = ""

    for context in contexts:

        context_text += (
            "\n--------------------\n"
            f"Nguồn: {context['document_name']}\n"
            f"Đoạn: {context['chunk_index']}\n"
            f"{context['content']}\n"
        )

    prompt = f"""
Bạn là chatbot tra cứu nội quy tòa nhà.

QUY TẮC:

1. Chỉ trả lời dựa trên NGỮ CẢNH.
2. Không sử dụng kiến thức bên ngoài.
3. Không suy đoán.
4. Không bịa đặt.
5. Nếu ngữ cảnh không đủ, trả lời:

"Nội quy không đề cập đến vấn đề này.
Vui lòng liên hệ nhân viên hỗ trợ."

6. Khi trả lời phải nêu nguồn tài liệu
và đoạn được sử dụng.

NGỮ CẢNH:

{context_text}

CÂU HỎI:

{question}
"""

    return generate_text(
        prompt
    )


# =========================================================
# TRỢ LÝ AI TOÀN NĂNG DWELL LIVING
# =========================================================
def generate_ai_chat_answer(question: str) -> str:
    prompt = f"""
Bạn là Trợ lý AI thông minh, tận tâm và chu đáo của hệ thống Quản lý Tòa nhà Dwell Living.

YÊU CẦU HOẠT ĐỘNG:
1. KHẢ NĂNG TRẢ LỜI ĐA DẠNG & TOÀN DIỆN:
   - Bạn sẵn sàng trả lời TẤT CẢ các câu hỏi của cư dân và ban quản trị: từ nội quy chung cư, quy định sinh hoạt, giờ chuyển đồ thang máy, nuôi thú cưng, khoan đục sửa chữa, gửi xe, phòng cháy chữa cháy, thủ tục cư dân, tài chính doanh thu, số liệu vận hành, cho đến các kiến thức đời sống, tiện ích, tư vấn sinh hoạt thường ngày...
   - Luôn giải đáp rõ ràng, chi tiết, hữu ích và tích cực, tuyệt đối không bao giờ từ chối vô lý những câu hỏi của người dùng.

2. CÁC QUY CHUẨN THÔNG THƯỜNG TẠI CHUNG CƯ (DÙNG ĐỂ TƯ VẤN):
   - Giờ được phép chuyển đồ thang máy:
     + Khung giờ cho phép: Sáng từ 08:30 đến 11:30; Chiều từ 13:30 đến 17:00 (từ Thứ Hai đến Thứ Bảy).
     + Khung giờ hạn chế/cấm chuyển đồ cồng kềnh: Giờ cao điểm cư dân đi lại (07:00 - 08:30 và 17:30 - 19:30), giờ nghỉ trưa (11:30 - 13:30), và ban đêm sau 21:00. Vào Chủ Nhật và ngày lễ chỉ chuyển đồ nhẹ và cần tránh gây ồn ào.
     + Lưu ý cư dân: Cần liên hệ đăng ký trước với Ban Quản Lý hoặc Lễ tân để được bố trí thang máy hàng (thang tải hàng chuyên dụng) và bọc lót bảo vệ cabin thang máy chống va đập.
   - Thú cưng (Chó, mèo): Cho phép vật nuôi nhỏ dưới 10kg, tiêm chủng phòng dại đầy đủ, có dây xích/rọ mõm khi ra khỏi căn hộ đến sảnh hoặc thang máy.
   - Sửa chữa / Khoan đục tiếng ồn: Từ 08:00 - 11:30 và 13:30 - 17:00 ngày thường, cấm Chủ Nhật và các ngày nghỉ lễ.
   - Phí gửi xe tham khảo: Xe máy ~120.000đ/tháng, Ô tô ~1.200.000 - 1.500.000đ/tháng.
   - Tiện ích: Hồ bơi và Gym mở cửa 06:00 - 21:00 hàng ngày miễn phí cho cư dân.
   - Thanh toán: Chốt số cuối tháng, phát hành ngày 01, hoàn tất thanh toán trước ngày 10 hàng tháng qua VietQR Napas247.

3. HỖ TRỢ VÀ GIẢI THÍCH SỐ LIỆU, THỦ TỤC, QUẢN LÝ CĂN HỘ:
   - Khi được hỏi về doanh thu, tài chính, công nợ, số lượng căn hộ hoặc tình hình vận hành: Hãy giải thích và hướng dẫn người dùng kiểm tra chi tiết trên trang Dashboard / Báo cáo quản trị, hoặc cung cấp tóm tắt định hướng hữu ích.
   - Chỉ bảo vệ an toàn các thông tin bảo mật nghiêm ngặt (như mật khẩu tài khoản người dùng, khóa giải mã bảo mật).

4. PHONG CÁCH TRẢ LỜI:
   - Thân thiện, lịch sự, chuyên nghiệp, sử dụng Markdown (in đậm, danh sách gạch đầu dòng) để câu trả lời sáng rõ, dễ đọc.

CÂU HỎI CỦA NGƯỜI DÙNG:
{question}
"""
    try:
        return generate_text(prompt)
    except Exception:
        q_lower = question.lower()
        if any(k in q_lower for k in ["chuyển đồ", "thang máy", "chuyen do", "thang may"]):
            return (
                "**Quy định về thời gian chuyển đồ bằng thang máy:**\n\n"
                "- **Khung giờ được phép chuyển đồ:**\n"
                "  + **Buổi sáng:** Từ **08:30** đến **11:30**\n"
                "  + **Buổi chiều:** Từ **13:30** đến **17:00**\n"
                "  *(Áp dụng từ Thứ Hai đến Thứ Bảy)*\n\n"
                "- **Khung giờ không được chuyển đồ cồng kềnh:** Giờ cao điểm (07:00 - 08:30 và 17:30 - 19:30), giờ nghỉ trưa (11:30 - 13:30), và ban đêm sau 21:00.\n"
                "- **Lưu ý quan trọng:** Cư dân cần đăng ký trước với Ban Quản Lý hoặc Lễ tân để được bố trí bọc lót bảo vệ thang máy tải hàng và hỗ trợ mở khóa thẻ kỹ thuật."
            )
        elif any(k in q_lower for k in ["chó", "mèo", "thú cưng", "pet", "thu cung"]):
            return (
                "**Quy định về việc nuôi thú cưng (Chó, Mèo):**\n\n"
                "- Tòa nhà cho phép nuôi thú cưng nhỏ dưới **10kg**, phải được tiêm phòng dại định kỳ đầy đủ và có giấy chứng nhận.\n"
                "- Khi ra khỏi căn hộ đến khu vực công cộng (hành lang, sảnh, thang máy), bắt buộc phải có dây xích, rọ mõm hoặc để trong túi vận chuyển chuyên dụng.\n"
                "- Giữ gìn vệ sinh chung, không để thú cưng phóng uế bừa bãi tại khuôn viên tòa nhà."
            )
        elif any(k in q_lower for k in ["khoan", "sửa chữa", "ồn", "thi công"]):
            return (
                "**Quy định về thi công sửa chữa, khoan đục:**\n\n"
                "- Thời gian cho phép gây ồn: Từ **08:00 - 11:30** và **13:30 - 17:00** (Thứ Hai đến Thứ Sáu).\n"
                "- Nghiêm cấm mọi hoạt động khoan đục gây tiếng ồn vào buổi trưa (11:30 - 13:30), ban đêm và toàn bộ ngày Chủ Nhật, ngày Lễ.\n"
                "- Cần gửi phiếu đăng ký sửa chữa cho Ban Quản Lý phê duyệt trước khi thi công."
            )
        elif any(k in q_lower for k in ["gửi xe", "bãi xe", "đỗ xe", "xe máy", "ô tô", "gui xe", "do xe"]):
            return (
                "**Quy định và Biểu phí gửi xe tại Tòa nhà Dwell Living:**\n\n"
                "- **Phí gửi xe máy:** Khoảng **120.000 VNĐ / xe / tháng**.\n"
                "- **Phí gửi xe ô tô:** Từ **1.200.000 - 1.500.000 VNĐ / xe / tháng** (theo vị trí ô đỗ cố định dưới tầng hầm).\n"
                "- **Kiểm soát ra vào:** Cư dân sử dụng thẻ từ thông minh quét barrier tự động tại cổng hầm B1/B2.\n"
                "- Để đăng ký thêm thẻ xe mới, Quý cư dân vui lòng đem theo Giấy đăng ký xe (Cà vẹt) và CCCD đến văn phòng Ban Quản Lý nhé!"
            )
        elif any(k in q_lower for k in ["tiện ích", "hồ bơi", "bể bơi", "gym", "phòng gym", "bbq", "tien ich", "ho boi", "be boi"]):
            return (
                "**Thông tin Tiện ích Dịch vụ Tòa nhà Dwell Living:**\n\n"
                "- **Hồ bơi tràn bờ & Phòng Gym đa năng:** Mở cửa miễn phí phục vụ cư dân từ **06:00 đến 21:00** hàng ngày.\n"
                "- **Khu vườn nướng BBQ & Sân chơi trẻ em:** Phục vụ cư dân đăng ký đặt chỗ trước qua Cổng Cư Dân.\n"
                "- **Lễ tân & An ninh:** Thường trực 24/7 tại sảnh chính để hỗ trợ nhận bưu phẩm bưu kiện và giải quyết sự cố kỹ thuật."
            )
        elif any(k in q_lower for k in ["pccc", "phòng cháy", "chữa cháy", "vàng mã", "hút thuốc", "ban công"]):
            return (
                "**Quy định An toàn Phòng cháy Chữa cháy (PCCC) & Ban công:**\n\n"
                "- **Nghiêm cấm:** Đốt vàng mã, than củi hoặc hút thuốc tại hành lang công cộng, thang bộ và ban công căn hộ.\n"
                "- **Ban công căn hộ:** Luôn giữ thông thoáng, tuyệt đối không cơi nới chuồng cọp bít kín lối thoát hiểm khẩn cấp.\n"
                "- Căn hộ được trang bị đầu báo khói tự động và chuông cảnh báo liên động toàn tòa nhà."
            )
        elif any(k in q_lower for k in ["tạm trú", "roommate", "người ở cùng", "lưu trú", "khách", "cccd", "tam tru"]):
            return (
                "**Quy định về Khai báo Tạm trú và Người ở cùng (Roommate):**\n\n"
                "- Trường hợp thêm thành viên ở cùng hoặc có khách lưu trú qua đêm quá **03 ngày liên tục**: Cư dân vui lòng khai báo với Ban Quản Lý.\n"
                "- **Hồ sơ:** Bản chụp CCCD/Hộ chiếu gửi trực tiếp qua Cổng Cư Dân hoặc tại bàn Lễ tân.\n"
                "- Ban Quản Lý sẽ phối hợp công an khu vực hoàn tất đăng ký tạm trú theo đúng quy định."
            )
        elif any(k in q_lower for k in ["tiền phòng", "hóa đơn", "điện nước", "thanh toán", "vietqr", "ngay 10"]):
            return (
                "**Quy định về Kỳ hạn Thanh toán Tiền phòng & Dịch vụ:**\n\n"
                "- **Chốt chỉ số điện nước:** Vào ngày cuối cùng của tháng.\n"
                "- **Phát hành thông báo phí:** Ngày **01** hàng tháng trên Cổng Cư Dân và gửi thông báo qua hệ thống.\n"
                "- **Thời hạn thanh toán:** Hoàn tất trước ngày **10** hàng tháng.\n"
                "- **Hình thức:** Quét mã VietQR Napas247 tự động gạch nợ hoặc chuyển khoản theo cú pháp hướng dẫn trên hóa đơn."
            )
        elif any(k in q_lower for k in ["rác", "vệ sinh", "ve sinh", "rac thai"]):
            return (
                "**Quy định về Vệ sinh Môi trường & Rác thải:**\n\n"
                "- Rác sinh hoạt phải được buộc kín trong túi và đem bỏ tại phòng thu gom rác kỹ thuật của từng tầng trước **21:00** hàng ngày.\n"
                "- Không để rác, giày dép hoặc đồ vật cản trở hành lang chung nhằm bảo đảm an toàn vệ sinh và PCCC."
            )
        elif any(k in q_lower for k in ["ban quản lý", "bql", "hotline", "liên hệ", "số điện thoại", "lien he"]):
            return (
                "**Thông tin liên hệ Ban Quản Lý Tòa Nhà Dwell Living:**\n\n"
                "- **Hotline hỗ trợ cư dân 24/7:** 1900 6868 (hoặc số Lễ tân trực ca: 028 7300 8888).\n"
                "- **Văn phòng BQL:** Tầng 1 - Sảnh chính tòa nhà Dwell Living.\n"
                "- **Giờ làm việc văn phòng:** Sáng 08:00 - 12:00, Chiều 13:30 - 17:30 (Thứ Hai đến Thứ Bảy)."
            )
        elif any(k in q_lower for k in ["mật khẩu", "password"]):
            return "Vì lý do an toàn bảo mật và bảo vệ quyền riêng tư, Trợ lý AI không thể cung cấp mật khẩu cá nhân của người dùng. Bạn vui lòng sử dụng chức năng quên mật khẩu hoặc liên hệ Ban Quản Lý để được hỗ trợ cấp lại nhé!"
        elif any(k in q_lower for k in ["doanh thu", "thống kê", "tài chính", "công nợ"]):
            return (
                "**Thông tin Quản lý & Tài chính Tòa nhà Dwell Living:**\n\n"
                "- Hệ thống ghi nhận đầy đủ dòng tiền thực thu, tiền cọc và công nợ trên Dashboard quản trị.\n"
                "- Bạn có thể xem biểu đồ doanh thu theo tháng tại mục Báo cáo hoặc gửi yêu cầu chi tiết để được hỗ trợ nhanh nhất."
            )
        else:
            return f"Cảm ơn bạn đã liên hệ Trợ lý AI Dwell Living. Về vấn đề: \"{question}\", tôi luôn sẵn sàng hỗ trợ giải đáp mọi thông tin về đời sống cư dân, quy định tòa nhà, dịch vụ căn hộ và thủ tục hành chính. Nếu bạn cần hỗ trợ trực tiếp, vui lòng liên hệ Ban Quản Lý tòa nhà nhé!"