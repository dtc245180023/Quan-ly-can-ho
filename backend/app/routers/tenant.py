from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.models.tenant import Tenant
from app.models.user import User
from app.models.role import Role

from app.schemas.tenant import (
    TenantCreate,
    TenantUpdate,
    TenantResponse
)

from app.dependencies.auth import require_roles


router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"]
)
import re

def is_same_person(name1: str, name2: str) -> bool:
    if not name1 or not name2:
        return False
    clean1 = re.sub(r'[\(\[\{].*?[\)\]\}]', '', name1).strip().lower()
    clean2 = re.sub(r'[\(\[\{].*?[\)\]\}]', '', name2).strip().lower()
    clean1 = ' '.join(clean1.split())
    clean2 = ' '.join(clean2.split())
    return clean1 == clean2

@router.post(
    "",
    response_model=TenantResponse
)
def create_tenant(
    data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF")
    )
):
    # 1. Kiểm tra số CCCD đã tồn tại trong hệ thống chưa
    existing_by_cccd = db.query(Tenant).filter(
        Tenant.citizen_id == data.citizen_id
    ).first()

    if existing_by_cccd:
        if not is_same_person(existing_by_cccd.full_name, data.full_name):
            raise HTTPException(
                status_code=400,
                detail="Số cccd đã tồn tại ! "
            )
        # Nếu cùng một người -> Cập nhật thông tin liên hệ mới nhất
        if data.phone:
            existing_by_cccd.phone = data.phone
        if data.email:
            existing_by_cccd.email = data.email
        if data.hometown:
            existing_by_cccd.hometown = data.hometown
        db.commit()
        db.refresh(existing_by_cccd)
        return existing_by_cccd

    # 2. Kiểm tra trùng số điện thoại
    existing_by_phone = db.query(Tenant).filter(
        Tenant.phone == data.phone
    ).first()

    if existing_by_phone:
        if not is_same_person(existing_by_phone.full_name, data.full_name):
            raise HTTPException(
                status_code=400,
                detail=f"Số điện thoại {data.phone} đã được đăng ký cho khách thuê '{existing_by_phone.full_name}'. Vui lòng sử dụng số điện thoại chính chủ!"
            )
        existing_by_phone.citizen_id = data.citizen_id
        if data.email:
            existing_by_phone.email = data.email
        if data.hometown:
            existing_by_phone.hometown = data.hometown
        db.commit()
        db.refresh(existing_by_phone)
        return existing_by_phone

    tenant = Tenant(
        full_name=data.full_name,
        citizen_id=data.citizen_id,
        phone=data.phone,
        email=data.email,
        hometown=data.hometown,
        is_bad_debt=False
    )

    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    return tenant
@router.get(
    "",
    response_model=list[TenantResponse]
)
def get_tenants(
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
    user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if user_role and user_role.role_code == "TENANT":
        tenants = db.query(Tenant).filter(
            (Tenant.user_id == current_user.id) |
            (Tenant.phone == current_user.phone) |
            (Tenant.email == current_user.email)
        ).all()
        return tenants

    tenants = db.query(Tenant).all()
    return tenants


@router.get("/me")
def get_my_tenant_profile(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles("TENANT")
    )
):

    tenant = db.query(Tenant).filter(
        (Tenant.user_id == current_user.id) |
        (Tenant.phone == current_user.phone) |
        (Tenant.email == current_user.email)
    ).first()

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy hồ sơ khách thuê"
        )

    return tenant


@router.get(
    "/{tenant_id}",
    response_model=TenantResponse
)
def get_tenant(
    tenant_id: int,
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

    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id
    ).first()

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy khách thuê"
        )

    return tenant
@router.put(
    "/{tenant_id}",
    response_model=TenantResponse
)
def update_tenant(
    tenant_id: int,
    data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF")
    )
):

    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id
    ).first()

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy khách thuê"
        )

    duplicate = db.query(Tenant).filter(
        Tenant.citizen_id == data.citizen_id,
        Tenant.id != tenant_id
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="CCCD đã tồn tại"
        )

    tenant.full_name = data.full_name
    tenant.citizen_id = data.citizen_id
    tenant.phone = data.phone
    tenant.email = data.email
    tenant.hometown = data.hometown
    tenant.is_bad_debt = data.is_bad_debt

    db.commit()
    db.refresh(tenant)

    return tenant
@router.delete("/{tenant_id}")
def delete_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF")
    )
):
    from app.models.contract import Contract
    from app.models.maintenance_request import MaintenanceRequest
    from app.models.debt_ledger import DebtLedger
    from app.models.receivable import Receivable
    from app.models.payment import Payment

    tenant = db.query(Tenant).filter(
        Tenant.id == tenant_id
    ).first()

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy khách thuê"
        )

    # Kiểm tra hợp đồng thuê đang có hiệu lực
    active_contract = db.query(Contract).filter(
        Contract.tenant_id == tenant_id,
        Contract.status.in_(["ACTIVE", "PENDING"])
    ).first()
    if active_contract:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể xóa khách thuê đang có hợp đồng thuê có hiệu lực ({active_contract.contract_code}). Vui lòng thanh lý hoặc kết thúc hợp đồng trước."
        )

    try:
        # Xóa các yêu cầu bảo trì liên quan
        db.query(MaintenanceRequest).filter(MaintenanceRequest.tenant_id == tenant_id).delete(synchronize_session=False)

        # Xóa các ghi nhận công nợ liên quan
        db.query(DebtLedger).filter(DebtLedger.tenant_id == tenant_id).delete(synchronize_session=False)

        # Xóa các hợp đồng cũ/đã hủy nếu có
        old_contracts = db.query(Contract).filter(Contract.tenant_id == tenant_id).all()
        for c in old_contracts:
            db.query(Payment).filter(Payment.contract_id == c.id).delete(synchronize_session=False)
            db.query(Receivable).filter(Receivable.contract_id == c.id).delete(synchronize_session=False)
            db.delete(c)

        # Hủy liên kết tài khoản user nếu có
        if tenant.user_id:
            user_account = db.query(User).filter(User.id == tenant.user_id).first()
            tenant.user_id = None
            db.flush()
            if user_account and hasattr(user_account, 'role') and user_account.role and user_account.role.role_code == "TENANT":
                db.delete(user_account)

        db.delete(tenant)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi khi xóa khách thuê: {str(e)}"
        )

    return {
        "message": f"Đã xóa thành công hồ sơ khách thuê {tenant.full_name}"
    }
