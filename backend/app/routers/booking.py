from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from sqlalchemy.orm import Session
from sqlalchemy import case

from datetime import datetime
from uuid import uuid4

from app.database import get_db

from app.models.booking import Booking
from app.models.apartment import Apartment
from app.models.user import User

from app.schemas.booking import (
    BookingCreate,
    BookingResponse
)

from app.dependencies.auth import require_roles, get_current_user


router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


VALID_BOOKING_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
    "CONVERTED"
]
def generate_booking_code(
    db: Session
):

    while True:

        month = datetime.now().strftime("%Y%m")

        random_code = uuid4().hex[:4].upper()

        booking_code = (
            f"BK-{month}-{random_code}"
        )

        existing = db.query(Booking).filter(
            Booking.booking_code == booking_code
        ).first()

        if existing is None:
            return booking_code
@router.post(
    "",
    response_model=BookingResponse
)
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db)
):

    apartment = db.query(Apartment).filter(
        Apartment.id == data.apartment_id
    ).with_for_update().first()

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Căn hộ không tồn tại"
        )

    if apartment.status == "MAINTENANCE":
        raise HTTPException(
            status_code=400,
            detail="Căn hộ hiện đang trong thời gian bảo trì kỹ thuật, vui lòng chọn căn khác"
        )

    booking_code = generate_booking_code(db)

    booking = Booking(
        booking_code=booking_code,
        customer_name=data.customer_name,
        customer_phone=data.customer_phone,
        customer_email=data.customer_email,
        apartment_id=data.apartment_id,
        check_in_date=data.check_in_date,
        deposit_amount=data.deposit_amount,
        status="PENDING",
        notes=data.notes
    )

    try:
        db.add(booking)

        # Nếu căn hộ đang trống thì chuyển sang giữ chỗ
        if apartment.status == "AVAILABLE":
            apartment.status = "RESERVED"

        db.commit()
        db.refresh(booking)
    except Exception:
        db.rollback()
        raise

    return booking
@router.get(
    "",
    response_model=list[BookingResponse]
)
def get_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF", "ACCOUNTANT")
    )
):

    bookings = db.query(Booking).order_by(
        case((Booking.status == "PENDING", 0), else_=1),
        Booking.id.desc()
    ).all()

    return bookings


@router.get(
    "/lookup",
    response_model=BookingResponse
)
def lookup_booking(
    booking_code: str = Query(..., min_length=5),
    customer_phone: str = Query(..., min_length=8),
    db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(
        Booking.booking_code == booking_code.strip(),
        Booking.customer_phone == customer_phone.strip()
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy Booking phù hợp"
        )

    return booking


@router.get(
    "/my",
    response_model=list[BookingResponse]
)
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookings = db.query(Booking).filter(
        (Booking.customer_phone == current_user.phone) |
        (Booking.customer_email == current_user.email)
    ).order_by(Booking.id.desc()).all()
    return bookings


@router.get(
    "/{booking_id}",
    response_model=BookingResponse
)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF", "ACCOUNTANT")
    )
):

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy Booking"
        )

    return booking
@router.patch(
    "/{booking_id}/confirm",
    response_model=BookingResponse
)
def confirm_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF")
    )
):

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy Booking"
        )

    if booking.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Booking không ở trạng thái chờ xác nhận"
        )

    try:
        booking.status = "CONFIRMED"
        db.commit()
        db.refresh(booking)
    except Exception:
        db.rollback()
        raise

    return booking
@router.patch(
    "/{booking_id}/cancel",
    response_model=BookingResponse
)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF")
    )
):

    booking = db.query(Booking).filter(
        Booking.id == booking_id
    ).first()

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy Booking"
        )

    if booking.status == "CONVERTED":
        raise HTTPException(
            status_code=400,
            detail="Booking đã chuyển thành hợp đồng"
        )

    if booking.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Booking đã được hủy trước đó"
        )

    apartment = db.query(Apartment).filter(
        Apartment.id == booking.apartment_id
    ).first()

    try:
        booking.status = "CANCELLED"

        if apartment:
            apartment.status = "AVAILABLE"

        db.commit()
        db.refresh(booking)
    except Exception:
        db.rollback()
        raise

    return booking