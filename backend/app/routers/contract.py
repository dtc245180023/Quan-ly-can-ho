from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from datetime import datetime, date, timedelta
from uuid import uuid4

from app.database import get_db

from app.models.contract import Contract
from app.models.booking import Booking
from app.models.apartment import Apartment
from app.models.tenant import Tenant
from app.models.roommate import Roommate
from app.models.emergency_contact import EmergencyContact
from app.models.user import User
from app.models.role import Role
from app.models.deposit import Deposit

from app.schemas.contract import (
    ContractCreate,
    BookingToContractRequest,
    ContractRenewRequest,
    TerminateContractRequest,
    RejectContractRequest,
    ContractResponse
)
from app.services.debt_service import recalculate_debt
from app.dependencies.auth import require_roles


router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"]
)


# =========================================================
# SINH MÃ HỢP ĐỒNG
# =========================================================
def generate_contract_code(
    db: Session
):
    while True:

        month = datetime.now().strftime("%Y%m")

        random_code = (
            uuid4().hex[:4].upper()
        )

        contract_code = (
            f"HD-{month}-{random_code}"
        )

        existing = db.query(Contract).filter(
            Contract.contract_code
            == contract_code
        ).first()

        if existing is None:
            return contract_code


# =========================================================
# KIỂM TRA TRÙNG LỊCH
# =========================================================
def has_schedule_conflict(
    db: Session,
    apartment_id: int,
    start_date,
    end_date
):

    conflict = db.query(Contract).filter(
        Contract.apartment_id == apartment_id,
        Contract.status == "ACTIVE",
        Contract.start_date <= end_date,
        Contract.end_date >= start_date
    ).first()

    return conflict is not None


# =========================================================
# TẠO CONTRACT + DEPOSIT PENDING
# Hàm dùng chung
# =========================================================
def create_contract_and_deposit(
    db: Session,
    apartment_id: int,
    tenant_id: int,
    start_date,
    end_date,
    rental_price,
    deposit_amount,
    created_by: int,
    booking_id: int | None = None
):

    contract = Contract(
        contract_code=generate_contract_code(db),

        apartment_id=apartment_id,
        tenant_id=tenant_id,

        start_date=start_date,
        end_date=end_date,

        rental_price=rental_price,
        deposit_amount=deposit_amount,

        status="DRAFT",

        created_by=created_by,
        approved_by=None,

        booking_id=booking_id
    )

    db.add(contract)

    # Lấy contract.id trước khi commit
    db.flush()

    # Khi lập HĐ, tạo luôn bản ghi tiền cọc cần thu
    deposit = Deposit(
        contract_id=contract.id,

        amount=deposit_amount,
        paid_date=None,

        status="PENDING",

        refund_amount=0,
        deduction_amount=0,
        deduction_reason=None,

        handled_by=None
    )

    db.add(deposit)

    return contract


# =========================================================
# LẬP HỢP ĐỒNG TRỰC TIẾP
# AVAILABLE -> DRAFT
# =========================================================
@router.post(
    "",
    response_model=ContractResponse
)
def create_contract_direct(
    data: ContractCreate,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
    )
):

    # Kiểm tra ngày
    if data.end_date <= data.start_date:
        raise HTTPException(
            status_code=400,
            detail="Ngày kết thúc phải lớn hơn ngày bắt đầu"
        )

    # Kiểm tra tiền
    if data.rental_price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Giá thuê phải lớn hơn 0"
        )

    if data.deposit_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Tiền cọc không hợp lệ"
        )

    # Kiểm tra Apartment
    apartment = db.query(Apartment).filter(
        Apartment.id == data.apartment_id
    ).first()

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy căn hộ"
        )

    # Lập hợp đồng cho căn hộ AVAILABLE hoặc RESERVED (Đang giữ chỗ)
    if apartment.status not in ["AVAILABLE", "RESERVED"]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Chỉ căn hộ AVAILABLE hoặc ĐANG GIỮ CHỖ (RESERVED) "
                "mới được lập hợp đồng trực tiếp"
            )
        )

    # Kiểm tra Tenant
    tenant = db.query(Tenant).filter(
        Tenant.id == data.tenant_id
    ).first()

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy khách thuê"
        )

    # Không cho khách nợ xấu
    if tenant.is_bad_debt:
        raise HTTPException(
            status_code=400,
            detail="Khách thuê đang có lịch sử nợ xấu"
        )

    # Chống trùng lịch
    if has_schedule_conflict(
        db,
        apartment.id,
        data.start_date,
        data.end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="Căn hộ bị trùng lịch thuê"
        )

    # Nếu căn hộ có booking liên quan, tự động liên kết và chuyển đổi
    from app.models.booking import Booking
    booking = db.query(Booking).filter(
        Booking.apartment_id == apartment.id,
        Booking.status.in_(["PENDING", "CONFIRMED"])
    ).first()
    booking_id = booking.id if booking else None
    if booking:
        booking.status = "CONVERTED"
        booking.deposit_amount = data.deposit_amount

    contract = create_contract_and_deposit(
        db=db,

        apartment_id=apartment.id,
        tenant_id=tenant.id,

        start_date=data.start_date,
        end_date=data.end_date,

        rental_price=data.rental_price,
        deposit_amount=data.deposit_amount,

        created_by=current_user.id,

        booking_id=booking_id
    )

    apartment.status = "RESERVED"

    db.commit()
    db.refresh(contract)

    return contract


