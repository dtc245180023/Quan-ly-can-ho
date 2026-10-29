from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from datetime import date
from decimal import Decimal

from app.database import get_db
from app.services.debt_service import (
    apply_deposit_offset,
    recalculate_debt
)
from app.models.deposit import Deposit
from app.models.contract import Contract
from app.models.tenant import Tenant
from app.models.user import User

from app.schemas.deposit import (
    ReceiveDepositRequest,
    SettleDepositRequest,
    DepositSettlementPreviewRequest,
    DepositResponse
)

from app.dependencies.auth import require_roles


router = APIRouter(
    prefix="/deposits",
    tags=["Deposits"]
)


# =========================================================
# DANH SÁCH TIỀN CỌC
# =========================================================
@router.get(
    "",
    response_model=list[DepositResponse]
)
def get_deposits(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
        )
    )
):

    return db.query(Deposit).order_by(Deposit.id.desc()).all()


# =========================================================
# TENANT XEM TIỀN CỌC CỦA MÌNH
# =========================================================
@router.get(
    "/my",
    response_model=list[DepositResponse]
)
def get_my_deposits(
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

    deposits = (
        db.query(Deposit)
        .join(
            Contract,
            Deposit.contract_id == Contract.id
        )
        .filter(
            Contract.tenant_id == tenant.id
        )
        .order_by(Deposit.id.desc())
        .all()
    )

    return deposits


# =========================================================
# GHI NHẬN THU TIỀN CỌC
# PENDING -> HELD
# =========================================================
@router.patch(
    "/contract/{contract_id}/receive",
    response_model=DepositResponse
)
def receive_deposit(
    contract_id: int,
    data: ReceiveDepositRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "ACCOUNTANT",
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

    if contract.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Chỉ hợp đồng DRAFT mới được thu cọc"
        )

    deposit = db.query(Deposit).filter(
        Deposit.contract_id == contract_id
    ).first()

    if deposit is None:
        deposit = Deposit(
            contract_id=contract_id,
            amount=data.amount,
            paid_date=date.today(),
            status="HELD",
            refund_amount=0,
            deduction_amount=0,
            handled_by=current_user.id
        )
        db.add(deposit)
        db.commit()
        db.refresh(deposit)
        return deposit

    if deposit.status == "HELD":
        # Tiền cọc đã ở trạng thái HELD (xử lý idempotent)
        return deposit

    if deposit.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Tiền cọc không ở trạng thái PENDING"
        )

    if data.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Số tiền cọc phải lớn hơn 0"
        )

    # Theo luồng hiện tại:
    # phải nộp đủ số tiền cọc hợp đồng
    if data.amount < contract.deposit_amount:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Chưa đủ tiền cọc. "
                f"Cần nộp {contract.deposit_amount}"
            )
        )

    deposit.amount = data.amount
    deposit.paid_date = date.today()

    deposit.status = "HELD"

    deposit.handled_by = current_user.id

    db.commit()
    db.refresh(deposit)

    return deposit


# =========================================================
# XEM TIỀN CỌC THEO CONTRACT
# =========================================================
@router.get(
    "/contract/{contract_id}",
    response_model=DepositResponse
)
def get_deposit_by_contract(
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

    deposit = db.query(Deposit).filter(
        Deposit.contract_id == contract_id
    ).first()

    if deposit is None:
        raise HTTPException(
            status_code=404,
            detail="Hợp đồng chưa có thông tin tiền cọc"
        )

    return deposit


# =========================================================
# THANH LÝ / HOÀN CỌC
# HELD -> REFUNDED / DEDUCTED
# =========================================================
@router.patch(
    "/contract/{contract_id}/settle",
    response_model=DepositResponse
)
def settle_deposit(
    contract_id: int,
    data: SettleDepositRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "ACCOUNTANT"
        )
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

    # Chỉ xử lý cọc khi đang chuẩn bị kết thúc HĐ
    if contract.status not in [
        "ACTIVE",
        "EXPIRED"
    ]:
        raise HTTPException(
            status_code=400,
            detail=(
                "Chỉ hợp đồng ACTIVE hoặc EXPIRED "
                "mới được thanh lý tiền cọc"
            )
        )

    # 2. Deposit
    deposit = db.query(Deposit).filter(
        Deposit.contract_id == contract_id
    ).first()

    if deposit is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tiền cọc"
        )

    if deposit.status != "HELD":
        raise HTTPException(
            status_code=400,
            detail="Tiền cọc không ở trạng thái HELD"
        )

    # 3. Kiểm tra khấu trừ
    if data.deduction_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Số tiền khấu trừ không hợp lệ"
        )

    if data.deduction_amount > deposit.amount:
        raise HTTPException(
            status_code=400,
            detail="Tiền khấu trừ lớn hơn tiền cọc"
        )

    if (
        data.deduction_amount > 0
        and not data.deduction_reason
    ):
        raise HTTPException(
            status_code=400,
            detail="Phải nhập lý do khấu trừ"
        )

    try:
        ledger = recalculate_debt(
            contract.tenant_id,
            db,
            commit=False
        )
        available_for_debt = (
            deposit.amount - data.deduction_amount
        )
        debt_to_offset = max(
            0,
            min(ledger.current_debt, available_for_debt)
        )
        debt_offset = apply_deposit_offset(
            contract.tenant_id,
            debt_to_offset,
            current_user.id,
            deposit.id,
            db
        )

        refund = (
            deposit.amount
            - data.deduction_amount
            - debt_offset
        )

        deposit.deduction_amount = data.deduction_amount
        deposit.deduction_reason = data.deduction_reason
        deposit.refund_amount = refund
        deposit.handled_by = current_user.id
        deposit.status = "REFUNDED" if refund > 0 else "DEDUCTED"

        recalculate_debt(
            contract.tenant_id,
            db,
            commit=False
        )
        db.commit()
        db.refresh(deposit)
    except Exception:
        db.rollback()
        raise

    return deposit
