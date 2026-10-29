"""
Script đồng bộ số tiền cọc (deposit_amount) từ Contract sang Booking
cho tất cả các Booking có trạng thái CONVERTED hoặc có liên kết Contract.
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.booking import Booking
from app.models.contract import Contract

def sync_booking_deposits():
    db = SessionLocal()
    try:
        # Tìm tất cả contracts có liên kết booking_id
        contracts_with_booking = db.query(Contract).filter(Contract.booking_id.isnot(None)).all()
        print(f"Tìm thấy {len(contracts_with_booking)} hợp đồng có liên kết booking_id.")

        updated_count = 0
        for contract in contracts_with_booking:
            booking = db.query(Booking).filter(Booking.id == contract.booking_id).first()
            if booking:
                old_amount = booking.deposit_amount
                booking.deposit_amount = contract.deposit_amount
                if booking.status != "CONVERTED":
                    booking.status = "CONVERTED"
                print(f"- Cập nhật Booking {booking.booking_code} (ID: {booking.id}, Khách: {booking.customer_name}):")
                print(f"  Tiền cọc cũ: {old_amount} -> Tiền cọc mới: {booking.deposit_amount} (theo HĐ {contract.contract_code})")
                updated_count += 1

        # Tìm các booking có status CONVERTED nhưng chưa liên kết contract_id mà tìm thấy contract theo căn hộ & khách
        converted_without_link = db.query(Booking).filter(
            Booking.status == "CONVERTED",
            ~Booking.id.in_([c.booking_id for c in contracts_with_booking if c.booking_id])
        ).all()

        for booking in converted_without_link:
            # Tìm contract tương ứng theo apartment_id
            contract = db.query(Contract).filter(
                Contract.apartment_id == booking.apartment_id
            ).order_by(Contract.id.desc()).first()
            if contract:
                old_amount = booking.deposit_amount
                booking.deposit_amount = contract.deposit_amount
                contract.booking_id = booking.id
                print(f"- Liên kết & Cập nhật Booking {booking.booking_code} (ID: {booking.id}):")
                print(f"  Tiền cọc cũ: {old_amount} -> Tiền cọc mới: {booking.deposit_amount} (theo HĐ {contract.contract_code})")
                updated_count += 1

        db.commit()
        print(f"\n=> Đã đồng bộ thành công {updated_count} booking.")

    except Exception as e:
        db.rollback()
        print(f"Lỗi khi đồng bộ: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    sync_booking_deposits()