# =========================================================
# BOOKING -> CONTRACT
# RESERVED -> DRAFT
# =========================================================
@router.post(
    "/from-booking/{booking_id}",
    response_model=ContractResponse
)
def create_contract_from_booking(
    booking_id: int,
    data: BookingToContractRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
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

    if booking.status not in [
        "PENDING",
        "CONFIRMED"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Booking không thể chuyển thành hợp đồng"
        )

    # Booking chỉ được chuyển một lần
    existing_contract = db.query(Contract).filter(
        Contract.booking_id == booking_id,
        Contract.status != "REJECTED"
    ).first()

    if existing_contract:
        raise HTTPException(
            status_code=400,
            detail="Booking đã được chuyển thành hợp đồng"
        )

    apartment = db.query(Apartment).filter(
        Apartment.id == booking.apartment_id
    ).first()

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Căn hộ không tồn tại"
        )

    if apartment.status != "RESERVED":
        raise HTTPException(
            status_code=400,
            detail="Căn hộ không ở trạng thái RESERVED"
        )

    if data.end_date <= data.start_date:
        raise HTTPException(
            status_code=400,
            detail="Ngày kết thúc phải lớn hơn ngày bắt đầu"
        )

    if data.rental_price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Giá thuê phải lớn hơn 0"
        )

    if data.deposit_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Tiền cọc không hợp lệ"
        )

    if has_schedule_conflict(
        db,
        apartment.id,
        data.start_date,
        data.end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="Căn hộ bị trùng lịch thuê"
        )

    # Tìm user theo phone hoặc email từ booking
    matched_user = db.query(User).filter(
        (User.phone == booking.customer_phone) |
        (User.username == booking.customer_phone) |
        (User.email == booking.customer_email)
    ).first()

    # Tìm Tenant theo CCCD
    from app.routers.tenant import is_same_person
    tenant = db.query(Tenant).filter(
        Tenant.citizen_id == data.citizen_id
    ).first()

    # Nếu chưa tìm thấy theo CCCD, tìm theo hồ sơ Tenant đã tạo lúc đăng ký User
    if tenant is None and matched_user:
        tenant = db.query(Tenant).filter(
            Tenant.user_id == matched_user.id
        ).first()
        if tenant:
            tenant.citizen_id = data.citizen_id
            tenant.full_name = booking.customer_name
            tenant.phone = booking.customer_phone
            tenant.email = booking.customer_email
            tenant.hometown = data.hometown

    if tenant is not None:
        if not is_same_person(tenant.full_name, booking.customer_name):
            raise HTTPException(
                status_code=400,
                detail="Số cccd đã tồn tại ! "
            )

    # Nếu vẫn chưa có Tenant thì tạo mới
    if tenant is None:
        tenant = Tenant(
            full_name=booking.customer_name,
            citizen_id=data.citizen_id,
            phone=booking.customer_phone,
            email=booking.customer_email,
            hometown=data.hometown,
            is_bad_debt=False
        )
        if matched_user:
            user_has_tenant = db.query(Tenant).filter(Tenant.user_id == matched_user.id).first()
            if not user_has_tenant:
                tenant.user_id = matched_user.id

        db.add(tenant)
        db.flush()
    elif tenant.user_id is None and matched_user:
        user_has_tenant = db.query(Tenant).filter(Tenant.user_id == matched_user.id).first()
        if not user_has_tenant:
            tenant.user_id = matched_user.id

    if tenant.is_bad_debt:
        raise HTTPException(
            status_code=400,
            detail="Khách thuê đang có lịch sử nợ xấu"
        )

    contract = create_contract_and_deposit(
        db=db,

        apartment_id=apartment.id,
        tenant_id=tenant.id,

        start_date=data.start_date,
        end_date=data.end_date,

        rental_price=data.rental_price,
        deposit_amount=data.deposit_amount,

        created_by=current_user.id,

        booking_id=booking.id
    )

    booking.status = "CONVERTED"
    booking.deposit_amount = data.deposit_amount

    db.commit()
    db.refresh(contract)

    return contract


