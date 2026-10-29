from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.apartment import Apartment
from app.models.amenity import Amenity
from app.database import get_db

import re
from datetime import datetime

from app.models.contract import Contract
from app.models.document_chunk import (
    DocumentChunk
)

from app.models.payment import Payment
from app.models.deposit import Deposit
from app.models.debt_ledger import DebtLedger
from app.models.receivable import Receivable

from app.models.system_alert import (
    SystemAlert
)

from app.models.user import User

from app.schemas.ai import (
    RagQuestionRequest,
    RagResponse,
    ApartmentRecommendRequest,
    ApartmentRecommendResponse
)

from app.dependencies.auth import (
    require_roles
)

from app.services.ai_service import (
    extract_document_text,
    split_into_chunks,
    create_embedding,
    summarize_contract_text,
    summarize_contract_structured,
    generate_alert_draft,
    generate_rag_answer,
    generate_text,
    generate_ai_chat_answer
)


router = APIRouter(
    prefix="/ai",
    tags=["AI"]
)


# =========================================================
# UPLOAD KNOWLEDGE BASE
# =========================================================
@router.post("/knowledge/upload")
async def upload_knowledge_document(
    file: UploadFile = File(...),

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
    )
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File không hợp lệ"
        )

    existing = db.query(
        DocumentChunk
    ).filter(
        DocumentChunk.document_name
        == file.filename
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Tài liệu đã tồn tại"
        )

    file_bytes = await file.read()

    try:

        text = extract_document_text(
            file.filename,
            file_bytes
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Không đọc được nội dung tài liệu"
        )

    chunks = split_into_chunks(text)

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="Không tạo được chunk"
        )

    try:

        for index, chunk in enumerate(chunks):

            vector = create_embedding(
                chunk
            )

            item = DocumentChunk(
                document_name=file.filename,
                chunk_index=index,
                content=chunk,
                embedding_vector=vector
            )

            db.add(item)

        db.commit()

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Lỗi AI: {str(exc)}"
        )

    return {
        "message": "Nạp tài liệu thành công",
        "document_name": file.filename,
        "total_chunks": len(chunks)
    }


# =========================================================
# DANH SÁCH KNOWLEDGE BASE
# =========================================================
@router.get("/knowledge")
def get_knowledge_documents(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
    )
):

    results = (
        db.query(
            DocumentChunk.document_name,

            func.count(
                DocumentChunk.id
            ).label(
                "total_chunks"
            )
        )
        .group_by(
            DocumentChunk.document_name
        )
        .all()
    )

    return [
        {
            "document_name":
                item.document_name,

            "total_chunks":
                item.total_chunks
        }

        for item in results
    ]


# =========================================================
# XÓA TÀI LIỆU
# =========================================================
@router.delete(
    "/knowledge/{document_name}"
)
def delete_knowledge_document(
    document_name: str,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles("ADMIN")
    )
):

    chunks = db.query(
        DocumentChunk
    ).filter(
        DocumentChunk.document_name
        == document_name
    ).all()

    if not chunks:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tài liệu"
        )

    for chunk in chunks:
        db.delete(chunk)

    db.commit()

    return {
        "message":
            "Đã xóa tài liệu khỏi Knowledge Base"
    }


# =========================================================
# CHATBOT RAG
def _cosine_similarity(vec_a, vec_b):
    if not vec_a or not vec_b:
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


