from decimal import Decimal
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.apartment import Apartment
from app.models.building import Building
from app.models.amenity import Amenity
from app.models.user import User
from app.models.maintenance_request import MaintenanceRequest

from app.schemas.apartment import (
    ApartmentCreate,
    ApartmentUpdate,
    ApartmentStatusUpdate,
    ApartmentResponse,
    ApartmentSearchResponse
)

from app.dependencies.auth import require_roles


router = APIRouter(
    prefix="/apartments",
    tags=["Apartments"]
)


# =========================================================
# CÁC TRẠNG THÁI CĂN HỘ HỢP LỆ
# =========================================================
VALID_STATUSES = {
    "AVAILABLE",
    "RESERVED",
    "OCCUPIED",
    "MAINTENANCE"
}


# =========================================================
# 1. TẠO CĂN HỘ
# ADMIN / STAFF
# =========================================================
@router.post(
    "",
    response_model=ApartmentResponse
)
def create_apartment(
    data: ApartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
    )
):
    # Kiểm tra tòa nhà tồn tại
    building = (
        db.query(Building)
        .filter(
            Building.id == data.building_id
        )
        .first()
    )

    if building is None:
        raise HTTPException(
            status_code=404,
            detail="Tòa nhà không tồn tại"
        )

    # Trạng thái mặc định
    status = (
        data.status.upper()
        if data.status
        else "AVAILABLE"
    )

    if status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Trạng thái căn hộ không hợp lệ"
        )

    # Không cho trùng số phòng trong cùng tòa
    existing = (
        db.query(Apartment)
        .filter(
            Apartment.building_id
            == data.building_id,

            Apartment.room_number
            == data.room_number
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail=(
                "Số phòng đã tồn tại "
                "trong tòa nhà"
            )
        )

    apartment = Apartment(
        building_id=data.building_id,
        room_number=data.room_number,
        floor=data.floor,
        area_sqm=data.area_sqm,
        price=data.price,
        max_occupants=data.max_occupants,
        status=status
    )

    db.add(apartment)
    db.commit()
    db.refresh(apartment)

    return apartment


# =========================================================
# 2. TÌM KIẾM / LỌC CĂN HỘ TRỐNG
#
# PUBLIC
# Khách chưa đăng nhập vẫn có thể tìm phòng
#
# PHẢI ĐẶT TRƯỚC /{apartment_id}
# =========================================================
@router.get(
    "/search",
    response_model=list[ApartmentSearchResponse]
)
def search_available_apartments(
    building_id: int | None = None,

    min_price: Decimal | None = Query(
        default=None,
        ge=0
    ),

    max_price: Decimal | None = Query(
        default=None,
        ge=0
    ),

    min_area: Decimal | None = Query(
        default=None,
        ge=0
    ),

    max_area: Decimal | None = Query(
        default=None,
        ge=0
    ),

    occupants: int | None = Query(
        default=None,
        ge=1
    ),

    amenities: str | None = None,

    db: Session = Depends(get_db)
):
    # -----------------------------------------
    # Kiểm tra khoảng giá
    # -----------------------------------------
    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Giá tối thiểu không được "
                "lớn hơn giá tối đa"
            )
        )

    # -----------------------------------------
    # Kiểm tra khoảng diện tích
    # -----------------------------------------
    if (
        min_area is not None
        and max_area is not None
        and min_area > max_area
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Diện tích tối thiểu không được "
                "lớn hơn diện tích tối đa"
            )
        )

    # -----------------------------------------
    # Chỉ lấy căn AVAILABLE
    # -----------------------------------------
    query = (
        db.query(Apartment)
        .filter(
            Apartment.status == "AVAILABLE"
        )
    )

    # -----------------------------------------
    # Lọc theo tòa nhà
    # -----------------------------------------
    if building_id is not None:
        building = (
            db.query(Building)
            .filter(
                Building.id == building_id
            )
            .first()
        )

        if building is None:
            raise HTTPException(
                status_code=404,
                detail="Tòa nhà không tồn tại"
            )

        query = query.filter(
            Apartment.building_id
            == building_id
        )

    # -----------------------------------------
    # Lọc giá
    # -----------------------------------------
    if min_price is not None:
        query = query.filter(
            Apartment.price >= min_price
        )

    if max_price is not None:
        query = query.filter(
            Apartment.price <= max_price
        )

    # -----------------------------------------
    # Lọc diện tích
    # -----------------------------------------
    if min_area is not None:
        query = query.filter(
            Apartment.area_sqm >= min_area
        )

    if max_area is not None:
        query = query.filter(
            Apartment.area_sqm <= max_area
        )

    # -----------------------------------------
    # Lọc số người
    # -----------------------------------------
    if occupants is not None:
        query = query.filter(
            Apartment.max_occupants
            >= occupants
        )

    # -----------------------------------------
    # Lọc tiện ích
    #
    # Ví dụ:
    # amenities=Điều hòa,Tủ lạnh
    #
    # Căn hộ phải có đủ tiện ích yêu cầu
    # -----------------------------------------
    if amenities:
        amenity_names = [
            item.strip().lower()
            for item in amenities.split(",")
            if item.strip()
        ]

        # Bỏ trùng
        amenity_names = list(
            set(amenity_names)
        )

        if amenity_names:
            apartment_ids_query = (
                db.query(
                    Amenity.apartment_id
                )
                .filter(
                    func.lower(
                        Amenity.name
                    ).in_(
                        amenity_names
                    )
                )
                .group_by(
                    Amenity.apartment_id
                )
                .having(
                    func.count(
                        func.distinct(
                            func.lower(
                                Amenity.name
                            )
                        )
                    )
                    == len(amenity_names)
                )
            )

            query = query.filter(
                Apartment.id.in_(
                    apartment_ids_query
                )
            )

    # -----------------------------------------
    # Giá thấp trước,
    # cùng giá thì diện tích lớn trước
    # -----------------------------------------
    apartments = (
        query
        .order_by(
            Apartment.price.asc(),
            Apartment.area_sqm.desc()
        )
        .all()
    )

    # -----------------------------------------
    # Ghép tiện ích vào response
    # -----------------------------------------
    result = []

    for apartment in apartments:
        apartment_amenities = (
            db.query(Amenity)
            .filter(
                Amenity.apartment_id
                == apartment.id
            )
            .order_by(
                Amenity.id.asc()
            )
            .all()
        )

        result.append({
            "id":
                apartment.id,

            "building_id":
                apartment.building_id,

            "room_number":
                apartment.room_number,

            "floor":
                apartment.floor,

            "area_sqm":
                apartment.area_sqm,

            "price":
                apartment.price,

            "max_occupants":
                apartment.max_occupants,

            "status":
                apartment.status,

            "amenities": [
                item.name
                for item
                in apartment_amenities
            ]
        })

    return result