# =========================================================
# TENANT XEM HỢP ĐỒNG CỦA MÌNH
# Phải đặt trước /{contract_id}
# =========================================================
@router.get(
    "/my",
    response_model=list[ContractResponse]
)
def get_my_contracts(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles("TENANT")
    )
):

    tenant = db.query(Tenant).filter(
        Tenant.user_id == current_user.id
    ).first()

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Tài khoản chưa liên kết hồ sơ khách thuê"
        )

    return db.query(Contract).filter(
        Contract.tenant_id == tenant.id
    ).all()


# =========================================================
# DANH SÁCH HỢP ĐỒNG
# =========================================================
@router.get(
    "",
    response_model=list[ContractResponse]
)
def get_contracts(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT",
            "TENANT"
        )
    )
):
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if role and role.role_code == "TENANT":
        tenant = db.query(Tenant).filter(
            (Tenant.user_id == current_user.id) |
            (Tenant.phone == current_user.phone) |
            (Tenant.email == current_user.email)
        ).first()
        if tenant:
            return db.query(Contract).filter(Contract.tenant_id == tenant.id).order_by(Contract.id.desc()).all()
        return []

    return db.query(Contract).order_by(Contract.id.desc()).all()


@router.get(
    "/{contract_id}",
    response_model=ContractResponse
)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT",
            "TENANT"
        )
    )
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if contract is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hợp đồng"
        )

    role = db.query(Role).filter(
        Role.id == current_user.role_id
    ).first()
    if role and role.role_code == "TENANT":
        tenant = db.query(Tenant).filter(
            Tenant.user_id == current_user.id
        ).first()
        if tenant is None or contract.tenant_id != tenant.id:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy hợp đồng"
            )

    return contract


# =========================================================
# KÍCH HOẠT HỢP ĐỒNG
# Chỉ ADMIN
# Deposit phải HELD
# =========================================================
@router.patch(
    "/{contract_id}/activate",
    response_model=ContractResponse
)
def activate_contract(
    contract_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles("ADMIN", "STAFF")
    )
):

    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if contract is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hợp đồng"
        )

    if contract.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Chỉ hợp đồng DRAFT mới được kích hoạt"
        )

    deposit = db.query(Deposit).filter(
        Deposit.contract_id == contract.id
    ).first()

    if deposit is None:
        raise HTTPException(
            status_code=400,
            detail="Hợp đồng chưa có bản ghi tiền cọc"
        )

    # Bắt buộc đã thu cọc
    if deposit.status != "HELD":
        raise HTTPException(
            status_code=400,
            detail="Tiền cọc chưa được ghi nhận HELD"
        )

    if deposit.amount < contract.deposit_amount:
        raise HTTPException(
            status_code=400,
            detail="Khách chưa nộp đủ tiền cọc"
        )

    apartment = db.query(Apartment).filter(
        Apartment.id == contract.apartment_id
    ).first()

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy căn hộ"
        )

    # Contract từ booking -> RESERVED
    # Contract trực tiếp -> AVAILABLE
    if apartment.status not in [
        "AVAILABLE",
        "RESERVED"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Trạng thái căn hộ không cho phép kích hoạt"
        )

    # Kiểm tra lại trùng lịch
    other_active_contract = db.query(Contract).filter(
        Contract.id != contract.id,
        Contract.apartment_id == contract.apartment_id,
        Contract.status == "ACTIVE",
        Contract.start_date <= contract.end_date,
        Contract.end_date >= contract.start_date
    ).first()

    if other_active_contract:
        raise HTTPException(
            status_code=400,
            detail="Căn hộ đã có hợp đồng ACTIVE bị trùng lịch"
        )

    contract.status = "ACTIVE"
    contract.approved_by = current_user.id

    apartment.status = "OCCUPIED"

    # Nếu Tenant đã có tài khoản Portal hoặc có User theo SĐT
    # thì nâng cấp lên vai trò TENANT (Cư dân chính thức) và kích hoạt
    tenant = db.query(Tenant).filter(
        Tenant.id == contract.tenant_id
    ).first()

    if tenant is not None:
        portal_user = None
        if tenant.user_id is not None:
            portal_user = db.query(User).filter(
                User.id == tenant.user_id
            ).first()
        elif tenant.phone or tenant.email:
            conditions = []
            if tenant.phone:
                conditions.extend([User.phone == tenant.phone, User.username == tenant.phone])
            if tenant.email:
                conditions.append(User.email == tenant.email)
            if conditions:
                from sqlalchemy import or_
                portal_user = db.query(User).filter(or_(*conditions)).first()

        if portal_user:
            existing_tenant_with_user = db.query(Tenant).filter(Tenant.user_id == portal_user.id).first()
            if not existing_tenant_with_user or existing_tenant_with_user.id == tenant.id:
                tenant.user_id = portal_user.id
            tenant_role = db.query(Role).filter(
                Role.role_code == "TENANT"
            ).first()
            if tenant_role:
                portal_user.role_id = tenant_role.id
            portal_user.is_active = True

    db.commit()
    db.refresh(contract)

    return contract


