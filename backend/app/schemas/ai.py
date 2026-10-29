from pydantic import (
    BaseModel,
    Field
)


class RagQuestionRequest(BaseModel):
    question: str

    top_k: int = Field(
        default=3,
        ge=1,
        le=5
    )


class RagSource(BaseModel):
    document_name: str
    chunk_index: int
    similarity: float


class RagResponse(BaseModel):
    answer: str
    sources: list[RagSource]
from decimal import Decimal


class ApartmentRecommendRequest(BaseModel):
    max_budget: Decimal
    min_area: Decimal | None = None
    occupants: int = 1
    bedrooms: int | None = None
    view: str | None = None
    building_id: int | None = None
    amenities: list[str] = []


class ApartmentRecommendResponse(BaseModel):
    apartment_id: int
    building_id: int
    room_number: str

    price: Decimal
    area_sqm: Decimal

    max_occupants: int
    bedrooms: int = 1
    bathrooms: int = 1
    view_direction: str = "Đông Nam"
    match_score: int = 95

    amenities: list[str]

    reason: str