# =========================================================
# 3. DANH SÁCH CĂN HỘ TRỐNG
# PUBLIC
#
# PHẢI ĐẶT TRƯỚC /{apartment_id}
# =========================================================
@router.get(
    "/available",
    response_model=list[ApartmentResponse]
)
def get_available_apartments(
    db: Session = Depends(get_db)
):
    return (
        db.query(Apartment)
        .filter(
            Apartment.status
            == "AVAILABLE"
        )
        .order_by(
            Apartment.price.asc()
        )
        .all()
    )


# =========================================================
# 4. DANH SÁCH TẤT CẢ CĂN HỘ
# =========================================================
@router.get(
    "",
    response_model=list[ApartmentResponse]
)
def get_apartments(
    building_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(Apartment)
    if building_id is not None:
        query = query.filter(Apartment.building_id == building_id)
    if status is not None and status.strip():
        query = query.filter(Apartment.status == status.strip().upper())

    return (
        query
        .order_by(
            Apartment.id.asc()
        )
        .all()
    )


# =========================================================
# 5. CHI TIẾT CĂN HỘ
#
# ROUTE ĐỘNG PHẢI NẰM SAU /search VÀ /available
# =========================================================
@router.get(
    "/{apartment_id}",
    response_model=ApartmentResponse
)
def get_apartment(
    apartment_id: int,
    db: Session = Depends(get_db)
):
    apartment = (
        db.query(Apartment)
        .filter(
            Apartment.id == apartment_id
        )
        .first()
    )

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy căn hộ"
        )

    return apartment