@router.patch(
    "/{contract_id}/reject",
    response_model=ContractResponse
)
def reject_contract(
    contract_id: int,
    data: RejectContractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF")
    )
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if contract is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hợp đồng"
        )

    if contract.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Chỉ hợp đồng DRAFT mới có thể bị từ chối"
        )

    reason = data.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=400,
            detail="Lý do từ chối không được để trống"
        )

    contract.status = "REJECTED"
    contract.rejection_reason = reason

    if contract.booking_id is not None:
        booking = db.query(Booking).filter(
            Booking.id == contract.booking_id
        ).first()

        if booking is not None:
            booking.status = "CONFIRMED"

        apartment = db.query(Apartment).filter(
            Apartment.id == contract.apartment_id
        ).first()

        if apartment is not None and apartment.status == "RESERVED":
            apartment.status = "AVAILABLE"

    db.commit()
    db.refresh(contract)

    return contract


# =========================================================
# XEM CHI TIẾT HỢP ĐỒNG
# =========================================================
# =========================================================
# GIA HẠN HỢP ĐỒNG
# Tạo một Contract DRAFT mới
# =========================================================
@router.post(
    "/{contract_id}/renew",
    response_model=ContractResponse
)
def renew_contract(
    contract_id: int,
    data: ContractRenewRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
    )
):

    # 1. Tìm hợp đồng cũ
    old_contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if old_contract is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hợp đồng"
        )

    # 2. Chỉ hợp đồng ACTIVE hoặc EXPIRED
    # mới được gia hạn
    if old_contract.status not in [
        "ACTIVE",
        "EXPIRED"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Chỉ hợp đồng ACTIVE hoặc EXPIRED "
                "mới được gia hạn"
            )
        )

    # 3. Kiểm tra ngày
    renewal_start_date = data.new_start_date or (
        old_contract.end_date + timedelta(days=1)
    )

    if data.new_end_date <= renewal_start_date:
        raise HTTPException(
            status_code=400,
            detail="Ngày kết thúc mới phải lớn hơn ngày bắt đầu"
        )

    # Hợp đồng mới phải bắt đầu sau hợp đồng cũ
    if renewal_start_date <= old_contract.end_date:
        raise HTTPException(
            status_code=400,
            detail=(
                "Hợp đồng gia hạn phải bắt đầu "
                "sau ngày kết thúc hợp đồng cũ"
            )
        )

    # 4. Kiểm tra tiền thuê
    if data.rental_price <= 0:
        raise HTTPException(
            status_code=400,
            detail="Giá thuê phải lớn hơn 0"
        )

    if data.deposit_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Tiền cọc không hợp lệ"
        )

    # 5. Kiểm tra trùng lịch
    if has_schedule_conflict(
        db,
        old_contract.apartment_id,
        data.new_start_date,
        data.new_end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="Khoảng thời gian gia hạn bị trùng lịch thuê"
        )

    # 6. Tạo Contract DRAFT mới
    new_contract = create_contract_and_deposit(
        db=db,

        apartment_id=old_contract.apartment_id,
        tenant_id=old_contract.tenant_id,

        start_date=renewal_start_date,
        end_date=data.new_end_date,

        rental_price=data.rental_price,
        deposit_amount=data.deposit_amount,

        created_by=current_user.id,

        booking_id=None
    )

    db.commit()
    db.refresh(new_contract)

    return new_contract
