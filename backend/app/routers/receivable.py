from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from sqlalchemy.orm import Session

from datetime import date

from app.database import get_db
from app.models.tenant import Tenant
from app.models.receivable import Receivable
from app.models.contract import Contract
from app.models.user import User

from app.schemas.receivable import (
    ReceivableCreate,
    ReceivableResponse,
    MonthlyReceivableGenerateRequest,
    MonthlyReceivableGenerateResponse
)
from app.services.debt_service import recalculate_debt

from app.dependencies.auth import require_roles
from urllib.parse import (
    quote,
    urlencode
)

from app.models.role import Role
from app.models.tenant import Tenant
from app.models.contract import Contract

from app.schemas.receivable import (
    VietQRResponse
)
from app.core.config import settings

router = APIRouter(
    prefix="/receivables",
    tags=["Receivables"]
)


# =========================================================
# TẠO KHOẢN PHẢI THU HÀNG THÁNG
# =========================================================
@router.post(
    "",
    response_model=ReceivableResponse
)
def create_receivable(
    data: ReceivableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "ACCOUNTANT"
        )
    )
):

    # 1. Kiểm tra tháng
    if data.billing_month < 1 or data.billing_month > 12:
        raise HTTPException(
            status_code=400,
            detail="Tháng thu phải từ 1 đến 12"
        )

    # 2. Kiểm tra năm
    if data.billing_year < 2000:
        raise HTTPException(
            status_code=400,
            detail="Năm thu không hợp lệ"
        )

    # 3. Tiền dịch vụ không được âm
    if data.service_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Tiền dịch vụ không được nhỏ hơn 0"
        )

    # 4. Tìm hợp đồng
    contract = db.query(Contract).filter(
        Contract.id == data.contract_id
    ).first()

    if contract is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hợp đồng"
        )

    # 5. Chỉ sinh khoản thu từ hợp đồng ACTIVE
    if contract.status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Chỉ hợp đồng ACTIVE mới được sinh khoản phải thu"
        )

    # 6. Chống sinh trùng cùng kỳ
    existing = db.query(Receivable).filter(
        Receivable.contract_id == data.contract_id,
        Receivable.billing_month == data.billing_month,
        Receivable.billing_year == data.billing_year
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Khoản phải thu của kỳ này đã tồn tại"
        )

    # 7. Tiền phòng lấy từ hợp đồng
    room_amount = contract.rental_price

    # 8. Tổng phải thu
    total_amount = (
        room_amount
        + data.service_amount
    )

    # 9. Hạn nộp ngày 10 hàng tháng
    due_date = date(
        data.billing_year,
        data.billing_month,
        10
    )

    elec_cost = data.electricity_cost
    elec_kwh = data.electricity_usage_kwh
    wat_cost = data.water_cost
    wat_m3 = data.water_usage_m3
    mgmt_cost = data.management_cost

    if data.service_amount > 0 and elec_cost == 0 and wat_cost == 0:
        from decimal import Decimal
        mgmt_cost = Decimal(str(round(float(data.service_amount) * 0.20 / 1000) * 1000))
        wat_cost = Decimal(str(round(float(data.service_amount) * 0.18 / 1000) * 1000))
        elec_cost = data.service_amount - mgmt_cost - wat_cost
        elec_kwh = Decimal(str(round(float(elec_cost) / 3500, 1)))
        wat_m3 = Decimal(str(round(float(wat_cost) / 15000, 1)))

    # 10. Tạo khoản phải thu
    receivable = Receivable(
        contract_id=contract.id,
        apartment_id=contract.apartment_id,
        billing_month=data.billing_month,
        billing_year=data.billing_year,
        room_amount=room_amount,
        service_amount=data.service_amount,
        electricity_cost=elec_cost,
        electricity_usage_kwh=elec_kwh,
        water_cost=wat_cost,
        water_usage_m3=wat_m3,
        management_cost=mgmt_cost,
        parking_cost=data.parking_cost,
        internet_cost=data.internet_cost,
        total_amount=total_amount,
        paid_amount=0,
        status="UNPAID",
        due_date=due_date
    )

    try:
        db.add(receivable)
        recalculate_debt(
            contract.tenant_id,
            db,
            commit=False
        )
        db.commit()
        db.refresh(receivable)
    except Exception:
        db.rollback()
        raise

    return receivable


@router.post(
    "/generate-monthly",
    response_model=MonthlyReceivableGenerateResponse
)
def generate_monthly_receivables(
    data: MonthlyReceivableGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "ACCOUNTANT")
    )
):
    from app.services.billing_service import generate_monthly_receivables

    try:
        result = generate_monthly_receivables(
            data.billing_month,
            data.billing_year,
            data.service_amount,
            db
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    return result


# =========================================================
# KIỂM TRA VÀ CẬP NHẬT CÁC KHOẢN QUÁ HẠN
# =========================================================
@router.patch("/check-overdue")
def check_overdue_receivables(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "ACCOUNTANT"
        )
    )
):

    today = date.today()

    receivables = db.query(Receivable).filter(
        Receivable.status.in_(
            ["UNPAID", "PARTIAL"]
        )
    ).all()

    updated_count = 0

    for receivable in receivables:

        if (
            today > receivable.due_date
            and receivable.paid_amount
            < receivable.total_amount
        ):

            receivable.status = "OVERDUE"

            updated_count += 1

    db.commit()

    return {
        "message": "Kiểm tra quá hạn thành công",
        "updated_count": updated_count
    }


