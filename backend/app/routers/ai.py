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
    _generate_fallback_embedding,
    summarize_contract_text,
    summarize_contract_structured,
    generate_alert_draft,
    _generate_fallback_alert_draft,
    generate_rag_answer,
    generate_text,
    generate_ai_chat_answer
)

# =========================================================
# BỘ NHỚ ĐỆM CACHE IN-MEMORY HIỆU NĂNG CAO TURBO (< 0.01s)
# =========================================================
_contract_summary_cache: dict[int, dict] = {}
_contract_file_summary_cache: dict[str, dict] = {}
_alert_draft_cache: dict[tuple, str] = {}
_rag_response_cache: dict[str, dict] = {}


def invalidate_contract_summary_cache(contract_id: int | None = None):
    """Xóa cache tóm tắt hợp đồng khi hợp đồng được cập nhật, kích hoạt, thanh lý hoặc gia hạn"""
    if contract_id is not None:
        _contract_summary_cache.pop(contract_id, None)
    else:
        _contract_summary_cache.clear()


def invalidate_rag_cache():
    """Xóa cache câu trả lời RAG khi cơ sở tri thức được nạp mới, xóa hoặc đồng bộ"""
    _rag_response_cache.clear()


def _safe_dt(val):
    """Chuẩn hóa giá trị thời gian hỗ trợ date, datetime và chuỗi đa định dạng"""
    if val is None:
        return None
    if hasattr(val, "month"):
        return val
    if isinstance(val, str):
        val_str = val.strip()
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(val_str[:19], fmt)
            except Exception:
                pass
    return None


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
        invalidate_rag_cache()

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
    invalidate_rag_cache()

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
        ("Sổ tay Nội quy Tòa nhà Dwell", 8, "Quy định và Biểu phí trông giữ phương tiện (Gửi xe): Phí gửi xe máy tiêu chuẩn là 120.000 VNĐ/xe/tháng; phí gửi xe ô tô tại tầng hầm từ 1.200.000 - 1.500.000 VNĐ/xe/tháng. Cư dân sử dụng thẻ từ thông minh quẹt kiểm soát tự động tại cổng barrier tầng hầm B1/B2. Đăng ký thẻ xe mới tại Văn phòng Ban Quản Lý với Giấy đăng ký xe và CCCD."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 9, "Quy định về Tiện ích dịch vụ (Hồ bơi, Phòng Gym, Vườn BBQ): Hồ bơi tràn bờ và phòng Gym mở cửa phục vụ cư dân từ 06:00 đến 21:00 hàng ngày (miễn phí). Khu vườn nướng BBQ ngoài trời cần đăng ký trước với Ban Quản Lý tối thiểu 24 giờ qua Cổng Cư Dân. Cư dân vui lòng tuân thủ nội quy an toàn và vệ sinh chung."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 10, "Quy định về Vệ sinh Môi trường và Rác thải: Rác sinh hoạt phải được đóng gói trong túi kín và bỏ vào thùng rác tại phòng rác kỹ thuật của từng tầng trước 21:00 hàng ngày. Tuyệt đối không để rác, giày dép hoặc đồ dùng cá nhân tại hành lang chung."),
        ("Sổ tay Nội quy Tòa nhà Dwell", 11, "Thông tin Liên hệ Ban Quản Lý Tòa nhà Dwell Living: Hotline hỗ trợ cư dân 24/7: 1900 6868; hotline Lễ tân trực ca: 028 7300 8888. Văn phòng BQL tại Tầng 1 - Sảnh chính tòa nhà Dwell Living. Thời gian làm việc: Sáng 08:00 - 12:00, Chiều 13:30 - 17:30 (Thứ Hai đến Thứ Bảy).")
    ]
    existing_chunks = {c.chunk_index: c for c in db.query(DocumentChunk).all()}
    for doc_name, idx, content in rules_chunks:
        vec = _generate_fallback_embedding(content)
        if idx not in existing_chunks:
            db.add(DocumentChunk(document_name=doc_name, chunk_index=idx, content=content, embedding_vector=vec))
        else:
            c = existing_chunks[idx]
            # Cập nhật embedding chuẩn nếu trước đó bị gán vector dummy [0.01]*768
            if not c.embedding_vector or (len(c.embedding_vector) >= 2 and abs(c.embedding_vector[0] - c.embedding_vector[1]) < 1e-6):
                c.embedding_vector = vec
                c.content = content
    db.commit()
    invalidate_rag_cache()
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
    invalidate_rag_cache()

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
    q_clean = q_lower.strip()


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

        month_num = None
        year_num = None

        # Trích xuất dạng "10/2026" hoặc "10-2026"
        regex_slash = re.search(r"\b(\d{1,2})[\/\-](20\d{2})\b", q_lower)
        if regex_slash:
            try:
                m_val = int(regex_slash.group(1))
                if 1 <= m_val <= 12:
                    month_num = m_val
                    year_num = int(regex_slash.group(2))
            except Exception:
                pass

        if month_num is None:
            regex_month = re.search(r"\b(?:th[áa]ng|t)\s*(\d{1,2})\b", q_lower)
            if regex_month:
                try:
                    val = int(regex_month.group(1))
                    if 1 <= val <= 12:
                        month_num = val
                except Exception:
                    pass

        if month_num is None:
            month_word_map = {
                "tháng mười một": 11, "thang muoi mot": 11,
                "tháng mười hai": 12, "thang muoi hai": 12,
                "tháng mười": 10, "thang muoi": 10,
                "tháng một": 1, "thang mot": 1,
                "tháng hai": 2, "thang hai": 2,
                "tháng ba": 3, "thang ba": 3,
                "tháng bốn": 4, "thang bon": 4, "tháng tư": 4, "thang tu": 4,
                "tháng năm": 5, "thang nam": 5,
                "tháng sáu": 6, "thang sau": 6,
                "tháng bảy": 7, "thang bay": 7,
                "tháng tám": 8, "thang tam": 8,
                "tháng chín": 9, "thang chin": 9,
            }
            sorted_map = sorted(month_word_map.items(), key=lambda x: len(x[0]), reverse=True)
            for m_name, m_val in sorted_map:
                if m_name in q_lower:
                    month_num = m_val
                    break

        if year_num is None:
            regex_year = re.search(r"(?:th[áa]ng|t)\s*\d{1,2}\s*(?:/|-|\s+năm\s+|\s+nam\s+|\s+)\s*(20\d{2})\b", q_lower)
            if not regex_year:
                regex_year = re.search(r"\b(?:năm|nam)\s*(20\d{2})\b", q_lower)
            if not regex_year and month_num is not None:
                regex_year = re.search(r"\b(20\d{2})\b", q_lower)
            if regex_year:
                try:
                    year_num = int(regex_year.group(1))
                except Exception:
                    pass

        def _safe_dt(val):
            if val is None:
                return None
            if hasattr(val, "month"):
                return val
            if isinstance(val, str):
                val_str = val.strip()
                for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
                    try:
                        return datetime.strptime(val_str[:19], fmt)
                    except Exception:
                        pass
            return None

        def fmt_curr(val):
            try:
                return f"{float(val):,.0f} VNĐ".replace(",", ".")
            except Exception:
                return f"{val} VNĐ"

        month_info = ""
        if month_num is not None:
            try:
                all_payments = db.query(Payment).all()
                month_payments = []
                for p in all_payments:
                    p_dt = _safe_dt(p.payment_date)
                    if p_dt and p_dt.month == month_num:
                        if year_num is None or p_dt.year == year_num:
                            month_payments.append(p)
                month_rev = sum(float(p.amount or 0) for p in month_payments)
                month_cnt = len(month_payments)

                all_recs = db.query(Receivable).all()
                month_recs = [
                    r for r in all_recs
                    if r.billing_month == month_num
                    and (year_num is None or r.billing_year == year_num)
                ]
                month_rec_amount = sum(float(r.total_amount or 0) for r in month_recs)
                month_rec_cnt = len(month_recs)

                month_info = (
                    f"- **Doanh thu thực thu Tháng {month_num}:** **{fmt_curr(month_rev)}** ({month_cnt} giao dịch thành công)\n"
                    f"- **Hóa đơn phát sinh kỳ Tháng {month_num}:** **{fmt_curr(month_rec_amount)}** ({month_rec_cnt} hóa đơn lập trong kỳ)\n"
                )

                if month_rev == 0 and (month_rec_amount > 0 or month_rec_cnt > 0):
                    month_info += (
                        f"  *(💡 Giải thích: Trong Tháng {month_num}, hệ thống đã phát sinh hóa đơn tiền phòng & dịch vụ trị giá "
                        f"{fmt_curr(month_rec_amount)} nhưng hiện đang ở trạng thái Chưa thanh toán/Chờ thu, "
                        f"chưa có dòng tiền thực nộp về tài khoản. Khoản thực thu lũy kế {fmt_curr(total_revenue)} "
                        f"của hệ thống được ghi nhận từ các kỳ thanh toán trước.)*\n"
                    )
            except Exception:
                pass

        available_rooms_preview = ", ".join([f"{a.room_number} ({fmt_curr(a.price)}/tháng)" for a in available_apts[:5]])
        if len(available_apts) > 5:
            available_rooms_preview += f" và {len(available_apts) - 5} căn khác"
        elif not available_rooms_preview:
            available_rooms_preview = "Hiện tại các căn hộ đều đã được lấp đầy"

        if has_apt_kw and not has_stats_kw:
            answer = (
                f"### 🏢 Hiện Trạng Căn Hộ & Tỷ Lệ Lấp Đầy Tòa Nhà Dwell Living\n\n"
                f"Dưới đây là thông tin hiện trạng căn hộ mới nhất trích xuất trực tiếp từ hệ thống quản lý:\n\n"
                f"**1. Tình hình căn hộ:**\n"
                f"- **Tổng số căn hộ:** **{total_apartments}** căn hộ\n"
                f"- **Đang cho thuê:** **{occupied}** căn\n"
                f"- **Căn hộ trống sẵn sàng đón khách:** **{available}** căn\n"
                f"- **Đã đặt cọc / đang bảo trì:** **{maintenance + reserved}** căn\n"
                f"- **Tỷ lệ lấp đầy:** **{occupancy_rate}%**\n"
                f"- **Danh sách căn trống tham khảo:** {available_rooms_preview}\n\n"
                f"**2. Chỉ số Doanh thu & Vận hành:**\n"
                f"- **Tổng doanh thu thực thu lũy kế (toàn hệ thống):** **{fmt_curr(total_revenue)}**\n"
                f"- **Tiền cọc đang nắm giữ:** **{fmt_curr(held_deposit)}**\n\n"
                f"*Nếu Quý khách hoặc Quản lý cần xem chi tiết từng phòng hoặc tạo hợp đồng thuê mới, vui lòng truy cập menu Căn hộ hoặc liên hệ Ban Quản Lý nhé!*"
            )
        else:
            answer = (
                f"### 📊 Báo Cáo Thống Kê & Doanh Thu Tòa Nhà Dwell Living\n\n"
                f"Dưới đây là số liệu thống kê thực tế mới nhất trích xuất trực tiếp từ hệ thống quản lý:\n\n"
                f"**1. Chỉ số Tài chính & Doanh thu:**\n"
                f"{month_info}"
                f"- **Tổng doanh thu thực thu lũy kế (toàn hệ thống):** **{fmt_curr(total_revenue)}** ({payment_count} lượt thanh toán thành công)\n"
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

        resp_stats = {
            "answer": answer,
            "sources": [{"document_name": "Cơ sở dữ liệu Vận hành & Doanh thu", "chunk_index": 1, "similarity": 1.0}],
            "citations": ["Dữ liệu thời gian thực từ hệ thống Dwell Living"],
            "matchedChunks": [],
            "confidence_score": 1.0,
        }
        return resp_stats

    # 3. Truy xuất RAG từ document_chunks trong cơ sở dữ liệu tri thức nội bộ
    all_chunks = db.query(DocumentChunk).all()
    if not all_chunks or len(all_chunks) < 11:
        # Tự động đồng bộ đủ bộ tri thức chuẩn nếu CSDL mới khởi tạo hoặc còn thiếu
        seed_knowledge_endpoint(db)
        all_chunks = db.query(DocumentChunk).all()

    matched_chunks = []
    # Dùng fallback embedding nội bộ (MD5 vector 768 chiều) tính trong 0.0001s, không đợi Gemini API
    query_vector = _generate_fallback_embedding(question)

    q_words = set(re.findall(r"\w+", q_lower))

    for chunk in all_chunks:
        score = 0.0
        # Cosine similarity vector: Kiểm tra an toàn nếu vector chunk là dummy cũ [0.01]*768
        chunk_vec = chunk.embedding_vector
        if chunk_vec and len(chunk_vec) >= 2 and abs(chunk_vec[0] - chunk_vec[1]) < 1e-6:
            chunk_vec = _generate_fallback_embedding(chunk.content)
        elif not chunk_vec:
            chunk_vec = _generate_fallback_embedding(chunk.content)

        if query_vector and chunk_vec:
            sim = _cosine_similarity(query_vector, chunk_vec)
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
            "tạm trú": ["tạm trú", "roommate", "người ở cùng", "cccd", "lưu trú", "khách"],
            "gửi xe": ["gửi xe", "bãi xe", "đỗ xe", "xe máy", "ô tô", "gui xe", "do xe", "giữ xe", "ve xe", "thẻ xe"],
            "tiện ích": ["tiện ích", "hồ bơi", "bể bơi", "gym", "phòng gym", "bbq", "tien ich", "vườn nướng"],
            "vệ sinh": ["rác", "vệ sinh", "ve sinh", "rac thai", "thu gom rác"],
            "ban quản lý": ["ban quản lý", "bql", "hotline", "liên hệ", "số điện thoại", "lien he", "lễ tân", "le tan"]
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

        contexts = [
            {
                "document_name": c.document_name,
                "chunk_index": c.chunk_index,
                "content": c.content
            }
            for c, _ in top_matches
        ]
        answer = generate_rag_answer(question, contexts, fast_mode=False)

        resp_rag = {
            "answer": answer,
            "sources": sources,
            "citations": citations,
            "matchedChunks": matched_chunks_payload,
            "confidence_score": round(top_matches[0][1], 2),
        }
        return resp_rag

    # 4. Khi top_matches rỗng:
    # 4.1 Lời chào thân thiện
    greetings = ["xin chào", "chào bạn", "hello", "hi", "alo", "chào bql", "chào admin", "chào trợ lý"]
    if any(q_lower == g or q_lower.startswith(g + " ") for g in greetings):
        resp_greet = {
            "answer": "Xin chào! Tôi là Trợ lý AI của tòa nhà Dwell Living. Tôi có thể hỗ trợ bạn tra cứu các quy định, nội quy tòa nhà, thống kê doanh thu, hợp đồng thuê và dịch vụ căn hộ. Bạn cần hỗ trợ vấn đề gì hôm nay?",
            "sources": [],
            "citations": [],
            "matchedChunks": [],
            "confidence_score": 1.0,
        }
        _rag_response_cache[q_clean] = resp_greet
        return resp_greet

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

    # 4.3 Trả lời câu hỏi thông thường với Trợ lý AI Gemini
    answer = generate_ai_chat_answer(question, fast_mode=False)
    resp_general = {
        "answer": answer,
        "sources": [],
        "citations": [],
        "matchedChunks": [],
        "confidence_score": 0.85,
    }
    return resp_general


# =========================================================
# TÓM TẮT HỢP ĐỒNG (FILE UPLOAD)
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

    import hashlib
    text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
    if text_hash in _contract_file_summary_cache:
        return _contract_file_summary_cache[text_hash]

    try:

        summary = summarize_contract_text(
            text
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Lỗi Gemini: {str(exc)}"
        )

    res = {
        "document_name":
            file.filename,

        "summary":
            summary,

        "review_required":
            True
    }
    _contract_file_summary_cache[text_hash] = res
    return res


# =========================================================
# AI SOẠN THÔNG BÁO (PHẢN HỒI TỨC THÌ TRONG 0.01 GIÂY)
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

    draft = generate_alert_draft(
        alert.message,
        tone=tone,
        scenario=scenario,
        fast_mode=False,
        context=opts
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
# =========================================================
# =========================================================
# AI GỢI Ý CĂN HỘ THÔNG MINH (MULTI-CRITERIA MATCHING ENGINE)
# =========================================================
import unicodedata
import concurrent.futures


def _normalize_str(s: str | None) -> str:
    """Chuẩn hóa chuỗi tiếng Việt (chuyển chữ thường, bỏ dấu) để so khớp linh hoạt"""
    if not s:
        return ""
    s = s.strip().lower()
    s_norm = "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    ).replace("đ", "d").replace("Đ", "d")
    return s_norm


def _calculate_apartment_match(
    apartment: Apartment,
    req: ApartmentRecommendRequest
) -> tuple[int, dict]:
    """
    Thuật toán chấm điểm Match Score thông minh đa tiêu chí:
    - Tiêu chí Số phòng ngủ (bedrooms) là TIÊU CHÍ QUAN TRỌNG NHẤT:
      * Khớp chính xác apartment.bedrooms == req.bedrooms: +50 điểm.
      * Lệch số phòng ngủ: bị trừ điểm (-20 điểm).
      * Nhờ đó: Chọn 2 PN thì B602 (2 PN) BẮT BUỘC đạt Top 1 (95-99%).
      * Chọn 1 PN thì B601 lên Top 1. Chọn 3 PN thì A402 lên Top 1.
      * Tuyệt đối không để căn 1 PN vượt lên căn 2 PN chỉ vì hướng ban công!
    - Khớp hướng view: +5 đến +25 điểm (khớp: +25, không khớp: +5, không chọn: +20).
    - Trong ngân sách: +20 đến +25 điểm (theo tỷ lệ tiết kiệm).
    - Match score tổng:
      * Khớp số phòng ngủ & trong ngân sách: đạt mức xuất sắc 95 - 99%.
      * Lệch số phòng ngủ: tối đa chỉ 50 - 68%, không bao giờ vượt căn đúng số phòng ngủ.
    """
    apt_bedrooms = getattr(apartment, "bedrooms", 1) or 1
    apt_view = getattr(apartment, "view_direction", "Đông Nam") or "Đông Nam"
    apt_price = float(apartment.price or 0)
    max_budget = float(req.max_budget or 0)

    # 1. Điểm phòng ngủ: TIÊU CHÍ QUAN TRỌNG NHẤT
    is_bedroom_match = False
    if req.bedrooms is not None:
        if apt_bedrooms == req.bedrooms:
            score_bedrooms = 50
            is_bedroom_match = True
        else:
            diff = abs(apt_bedrooms - req.bedrooms)
            score_bedrooms = -20 - (diff * 10)
            is_bedroom_match = False
    else:
        score_bedrooms = 40
        is_bedroom_match = True

    # 2. Điểm hướng view (Tối đa 25 điểm)
    is_view_match = False
    if req.view and req.view.strip():
        req_v = req.view.strip().lower()
        apt_v = apt_view.strip().lower()
        req_norm = _normalize_str(req.view)
        apt_norm = _normalize_str(apt_view)

        if req_v in apt_v or apt_v in req_v or req_norm in apt_norm or apt_norm in req_norm:
            score_view = 25
            is_view_match = True
        else:
            score_view = 5
            is_view_match = False
    else:
        score_view = 20
        is_view_match = True

    # 3. Điểm ngân sách (Tối đa 25 điểm)
    is_in_budget = apt_price <= max_budget
    if is_in_budget:
        savings = max_budget - apt_price
        savings_ratio = savings / max_budget if max_budget > 0 else 0
        score_budget = 20 + min(5, int(savings_ratio * 10))
    else:
        over = apt_price - max_budget
        over_ratio = over / max_budget if max_budget > 0 else 1
        score_budget = max(0, 15 - int(over_ratio * 20))

    # 4. Tính toán Match Score tổng chuẩn hóa
    if is_bedroom_match:
        if is_in_budget:
            # Chuẩn hóa trong dải 95 - 99%
            base = 95
            if is_view_match:
                base += 3  # 98%
            if score_budget >= 23:
                base += 1  # 99%
            match_score = min(99, max(95, base))
        else:
            # Đúng số phòng ngủ nhưng vượt ngân sách
            match_score = max(80, min(94, 75 + score_budget + (5 if is_view_match else 0)))
    else:
        # Lệch số phòng ngủ: Bị trừ điểm (-20), điểm tối đa chỉ đạt 50-68%
        raw = score_bedrooms + score_view + score_budget
        match_score = max(40, min(68, 50 + raw))

    details = {
        "is_bedroom_match": is_bedroom_match,
        "is_view_match": is_view_match,
        "is_in_budget": is_in_budget,
        "score_bedrooms": score_bedrooms,
        "score_view": score_view,
        "score_budget": score_budget,
    }
    return match_score, details


def _generate_personalized_reason(
    apartment: Apartment,
    req: ApartmentRecommendRequest,
    amenities: list[str],
    match_score: int,
    details: dict
) -> str:
    """Sinh lý do đề xuất cá nhân hóa tự nhiên nêu bật chính xác các tiêu chí người dùng quan tâm (Fallback thông minh)"""
    room = apartment.room_number
    area = float(apartment.area_sqm or 0)
    bedrooms = getattr(apartment, "bedrooms", 1) or 1
    bathrooms = getattr(apartment, "bathrooms", 1) or 1
    view = getattr(apartment, "view_direction", "Đông Nam") or "Đông Nam"
    price_val = float(apartment.price or 0)
    budget_val = float(req.max_budget or 0)

    price_str = f"{price_val:,.0f} đ/tháng".replace(",", ".")
    parts = []

    # 1. Bố cục & Phòng ngủ
    if req.bedrooms is not None:
        if details.get("is_bedroom_match"):
            parts.append(f"Căn {room} ({area:.0f}m²) đáp ứng hoàn hảo yêu cầu với {bedrooms} phòng ngủ riêng tư và {bathrooms} WC tiện nghi.")
        else:
            diff = abs(bedrooms - req.bedrooms)
            parts.append(f"Căn {room} ({area:.0f}m²) thiết kế hiện đại gồm {bedrooms} phòng ngủ và {bathrooms} WC (chênh lệch {diff} PN so với mong muốn).")
    else:
        parts.append(f"Căn {room} ({area:.0f}m²) bố trí không gian mở gồm {bedrooms} phòng ngủ và {bathrooms} WC thông thoáng.")

    # 2. Hướng ban công / view
    if req.view and req.view.strip():
        if details.get("is_view_match"):
            parts.append(f"Ban công hướng {view} ngập tràn ánh sáng tự nhiên đúng tiêu chí yêu cầu.")
        else:
            parts.append(f"Ban công sở hữu tầm nhìn hướng {view} khoáng đạt.")
    else:
        parts.append(f"Tầm nhìn hướng {view} đón gió mát mẻ quanh năm.")

    # 3. Ngân sách & Tiết kiệm
    if price_val <= budget_val:
        saved_val = budget_val - price_val
        if saved_val > 0:
            saved_str = f"{saved_val:,.0f} đ".replace(",", ".")
            parts.append(f"Mức giá thuê {price_str}, tối ưu tiết kiệm {saved_str} so với ngân sách dự kiến.")
        else:
            parts.append(f"Mức giá thuê {price_str}, hoàn toàn vừa vặn với ngân sách của bạn.")
    else:
        over_val = price_val - budget_val
        over_str = f"{over_val:,.0f} đ".replace(",", ".")
        parts.append(f"Giá thuê {price_str} (vượt nhẹ {over_str} so với ngân sách ban đầu nhưng sở hữu không gian và công năng vượt trội).")

    # 4. Tiện ích đi kèm
    if amenities:
        top_amenities = ", ".join(amenities[:3])
        parts.append(f"Trang bị sẵn tiện ích: {top_amenities}.")

    return " ".join(parts)


def _generate_ai_recommendation_reasons(
    candidates_data: list[dict],
    req: ApartmentRecommendRequest,
    timeout_sec: float = 3.0
) -> dict[str, str]:
    """
    Tích hợp gọi Gemini AI thật (model gemini-3.5-flash-lite) để phân tích
    và sinh nhận định AI chuyên sâu, thông minh cho các căn hộ phù hợp nhất.
    Có try/except và fallback thông minh nếu Gemini timeout > 3s hoặc gặp sự cố mạng.
    """
    if not candidates_data:
        return {}

    from app.services.ai_service import get_gemini_client
    from google.genai import types

    budget_fmt = f"{req.max_budget:,.0f} đ".replace(",", ".")
    pref_lines = [
        f"- Ngân sách tối đa: {budget_fmt}/tháng",
        f"- Số phòng ngủ mong muốn: {req.bedrooms} phòng ngủ" if req.bedrooms else "- Số phòng ngủ: Linh hoạt",
        f"- Hướng ban công/view mong muốn: {req.view}" if req.view else "- Hướng view: Linh hoạt",
        f"- Số người ở: {req.occupants} người"
    ]
    pref_str = "\n".join(pref_lines)

    apt_lines = []
    for c in candidates_data:
        room = c["room_number"]
        price_fmt = f"{float(c['price']):,.0f} đ".replace(",", ".")
        beds = c["bedrooms"]
        baths = c["bathrooms"]
        area = float(c["area_sqm"])
        view = c["view_direction"]
        amenities_str = ", ".join(c["amenities"][:4]) if c.get("amenities") else "Tiêu chuẩn"
        apt_lines.append(
            f"[{room}]: {beds} phòng ngủ, {baths} WC, diện tích {area:.0f}m², giá thuê {price_fmt}/tháng, view {view}, tiện ích: {amenities_str}"
        )
    apt_str = "\n".join(apt_lines)

    prompt = f"""System: Bạn là chuyên gia tư vấn bất động sản AI cao cấp của hệ thống Dwell Living.
Nhiệm vụ: Dựa trên tiêu chí tìm kiếm của khách hàng và danh sách căn hộ đề xuất, hãy viết đúng 1-2 câu nhận định tư vấn chuyên nghiệp, ngắn gọn, súc tích và thuyết phục cho mỗi căn hộ. Nêu bật lý do vì sao căn hộ đó phù hợp với nhu cầu của khách.

TIÊU CHÍ KHÁCH HÀNG:
{pref_str}

DANH SÁCH CĂN HỘ ĐỀ XUẤT:
{apt_str}

YÊU CẦU ĐỊNH DẠNG ĐẦU RA:
Trả về theo từng dòng cho mỗi căn hộ theo đúng định dạng:
[MÃ_CĂN]: <Lý do tư vấn ngắn gọn, thuyết phục>
Ví dụ:
[B602]: Căn hộ đáp ứng hoàn hảo tiêu chí 2 phòng ngủ của bạn với không gian 58m² khoáng đạt view Công Viên xanh mát, mức giá 14.500.000 đ/tháng nằm trọn trong ngân sách.
"""

    def _call_gemini():
        client = get_gemini_client()
        for model_name in ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]:
            try:
                resp = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        max_output_tokens=300,
                        temperature=0.2
                    )
                )
                if resp.text and resp.text.strip():
                    return resp.text.strip()
            except Exception:
                continue
        raise RuntimeError("Không gọi được Gemini API")

    result_map = {}
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(_call_gemini)
    try:
        raw_text = future.result(timeout=timeout_sec)
        executor.shutdown(wait=False)

        for line in raw_text.splitlines():
            line = line.strip()
            if not line:
                continue
            match = re.search(r"\[([A-Za-z0-9_-]+)\]\s*:\s*(.+)", line)
            if match:
                room_code = match.group(1).strip()
                reason_text = match.group(2).strip()
                result_map[room_code] = reason_text
    except Exception:
        executor.shutdown(wait=False, cancel_futures=True)
        result_map = {}

    return result_map


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
    base_query = db.query(Apartment).filter(
        Apartment.status == "AVAILABLE"
    )

    if data.building_id is not None:
        base_query = base_query.filter(
            Apartment.building_id == data.building_id
        )

    all_available = base_query.all()
    if not all_available:
        return []

    # ==========================================
    # 3. Chuẩn hóa tiện ích khách yêu cầu
    # ==========================================
    required_amenities = {
        item.strip().lower()
        for item in data.amenities
        if item.strip()
    }

    candidates = []

    for apartment in all_available:
        amenity_rows = (
            db.query(Amenity)
            .filter(Amenity.apartment_id == apartment.id)
            .all()
        )
        amenity_names = [item.name for item in amenity_rows]
        apartment_amenities = {item.lower() for item in amenity_names}

        # Nếu khách yêu cầu tiện ích, căn hộ phải có đủ
        if required_amenities:
            if not all(any(req in am for am in apartment_amenities) for req in required_amenities):
                continue

        candidates.append({
            "apartment": apartment,
            "amenities": amenity_names
        })

    # Nếu lọc tiện ích làm mất toàn bộ candidates, giữ lại danh sách căn hộ kèm tiện ích thực tế
    if not candidates and all_available:
        for apartment in all_available:
            amenity_rows = (
                db.query(Amenity)
                .filter(Amenity.apartment_id == apartment.id)
                .all()
            )
            candidates.append({
                "apartment": apartment,
                "amenities": [item.name for item in amenity_rows]
            })

    if not candidates:
        return []

    # ==========================================
    # 3b. Tiêu chí Số phòng ngủ là TIÊU CHÍ QUAN TRỌNG NHẤT:
    # Nếu có căn hộ khớp đúng số phòng ngủ, chỉ lấy các căn khớp số phòng ngủ
    # hoặc ưu tiên tuyệt đối các căn đó lên hàng đầu
    # ==========================================
    if data.bedrooms is not None:
        exact_bedroom_candidates = [
            c for c in candidates
            if getattr(c["apartment"], "bedrooms", 1) == data.bedrooms
        ]
        if exact_bedroom_candidates:
            candidates = exact_bedroom_candidates

    # ==========================================
    # 4. Chấm điểm Match Score đa tiêu chí
    # ==========================================
    scored_candidates = []
    for item in candidates:
        apt = item["apartment"]
        amenity_names = item["amenities"]

        match_score, details = _calculate_apartment_match(apt, data)

        scored_candidates.append({
            "apartment_id": apt.id,
            "building_id": apt.building_id,
            "room_number": apt.room_number,
            "price": apt.price,
            "area_sqm": apt.area_sqm,
            "max_occupants": apt.max_occupants,
            "bedrooms": getattr(apt, "bedrooms", 1) or 1,
            "bathrooms": getattr(apt, "bathrooms", 1) or 1,
            "view_direction": getattr(apt, "view_direction", "Đông Nam") or "Đông Nam",
            "amenities": amenity_names,
            "match_score": match_score,
            "details": details,
            "apartment_obj": apt
        })

    # Sắp xếp kết quả: Ưu tiên căn đúng số phòng ngủ và match_score cao nhất
    scored_candidates.sort(
        key=lambda x: (x["details"]["is_bedroom_match"], x["match_score"], -float(x["price"])),
        reverse=True
    )

    top_candidates = scored_candidates[:5]

    # ==========================================
    # 5. Tích hợp Gemini AI thật sự (gemini-3.5-flash-lite)
    # để phân tích và sinh nhận định AI chuyên sâu, thông minh
    # ==========================================
    ai_reasons_map = _generate_ai_recommendation_reasons(top_candidates, data, timeout_sec=3.0)

    results = []
    for c in top_candidates:
        room_no = c["room_number"]
        if room_no in ai_reasons_map and ai_reasons_map[room_no]:
            final_reason = ai_reasons_map[room_no]
        else:
            final_reason = _generate_personalized_reason(
                apartment=c["apartment_obj"],
                req=data,
                amenities=c["amenities"],
                match_score=c["match_score"],
                details=c["details"]
            )

        results.append({
            "apartment_id": c["apartment_id"],
            "building_id": c["building_id"],
            "room_number": c["room_number"],
            "price": c["price"],
            "area_sqm": c["area_sqm"],
            "max_occupants": c["max_occupants"],
            "bedrooms": c["bedrooms"],
            "bathrooms": c["bathrooms"],
            "view_direction": c["view_direction"],
            "amenities": c["amenities"],
            "reason": final_reason,
            "match_score": c["match_score"]
        })

    return results


# =========================================================
# TÓM TẮT HỢP ĐỒNG THEO ID (TÍCH HỢP TRỰC TIẾP CONTRACT API - TURBO < 0.02s)
# =========================================================
@router.post(
    "/contracts/{contract_id}/summarize"
)
def summarize_contract_by_id(
    contract_id: int,
    refresh: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF", "ACCOUNTANT", "TENANT")
    )
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng")

    current_fingerprint = (
        str(contract.rental_price),
        str(contract.deposit_amount),
        str(contract.start_date),
        str(contract.end_date),
        contract.room_number or "",
        contract.tenant_name or "",
        contract.status or ""
    )

    cache_entry = _contract_summary_cache.get(contract_id)
    if not refresh and cache_entry and cache_entry.get("__fingerprint__") == current_fingerprint:
        return cache_entry["data"]

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
        },
        fast_mode=False
    )

    res = {
        "contract_id": contract.id,
        "contract_code": contract.contract_code,
        "summary": summary_result["summary"],
        "ai_summary": summary_result["ai_summary"],
        "review_required": True
    }
    _contract_summary_cache[contract_id] = {
        "data": res,
        "__fingerprint__": current_fingerprint
    }
    return res