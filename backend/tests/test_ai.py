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
    """Kiểm tra cấu hình model mặc định chuẩn hóa theo bảng quota mới (Gemini 3.5 Flash Lite và Gemini Embedding 2)"""
    from app.core.config import Settings, settings

    # 1. Kiểm tra singleton instance nạp đúng giá trị mặc định từ cấu hình
    assert settings.gemini_model == "gemini-3.5-flash-lite"
    assert settings.gemini_embed_model == "gemini-embedding-2"

    # 2. Kiểm tra khi khởi tạo Settings() không truyền tham số vẫn giữ nguyên mặc định
    default_settings = Settings()
    assert default_settings.gemini_model == "gemini-3.5-flash-lite"
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
    fake_settings = Settings(gemini_api_key="fake-key", gemini_model=" gemini-3.5-flash-lite ")
    monkeypatch.setattr(ai_service, "settings", fake_settings)
    monkeypatch.setattr(ai_service, "get_gemini_client", lambda: FakeClient())

    result = ai_service.generate_text("Xin chào AI")
    assert result == "Phản hồi từ gemini-1.5-flash"

    expected_sequence = [
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
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
