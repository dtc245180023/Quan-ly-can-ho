from fastapi import (
    APIRouter,
    Depends,
    Response
)

from sqlalchemy.orm import Session
from sqlalchemy import func

import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.database import get_db
from app.models.maintenance_request import MaintenanceRequest
from app.models.apartment import Apartment
from app.models.contract import Contract
from app.models.payment import Payment
from app.models.debt_ledger import DebtLedger
from app.models.receivable import Receivable
from app.models.deposit import Deposit
from app.models.maintenance_request import (
    MaintenanceRequest
)
from app.models.system_alert import SystemAlert
from app.models.user import User

from app.dependencies.auth import require_roles


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


# =========================================================
# DASHBOARD TỔNG QUAN
# =========================================================
@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
        )
    )
):

    today = date.today()

    # =====================================================
    # CĂN HỘ
    # =====================================================
    total_apartments = (
        db.query(Apartment).count()
    )

    occupied = db.query(Apartment).filter(
        Apartment.status == "OCCUPIED"
    ).count()

    available = db.query(Apartment).filter(
        Apartment.status == "AVAILABLE"
    ).count()

    reserved = db.query(Apartment).filter(
        Apartment.status == "RESERVED"
    ).count()

    maintenance = db.query(Apartment).filter(
        Apartment.status == "MAINTENANCE"
    ).count()

    occupancy_rate = 0

    if total_apartments > 0:
        occupancy_rate = round(
            occupied
            / total_apartments
            * 100,
            2
        )

    # =====================================================
    # DOANH THU THỰC THU
    # =====================================================
    total_revenue = db.query(
        func.coalesce(
            func.sum(Payment.amount),
            0
        )
    ).scalar()

    # =====================================================
    # CÔNG NỢ
    # =====================================================
    total_debt = db.query(
        func.coalesce(
            func.sum(
                DebtLedger.current_debt
            ),
            0
        )
    ).scalar()

    overdue_receivables = (
        db.query(Receivable)
        .filter(
            Receivable.status == "OVERDUE"
        )
        .count()
    )

    # =====================================================
    # CỌC ĐANG GIỮ
    # =====================================================
    held_deposit = db.query(
        func.coalesce(
            func.sum(Deposit.amount),
            0
        )
    ).filter(
        Deposit.status == "HELD"
    ).scalar()

    # =====================================================
    # HỢP ĐỒNG SẮP HẾT HẠN 30 NGÀY
    # =====================================================
    end_limit = (
        today + timedelta(days=30)
    )

    expiring_contracts = (
        db.query(Contract)
        .filter(
            Contract.status == "ACTIVE",
            Contract.end_date >= today,
            Contract.end_date <= end_limit
        )
        .count()
    )

    # =====================================================
    # BẢO TRÌ TỒN ĐỌNG
    # =====================================================
    pending_maintenance = (
        db.query(MaintenanceRequest)
        .filter(
            MaintenanceRequest.status.in_(
                [
                    "PENDING",
                    "IN_PROGRESS"
                ]
            )
        )
        .count()
    )

    # =====================================================
    # CẢNH BÁO CHƯA XỬ LÝ
    # =====================================================
    unsent_alerts = (
        db.query(SystemAlert)
        .filter(
            SystemAlert.is_sent == False
        )
        .count()
    )

    return {
        "apartments": {
            "total": total_apartments,
            "available": available,
            "reserved": reserved,
            "occupied": occupied,
            "maintenance": maintenance,
            "occupancy_rate": occupancy_rate
        },

        "finance": {
            "total_revenue": total_revenue,
            "total_debt": total_debt,
            "held_deposit": held_deposit,
            "overdue_receivables":
                overdue_receivables
        },

        "operations": {
            "expiring_contracts":
                expiring_contracts,

            "pending_maintenance":
                pending_maintenance,

            "unsent_alerts":
                unsent_alerts
        }
    }


# =========================================================
# DOANH THU THEO KHOẢNG THỜI GIAN
# =========================================================
@router.get("/revenue")
def revenue_report(
    start_date: date,
    end_date: date,

    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "ACCOUNTANT"
        )
    )
):

    start_datetime = datetime.combine(
        start_date,
        datetime.min.time()
    )

    end_datetime = datetime.combine(
        end_date,
        datetime.max.time()
    )

    total = db.query(
        func.coalesce(
            func.sum(Payment.amount),
            0
        )
    ).filter(
        Payment.payment_date
        >= start_datetime,

        Payment.payment_date
        <= end_datetime
    ).scalar()

    count = db.query(Payment).filter(
        Payment.payment_date
        >= start_datetime,

        Payment.payment_date
        <= end_datetime
    ).count()

    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_revenue": total,
        "payment_count": count
    }


