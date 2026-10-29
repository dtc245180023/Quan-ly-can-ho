from app.services import ai_service


def test_split_into_chunks_preserves_content():
    chunks = ai_service.split_into_chunks(
        "một hai ba bốn năm sáu bảy tám",
        words_per_chunk=4,
        overlap_words=1
    )

    assert chunks[0] == "một hai ba bốn"
    assert chunks[1] == "bốn năm sáu bảy"
    assert chunks[-1].endswith("tám")


def test_contract_summary_prompt_is_reviewable(monkeypatch):
    captured = {}

    def fake_generate_text(prompt):
        captured["prompt"] = prompt
        return "Bản nháp tóm tắt"

    monkeypatch.setattr(
        ai_service,
        "generate_text",
        fake_generate_text
    )

    result = ai_service.summarize_contract_text(
        "Tiền thuê 10 triệu, tiền cọc 20 triệu."
    )

    assert result == "Bản nháp tóm tắt"
    assert "không tư vấn pháp lý" in captured["prompt"]
    assert "Hợp đồng:" in captured["prompt"]
    assert "thời hạn, tiền thuê, tiền cọc, nghĩa vụ thanh toán, điều kiện chấm dứt" in captured["prompt"]


def test_rag_answer_prompt_is_context_bound(monkeypatch):
    captured = {}

    def fake_generate_text(prompt):
        captured["prompt"] = prompt
        return "Câu trả lời"

    monkeypatch.setattr(
        ai_service,
        "generate_text",
        fake_generate_text
    )

    result = ai_service.generate_rag_answer(
        "Giờ đổ rác?",
        [{
            "document_name": "noi-quy.txt",
            "chunk_index": 2,
            "content": "Đổ rác từ 18:00 đến 20:00."
        }]
    )

    assert result == "Câu trả lời"
    assert "Chỉ trả lời dựa trên NGỮ CẢNH" in captured["prompt"]
    assert "Đổ rác từ 18:00 đến 20:00" in captured["prompt"]


def test_create_embedding_fallback_no_crash(monkeypatch):
    """Kiểm tra create_embedding fallback an toàn 768 chiều khi không có API key hoặc lỗi"""
    from app.core.config import settings

    # Test fallback
    vec = ai_service.create_embedding("Nội quy giờ giấc tòa nhà")
    assert isinstance(vec, list)
    assert len(vec) == 768
    assert all(isinstance(x, float) for x in vec)


def test_summarize_contract_structured_five_clauses():
    """Kiểm tra cấu trúc 5 điều khoản chuẩn YCHT trả về đúng schema JSON"""
    contract_sample = """
    HỢP ĐỒNG THUÊ CĂN HỘ
    Thời hạn: Từ 01/01/2026 đến 31/12/2026
    Giá thuê: 15,000,000 VNĐ/tháng
    Tiền cọc: 30,000,000 VNĐ
    Nghĩa vụ: Thanh toán trước ngày 10 hàng tháng qua VietQR.
    Chấm dứt: Báo trước 30 ngày.
    """
    res = ai_service.summarize_contract_structured(
        contract_sample,
        contract_info={
            "start_date": "01/01/2026",
            "end_date": "31/12/2026",
            "price": 15000000,
            "deposit": 30000000
        }
    )
    assert "summary" in res
    assert "ai_summary" in res
    ai_sum = res["ai_summary"]
    # Kiểm tra cả 5 điều khoản chuẩn YCHT
    assert "term1_duration" in ai_sum
    assert "term2_rental_price" in ai_sum
    assert "term3_deposit" in ai_sum
    assert "term4_payment_obligations" in ai_sum
    assert "term5_termination_conditions" in ai_sum
    # Kiểm tra tương thích camelCase cho giao diện
    assert "term2_rentalPrice" in ai_sum
    assert "term3_paymentObligation" in ai_sum
    assert "term4_penalties" in ai_sum
    assert "term5_termination" in ai_sum


