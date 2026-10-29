from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from decimal import Decimal


# ==========================================
# LẬP HỢP ĐỒNG TRỰC TIẾP
# Không cần Booking
# ==========================================
class ContractCreate(BaseModel):
    apartment_id: int
    tenant_id: int

    start_date: date
    end_date: date

    rental_price: Decimal
    deposit_amount: Decimal
    booking_id: int | None = None


# ==========================================
# CHUYỂN BOOKING THÀNH CONTRACT
# ==========================================
class BookingToContractRequest(BaseModel):
    citizen_id: str
    hometown: str | None = None

    start_date: date
    end_date: date

    rental_price: Decimal
    deposit_amount: Decimal


class RejectContractRequest(BaseModel):
    reason: str


# ==========================================
# RESPONSE
# ==========================================
class ContractResponse(BaseModel):
    id: int
    contract_code: str

    apartment_id: int
    tenant_id: int

    start_date: date
    end_date: date

    rental_price: Decimal
    deposit_amount: Decimal

    status: str
    rejection_reason: str | None

    created_by: int
    approved_by: int | None

    booking_id: int | None
    created_at: datetime
    room_number: str | None = None
    tenant_name: str | None = None

    model_config = ConfigDict(
        from_attributes=True
    )
class ContractRenewRequest(BaseModel):
    new_start_date: date | None = None
    new_end_date: date
    rental_price: Decimal | None = None
    new_rental_price: Decimal | None = None
    deposit_amount: Decimal | None = None


class TerminateContractRequest(BaseModel):
    needs_maintenance: bool = False