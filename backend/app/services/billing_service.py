import calendar
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.contract import Contract
from app.models.receivable import Receivable


def generate_monthly_receivables(
    billing_month: int,
    billing_year: int,
    service_amount: Decimal,
    db: Session
):
    if billing_month < 1 or billing_month > 12:
        raise HTTPException(
            status_code=400,
            detail="Tháng thu phải từ 1 đến 12"
        )

    if billing_year < 2000:
        raise HTTPException(
            status_code=400,
            detail="Năm thu không hợp lệ"
        )

    if service_amount < 0:
        raise HTTPException(
            status_code=400,
            detail="Tiền dịch vụ không được nhỏ hơn 0"
        )

    active_contracts = db.query(Contract).filter(
        Contract.status == "ACTIVE"
    ).all()

    created_count = 0
    total_amount = Decimal("0")

    days_in_month = calendar.monthrange(billing_year, billing_month)[1]
    first_day_of_month = date(billing_year, billing_month, 1)
    last_day_of_month = date(billing_year, billing_month, days_in_month)

    for contract in active_contracts:
        # Check if contract overlaps with billing month
        if contract.start_date > last_day_of_month or (contract.end_date and contract.end_date < first_day_of_month):
            continue

        existing = db.query(Receivable).filter(
            Receivable.contract_id == contract.id,
            Receivable.billing_month == billing_month,
            Receivable.billing_year == billing_year
        ).first()

        if existing is not None:
            continue

        # Calculate prorated days
        eff_start = max(contract.start_date, first_day_of_month)
        eff_end = min(contract.end_date, last_day_of_month) if contract.end_date else last_day_of_month
        if eff_start > eff_end:
            continue

        active_days = (eff_end - eff_start).days + 1

        if active_days >= days_in_month:
            room_amount = contract.rental_price
        else:
            # Prorated room rent rounded to nearest 1,000 VND
            calculated = (float(contract.rental_price) * active_days) / days_in_month
            room_amount = Decimal(str(round(calculated / 1000) * 1000))

        total = room_amount + service_amount

        if service_amount > 0:
            mgmt_cost = Decimal(str(round(float(service_amount) * 0.20 / 1000) * 1000))
            wat_cost = Decimal(str(round(float(service_amount) * 0.18 / 1000) * 1000))
            elec_cost = service_amount - mgmt_cost - wat_cost
            elec_kwh = Decimal(str(round(float(elec_cost) / 3500, 1)))
            wat_m3 = Decimal(str(round(float(wat_cost) / 15000, 1)))
        else:
            mgmt_cost = Decimal("0")
            wat_cost = Decimal("0")
            elec_cost = Decimal("0")
            elec_kwh = Decimal("0")
            wat_m3 = Decimal("0")

        # Determine due date
        if eff_start.day > 10:
            due_date = min(last_day_of_month, eff_start + timedelta(days=5))
        else:
            due_date = date(billing_year, billing_month, 10)

        db.add(
            Receivable(
                contract_id=contract.id,
                apartment_id=contract.apartment_id,
                billing_month=billing_month,
                billing_year=billing_year,
                room_amount=room_amount,
                service_amount=service_amount,
                electricity_cost=elec_cost,
                electricity_usage_kwh=elec_kwh,
                water_cost=wat_cost,
                water_usage_m3=wat_m3,
                management_cost=mgmt_cost,
                total_amount=total,
                paid_amount=Decimal("0"),
                status="UNPAID",
                due_date=due_date
            )
        )
        created_count += 1
        total_amount += total

    return {
        "count": created_count,
        "total_amount": total_amount
    }