def test_ai_safety_guardrail_out_of_scope():
    """Kiểm tra Rào chắn An toàn AI (AI-05) từ chối lịch sự khi câu hỏi ngoài phạm vi tòa nhà"""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    resp = client.post(
        "/api/v1/ai/rag-chat",
        json={"question": "Hướng dẫn tôi cách nấu món canh chua cá lóc miền Tây"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "nằm ngoài phạm vi quy chế, nội quy của tòa nhà Dwell Living" in data["answer"]
    assert data["confidence_score"] == 0.0


def test_ai_settings_default_models():
    """Kiểm tra cấu hình model mặc định chuẩn hóa theo bảng quota mới (Gemini 3.1 Flash Lite và Gemini Embedding 2)"""
    from app.core.config import Settings, settings

    # 1. Kiểm tra singleton instance nạp đúng giá trị mặc định từ cấu hình
    assert settings.gemini_model == "gemini-3.1-flash-lite"
    assert settings.gemini_embed_model == "gemini-embedding-2"

    # 2. Kiểm tra khi khởi tạo Settings() không truyền tham số vẫn giữ nguyên mặc định
    default_settings = Settings()
    assert default_settings.gemini_model == "gemini-3.1-flash-lite"
    assert default_settings.gemini_embed_model == "gemini-embedding-2"


def test_generate_text_full_model_order(monkeypatch):
    """Kiểm tra generate_text ưu tiên và thử lần lượt TOÀN BỘ chuỗi model theo đúng thứ tự"""
    attempted_models = []

    class FakeModels:
        def generate_content(self, model, contents):
            attempted_models.append(model)
            # Giả lập chỉ model cuối cùng (gemini-1.5-flash) thành công để kiểm tra trọn vẹn thứ tự
            if model == "gemini-1.5-flash":
                class Resp:
                    text = "Phản hồi từ gemini-1.5-flash"
                return Resp()
            raise RuntimeError(f"Model {model} 404 Not Found")

    class FakeClient:
        models = FakeModels()

    from app.core.config import Settings
    fake_settings = Settings(gemini_api_key="fake-key", gemini_model=" gemini-3.1-flash-lite ")
    monkeypatch.setattr(ai_service, "settings", fake_settings)
    monkeypatch.setattr(ai_service, "get_gemini_client", lambda: FakeClient())

    result = ai_service.generate_text("Xin chào AI")
    assert result == "Phản hồi từ gemini-1.5-flash"

    expected_sequence = [
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ]
    # Lấy các model duy nhất theo thứ tự được gọi
    unique_attempted = []
    for m in attempted_models:
        if m not in unique_attempted:
            unique_attempted.append(m)

    assert unique_attempted == expected_sequence


def test_create_embedding_full_model_fallback(monkeypatch):
    """Kiểm tra create_embedding thử fallback lần lượt toàn bộ danh sách model embedding"""
    attempted_models = []

    class FakeModels:
        def embed_content(self, model, contents, config=None):
            attempted_models.append(model)
            if model == "text-embedding-004":
                class EmbeddingObj:
                    values = [0.05] * 768
                class Resp:
                    embeddings = [EmbeddingObj()]
                return Resp()
            raise RuntimeError(f"Model {model} quota exceeded")

    class FakeClient:
        models = FakeModels()

    from app.core.config import Settings
    fake_settings = Settings(gemini_api_key="fake-key", gemini_embed_model=" gemini-embedding-2 ")
    monkeypatch.setattr(ai_service, "settings", fake_settings)
    monkeypatch.setattr(ai_service, "get_gemini_client", lambda: FakeClient())

    vec = ai_service.create_embedding("Thử nghiệm embedding fallback toàn diện")
    assert len(vec) == 768
    assert vec[0] == 0.05

    unique_attempted = []
    for m in attempted_models:
        if m not in unique_attempted:
            unique_attempted.append(m)

    expected_models = ["gemini-embedding-2", "gemini-embedding-1", "text-embedding-004"]
    assert unique_attempted == expected_models


def test_create_embedding_config_exception_fallback(monkeypatch):
    """Kiểm tra khi model không hỗ trợ EmbedContentConfig thì tự động fallback gọi không config"""
    call_log = []

    class FakeModels:
        def embed_content(self, model, contents, config=None):
            call_log.append((model, config is not None))
            if config is not None:
                raise RuntimeError("InvalidArgument: output_dimensionality is not supported for this model")
            # Khi gọi không config thì thành công
            class EmbeddingObj:
                values = [0.02] * 768
            class Resp:
                embeddings = [EmbeddingObj()]
            return Resp()

    class FakeClient:
        models = FakeModels()

    from app.core.config import Settings
    fake_settings = Settings(gemini_api_key="fake-key", gemini_embed_model="gemini-embedding-1")
    monkeypatch.setattr(ai_service, "settings", fake_settings)
    monkeypatch.setattr(ai_service, "get_gemini_client", lambda: FakeClient())

    vec = ai_service.create_embedding("Kiểm tra fallback config")
    assert len(vec) == 768
    assert vec[0] == 0.02
    # Phải có lượt gọi đầu tiên có config (True) và lượt gọi sau không config (False)
    assert call_log[0] == ("gemini-embedding-1", True)
    assert call_log[1] == ("gemini-embedding-1", False)


def test_create_embedding_matryoshka_dimension_truncation(monkeypatch):
    """Kiểm tra tự động cắt 768 chiều và L2-normalize khi embedding trả về > 768 chiều (vd 1536 chiều)"""
    class FakeModels:
        def embed_content(self, model, contents, config=None):
            class EmbeddingObj:
                values = [1.0] * 1536  # Giả lập trả về 1536 chiều
            class Resp:
                embeddings = [EmbeddingObj()]
            return Resp()

    class FakeClient:
        models = FakeModels()

    from app.core.config import Settings
    fake_settings = Settings(gemini_api_key="fake-key", gemini_embed_model="gemini-embedding-2")
    monkeypatch.setattr(ai_service, "settings", fake_settings)
    monkeypatch.setattr(ai_service, "get_gemini_client", lambda: FakeClient())

    vec = ai_service.create_embedding("Test Matryoshka")
    assert len(vec) == 768
    # Sau L2 normalization, norm của vector phải xấp xỉ 1.0
    norm = sum(x * x for x in vec) ** 0.5
    assert abs(norm - 1.0) < 0.01


def test_rag_chat_parking_fee_retrieval():
    """Kiểm tra RAG tra cứu chính xác quy định gửi xe (Mục 8), không bị gán nhầm quy định nuôi chó mèo"""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    resp = client.post(
        "/api/v1/ai/rag-chat",
        json={"question": "Phí gửi xe máy và ô tô tại tòa nhà là bao nhiêu?", "top_k": 3}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "gửi xe" in data["answer"].lower() or "xe máy" in data["answer"].lower()
    assert "chó" not in data["answer"].lower()
    assert "mèo" not in data["answer"].lower()
    assert len(data.get("sources", [])) > 0
    assert data["sources"][0]["chunk_index"] == 8


def test_contract_summary_cache_invalidation_on_data_change():
    """Kiểm tra cache tóm tắt hợp đồng tự động làm mới khi thông tin giá thuê hợp đồng trong DB thay đổi"""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.database import SessionLocal
    from app.models.contract import Contract
    from app.models.apartment import Apartment
    from app.models.user import User
    from app.models.role import Role
    from app.dependencies.auth import get_current_user

    db = SessionLocal()
    try:
        admin_role = db.query(Role).filter(Role.role_code == "ADMIN").first()
        if not admin_role:
            admin_role = Role(role_code="ADMIN", role_name="Quản trị viên")
            db.add(admin_role)
            db.commit()
        admin_user = db.query(User).filter(User.role_id == admin_role.id).first()
        if not admin_user:
            admin_user = User(username="admin_test_cache", email="admin_cache@dwell.vn", hashed_password="pw", role_id=admin_role.id)
            db.add(admin_user)
            db.commit()

        from app.models.tenant import Tenant
        import datetime
        apt = db.query(Apartment).first()
        tenant = db.query(Tenant).first()
        if not tenant:
            tenant = Tenant(full_name="Trần Văn Test", phone="0988777666", email="test@dwell.vn", cccd_number="123456789")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

        today = datetime.date.today()
        unique_code = f"HD-CACHE-TEST-{int(datetime.datetime.now().timestamp() * 1000)}"
        contract = Contract(
            contract_code=unique_code,
            apartment_id=apt.id if apt else 1,
            tenant_id=tenant.id,
            start_date=today,
            end_date=today + datetime.timedelta(days=365),
            rental_price=10000000,
            deposit_amount=20000000,
            status="ACTIVE",
            created_by=admin_user.id
        )
        db.add(contract)
        db.commit()
        db.refresh(contract)

        app.dependency_overrides[get_current_user] = lambda: admin_user
        client = TestClient(app)

        # Lần 1: Giá thuê 10,000,000
        res1 = client.post(f"/api/v1/ai/contracts/{contract.id}/summarize")
        assert res1.status_code == 200
        assert "10,000,000" in res1.json()["ai_summary"]["term2_rental_price"]

        # Cập nhật giá thuê lên 18,000,000
        contract.rental_price = 18000000
        db.commit()

        # Lần 2: Cache phải tự động nhận diện fingerprint thay đổi và trả về 18,000,000
        res2 = client.post(f"/api/v1/ai/contracts/{contract.id}/summarize")
        assert res2.status_code == 200
        assert "18,000,000" in res2.json()["ai_summary"]["term2_rental_price"]

        # Test tham số ép refresh: ?refresh=true
        res3 = client.post(f"/api/v1/ai/contracts/{contract.id}/summarize?refresh=true")
        assert res3.status_code == 200
        assert "18,000,000" in res3.json()["ai_summary"]["term2_rental_price"]

    finally:
        app.dependency_overrides.pop(get_current_user, None)
        db.close()


def test_alert_draft_context_enrichment():
    """Kiểm tra soạn thông báo fallback làm giàu thông tin từ context (tên cư dân, số phòng, nợ)"""
    alert_msg = "Quá hạn thanh toán tiền phòng."
    context = {
        "customer_name": "Lê Văn Hùng",
        "room_number": "P505",
        "amount_due": 8500000,
        "days_overdue": 7
    }
    draft = ai_service.generate_alert_draft(
        alert_msg,
        tone="EMPATHETIC",
        scenario="OVERDUE_WITH_PENALTY",
        fast_mode=True,
        context=context
    )
    assert "Lê Văn Hùng" in draft
    assert "P505" in draft
    assert "8.500.000 VNĐ" in draft
    assert "7 ngày" in draft


def test_safe_dt_standardization():
    """Kiểm tra _safe_dt hỗ trợ datetime, date, chuỗi đa định dạng và an toàn khi None"""
    import datetime
    from app.routers.ai import _safe_dt

    # 1. datetime.datetime & datetime.date
    dt = datetime.datetime(2026, 9, 8, 14, 30, 0)
    d = datetime.date(2026, 9, 8)
    assert _safe_dt(dt) == dt
    assert _safe_dt(d) == d

    # 2. Chuỗi các định dạng
    assert _safe_dt("2026-09-08 14:30:00") == datetime.datetime(2026, 9, 8, 14, 30, 0)
    assert _safe_dt("2026-09-08T14:30:00") == datetime.datetime(2026, 9, 8, 14, 30, 0)
    assert _safe_dt("2026-09-08") == datetime.datetime(2026, 9, 8, 0, 0, 0)
    assert _safe_dt("08/09/2026") == datetime.datetime(2026, 9, 8, 0, 0, 0)

    # 3. None và chuỗi không hợp lệ
    assert _safe_dt(None) is None
    assert _safe_dt("not-a-date") is None


def test_chatbot_monthly_revenue_breakdown():
    """Kiểm tra chatbot bóc tách thực thu và hóa đơn phát sinh theo tháng, giải thích khi thực thu = 0"""
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    # 1. Tháng 10: Thực thu = 0, phát sinh hóa đơn 12.920.000
    res10 = client.post("/api/v1/ai/chat", json={"question": "Cho tôi biết doanh thu tháng 10 năm 2026"})
    assert res10.status_code == 200
    ans10 = res10.json()["answer"]
    assert "Doanh thu thực thu Tháng 10:" in ans10
    assert "0 VNĐ" in ans10
    assert "Hóa đơn phát sinh kỳ Tháng 10:" in ans10
    assert "12.920.000 VNĐ" in ans10
    assert "💡 Giải thích: Trong Tháng 10" in ans10
    assert "Tổng doanh thu thực thu lũy kế (toàn hệ thống):" in ans10

    # 2. Tháng 9: Có thực thu 12.750.000
    res9 = client.post("/api/v1/ai/chat", json={"question": "Doanh thu tháng 9"})
    assert res9.status_code == 200
    ans9 = res9.json()["answer"]
    assert "Doanh thu thực thu Tháng 9:" in ans9
    assert "12.750.000 VNĐ" in ans9
    assert "Hóa đơn phát sinh kỳ Tháng 9:" in ans9
    assert "Tổng doanh thu thực thu lũy kế (toàn hệ thống):" in ans9

