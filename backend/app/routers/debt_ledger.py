from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.models.debt_ledger import DebtLedger
from app.models.tenant import Tenant
from app.models.user import User

from app.schemas.debt_ledger import (
    DebtLedgerResponse
)

from app.services.debt_service import (
    recalculate_debt
)

from app.dependencies.auth import (
    require_roles
)


router = APIRouter(
    prefix="/debt-ledgers",
    tags=["Debt Ledgers"]
)


# =========================================================
# DANH SÁCH TOÀN BỘ SỔ CÔNG NỢ
# =========================================================
@router.get(
    "",
    response_model=list[DebtLedgerResponse]
)
def get_debt_ledgers(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
        )
    )
):

    return db.query(
        DebtLedger
    ).all()


# =========================================================
# XEM CÔNG NỢ CỦA MỘT TENANT
# =========================================================
@router.get(
    "/tenant/{tenant_id}",
    response_model=DebtLedgerResponse
)
def get_debt_by_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
        )
    )
):

    # Kiểm tra Tenant
    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id
    ).first()

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy khách thuê"
        )

    # Tìm sổ công nợ
    ledger = db.query(DebtLedger).filter(
        DebtLedger.tenant_id == tenant_id
    ).first()

    if ledger is None:
        raise HTTPException(
            status_code=404,
            detail="Khách thuê chưa có sổ công nợ"
        )

    return ledger


# =========================================================
# TÍNH LẠI CÔNG NỢ CỦA TENANT
# =========================================================
@router.patch(
    "/tenant/{tenant_id}/recalculate",
    response_model=DebtLedgerResponse
)
def recalculate_tenant_debt(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "ACCOUNTANT"
        )
    )
):

    return recalculate_debt(
        tenant_id,
        db
    )
@router.get(
    "/my",
    response_model=DebtLedgerResponse
)
def get_my_debt(
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

    return recalculate_debt(
        tenant.id,
        db
    )