# =========================================================
# DANH SÁCH NỢ QUÁ HẠN
# =========================================================
@router.get("/overdue")
def overdue_report(
    db: Session = Depends(get_db),

    current_user: User = Depends(
        require_roles(
            "ADMIN",
            "STAFF",
            "ACCOUNTANT"
        )
    )
):

    today = date.today()

    receivables = db.query(
        Receivable
    ).filter(
        Receivable.due_date < today,
        Receivable.status != "PAID"
    ).all()

    result = []

    for item in receivables:

        remaining = (
            item.total_amount
            - item.paid_amount
        )

        if remaining <= 0:
            continue

        result.append({
            "receivable_id":
                item.id,

            "contract_id":
                item.contract_id,

            "due_date":
                item.due_date,

            "days_overdue":
                (
                    today - item.due_date
                ).days,

            "total_amount":
                item.total_amount,

            "paid_amount":
                item.paid_amount,

            "remaining_amount":
                remaining
        })

    return result


# =========================================================
# XUẤT BÁO CÁO DOANH THU (CSV)
# =========================================================
@router.get("/export-revenue")
def export_revenue_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF", "ACCOUNTANT")
    )
):
    payments = db.query(Payment).order_by(Payment.payment_date.desc()).all()

    csv_rows = [
        "Mã Giao Dịch,Mã Khoản Thu,Hợp Đồng,Số Tiền (VNĐ),Phương Thức,Ngày Thanh Toán,Ghi Chú"
    ]
    for p in payments:
        p_date = p.payment_date.strftime("%Y-%m-%d %H:%M") if p.payment_date else ""
        tx_id = str(p.transaction_code or p.id)
        cid = str(p.receivable_id or "")
        notes = str(p.note or "").replace('"', '""')
        csv_rows.append(
            f'"{tx_id}","{p.receivable_id}","{cid}","{p.amount}","{p.payment_method}","{p_date}","{notes}"'
        )

    csv_content = "\ufeff" + "\r\n".join(csv_rows)
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename=bao_cao_doanh_thu_{date.today().isoformat()}.csv"
        }
    )