@router.get("/knowledge-chunks")
def get_all_knowledge_chunks(db: Session = Depends(get_db)):
    chunks = db.query(DocumentChunk).order_by(DocumentChunk.id.asc()).all()
    return [
        {
            "id": c.id,
            "document_name": c.document_name,
            "chunk_index": c.chunk_index,
            "content": c.content,
            "category": "LIVING_RULES",
            "citation": f"{c.document_name} • Mục {c.chunk_index}",
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in chunks
    ]


@router.post("/seed-knowledge")
def seed_knowledge_endpoint(db: Session = Depends(get_db)):
    rules_chunks = [
        ("Sổ tay Nội quy Tòa nhà Dwell", 1, "Quy định về thời gian sinh hoạt và an ninh trật tự: Cư dân và khách thuê vui lòng giữ trật tự chung sau 22:00 đêm đến 06:00 sáng hôm sau. Không bật nhạc công suất lớn, không tụ tập gây ồn ào ảnh hưởng đến các căn hộ lân cận."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 2, "Quy định về việc nuôi thú cưng (Chó, Mèo): Tòa nhà cho phép nuôi thú cưng nhỏ dưới 10kg, phải tiêm phòng dại đầy đủ và có giấy chứng nhận. Khi ra khỏi căn hộ đến khu vực sảnh hoặc thang máy bắt buộc phải có dây xích, rọ mõm hoặc để trong túi chuyên dụng."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 3, "Quy định an toàn phòng cháy chữa cháy (PCCC) và ban công: Nghiêm cấm đốt vàng mã, than củi hoặc hút thuốc tại hành lang và ban công. Ban công phải giữ thông thoáng, không cơi nới chuồng cọp bít kín lối thoát hiểm khẩn cấp."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 4, "Quy định thanh toán tiền phòng và dịch vụ: Cước phí tiền phòng và dịch vụ điện nước được chốt số vào ngày cuối tháng và phát hành thông báo hóa đơn vào ngày 01 hàng tháng. Cư dân có trách nhiệm hoàn tất thanh toán trước ngày 10 hàng tháng qua quét mã VietQR Napas247 hoặc chuyển khoản."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 5, "Quy định đăng ký tạm trú và người ở cùng: Mọi trường hợp thêm người ở cùng (Roommate) hoặc khách lưu trú qua đêm quá 03 ngày liên tục phải đăng ký khai báo với Ban Quản Lý và nộp bản chụp CCCD để thực hiện thủ tục đăng ký tạm trú theo quy định pháp luật."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 6, "Quy định về thời gian chuyển đồ và sử dụng thang máy hàng: Cư dân được phép chuyển đồ từ 08:30 đến 11:30 sáng và 13:30 đến 17:00 chiều (Thứ Hai đến Thứ Bảy). Nghiêm cấm chuyển đồ cồng kềnh vào giờ cao điểm (07:00 - 08:30 và 17:30 - 19:30), giờ nghỉ trưa và sau 21:00 tối. Cần đăng ký trước với Ban Quản Lý để được hỗ trợ bọc lót cabin thang máy tải hàng."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 7, "Quy định về thi công sửa chữa và khoan đục gây tiếng ồn: Thời gian cho phép thi công từ 08:00 - 11:30 và 13:30 - 17:00 (Thứ Hai đến Thứ Sáu). Nghiêm cấm mọi hoạt động khoan đục gây tiếng ồn vào buổi trưa, ban đêm, các ngày Chủ Nhật và ngày nghỉ lễ. Cần gửi phiếu đăng ký trước cho Ban Quản Lý phê duyệt."),
    ]
    existing_indices = {c.chunk_index for c in db.query(DocumentChunk).all()}
    dummy_vec = [0.01] * 768
    for doc_name, idx, content in rules_chunks:
        if idx not in existing_indices:
            db.add(DocumentChunk(document_name=doc_name, chunk_index=idx, content=content, embedding_vector=dummy_vec))
    db.commit()
    return {"message": "Đã đồng bộ cơ sở tri thức nội quy tòa nhà", "total_chunks": db.query(DocumentChunk).count()}


@router.post("/knowledge-chunks")
def create_knowledge_chunk_endpoint(
    data: dict,
    db: Session = Depends(get_db)
):
    doc_name = data.get("document_name") or data.get("documentName") or "Nội quy Tòa nhà Dwell"
    content = data.get("content") or ""
    if not content.strip():
        raise HTTPException(status_code=400, detail="Nội dung không được để trống")

    existing_count = db.query(DocumentChunk).filter(DocumentChunk.document_name == doc_name).count()
    chunk_idx = data.get("chunk_index") or data.get("chunkIndex") or (existing_count + 1)

    vec = create_embedding(content.strip())
    chunk = DocumentChunk(
        document_name=doc_name.strip(),
        chunk_index=int(chunk_idx),
        content=content.strip(),
        embedding_vector=vec
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)

    return {
        "id": chunk.id,
        "document_name": chunk.document_name,
        "chunk_index": chunk.chunk_index,
        "content": chunk.content,
        "category": "LIVING_RULES",
        "citation": data.get("citation") or f"{chunk.document_name} • Mục {chunk.chunk_index}",
        "created_at": chunk.created_at.isoformat() if chunk.created_at else None,
    }


# =========================================================
# CHATBOT TRỢ LÝ AI (Hỗ trợ cả /chat và /rag-chat)
# =========================================================
@router.post("/chat")
@router.post("/rag-chat")
def rag_chat(
    data: RagQuestionRequest,
    db: Session = Depends(get_db)
):
    question = data.question.strip()
    if len(question) < 2:
        raise HTTPException(status_code=400, detail="Câu hỏi quá ngắn")

    q_lower = question.lower()

    # 1. Kiểm tra an toàn bảo mật cao cấp: Trích xuất mật khẩu hoặc xâm nhập trái phép CSDL
    db_security_keywords = [
        "truy cập csdl", "truy cap csdl", "vào csdl", "vào cơ sở dữ liệu", "truy cập vào cơ sở dữ liệu",
        "dump database", "query db", "select * from", "lấy mật khẩu", "lay mat khau",
        "danh sách mật khẩu", "database credentials", "hack csdl", "drop table", "xem csdl"
    ]
    is_db_exploit = any(k in q_lower for k in db_security_keywords) or (
        ("mật khẩu" in q_lower or "password" in q_lower) and any(w in q_lower for w in ["csdl", "cơ sở dữ liệu", "hiển thị", "lấy", "danh sách", "toàn bộ", "xem"])
    )
    if is_db_exploit:
        return {
            "answer": "Vì lý do an toàn bảo mật và bảo vệ quyền riêng tư theo tiêu chuẩn an ninh mạng, Trợ lý AI tuyệt đối không có quyền và không được phép truy cập vào cơ sở dữ liệu (CSDL) nội bộ của hệ thống hoặc cung cấp mật khẩu người dùng. Bạn vui lòng tra cứu thông tin trên tài khoản cá nhân hoặc liên hệ trực tiếp Ban Quản Lý tòa nhà nhé!",
            "sources": [],
            "citations": [],
            "matchedChunks": [],
            "confidence_score": 1.0,
        }

    # 2. Xử lý thông minh khi người dùng hỏi về thống kê, doanh thu, tài chính, căn hộ
    stats_keywords = [
        "doanh thu", "doanh so", "thống kê", "thoóng kê", "thong ke", "báo cáo", "bao cao",
        "tài chính", "tai chinh", "dòng tiền", "dong tien", "công nợ", "cong no",
        "lợi nhuận", "loi nhuan"
    ]
    apartment_keywords = ["căn hộ", "can ho", "phòng trống", "phong trong"]

    # Nhận diện nếu câu hỏi hướng tới quy chế sinh hoạt cụ thể (nuôi thú cưng, tiếng ồn, PCCC...)
    has_living_rule_topic = any(
        k in q_lower for k in [
            "thú cưng", "nuôi chó", "nuôi mèo", "chó mèo", "rọ mõm", "tiêm dại",
            "khoan đục", "tiếng ồn", "chuyển đồ", "thang máy", "22:00",
            "vàng mã", "đốt vàng", "chuồng cọp", "pccc",
            "tạm trú", "roommate", "người ở cùng"
        ]
    )

    has_stats_kw = any(k in q_lower for k in stats_keywords)
    has_apt_kw = any(k in q_lower for k in apartment_keywords)

    is_stats_or_apartment = has_stats_kw or (has_apt_kw and not has_living_rule_topic)

    if is_stats_or_apartment:
        total_apartments = db.query(Apartment).count()
        available_apts = db.query(Apartment).filter(Apartment.status == "AVAILABLE").all()
        occupied = db.query(Apartment).filter(Apartment.status == "OCCUPIED").count()
        reserved = db.query(Apartment).filter(Apartment.status == "RESERVED").count()
        maintenance = db.query(Apartment).filter(Apartment.status == "MAINTENANCE").count()
        available = len(available_apts)
        occupancy_rate = round(occupied / total_apartments * 100, 1) if total_apartments > 0 else 0

        total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).scalar() or 0
        total_debt = db.query(func.coalesce(func.sum(DebtLedger.current_debt), 0)).scalar() or 0
        held_deposit = db.query(func.coalesce(func.sum(Deposit.amount), 0)).filter(Deposit.status == "HELD").scalar() or 0
        total_deposit = db.query(func.coalesce(func.sum(Deposit.amount), 0)).scalar() or 0
        overdue_count = db.query(Receivable).filter(Receivable.status == "OVERDUE").count()
        payment_count = db.query(Payment).count()

        # Bóc tách tháng và năm nếu có trong câu hỏi
        month_word_map = {
            "tháng một": 1, "thang mot": 1, "tháng 1": 1,
            "tháng hai": 2, "thang hai": 2, "tháng 2": 2,
            "tháng ba": 3, "thang ba": 3, "tháng 3": 3,
            "tháng bốn": 4, "thang bon": 4, "tháng tư": 4, "thang tu": 4, "tháng 4": 4,
            "tháng năm": 5, "thang nam": 5, "tháng 5": 5,
            "tháng sáu": 6, "thang sau": 6, "tháng 6": 6,
            "tháng bảy": 7, "thang bay": 7, "tháng 7": 7,
            "tháng tám": 8, "thang tam": 8, "tháng 8": 8,
            "tháng chín": 9, "thang chin": 9, "tháng 9": 9,
            "tháng mười một": 11, "thang muoi mot": 11, "tháng 11": 11,
            "tháng mười hai": 12, "thang muoi hai": 12, "tháng 12": 12,
            "tháng mười": 10, "thang muoi": 10, "tháng 10": 10,
        }
        month_num = None
        for m_name, m_val in month_word_map.items():
            if m_name in q_lower:
                month_num = m_val
                break

        if month_num is None:
            regex_month = re.search(r"(?:th[áa]ng|t)\s*(\d{1,2})", q_lower)
            if regex_month:
                try:
                    val = int(regex_month.group(1))
                    if 1 <= val <= 12:
                        month_num = val
                except Exception:
                    pass

        def _safe_dt(val):
            if isinstance(val, datetime):
                return val
            if isinstance(val, str):
                for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
                    try:
                        return datetime.strptime(val[:19], fmt)
                    except Exception:
                        pass
            return None

        month_info = ""
        if month_num is not None:
            try:
                all_payments = db.query(Payment).all()
                month_payments = [
                    p for p in all_payments
                    if _safe_dt(p.payment_date) and _safe_dt(p.payment_date).month == month_num
                ]
                month_rev = sum(float(p.amount) for p in month_payments)
                month_cnt = len(month_payments)
                month_rev_str = f"{month_rev:,.0f} VNĐ".replace(",", ".")
                month_info = f"- **Doanh thu riêng Tháng {month_num}:** **{month_rev_str}** ({month_cnt} giao dịch thành công)\n"
            except Exception:
                pass

        def fmt_curr(val):
            try:
                return f"{float(val):,.0f} VNĐ".replace(",", ".")
            except Exception:
                return f"{val} VNĐ"

        available_rooms_preview = ", ".join([f"{a.room_number} ({fmt_curr(a.price)}/tháng)" for a in available_apts[:5]])
        if len(available_apts) > 5:
            available_rooms_preview += f" và {len(available_apts) - 5} căn khác"
        elif not available_rooms_preview:
            available_rooms_preview = "Hiện tại các căn hộ đều đã được lấp đầy"

        stats_summary = (
            f"- Tổng doanh thu thực thu (Payment): {fmt_curr(total_revenue)} (tổng {payment_count} giao dịch)\n"
            f"{month_info}"
            f"- Tiền cọc đang giữ an toàn (Deposit HELD): {fmt_curr(held_deposit)} (Tổng tiền cọc: {fmt_curr(total_deposit)})\n"
            f"- Tổng công nợ cư dân hiện tại: {fmt_curr(total_debt)} ({overdue_count} hóa đơn quá hạn cần thu)\n"
            f"- Tình hình căn hộ: Tổng số {total_apartments} căn hộ ({occupied} đang cho thuê, {available} căn trống sẵn sàng đón khách, {reserved} căn đã đặt cọc giữ chỗ, {maintenance} căn đang bảo trì)\n"
            f"- Các căn trống sẵn sàng: {available_rooms_preview}\n"
            f"- Tỷ lệ lấp đầy phòng: {occupancy_rate}%\n"
        )

        prompt = f"""
Bạn là Trợ lý AI của hệ thống quản lý tòa nhà Dwell Living.
Người dùng đang hỏi: "{question}"

Dưới đây là số liệu thống kê tài chính và hiện trạng căn hộ thực tế mới nhất trích xuất từ cơ sở dữ liệu hệ thống:
{stats_summary}

Hãy trả lời trực tiếp, chính xác theo đúng các con số trên, trình bày chuyên nghiệp, sáng sủa bằng Markdown (in đậm, danh sách gạch đầu dòng rõ ràng), với phong cách chu đáo, thân thiện và đáng tin cậy.
"""
        try:
            answer = generate_text(prompt)
        except Exception:
            if has_apt_kw and not has_stats_kw:
                answer = (
                    f"### 🏢 Hiện Trạng Căn Hộ & Tỷ Lệ Lấp Đầy Tòa Nhà Dwell Living\n\n"
                    f"Dạ dưới đây là thông tin hiện trạng căn hộ mới nhất từ hệ thống quản lý:\n\n"
                    f"**1. Tình hình căn hộ:**\n"
                    f"- **Tổng số căn hộ:** **{total_apartments}** căn hộ\n"
                    f"- **Đang cho thuê:** **{occupied}** căn\n"
                    f"- **Căn hộ trống sẵn sàng đón khách:** **{available}** căn\n"
                    f"- **Đã đặt cọc / đang bảo trì:** **{maintenance + reserved}** căn\n"
                    f"- **Tỷ lệ lấp đầy:** **{occupancy_rate}%**\n"
                    f"- **Danh sách căn trống tham khảo:** {available_rooms_preview}\n\n"
                    f"**2. Chỉ số Doanh thu & Vận hành:**\n"
                    f"- **Tổng doanh thu tích lũy:** **{fmt_curr(total_revenue)}**\n"
                    f"- **Tiền cọc đang nắm giữ:** **{fmt_curr(held_deposit)}**\n\n"
                    f"*Nếu Quý khách hoặc Quản lý cần xem chi tiết từng phòng hoặc tạo hợp đồng thuê mới, vui lòng truy cập menu Căn hộ hoặc liên hệ Ban Quản Lý nhé!*"
                )
            else:
                answer = (
                    f"### 📊 Báo Cáo Thống Kê & Doanh Thu Tòa Nhà Dwell Living\n\n"
                    f"Dạ dưới đây là số liệu thống kê thực tế mới nhất từ hệ thống quản lý:\n\n"
                    f"**1. Chỉ số Tài chính & Doanh thu:**\n"
                    f"{month_info}"
                    f"- **Tổng doanh thu thực thu:** **{fmt_curr(total_revenue)}** ({payment_count} lượt thanh toán thành công)\n"
                    f"- **Tiền cọc đang nắm giữ:** **{fmt_curr(held_deposit)}**\n"
                    f"- **Tổng công nợ cần thu hồi:** **{fmt_curr(total_debt)}** ({overdue_count} hóa đơn quá hạn)\n\n"
                    f"**2. Hiện trạng Căn hộ & Tỷ lệ lấp đầy:**\n"
                    f"- **Tổng số căn hộ:** **{total_apartments}** căn hộ\n"
                    f"- **Căn hộ đang cho thuê:** **{occupied}** căn\n"
                    f"- **Căn hộ trống sẵn sàng:** **{available}** căn\n"
                    f"- **Căn hộ đặt cọc / bảo trì:** **{maintenance + reserved}** căn\n"
                    f"- **Tỷ lệ lấp đầy:** **{occupancy_rate}%**\n\n"
                    f"*Nếu Quý quản lý hoặc cư dân cần phân tích sâu hơn hoặc xuất báo cáo chi tiết, vui lòng truy cập Dashboard hoặc liên hệ Ban Quản Lý tòa nhà nhé!*"
                )

        return {
            "answer": answer,
            "sources": [{"document_name": "Cơ sở dữ liệu Vận hành & Doanh thu", "chunk_index": 1, "similarity": 1.0}],
            "citations": ["Dữ liệu thời gian thực từ hệ thống Dwell Living"],
            "matchedChunks": [],
            "confidence_score": 1.0,
        }

    # 3. Truy xuất RAG từ document_chunks trong cơ sở dữ liệu tri thức nội bộ
    all_chunks = db.query(DocumentChunk).all()
    matched_chunks = []

    # Thử tính vector tương đồng nếu có embedding model
    query_vector = None
    try:
        query_vector = create_embedding(question)
    except Exception:
        query_vector = None

    q_words = set(re.findall(r"\w+", q_lower))

    for chunk in all_chunks:
        score = 0.0
        # Cosine similarity nếu có vector
        if query_vector and chunk.embedding_vector:
            sim = _cosine_similarity(query_vector, chunk.embedding_vector)
            score = max(score, sim)

        # Keyword & ngữ nghĩa tương đồng (lexical match)
        c_text_lower = (chunk.content + " " + chunk.document_name).lower()
        c_words = set(re.findall(r"\w+", c_text_lower))
        overlap = len(q_words & c_words)
        if overlap > 0:
            score += min(0.65, overlap * 0.12)

        # Semantic keywords trọng yếu theo sơ đồ nghiệp vụ
        topic_keywords = {
            "thú cưng": ["thú cưng", "chó", "mèo", "pet", "dây xích", "rọ mõm"],
            "giờ giấc": ["thang máy", "chuyển đồ", "giờ giấc", "22:00", "06:00", "yên tĩnh", "tiếng ồn"],
            "sửa chữa": ["khoan", "sửa chữa", "thi công", "đục", "gây ồn"],
            "pccc": ["phòng cháy", "pccc", "vàng mã", "hút thuốc", "ban công", "cứu hỏa", "chuồng cọp"],
            "thanh toán": ["tiền phòng", "tiền thuê", "hóa đơn", "vietqr", "ngày 10", "ngày 01", "dịch vụ", "điện nước"],
            "tạm trú": ["tạm trú", "roommate", "người ở cùng", "cccd", "lưu trú", "khách"]
        }
        for topic, kws in topic_keywords.items():
            if any(kw in q_lower for kw in kws) and any(kw in c_text_lower for kw in kws):
                score += 0.35

        if score >= 0.40:
            matched_chunks.append((chunk, min(0.98, score)))

    # Sắp xếp theo độ tương đồng cao nhất
    matched_chunks.sort(key=lambda x: x[1], reverse=True)
    top_matches = matched_chunks[:data.top_k]

    if top_matches:
        contexts = [
            {
                "document_name": c.document_name,
                "chunk_index": c.chunk_index,
                "content": c.content,
            }
            for c, _ in top_matches
        ]
        sources = [
            {
                "document_name": c.document_name,
                "chunk_index": c.chunk_index,
                "similarity": round(sim, 2)
            }
            for c, sim in top_matches
        ]
        citations = [
            f"{c.document_name} • Mục {c.chunk_index}: {c.content}"
            for c, _ in top_matches
        ]
        matched_chunks_payload = [
            {
                "id": c.id,
                "document_name": c.document_name,
                "chunk_index": c.chunk_index,
                "content": c.content,
                "category": "LIVING_RULES",
                "citation": f"{c.document_name} • Mục {c.chunk_index}",
                "similarityScore": round(sim, 2)
            }
            for c, sim in top_matches
        ]

        # Sinh câu trả lời RAG từ context tài liệu
        try:
            answer = generate_rag_answer(question, contexts)
        except Exception:
            best_chunk, best_score = top_matches[0]
            answer = (
                f"**Dựa theo {best_chunk.document_name} (Mục {best_chunk.chunk_index}):**\n\n"
                f"{best_chunk.content}\n\n"
                f"*Nếu Quý cư dân cần hỗ trợ thêm thông tin hoặc giải đáp chi tiết, vui lòng liên hệ trực tiếp Ban Quản Lý tòa nhà nhé!*"
            )

        return {
            "answer": answer,
            "sources": sources,
            "citations": citations,
            "matchedChunks": matched_chunks_payload,
            "confidence_score": round(top_matches[0][1], 2),
        }

    # 4. Khi top_matches rỗng:
    # 4.1 Lời chào thân thiện
    greetings = ["xin chào", "chào bạn", "hello", "hi", "alo", "chào bql", "chào admin", "chào trợ lý"]
    if any(q_lower == g or q_lower.startswith(g + " ") for g in greetings):
        return {
            "answer": "Xin chào! Tôi là Trợ lý AI của tòa nhà Dwell Living. Tôi có thể hỗ trợ bạn tra cứu các quy định, nội quy tòa nhà, thống kê doanh thu, hợp đồng thuê và dịch vụ căn hộ. Bạn cần hỗ trợ vấn đề gì hôm nay?",
            "sources": [],
            "citations": [],
            "matchedChunks": [],
            "confidence_score": 1.0,
        }

    # 4.2 Rào chắn an toàn khi câu hỏi hoàn toàn lạc đề (ẩm thực, chính trị...)
    unrelated_keywords = ["canh chua", "cá lóc", "nấu món", "công thức nấu", "món canh"]
    if any(k in q_lower for k in unrelated_keywords):
        return {
            "answer": (
                "Xin lỗi, câu hỏi này nằm ngoài phạm vi quy chế, nội quy của tòa nhà Dwell Living. "
                "Tôi chỉ có thể hỗ trợ các thông tin liên quan đến quản lý tòa nhà, hợp đồng, dịch vụ và căn hộ. "
                "Nếu bạn cần thêm hỗ trợ khác, vui lòng liên hệ Ban Quản Lý tòa nhà nhé!"
            ),
            "sources": [],
            "citations": [],
            "matchedChunks": [],
            "confidence_score": 0.0,
        }

    # 4.3 Xóa bỏ việc trả về refusal_message cứng nhắc:
    # Thay vào đó, gọi generate_ai_chat_answer(question) để mô hình Gemini trả lời thông minh, thân thiện
    answer = generate_ai_chat_answer(question)
    return {
        "answer": answer,
        "sources": [],
        "citations": [],
        "matchedChunks": [],
        "confidence_score": 0.85,
    }


