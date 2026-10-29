from app.services import ai_service


def test_ai_summary_five_mandatory_clauses():
    """Kiểm tra yêu cầu bắt buộc tóm tắt đúng 5 điều khoản cốt lõi theo Đề tài 12"""
    required_clauses = [
        "thời hạn",
        "tiền thuê",
        "tiền cọc",
        "nghĩa vụ thanh toán",
        "điều kiện chấm dứt",
    ]
    
    sample_contract = """
    HỢP ĐỒNG THUÊ CĂN HỘ P101
    1. Thời hạn thuê: 12 tháng từ ngày 01/01/2026 đến 31/12/2026.
    2. Giá thuê: 12.000.000 VNĐ/tháng.
    3. Tiền đặt cọc: 24.000.000 VNĐ.
    4. Nghĩa vụ thanh toán: Thanh toán trước ngày 10 hàng tháng qua VietQR.
    5. Điều kiện chấm dứt: Báo trước 30 ngày bằng văn bản.
    """
    
    captured = {}
    def mock_generate(prompt):
        captured["prompt"] = prompt
        return "Bản tóm tắt 5 điều khoản hợp lệ"
    
    original_fn = ai_service.generate_text
    ai_service.generate_text = mock_generate
    
    try:
        res = ai_service.summarize_contract_text(sample_contract)
        assert res == "Bản tóm tắt 5 điều khoản hợp lệ"
        
        # Kiểm tra prompt tuân thủ nghiêm ngặt prompt mẫu của Đề tài 12
        prompt = captured["prompt"]
        assert "không tư vấn pháp lý" in prompt
        assert "thời hạn, tiền thuê, tiền cọc, nghĩa vụ thanh toán, điều kiện chấm dứt" in prompt
        assert "Không tự suy đoán" in prompt
        assert "Hợp đồng:" in prompt
    finally:
        ai_service.generate_text = original_fn


def test_ai_dunning_draft_generation():
    """Kiểm tra AI sinh thông báo nhắc nợ/nhắc hạn không thay đổi số liệu"""
    alert_msg = "Căn hộ P202 quá hạn 12 ngày. Số nợ cần thu: 21,100,000 VNĐ."
    
    captured = {}
    def mock_generate(prompt):
        captured["prompt"] = prompt
        return "Kính gửi quý cư dân căn P202, số nợ quá hạn 12 ngày là 21,100,000 VNĐ..."
    
    original_fn = ai_service.generate_text
    ai_service.generate_text = mock_generate
    
    try:
        draft = ai_service.generate_alert_draft(alert_msg)
        assert "21,100,000 VNĐ" in draft
        prompt = captured["prompt"]
        assert "Không thay đổi số tiền" in prompt
        assert "Không thay đổi ngày tháng" in prompt
    finally:
        ai_service.generate_text = original_fn


def test_ai_dunning_draft_fallback_regex():
    """Kiểm tra fallback regex trích xuất đúng số nợ, không bắt nhầm phòng P101 hay mã HĐ HD-2026"""
    alert_msg = "Căn hộ P101 hợp đồng HD-2026 quá hạn 5 ngày. Số nợ cần thu: 5,500,000 VNĐ. Khách thuê: Nguyen Van A."
    # Khi generate_text lỗi thì fallback kích hoạt
    def mock_fail(_prompt):
        raise RuntimeError("API offline")

    original_fn = ai_service.generate_text
    ai_service.generate_text = mock_fail
    try:
        draft = ai_service.generate_alert_draft(alert_msg, scenario="OVERDUE_DEBT")
        assert "5,500,000 VNĐ" in draft
        assert "(101)" not in draft
        assert "(2026)" not in draft
    finally:
        ai_service.generate_text = original_fn


def test_ai_dunning_draft_expired_contract():
    """Kiểm tra kịch bản EXPIRED_CONTRACT nhắc gia hạn và không đòi tiền nợ"""
    alert_msg = "Hợp đồng HD-2026 của cư dân Tran B tại căn P303 sẽ hết hạn sau 10 ngày (2026-11-30). Cần liên hệ gia hạn hoặc chuẩn bị bàn giao."
    def mock_fail(_prompt):
        raise RuntimeError("API offline")

    original_fn = ai_service.generate_text
    ai_service.generate_text = mock_fail
    try:
        draft = ai_service.generate_alert_draft(alert_msg, scenario="EXPIRED_CONTRACT")
        assert "gia hạn hợp đồng" in draft.lower()
        assert "thanh toán số tiền" not in draft
    finally:
        ai_service.generate_text = original_fn


def test_ai_dunning_draft_tone_variations():
    """Kiểm tra AI đôn đốc nợ với các văn phong STRICT và CONCISE_SMS"""
    alert_msg = "Căn hộ P101 quá hạn 5 ngày. Số nợ cần thu: 5,500,000 VNĐ."
    def mock_fail(_prompt):
        raise RuntimeError("API offline")

    original_fn = ai_service.generate_text
    ai_service.generate_text = mock_fail
    try:
        draft_sms = ai_service.generate_alert_draft(alert_msg, tone="CONCISE_SMS", scenario="OVERDUE_DEBT")
        assert "[Dwell Living]" in draft_sms
        assert "5,500,000 VNĐ" in draft_sms

        draft_strict = ai_service.generate_alert_draft(alert_msg, tone="STRICT", scenario="OVERDUE_DEBT")
        assert "khẩn trương" in draft_strict.lower()
        assert "5,500,000 VNĐ" in draft_strict
    finally:
        ai_service.generate_text = original_fn


def test_create_embedding_none_and_empty_safe():
    """Kiểm tra create_embedding an toàn tuyệt đối với None, chuỗi rỗng và chuỗi khoảng trắng"""
    vec_none = ai_service.create_embedding(None)
    assert len(vec_none) == 768
    vec_empty = ai_service.create_embedding("")
    assert len(vec_empty) == 768
    vec_spaces = ai_service.create_embedding("   ")
    assert len(vec_spaces) == 768
