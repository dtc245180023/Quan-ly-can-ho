from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tenant import Tenant
from app.models.payment import Payment
from app.models.receivable import Receivable
from app.models.user import User
from datetime import datetime
from uuid import uuid4

from app.models.contract import Contract
from app.models.role import Role
from app.services.debt_service import recalculate_debt
from app.schemas.payment import (
    PaymentCreate,
    PaymentResponse
)
def generate_cash_transaction_code():
    today = datetime.now().strftime("%Y%m%d")
    random_code = uuid4().hex[:6].upper()
    return f"PT-{today}-{random_code}"
from app.dependencies.auth import require_roles


router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


@router.get(
    "",
    response_model=list[PaymentResponse]
)
def get_payments(
    receivable_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF", "ACCOUNTANT", "TENANT")
    )
):
    query = db.query(Payment)

    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if user_role and user_role.role_code == "TENANT":
        tenant = db.query(Tenant).filter(
            (Tenant.user_id == current_user.id) |
            (Tenant.phone == current_user.phone) |
            (Tenant.email == current_user.email)
        ).first()
        if tenant:
            contract_ids = [c.id for c in db.query(Contract).filter(Contract.tenant_id == tenant.id).all()]
            receivable_ids = [r.id for r in db.query(Receivable).filter(Receivable.contract_id.in_(contract_ids)).all()]
            query = query.filter(Payment.receivable_id.in_(receivable_ids))
        else:
            return []

    if receivable_id is not None:
        query = query.filter(Payment.receivable_id == receivable_id)
    return query.order_by(Payment.payment_date.desc()).all()


VALID_PAYMENT_METHODS = [
    "CASH",
    "BANK_TRANSFER"
]


# =========================================================
# GHI NHẬN THANH TOÁN
# =========================================================
@router.post(
    "",
    response_model=PaymentResponse
)
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "ACCOUNTANT",
            "TENANT"
        )
    )
):

    # 1. Tìm khoản phải thu
    receivable = db.query(Receivable).filter(
        Receivable.id == data.receivable_id
    ).first()

    if receivable is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy khoản phải thu"
        )

    # Nếu là cư dân (TENANT), bắt buộc phải là hóa đơn của chính mình
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if user_role and user_role.role_code == "TENANT":
        tenant = db.query(Tenant).filter(
            (Tenant.user_id == current_user.id) |
            (Tenant.phone == current_user.phone) |
            (Tenant.email == current_user.email)
        ).first()
        if not tenant:
            raise HTTPException(status_code=403, detail="Không tìm thấy hồ sơ cư dân của bạn")

        contract = db.query(Contract).filter(Contract.id == receivable.contract_id).first()
        if not contract or contract.tenant_id != tenant.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thanh toán cho hóa đơn của căn hộ khác")

    # 2. Không thanh toán lại khoản đã PAID
    if receivable.status == "PAID":
        raise HTTPException(
            status_code=400,
            detail="Khoản phải thu đã được thanh toán đầy đủ"
        )

    # 3. Kiểm tra số tiền > 0
    if data.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Số tiền thanh toán phải lớn hơn 0"
        )

    # 4. Kiểm tra phương thức
    if data.payment_method not in [
        "CASH",
        "BANK_TRANSFER"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Phương thức thanh toán không hợp lệ"
        )

    # 5. Tính tiền còn nợ
    remaining_before_payment = (
        receivable.total_amount
        - receivable.paid_amount
    )

    # 6. Không cho thanh toán dư
    if data.amount > remaining_before_payment:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Số tiền thanh toán lớn hơn số tiền còn nợ "
                f"({remaining_before_payment})"
            )
        )

    # 7. Xử lý mã giao dịch
    transaction_code = data.transaction_code

    if data.payment_method == "BANK_TRANSFER":
        if not transaction_code:
            today = datetime.now().strftime("%Y%m%d")
            transaction_code = f"VQR-{today}-{uuid4().hex[:6].upper()}"
    else:
        # Tiền mặt: Backend tự sinh mã phiếu thu
        if not transaction_code:
            transaction_code = (
                generate_cash_transaction_code()
            )

    # 8. Chống mã giao dịch trùng
    existing_transaction = db.query(Payment).filter(
        Payment.transaction_code == transaction_code
    ).first()

    if existing_transaction:
        raise HTTPException(
            status_code=400,
            detail="Mã giao dịch đã tồn tại"
        )

    # 9. Tạo Payment
    payment = Payment(
        receivable_id=data.receivable_id,
        amount=data.amount,
        payment_method=data.payment_method,
        transaction_code=transaction_code,
        note=data.note,
        handled_by=current_user.id
    )

    try:
        db.add(payment)

        # 10. Cộng số đã trả
        receivable.paid_amount = (
            receivable.paid_amount
            + data.amount
        )

        remaining = (
            receivable.total_amount
            - receivable.paid_amount
        )

        # 11. Cập nhật trạng thái
        receivable.status = "PAID" if remaining == 0 else "PARTIAL"

        # 12. Đồng bộ sổ công nợ trong cùng transaction
        contract = db.query(Contract).filter(
            Contract.id == receivable.contract_id
        ).first()

        if contract:
            recalculate_debt(
                contract.tenant_id,
                db,
                commit=False
            )

        db.commit()
        db.refresh(payment)
    except Exception:
        db.rollback()
        raise

    return payment


# =========================================================
# XUẤT THÔNG TIN BIÊN LAI
# =========================================================
@router.get(
    "/my",
    response_model=list[PaymentResponse]
)
def get_my_payments(
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

    payments = (
        db.query(Payment)
        .join(
            Receivable,
            Payment.receivable_id == Receivable.id
        )
        .join(
            Contract,
            Receivable.contract_id == Contract.id
        )
        .filter(
            Contract.tenant_id == tenant.id
        )
        .all()
    )

    return payments
@router.get("/{payment_id}/receipt")
def export_receipt(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
        )
    )
):

    payment = db.query(Payment).filter(
        Payment.id == payment_id
    ).first()

    if payment is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy giao dịch thanh toán"
        )

    receivable = db.query(Receivable).filter(
        Receivable.id == payment.receivable_id
    ).first()

    receipt = (
        f"PHIẾU THU #{payment.id}\n"
        f"Khoản thu: {payment.receivable_id}\n"
        f"Số tiền: {payment.amount}\n"
        f"Phương thức: {payment.payment_method}\n"
        f"Mã giao dịch: {payment.transaction_code or 'Không có'}\n"
        f"Ngày thanh toán: {payment.payment_date}\n"
        f"Kỳ thu: {receivable.billing_month}/{receivable.billing_year}\n"
        f"Ghi chú: {payment.note or 'Không có'}"
    )

    return {
        "receipt": receipt
    }