# =========================================================
# XU HƯỚNG DOANH THU THỰC TẾ (THÁNG & QUÝ)
# =========================================================
@router.get("/revenue-trends")
def revenue_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles("ADMIN", "STAFF", "ACCOUNTANT")
    )
):
    today = date.today()
    # List of last 6 months
    months = []
    for i in range(5, -1, -1):
        y = today.year
        m = today.month - i
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m))

    monthly_data = []
    for y, m in months:
        days_in_m = calendar.monthrange(y, m)[1]
        m_start = datetime(y, m, 1, 0, 0, 0)
        m_end = datetime(y, m, days_in_m, 23, 59, 59)
        period_label = f"T{str(m).zfill(2)}/{str(y)[2:]}"

        payments = db.query(Payment).filter(
            Payment.payment_date >= m_start,
            Payment.payment_date <= m_end
        ).all()

        m_rent = Decimal("0")
        m_service = Decimal("0")
        m_total = Decimal("0")

        for p in payments:
            amt = p.amount or Decimal("0")
            m_total += amt
            if p.receivable:
                rec = p.receivable
                rec_total = rec.total_amount or Decimal("0")
                if rec_total > 0:
                    ratio_rent = (rec.room_amount or Decimal("0")) / rec_total
                    ratio_service = (rec.service_amount or Decimal("0")) / rec_total
                    m_rent += amt * ratio_rent
                    m_service += amt * ratio_service
                else:
                    m_rent += amt * Decimal("0.8")
                    m_service += amt * Decimal("0.2")
            else:
                m_rent += amt * Decimal("0.8")
                m_service += amt * Decimal("0.2")

        # If no payments recorded in this month, fallback to receivables billed
        if m_total == 0:
            recs = db.query(Receivable).filter(
                Receivable.billing_year == y,
                Receivable.billing_month == m
            ).all()
            if recs:
                m_rent = sum(Decimal(str(r.room_amount or 0)) for r in recs)
                m_service = sum(Decimal(str(r.service_amount or 0)) for r in recs)
                m_total = m_rent + m_service

        # Maintenance costs as OpEx
        m_opex = db.query(
            func.coalesce(func.sum(MaintenanceRequest.actual_cost), 0)
        ).filter(
            MaintenanceRequest.status == "COMPLETED",
            MaintenanceRequest.updated_at >= m_start,
            MaintenanceRequest.updated_at <= m_end
        ).scalar()
        m_opex = Decimal(str(m_opex or 0))
        if m_opex == 0 and m_total > 0:
            m_opex = m_total * Decimal("0.25")

        monthly_data.append({
            "period": period_label,
            "year": y,
            "month": m,
            "rent_raw": float(m_rent),
            "service_raw": float(m_service),
            "total_raw": float(m_total),
            "opex_raw": float(m_opex)
        })

    max_total = max([d["total_raw"] for d in monthly_data] + [0])
    is_billion = max_total >= 1_000_000_000
    divisor = 1_000_000_000.0 if is_billion else 1_000_000.0
    unit_label = "Tỷ" if is_billion else "Tr"

    formatted_monthly = []
    for d in monthly_data:
        r = round(d["rent_raw"] / divisor, 1)
        s = round(d["service_raw"] / divisor, 1)
        op = round(d["opex_raw"] / divisor, 1)
        tot = round(r + s, 1)
        formatted_monthly.append({
            "period": d["period"],
            "rent": r,
            "service": s,
            "opex": op,
            "total": tot,
            "rent_raw": d["rent_raw"],
            "service_raw": d["service_raw"],
            "total_raw": d["total_raw"]
        })

    # Group quarterly: Q1-Q4
    quarterly_data = []
    current_year = today.year
    for q in range(1, 5):
        q_start_month = (q - 1) * 3 + 1
        q_end_month = q * 3
        days_in_q_end = calendar.monthrange(current_year, q_end_month)[1]
        q_start = datetime(current_year, q_start_month, 1, 0, 0, 0)
        q_end = datetime(current_year, q_end_month, days_in_q_end, 23, 59, 59)
        q_label = f"Q{q}/{str(current_year)[2:]}"
        if q_start.date() > today:
            q_label += " (Dự kiến)"

        q_payments = db.query(Payment).filter(
            Payment.payment_date >= q_start,
            Payment.payment_date <= q_end
        ).all()

        q_rent = Decimal("0")
        q_service = Decimal("0")
        q_total = Decimal("0")
        for p in q_payments:
            amt = p.amount or Decimal("0")
            q_total += amt
            if p.receivable:
                rec = p.receivable
                rec_total = rec.total_amount or Decimal("0")
                if rec_total > 0:
                    q_rent += amt * ((rec.room_amount or Decimal("0")) / rec_total)
                    q_service += amt * ((rec.service_amount or Decimal("0")) / rec_total)
                else:
                    q_rent += amt * Decimal("0.8")
                    q_service += amt * Decimal("0.2")
            else:
                q_rent += amt * Decimal("0.8")
                q_service += amt * Decimal("0.2")

        if q_total == 0:
            recs = db.query(Receivable).filter(
                Receivable.billing_year == current_year,
                Receivable.billing_month >= q_start_month,
                Receivable.billing_month <= q_end_month
            ).all()
            if recs:
                q_rent = sum(Decimal(str(r.room_amount or 0)) for r in recs)
                q_service = sum(Decimal(str(r.service_amount or 0)) for r in recs)
                q_total = q_rent + q_service

        q_opex = db.query(
            func.coalesce(func.sum(MaintenanceRequest.actual_cost), 0)
        ).filter(
            MaintenanceRequest.status == "COMPLETED",
            MaintenanceRequest.updated_at >= q_start,
            MaintenanceRequest.updated_at <= q_end
        ).scalar()
        q_opex = Decimal(str(q_opex or 0))
        if q_opex == 0 and q_total > 0:
            q_opex = q_total * Decimal("0.25")

        r = round(float(q_rent) / divisor, 1)
        s = round(float(q_service) / divisor, 1)
        tot = round(r + s, 1)
        op = round(float(q_opex) / divisor, 1)

        quarterly_data.append({
            "period": q_label,
            "rent": r,
            "service": s,
            "opex": op,
            "total": tot,
            "rent_raw": float(q_rent),
            "service_raw": float(q_service),
            "total_raw": float(q_total)
        })

    return {
        "monthly": formatted_monthly,
        "quarterly": quarterly_data,
        "unit_label": unit_label,
        "divisor": divisor
    }