# =========================================================
# XEM TRƯỚC SỐ TIỀN HOÀN CỌC
# =========================================================
@router.post(
    "/contract/{contract_id}/settlement-preview"
)
def preview_deposit_settlement(
    contract_id: int,
    data: DepositSettlementPreviewRequest,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
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

    deposit = db.query(Deposit).filter(
        Deposit.contract_id == contract_id
    ).first()

    if deposit is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy tiền cọc"
        )

    if deposit.status != "HELD":
        raise HTTPException(
            status_code=400,
            detail="Tiền cọc không ở trạng thái HELD"
        )

    if data.deduction_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Tiền khấu trừ không hợp lệ"
        )

    if data.deduction_amount > deposit.amount:
        raise HTTPException(
            status_code=400,
            detail="Tiền khấu trừ lớn hơn tiền cọc"
        )

    # Tính lại công nợ mới nhất
    ledger = recalculate_debt(
        contract.tenant_id,
        db
    )

    current_debt = ledger.current_debt

    # Công thức trong tài liệu:
    # hoàn = cọc - khấu trừ - công nợ
    estimated_refund = (
        deposit.amount
        - data.deduction_amount
        - current_debt
    )

    extra_amount_due = 0

    if estimated_refund < 0:
        extra_amount_due = abs(
            estimated_refund
        )

        estimated_refund = 0

    return {
        "contract_id": contract.id,
        "deposit_amount": deposit.amount,
        "deduction_amount": data.deduction_amount,
        "current_debt": current_debt,
        "estimated_refund": estimated_refund,
        "extra_amount_due": extra_amount_due
    }


# =========================================================
# THANH LÝ HỢP ĐỒNG KÈM QUYẾT TOÁN CỌC CHI TIẾT
# =========================================================
@router.post(
    "/contract/{contract_id}/settle-detail"
)
def settle_detail_contract_deposit(
    contract_id: int,
    data: SettleDepositRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "ACCOUNTANT")
    )
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Không tìm thấy hợp đồng")

    deposit = db.query(Deposit).filter(Deposit.contract_id == contract_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Không tìm thấy tiền cọc")

    deduction = Decimal(str(data.deduction_amount or 0))
    if deduction > deposit.amount:
        raise HTTPException(status_code=400, detail="Tiền khấu trừ không thể lớn hơn tiền cọc")

    # 1. Tính toán công nợ hiện tại của khách thuê để bù trừ
    ledger = recalculate_debt(contract.tenant_id, db, commit=False)
    available_for_debt = max(Decimal("0"), deposit.amount - deduction)
    debt_to_offset = max(Decimal("0"), min(Decimal(str(ledger.current_debt)), available_for_debt))

    # 2. Cấn trừ nợ nếu có nợ tồn đọng
    debt_offset = Decimal("0")
    if debt_to_offset > 0:
        debt_offset = apply_deposit_offset(
            contract.tenant_id,
            debt_to_offset,
            current_user.id,
            deposit.id,
            db
        )

    refund = max(Decimal("0"), deposit.amount - deduction - debt_offset)
    extra_due = max(Decimal("0"), Decimal(str(ledger.current_debt)) - debt_to_offset) if (deposit.amount - deduction) < Decimal(str(ledger.current_debt)) else Decimal("0")

    deposit.deduction_amount = deduction
    deposit.deduction_reason = data.deduction_reason
    deposit.refund_amount = refund
    deposit.status = "REFUNDED" if refund > 0 else "DEDUCTED"
    deposit.handled_by = current_user.id

    contract.status = "TERMINATED"

    from app.models.apartment import Apartment
    apt = db.query(Apartment).filter(Apartment.id == contract.apartment_id).first()
    if apt:
        apt.status = "AVAILABLE"

    # Cập nhật lại số dư công nợ sau khi cấn trừ
    recalculate_debt(contract.tenant_id, db, commit=False)

    db.commit()
    db.refresh(deposit)
    db.refresh(contract)

    return {
        "contract": contract,
        "deposit": deposit,
        "refund_amount": refund,
        "debt_offset": debt_offset,
        "extra_amount_due": extra_due
    }