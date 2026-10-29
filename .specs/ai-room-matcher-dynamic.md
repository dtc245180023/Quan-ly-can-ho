# Đặc Tả Kỹ Thuật: AI Room Matcher Dynamic & Đồng Bộ Đa Tiêu Chí

## 1. Mục Tiêu & Bối Cảnh
Nâng cấp tính năng **AI Room Matcher** từ lọc ngân sách/diện tích cơ bản thành hệ thống gợi ý thông minh đa tiêu chí (Multi-criteria Room Matching & Scoring Engine) hoạt động realtime (< 0.05s).
Hệ thống kết nối trực tiếp giữa tiêu chí người dùng chọn trên giao diện (`AIRoomMatcherModal.tsx`), API client (`buildingApi.ts`), schema Pydantic (`ApartmentRecommendRequest`), thuật toán backend (`ai.py`) và dữ liệu thực tế trong CSDL SQLite `quan_ly_can_ho.db`.

---

## 2. Dữ Liệu Căn Hộ Thực Tế Trong CSDL (Ground Truth Data)

### 2.1 Hiện trạng CSDL trước cập nhật
Kiểm tra các căn hộ có trạng thái `AVAILABLE`:
- Căn `A402`: 80m², 1 PN, 1 WC, Hướng Đông Nam, Giá 16.000.000 đ
- Căn `B601`: 50m², 1 PN, 1 WC, Hướng Đông Nam, Giá 9.500.000 đ
- Căn `B602`: 75m², 1 PN, 1 WC, Hướng Đông Nam, Giá 14.500.000 đ

### 2.2 Cập nhật chuẩn hóa cấu hình căn hộ mẫu
Cần cập nhật 3 căn hộ sẵn sàng (`AVAILABLE`) trong `backend/quan_ly_can_ho.db` với đầy đủ cấu hình đại diện cho 3 phân khúc:
1. **Căn B601**:
   - Diện tích: `50.0m²`
   - Số phòng ngủ: `1` PN
   - Số phòng vệ sinh: `1` WC
   - Hướng ban công: `Đông Nam`
   - Giá thuê: `9.500.000 đ/tháng`
   - Trạng thái: `AVAILABLE`
2. **Căn B602**:
   - Diện tích: `75.0m²`
   - Số phòng ngủ: `2` PN
   - Số phòng vệ sinh: `2` WC
   - Hướng ban công: `Công Viên`
   - Giá thuê: `14.500.000 đ/tháng`
   - Trạng thái: `AVAILABLE`
3. **Căn A402**:
   - Diện tích: `80.0m²`
   - Số phòng ngủ: `3` PN
   - Số phòng vệ sinh: `2` WC
   - Hướng ban công: `Nội Khu`
   - Giá thuê: `16.000.000 đ/tháng`
   - Trạng thái: `AVAILABLE`

---

## 3. Đặc Tả Hợp Đồng Giao Tiếp API (API Contract Handshake)

### 3.1 Backend Request Schema: `ApartmentRecommendRequest`
File: `backend/app/schemas/ai.py`
```python
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

class ApartmentRecommendRequest(BaseModel):
    max_budget: Decimal = Field(..., description="Ngân sách tối đa mỗi tháng")
    min_area: Optional[Decimal] = Field(None, description="Diện tích tối thiểu")
    occupants: int = Field(default=1, description="Số lượng người ở")
    bedrooms: Optional[int] = Field(None, description="Số phòng ngủ ưu tiên (1, 2, 3)")
    view: Optional[str] = Field(None, description="Hướng ban công/view ưu tiên")
    building_id: Optional[int] = Field(None, description="Lọc theo tòa nhà")
    amenities: list[str] = Field(default_factory=list, description="Danh sách tiện ích bắt buộc")
```

### 3.2 Backend Response Schema: `ApartmentRecommendResponse`
Bổ sung các trường cấu hình phòng để frontend hiển thị chính xác 100% không phụ thuộc fallback:
```python
class ApartmentRecommendResponse(BaseModel):
    apartment_id: int
    building_id: int
    room_number: str
    price: Decimal
    area_sqm: Decimal
    max_occupants: int
    bedrooms: int
    bathrooms: int
    view_direction: str
    amenities: list[str]
    reason: str
    match_score: int = 95
```

### 3.3 Frontend TypeScript Schema: `buildingApi.ts`
File: `frontend/src/modules/buildings/services/buildingApi.ts`
```typescript
recommendApartmentsAI: builder.mutation<
  Array<{
    apartment_id: number;
    building_id: number;
    room_number: string;
    price: number;
    area_sqm: number;
    max_occupants: number;
    bedrooms: number;
    bathrooms: number;
    view_direction: string;
    amenities: string[];
    reason: string;
    match_score?: number;
  }>,
  {
    max_budget: number;
    min_area?: number;
    occupants?: number;
    bedrooms?: number;
    view?: string;
    building_id?: number;
    amenities?: string[];
  }
>({
  query: (body) => ({
    url: '/ai/apartments/recommend',
    method: 'POST',
    body,
  }),
})
```