# =========================================================
# 6. CẬP NHẬT CĂN HỘ
# ADMIN / STAFF
# =========================================================
@router.put(
    "/{apartment_id}",
    response_model=ApartmentResponse
)
def update_apartment(
    apartment_id: int,
    data: ApartmentUpdate,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
    )
):
    apartment = (
        db.query(Apartment)
        .filter(
            Apartment.id == apartment_id
        )
        .first()
    )

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy căn hộ"
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    # -----------------------------------------
    # Nếu đổi building
    # -----------------------------------------
    if "building_id" in update_data:
        building = (
            db.query(Building)
            .filter(
                Building.id
                == update_data["building_id"]
            )
            .first()
        )

        if building is None:
            raise HTTPException(
                status_code=404,
                detail="Tòa nhà không tồn tại"
            )

    new_building_id = update_data.get(
        "building_id",
        apartment.building_id
    )

    new_room_number = update_data.get(
        "room_number",
        apartment.room_number
    )

    # -----------------------------------------
    # Kiểm tra trùng số phòng
    # -----------------------------------------
    duplicate = (
        db.query(Apartment)
        .filter(
            Apartment.building_id
            == new_building_id,

            Apartment.room_number
            == new_room_number,

            Apartment.id
            != apartment.id
        )
        .first()
    )

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail=(
                "Số phòng đã tồn tại "
                "trong tòa nhà"
            )
        )

    # -----------------------------------------
    # Kiểm tra trạng thái mới
    # -----------------------------------------
    if (
        "status" in update_data
        and update_data["status"] is not None
    ):
        new_status = (
            update_data["status"]
            .upper()
        )

        if new_status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Trạng thái căn hộ "
                    "không hợp lệ"
                )
            )

        update_data["status"] = new_status

    # -----------------------------------------
    # Cập nhật
    # -----------------------------------------
    for field, value in update_data.items():
        setattr(
            apartment,
            field,
            value
        )

    db.commit()
    db.refresh(apartment)

    return apartment


@router.patch(
    "/{apartment_id}/status",
    response_model=ApartmentResponse
)
def update_apartment_status(
    apartment_id: int,
    data: ApartmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF")
    )
):
    if data.status.upper() not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Trạng thái căn hộ không hợp lệ"
        )

    apartment = db.query(Apartment).filter(
        Apartment.id == apartment_id
    ).first()

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy căn hộ"
        )

    try:
        apartment.status = data.status.upper()
        db.commit()
        db.refresh(apartment)
    except Exception:
        db.rollback()
        raise

    return apartment


# =========================================================
# 7. XÓA CĂN HỘ
# ADMIN
# =========================================================
@router.delete(
    "/{apartment_id}"
)
def delete_apartment(
    apartment_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles("ADMIN")
    )
):
    apartment = (
        db.query(Apartment)
        .filter(
            Apartment.id == apartment_id
        )
        .first()
    )

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy căn hộ"
        )

    # Không xóa căn đang có người thuê
    if apartment.status == "OCCUPIED":
        raise HTTPException(
            status_code=400,
            detail=(
                "Không thể xóa căn hộ "
                "đang có người thuê"
            )
        )

    db.delete(apartment)
    db.commit()

    return {
        "message":
            "Xóa căn hộ thành công"
    }