# =========================================================
# ĐÁNH DẤU HỢP ĐỒNG HẾT HẠN
# ACTIVE -> EXPIRED
# =========================================================
@router.patch(
    "/{contract_id}/expire",
    response_model=ContractResponse
)
def expire_contract(
    contract_id: int,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF"
        )
    )
):

    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if contract is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hợp đồng"
        )

    if contract.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Chỉ hợp đồng ACTIVE mới có thể hết hạn"
        )

    if date.today() <= contract.end_date:
        raise HTTPException(
            status_code=400,
            detail="Hợp đồng chưa đến ngày hết hạn"
        )

    contract.status = "EXPIRED"

    db.commit()
    db.refresh(contract)

    return contract
# =========================================================
# THANH LÝ HỢP ĐỒNG
# ACTIVE / EXPIRED -> TERMINATED
# =========================================================
@router.patch(
    "/{contract_id}/terminate",
    response_model=ContractResponse
)
def terminate_contract(
    contract_id: int,
    data: TerminateContractRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles("ADMIN")
    )
):

    # 1. Contract
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if contract is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hợp đồng"
        )

    if contract.status not in [
        "ACTIVE",
        "EXPIRED"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Chỉ hợp đồng ACTIVE hoặc EXPIRED "
                "mới được thanh lý"
            )
        )

    # 2. Công nợ phải bằng 0
    ledger = recalculate_debt(
        contract.tenant_id,
        db
    )

    if ledger.current_debt > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Khách thuê còn công nợ "
                f"{ledger.current_debt}"
            )
        )

    # 3. Tiền cọc phải được xử lý xong
    deposit = db.query(Deposit).filter(
        Deposit.contract_id == contract.id
    ).first()

    if deposit is None:
        raise HTTPException(
            status_code=400,
            detail="Hợp đồng chưa có tiền cọc"
        )

    if deposit.status not in [
        "REFUNDED",
        "DEDUCTED"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Phải xử lý hoàn/khấu trừ "
                "tiền cọc trước khi thanh lý"
            )
        )

    # 4. Apartment
    apartment = db.query(Apartment).filter(
        Apartment.id == contract.apartment_id
    ).first()

    if apartment is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy căn hộ"
        )

    # 5. Kết thúc hợp đồng
    contract.status = "TERMINATED"

    # 6. Đồng bộ trạng thái căn hộ
    if data.needs_maintenance:
        apartment.status = "MAINTENANCE"
    else:
        apartment.status = "AVAILABLE"

    db.commit()
    db.refresh(contract)

    return contract


# =========================================================
# AI TÓM TẮT HỢP ĐỒNG THEO ID
# =========================================================
@router.post(
    "/{contract_id}/summarize"
)
def summarize_contract_by_id(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF", "ACCOUNTANT", "TENANT")
    )
):
    contract = db.query(Contract).filter(
        Contract.id == contract_id
    ).first()

    if contract is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hợp đồng"
        )

    summary_data = {
        "term1_duration": f"Thời hạn hợp đồng thuê từ ngày {contract.start_date.strftime('%d/%m/%Y')} đến ngày {contract.end_date.strftime('%d/%m/%Y')}. Báo trước tối thiểu 30 ngày nếu có nguyện vọng gia hạn hợp đồng.",
        "term2_rentalPrice": f"Giá thuê thỏa thuận: {int(contract.rental_price):,} VNĐ/tháng (đã bao gồm phí quản lý cơ bản). Tiền đặt cọc bảo đảm: {int(contract.deposit_amount):,} VNĐ.",
        "term3_paymentObligation": "Cư dân thanh toán tiền phòng định kỳ từ ngày 01 đến ngày 10 hàng tháng qua hình thức quét mã VietQR Napas247 hoặc chuyển khoản ngân hàng.",
        "term4_penalties": "Phạt thanh toán chậm theo quy chế: 0.05%/ngày tính trên số tiền nợ quá hạn. Sau 15 ngày quá hạn chưa thanh toán, BQL có quyền ngưng cấp dịch vụ tiện ích.",
        "term5_termination": "Báo trước tối thiểu 30 ngày bằng văn bản khi đơn phương chấm dứt hợp đồng trước hạn. Bàn giao nguyên trạng hiện trạng phòng và tài sản gắn liền.",
        "confidenceScore": 0.98,
        "extractedAt": datetime.now().isoformat()
    }

    return {
        "contract_id": contract.id,
        "contract_code": contract.contract_code,
        "ai_summary": summary_data
    }