import calendar
from datetime import date
from decimal import Decimal
import pytest
from unittest.mock import MagicMock

from app.models.contract import Contract
from app.models.receivable import Receivable
from app.services.billing_service import generate_monthly_receivables


def test_prorated_rent_calculation_mid_month():
    """Kiểm tra tính tiền phòng theo tỷ lệ ngày thực tế khi hợp đồng bắt đầu giữa tháng"""
    # Contract starts on Oct 16, 2026. Rental price: 10,000,000 VND / month.
    # October has 31 days. Active days: Oct 16 to Oct 31 = 16 days.
    # Expected prorated room amount: round((10,000,000 * 16 / 31) / 1000) * 1000 = 5,161,000 VND.
    mock_db = MagicMock()
    mock_contract = MagicMock(spec=Contract)
    mock_contract.id = 101
    mock_contract.apartment_id = 5
    mock_contract.status = "ACTIVE"
    mock_contract.rental_price = Decimal("10000000")
    mock_contract.start_date = date(2026, 10, 16)
    mock_contract.end_date = date(2027, 10, 15)

    mock_db.query.return_value.filter.return_value.all.return_value = [mock_contract]
    mock_db.query.return_value.filter.return_value.first.return_value = None  # No existing receivable

    result = generate_monthly_receivables(
        billing_month=10,
        billing_year=2026,
        service_amount=Decimal("0"),
        db=mock_db
    )

    assert result["count"] == 1
    # Check what Receivable was added to db
    added_receivable = mock_db.add.call_args[0][0]
    expected_amount = Decimal(str(round((10000000 * 16 / 31) / 1000) * 1000))
    assert added_receivable.room_amount == expected_amount
    assert added_receivable.total_amount == expected_amount
    assert added_receivable.due_date == date(2026, 10, 21)  # start + 5 days because start > 10


def test_full_rent_calculation_full_month():
    """Kiểm tra hợp đồng đủ tháng tính nguyên tiền phòng"""
    mock_db = MagicMock()
    mock_contract = MagicMock(spec=Contract)
    mock_contract.id = 102
    mock_contract.apartment_id = 6
    mock_contract.status = "ACTIVE"
    mock_contract.rental_price = Decimal("12000000")
    mock_contract.start_date = date(2026, 1, 1)
    mock_contract.end_date = date(2026, 12, 31)

    mock_db.query.return_value.filter.return_value.all.return_value = [mock_contract]
    mock_db.query.return_value.filter.return_value.first.return_value = None

    result = generate_monthly_receivables(
        billing_month=10,
        billing_year=2026,
        service_amount=Decimal("500000"),
        db=mock_db
    )

    assert result["count"] == 1
    added_receivable = mock_db.add.call_args[0][0]
    assert added_receivable.room_amount == Decimal("12000000")
    assert added_receivable.service_amount == Decimal("500000")
    assert added_receivable.total_amount == Decimal("12500000")
    assert added_receivable.due_date == date(2026, 10, 10)


def test_deposit_settlement_math():
    """Kiểm tra đối trừ công nợ tồn đọng trước khi hoàn cọc"""
    deposit_amount = Decimal("20000000")
    deduction_amount = Decimal("1500000")  # Hư hỏng tài sản
    current_debt = Decimal("3500000")     # Nợ tiền điện nước

    # Available after damage deduction
    available_for_debt = max(Decimal("0"), deposit_amount - deduction_amount)
    debt_offset = min(available_for_debt, current_debt)
    refund_amount = deposit_amount - deduction_amount - debt_offset

    assert debt_offset == Decimal("3500000")
    assert refund_amount == Decimal("15000000")