# =========================================================
# TÓM TẮT HỢP ĐỒNG
# =========================================================
@router.post(
    "/contracts/summarize"
)
async def summarize_contract(
    file: UploadFile = File(...),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
    )
):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File không hợp lệ"
        )

    file_bytes = await file.read()

    try:

        text = extract_document_text(
            file.filename,
            file_bytes
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        )

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Không đọc được hợp đồng"
        )

    try:

        summary = summarize_contract_text(
            text
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Lỗi Gemini: {str(exc)}"
        )

    return {
        "document_name":
            file.filename,

        "summary":
            summary,

        "review_required":
            True
    }


# =========================================================
# AI SOẠN THÔNG BÁO
# =========================================================
@router.post(
    "/alerts/{alert_id}/draft"
)
def create_alert_draft(
    alert_id: int,
    options: dict | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
        )
    )
):

    alert = db.query(
        SystemAlert
    ).filter(
        SystemAlert.id == alert_id
    ).first()

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy cảnh báo"
        )

    opts = options or {}
    tone = opts.get("tone") or "EMPATHETIC"
    scenario = opts.get("scenario") or alert.alert_type

    try:
        draft = generate_alert_draft(
            alert.message,
            tone=tone,
            scenario=scenario
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Lỗi Gemini: {str(exc)}"
        )

    return {
        "alert_id":
            alert.id,

        "alert_type":
            alert.alert_type,

        "original_message":
            alert.message,

        "ai_draft":
            draft,

        "tone":
            tone,

        "scenario":
            scenario,

        "review_required":
            True
    }