---

## 4. Thuật Toán Scoring & Đề Xuất Thông Minh (Backend Engine)

### 4.1 Quy Tắc Chấm Điểm Đa Tiêu Chí (Scoring Formula)
Mỗi căn hộ được tính `score` tổng hợp trên thang 100 điểm:
1. **Điểm Phòng Ngủ (Bedrooms Match - Trọng số 40đ)**:
   - Trùng khớp chính xác (`apt.bedrooms == req.bedrooms`): **+40 điểm**.
   - Lệch 1 phòng (`abs(apt.bedrooms - req.bedrooms) == 1`): **+15 điểm**.
   - Lệch từ 2 phòng trở lên: **+0 điểm**.
2. **Điểm Hướng View (View Match - Trọng số 30đ)**:
   - Nếu khách yêu cầu `req.view`:
     - Trùng khớp hướng (`req.view.lower() in apt.view_direction.lower()` hoặc ngược lại): **+30 điểm**.
     - Không trùng hướng: **+10 điểm** (view tiêu chuẩn thoáng mát).
   - Nếu khách không chọn view: Mặc định **+25 điểm**.
3. **Điểm Tối Ưu Ngân Sách (Budget Match - Trọng số 30đ)**:
   - Nếu `apt.price <= req.max_budget`:
     - Tỷ lệ tiết kiệm ngân sách `savings_ratio = (req.max_budget - apt.price) / req.max_budget`.
     - Điểm thưởng ngân sách: `20 + min(10, int(savings_ratio * 20))` (tối đa **+30 điểm**).
   - Nếu `apt.price > req.max_budget`: Trừ điểm nặng (-30 điểm).

### 4.2 Sinh Lý Do Cá Nhân Hóa (Personalized AI Reason Generation)
Tạo đoạn văn lý do gợi ý tự nhiên, hấp dẫn, nêu bật chính xác các tiêu chí người dùng quan tâm:
- **Phòng ngủ**: Nêu rõ số phòng ngủ & phòng tắm (ví dụ: *"Bố trí tối ưu 2 phòng ngủ riêng tư & 2 WC tiện nghi"*).
- **Hướng view**: Tôn vinh góc nhìn khớp yêu cầu (ví dụ: *"Ban công view Công Viên ngập tràn ánh sáng tự nhiên và cây xanh"*).
- **Ngân sách**: Nêu rõ mức chi phí và số tiền tiết kiệm được so với ngân sách tối đa (ví dụ: *"Chi phí 14.500.000 đ/tháng, tiết kiệm 5.500.000 đ so với ngân sách dự kiến"*).

---

## 5. Đặc Tả Nâng Cấp Frontend `AIRoomMatcherModal.tsx`

### 5.1 Gửi Dữ Liệu Lọc Đầy Đủ
Trong hàm `fetchAiRecommendations`:
```typescript
const res = await recommendApartmentsAI({
  max_budget: budgetMax,
  bedrooms: bedrooms,
  view: view,
  occupants: Math.max(1, bedrooms),
  min_area: bedrooms === 1 ? 25 : bedrooms === 2 ? 40 : 60,
  amenities: [],
}).unwrap();
```

### 5.2 Ánh Xạ Dữ Liệu Trả Về (Data Mapping)
Khi backend trả về danh sách căn hộ:
- Ưu tiên lấy thông tin thực tế từ `item.bedrooms`, `item.bathrooms`, `item.view_direction` được backend trả về.
- Kết hợp với `apartments` trong props để giữ lại các thông tin hình ảnh (`imageUrl`), tên tòa nhà (`buildingName`), trạng thái đặt cọc.
- `matchScore`: Sử dụng `item.match_score` trả về từ thuật toán backend hoặc tính từ thứ hạng phù hợp (98%, 95%, 92%...).

---

## 6. Kế Hoạch Kiểm Thử Tích Hợp (Acceptance Criteria)

| Trường Hợp | Đầu Vào Bộ Lọc | Kết Quả Đề Xuất Kỳ Vọng | Điểm Match |
| :--- | :--- | :--- | :--- |
| **TC-01: Căn 1 PN Đông Nam** | Ngân sách: 10tr, 1 PN, Đông Nam | Top 1: **Căn B601** (50m², 1 PN, 1 WC, Đông Nam, 9.5tr) | >= 95% |
| **TC-02: Căn 2 PN Công Viên** | Ngân sách: 20tr, 2 PN, Công Viên | Top 1: **Căn B602** (75m², 2 PN, 2 WC, Công Viên, 14.5tr) | >= 95% |
| **TC-03: Căn 3 PN Nội Khu** | Ngân sách: 20tr, 3 PN, Nội Khu | Top 1: **Căn A402** (80m², 3 PN, 2 WC, Nội Khu, 16.0tr) | >= 95% |
| **TC-04: Ngân sách chặt chẽ** | Ngân sách: 8tr, 1 PN, Đông Nam | Gợi ý fallback căn gần ngân sách nhất (B601) kèm thông báo giá | >= 75% |
