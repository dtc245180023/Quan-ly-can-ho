from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from decimal import Decimal


class BookingCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    apartment_id: int
    check_in_date: date
    deposit_amount: Decimal = Decimal("0")
    notes: str | None = None


class BookingResponse(BaseModel):
    id: int
    booking_code: str
    customer_name: str
    customer_phone: str
    customer_email: str | None
    apartment_id: int
    room_number: str | None = None
    building_name: str | None = None
    monthly_price: Decimal | None = None
    check_in_date: date
    deposit_amount: Decimal
    status: str
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )