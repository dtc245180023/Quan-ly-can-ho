Hệ thống quản lý thuê căn hộ có tích hợp AI
1. Mô tả bài toán

Đơn vị cho thuê căn hộ cần quản lý căn hộ, khách thuê, hợp đồng, thanh toán tiền thuê, tiền cọc và yêu cầu bảo trì. Quản lý bằng bảng tính dễ sai hạn thanh toán, khó theo dõi hợp đồng sắp hết hạn và mất thời gian trả lời khách thuê. Hệ thống cần hỗ trợ quản lý vận hành căn hộ và tích hợp AI sinh thông báo, tóm tắt hợp đồng, hỏi đáp quy định thuê nhà.
2. Mục tiêu

- Quản lý căn hộ, khách thuê, hợp đồng, thanh toán, bảo trì và báo cáo công suất thuê.
- Tích hợp AI để tóm tắt hợp đồng, sinh thông báo thanh toán và trả lời quy định thuê căn hộ.
- Sử dụng AI trong phân tích, thiết kế, lập trình, kiểm thử, tài liệu và triển khai.
3. Yêu cầu chức năng
3.1. Chức năng quản lý
1. Đăng nhập và phân quyền quản lý, nhân viên, kế toán.
2. Quản lý căn hộ, tòa nhà, tiện ích, trạng thái thuê.
3. Quản lý khách thuê và người liên hệ.
4. Quản lý hợp đồng thuê, tiền cọc, ngày bắt đầu/kết thúc.
5. Theo dõi thanh toán tiền thuê, phí dịch vụ, công nợ.
6. Quản lý yêu cầu bảo trì từ khách thuê.
7. Cảnh báo hợp đồng sắp hết hạn và khoản thanh toán quá hạn.
8. Thống kê công suất thuê, doanh thu, công nợ.
3.2. Chức năng AI
1. AI tóm tắt hợp đồng thuê thành các điều khoản chính.
2. AI sinh email/thông báo nhắc thanh toán hoặc nhắc gia hạn.
3. Chatbot hỏi đáp quy định thuê căn hộ từ tài liệu nội bộ.
4. Yêu cầu kỹ thuật

- Backend Python FastAPI/Flask/Django; frontend React/Vue/HTML.
- CSDL SQLite/MySQL/PostgreSQL.
- AI Engine OpenAI/Gemini/Claude/Hugging Face/Ollama.
- Khuyến khích RAG cho hỏi đáp quy định thuê.
- Có test cho hợp đồng, thanh toán, cảnh báo và AI tóm tắt.
5. Dữ liệu đầu vào, đầu ra và dữ liệu hệ thống

- Dữ liệu chính: căn hộ, khách thuê, hợp đồng, thanh toán, yêu cầu bảo trì, quy định.
- Đầu vào AI: nội dung hợp đồng, tình trạng thanh toán, tài liệu quy định.
- Đầu ra AI: tóm tắt hợp đồng, thông báo nhắc hạn, câu trả lời quy định.

Prompt mẫu:


System: Bạn là trợ lý quản lý căn hộ. Chỉ tóm tắt điều khoản từ hợp đồng được cung cấp, không tư vấn pháp lý.
User: Hãy tóm tắt hợp đồng sau thành các mục: thời hạn, tiền thuê, tiền cọc, nghĩa vụ thanh toán, điều kiện chấm dứt. Hợp đồng: {{contract_text}}.


6. Hướng dẫn sử dụng AI trong từng giai đoạn SDLC

- KT1: Dùng AI phân tích nghiệp vụ thuê căn hộ, thiết kế use case, ERD, phân quyền và vị trí AI.
- KT2: Dùng AI sinh API/giao diện quản lý căn hộ, hợp đồng, thanh toán, bảo trì; debug logic cảnh báo hạn.
- KT3: Dùng AI thiết kế prompt tóm tắt hợp đồng và chatbot quy định; kiểm thử câu hỏi ngoài phạm vi.
- Cuối kỳ: Dùng AI viết README, báo cáo, slide và review bảo mật dữ liệu khách thuê.
7. Mức độ khó

Trung bình: Hệ thống có hợp đồng, thanh toán định kỳ và cảnh báo hạn. AI cần kiểm soát không tư vấn pháp lý vượt dữ liệu.