@router.post(
    "/apartments/recommend",
    response_model=list[ApartmentRecommendResponse]
)
def recommend_apartments(
    data: ApartmentRecommendRequest,
    db: Session = Depends(get_db)
):

    # ==========================================
    # 1. Kiểm tra dữ liệu đầu vào
    # ==========================================
    if data.max_budget <= 0:
        raise HTTPException(
            status_code=400,
            detail="Ngân sách phải lớn hơn 0"
        )

    if data.occupants <= 0:
        raise HTTPException(
            status_code=400,
            detail="Số người phải lớn hơn 0"
        )

    if (
        data.min_area is not None
        and data.min_area < 0
    ):
        raise HTTPException(
            status_code=400,
            detail="Diện tích không hợp lệ"
        )

    # ==========================================
    # 2. Backend lọc căn hộ thật trong DB
    # ==========================================
    query = db.query(
        Apartment
    ).filter(
        Apartment.status == "AVAILABLE",
        Apartment.price <= data.max_budget,
        Apartment.max_occupants >= data.occupants
    )

    if data.min_area is not None:
        query = query.filter(
            Apartment.area_sqm >= data.min_area
        )

    if data.building_id is not None:
        query = query.filter(
            Apartment.building_id
            == data.building_id
        )

    apartments = (
        query
        .order_by(
            Apartment.price.asc(),
            Apartment.area_sqm.desc()
        )
        .all()
    )

    # ==========================================
    # 3. Chuẩn hóa tiện ích khách yêu cầu
    # ==========================================
    required_amenities = {
        item.strip().lower()
        for item in data.amenities
        if item.strip()
    }

    candidates = []

    for apartment in apartments:

        amenity_rows = (
            db.query(Amenity)
            .filter(
                Amenity.apartment_id
                == apartment.id
            )
            .all()
        )

        amenity_names = [
            item.name
            for item in amenity_rows
        ]

        apartment_amenities = {
            item.lower()
            for item in amenity_names
        }

        # Nếu khách yêu cầu tiện ích, căn hộ phải có đủ
        # Hỗ trợ tìm kiếm tiện ích linh hoạt (matching cụm từ, ví dụ "điều hòa" khớp "điều hòa daikin inverter")
        if required_amenities:
            if not all(any(req in am for am in apartment_amenities) for req in required_amenities):
                continue

        candidates.append({
            "apartment": apartment,
            "amenities": amenity_names
        })

    # Không có căn phù hợp
    if not candidates:
        return []

    # Chỉ tư vấn tối đa 5 căn
    candidates = candidates[:5]

    result = []

    # ==========================================
    # 4. AI chỉ giải thích vì sao phù hợp
    # ==========================================
    for item in candidates:

        apartment = item["apartment"]
        amenity_names = item["amenities"]

        prompt = f"""
Bạn là trợ lý tư vấn thuê căn hộ.

Hãy giải thích ngắn gọn tại sao căn hộ dưới đây
phù hợp với nhu cầu của khách hàng.

Nhu cầu khách:
- Ngân sách tối đa: {data.max_budget} VNĐ/tháng
- Diện tích tối thiểu: {data.min_area}
- Số người ở: {data.occupants}
- Tòa nhà mong muốn: {data.building_id}
- Tiện ích yêu cầu: {data.amenities}

Thông tin căn hộ:
- Mã căn hộ: {apartment.id}
- Phòng: {apartment.room_number}
- Giá: {apartment.price} VNĐ/tháng
- Diện tích: {apartment.area_sqm} m2
- Số người tối đa: {apartment.max_occupants}
- Tiện ích: {amenity_names}

Quy tắc:
- Chỉ sử dụng dữ liệu được cung cấp.
- Không tự tạo căn hộ mới.
- Không bịa tiện ích.
- Không bịa số phòng ngủ.
- Không bịa hình ảnh.
- Trả lời tối đa 3 câu.
"""

        try:
            reason = generate_text(
                prompt
            )

        except Exception:
            # Gemini lỗi thì hệ thống vẫn sử dụng được
            reason = (
                "Căn hộ đáp ứng điều kiện "
                "ngân sách và nhu cầu đã chọn."
            )

        result.append({
            "apartment_id":
                apartment.id,

            "building_id":
                apartment.building_id,

            "room_number":
                apartment.room_number,

            "price":
                apartment.price,

            "area_sqm":
                apartment.area_sqm,

            "max_occupants":
                apartment.max_occupants,

            "amenities":
                amenity_names,

            "reason":
                reason
        })

    return result


