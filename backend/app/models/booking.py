from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    Text
)

from datetime import datetime
from sqlalchemy.orm import relationship

from app.database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_code = Column(
        String(50),
        unique=True,
        nullable=False
    )

    customer_name = Column(
        String(100),
        nullable=False
    )

    customer_phone = Column(
        String(20),
        nullable=False
    )

    customer_email = Column(
        String(100),
        nullable=True
    )

    apartment_id = Column(
        Integer,
        ForeignKey("apartments.id"),
        nullable=False
    )

    check_in_date = Column(
        Date,
        nullable=False
    )

    deposit_amount = Column(
        Numeric(12, 2),
        default=0
    )

    status = Column(
        String(20),
        default="PENDING"
    )

    notes = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.now
    )

    apartment = relationship(
        "Apartment",
        back_populates="bookings"
    )
    contract = relationship(
        "Contract",
        back_populates="booking",
        uselist=False
    )

    @property
    def room_number(self):
        return self.apartment.room_number if self.apartment else None

    @property
    def building_name(self):
        if self.apartment and self.apartment.building:
            return self.apartment.building.name
        return None

    @property
    def monthly_price(self):
        return self.apartment.price if self.apartment else None