# =========================================================
# LẤY DANH SÁCH KHOẢN PHẢI THU
# =========================================================
@router.get(
    "",
    response_model=list[ReceivableResponse]
)
def get_receivables(
    db: Session = Depends(get_db),
    billing_month: int | None = Query(default=None, ge=1, le=12),
    billing_year: int | None = Query(default=None, ge=2000),
    status: str | None = None,
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT",
            "TENANT"
        )
    )
):

    query = db.query(Receivable)

    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if user_role and user_role.role_code == "TENANT":
        tenant = db.query(Tenant).filter(
            (Tenant.user_id == current_user.id) |
            (Tenant.phone == current_user.phone) |
            (Tenant.email == current_user.email)
        ).first()
        if tenant:
            contract_ids = [c.id for c in db.query(Contract).filter(Contract.tenant_id == tenant.id).all()]
            query = query.filter(Receivable.contract_id.in_(contract_ids))
        else:
            return []

    if billing_month is not None:
        query = query.filter(
            Receivable.billing_month == billing_month
        )
    if billing_year is not None:
        query = query.filter(
            Receivable.billing_year == billing_year
        )
    if status:
        query = query.filter(Receivable.status == status)

    return query.order_by(Receivable.due_date.asc()).all()


@router.get(
    "/my",
    response_model=list[ReceivableResponse]
)
def get_my_receivables(
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
            detail="Không tìm thấy hồ sơ khách thuê"
        )

    return (
        db.query(Receivable)
        .join(Contract, Receivable.contract_id == Contract.id)
        .filter(Contract.tenant_id == tenant.id)
        .order_by(Receivable.due_date.desc())
        .all()
    )


# =========================================================
# LẤY KHOẢN THU THEO HỢP ĐỒNG
# =========================================================
@router.get(
    "/contract/{contract_id}",
    response_model=list[ReceivableResponse]
)
def get_receivables_by_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
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

    receivables = db.query(Receivable).filter(
        Receivable.contract_id == contract_id
    ).all()

    return receivables
@router.get(
    "/{receivable_id}/vietqr",
    response_model=VietQRResponse
)
def get_receivable_vietqr(
    receivable_id: int,

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

    # ==========================================
    # 1. Kiểm tra cấu hình VietQR
    # ==========================================
    if (
        not settings.vietqr_bank_id
        or not settings.vietqr_account_no
        or not settings.vietqr_account_name
    ):
        raise HTTPException(
            status_code=500,
            detail="Hệ thống chưa cấu hình VietQR"
        )

    # ==========================================
    # 2. Tìm khoản phải thu
    # ==========================================
    receivable = db.query(
        Receivable
    ).filter(
        Receivable.id == receivable_id
    ).first()

    if receivable is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy khoản phải thu"
        )

    # ==========================================
    # 3. Kiểm tra quyền Tenant
    # ==========================================
    role = db.query(
        Role
    ).filter(
        Role.id == current_user.role_id
    ).first()

    if (
        role is not None
        and role.role_code == "TENANT"
    ):

        tenant = db.query(
            Tenant
        ).filter(
            Tenant.user_id == current_user.id
        ).first()

        if tenant is None:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy hồ sơ khách thuê"
            )

        contract = db.query(
            Contract
        ).filter(
            Contract.id == receivable.contract_id,
            Contract.tenant_id == tenant.id
        ).first()

        # Chống IDOR:
        # Tenant không được xem khoản thu người khác
        if contract is None:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy khoản phải thu"
            )

    # ==========================================
    # 4. Tính số tiền còn phải trả
    # ==========================================
    remaining = (
        receivable.total_amount
        - receivable.paid_amount
    )

    if remaining <= 0:
        raise HTTPException(
            status_code=400,
            detail="Khoản thu đã được thanh toán đầy đủ"
        )

    amount = int(remaining)

    # Nội dung chuyển khoản:
    # ngắn, không ký tự đặc biệt
    transfer_content = (
        f"THUE CAN HO HD{receivable.contract_id} "
        f"PT{receivable.id}"
    )

    # ==========================================
    # 5. Sinh VietQR Quick Link
    # ==========================================
    bank_id = quote(
        settings.vietqr_bank_id.strip()
    )

    account_no = quote(
        settings.vietqr_account_no.strip()
    )

    base_url = (
        "https://img.vietqr.io/image/"
        f"{bank_id}-"
        f"{account_no}-"
        "compact2.png"
    )

    query_string = urlencode({
        "amount":
            amount,

        "addInfo":
            transfer_content,

        "accountName":
            settings.vietqr_account_name
    })

    qr_url = (
        f"{base_url}?{query_string}"
    )

    return {
        "receivable_id":
            receivable.id,

        "contract_id":
            receivable.contract_id,

        "amount":
            amount,

        "bank_id":
            settings.vietqr_bank_id,

        "account_no":
            settings.vietqr_account_no,

        "account_name":
            settings.vietqr_account_name,

        "transfer_content":
            transfer_content,

        "qr_url":
            qr_url
    }


# =========================================================
# XEM CHI TIẾT MỘT KHOẢN THU
# =========================================================
@router.get(
    "/{receivable_id}",
    response_model=ReceivableResponse
)
def get_receivable(
    receivable_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
        )
    )
):

    receivable = db.query(Receivable).filter(
        Receivable.id == receivable_id
    ).first()

    if receivable is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy khoản phải thu"
        )

    return receivable