# =========================================================
# TÓM TẮT HỢP ĐỒNG THEO ID (TÍCH HỢP TRỰC TIẾP CONTRACT API)
# =========================================================
@router.post(
    "/contracts/{contract_id}/summarize"
)
def summarize_contract_by_id(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF", "ACCOUNTANT", "TENANT")
    )
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng")

    room_num = contract.room_number or f"Căn hộ {contract.apartment_id}"
    tenant_name = contract.tenant_name or "Khách thuê"
    price_val = float(contract.rental_price or 0)
    deposit_val = float(contract.deposit_amount or 0)
    start_str = contract.start_date.strftime("%d/%m/%Y") if contract.start_date else "Ngày ký"
    end_str = contract.end_date.strftime("%d/%m/%Y") if contract.end_date else "12 tháng"

    contract_text = f"""
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
HỢP ĐỒNG THUÊ CĂN HỘ
Mã hợp đồng: {contract.contract_code}
Bên cho thuê (Bên A): Tòa nhà Quản lý Căn hộ Dwell
Bên thuê (Bên B): Ông/Bà {tenant_name}
Căn hộ thuê: {room_num}
Thời hạn thuê: Từ ngày {start_str} đến ngày {end_str}
Giá thuê: {price_val:,.0f} VNĐ/tháng
Tiền cọc bảo đảm: {deposit_val:,.0f} VNĐ
Kỳ hạn thanh toán: Định kỳ trước ngày 10 hàng tháng qua quét mã VietQR Napas247 hoặc chuyển khoản.
Điều kiện chấm dứt: Báo trước tối thiểu 30 ngày bằng văn bản hoặc trên Cổng cư dân, bàn giao phòng nguyên vẹn.
"""
    summary_result = summarize_contract_structured(
        contract_text,
        contract_info={
            "start_date": start_str,
            "end_date": end_str,
            "price": price_val,
            "deposit": deposit_val
        }
    )

    return {
        "contract_id": contract.id,
        "contract_code": contract.contract_code,
        "summary": summary_result["summary"],
        "ai_summary": summary_result["ai_summary"],
        "review_required": True
    }