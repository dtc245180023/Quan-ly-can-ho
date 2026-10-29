```text
+--------------------------------------------------------------------------------------------------+
|                                  BỘ GIÁO DỤC VÀ ĐÀO TẠO                                          |
|                                   ĐẠI HỌC THÁI NGUYÊN                                            |
|                     TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG                           |
|                                  KHOA CÔNG NGHỆ THÔNG TIN                                        |
|                                       -----***-----                                              |
|                                                                                                  |
|                                           [LOGO ICTU]                                            |
|                                                                                                  |
|                                     BÁO CÁO DỰ ÁN HỌC PHẦN                                       |
|                                 ỨNG DỤNG TRÍ TUỆ NHÂN TẠO                                        |
|                                                                                                  |
|       Chủ đề đề tài:                                                                             |
|       XÂY DỰNG VÀ PHÁT TRIỂN HỆ THỐNG QUẢN LÝ THUÊ CĂN HỘ THÔNG MINH                             |
|                 TÍCH HỢP TRÍ TUỆ NHÂN TẠO (DWELL LIVING)                                         |
|                                                                                                  |
|       Giảng viên hướng dẫn:       Bộ môn Công nghệ phần mềm & Trí tuệ nhân tạo                   |
|       Nhóm sinh viên thực hiện:   Nhóm 12 (KTPM K23C)                                            |
|           1. Lê Quang Khánh       - Mã SV: DTC245180169                                          |
|           2. Nguyễn Thị Trang     - Mã SV: DTC245180023                                          |
|       Lớp chuyên ngành:           Kỹ thuật phần mềm K23C                                         |
|                                                                                                  |
|                                    Thái Nguyên, năm 2026                                         |
+--------------------------------------------------------------------------------------------------+
```

---


# BẢNG PHÂN CÔNG THỰC HIỆN TIỂU LUẬN

Bảng phân công trách nhiệm và nhiệm vụ chi tiết của từng sinh viên trong Nhóm 12:


*Bảng 1. Phân công nhiệm vụ thực hiện đồ án Nhóm 12 theo danh sách phân công chính thức*


| Mã sinh viên | Họ và tên | Nhiệm vụ phân công chi tiết |
| --- | --- | --- |
| DTC245180169 | Lê Quang Khánh | - Thiết kế sơ đồ Use Case và sơ đồ quan hệ thực thể (ERD 18 bảng chuẩn 3NF) khớp với CSDL và giao diện thực tế.<br>- Lập trình toàn bộ Backend API bằng Python 3.11+ (FastAPI, SQLAlchemy 2.0 async, Uvicorn, pgvector): xử lý nghiệp vụ tài khoản, căn hộ, hợp đồng, thanh toán VietQR, bảo trì, cảnh báo tự động.<br>- Kiểm thử hệ thống: kiểm thử chức năng 25 Test Cases, test chức năng fail, test ca lỗi dữ liệu, test câu hỏi ngoài phạm vi của Chatbot AI.<br>- Chỉnh sửa các file tài liệu kỹ thuật, rà soát chuẩn 100% nghiệp vụ dự án.<br>- Tổng hợp file Báo cáo tổng hợp, căn chỉnh format và in quyển đóng bìa nộp. |
| DTC245180023 | Nguyễn Thị Trang | - Phân tích nghiệp vụ, thiết kế kiến trúc hệ thống tổng thể và quy hoạch vị trí tích hợp AI.<br>- Lập trình toàn bộ giao diện Frontend (React 19, Vite 6, TypeScript, Redux Toolkit, Tailwind CSS 3.4): phân quyền RBAC, dashboard thống kê, quản lý căn hộ, hợp đồng, thanh toán VietQR, bảo trì.<br>- Nghiên cứu và lập trình tích hợp 3 chức năng AI: tóm tắt hợp đồng thuê, sinh thông báo/nhắc nợ tự động, chatbot hỏi đáp quy định căn hộ bằng Google GenAI SDK.<br>- Thiết kế Prompt Engineering, thực nghiệm so sánh 3 phiên bản Prompt chống hallucination và bảo vệ dữ liệu riêng tư khách thuê.<br>- Quản lý kho mã nguồn Git, viết tài liệu README, lưu nhật ký Prompt AI trong SDLC và chuẩn bị dữ liệu demo hệ thống.<br>- Chuẩn bị slide PowerPoint, kịch bản nội dung và trực tiếp thuyết trình trước hội đồng. |


# MỤC LỤC


# LỜI MỞ ĐẦU	4


# BẢNG PHÂN CÔNG THỰC HIỆN TIỂU LUẬN	2


# DANH MỤC TỪ VIẾT TẮT	5


# DANH MỤC HÌNH ẢNH & SƠ ĐỒ	6


# DANH MỤC BẢNG BIỂU	8


# CHƯƠNG 1. CƠ SỞ LÝ THUYẾT & KẾ HOẠCH DỰ ÁN	9


## 1.1. Các khái niệm cơ bản	9


### 1.1.1. Phần mềm và Kỹ nghệ phần mềm	9


### 1.1.2. Vòng đời phát triển phần mềm (SDLC)	9


### 1.1.3. Quy trình phát triển phần mềm hiện đại	9


## 1.2. Các chuẩn trong công nghệ phần mềm	10


## 1.3. Xu hướng công nghệ phần mềm hiện đại áp dụng trong dự án	11


## 1.4. Kế hoạch thời gian thực hiện dự án (Gantt Chart 9 tuần)	12


## 1.5. Đánh giá mức độ rủi ro và biện pháp giảm thiểu	13


# CHƯƠNG 2. ĐẶC TẢ PHẦN MỀM (SRS)	14


## 2.1. Khảo sát hiện trạng và Nhu cầu xây dựng hệ thống mới	14


## 2.2. Các đối tượng sử dụng hệ thống (Actors)	15


## 2.3. Danh mục các yêu cầu chức năng (FR)	16


## 2.4. Ma trận phân quyền kiểm soát truy cập (RBAC Matrix)	17


## 2.5. Lý giải vị trí và Kiến trúc tích hợp Trí tuệ Nhân tạo (AI Rationale)	18


## 2.6. Rào chắn An toàn AI (Safety Guardrails) và Kết nối API	19


# CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG	18


## 3.1. Mô hình tổ chức hệ thống (Kiến trúc 3 tầng)	18


## 3.2. Thiết kế Giao diện và Luồng màn hình tương tác (Screen Flow)	19


## 3.3. Thiết kế Cấu trúc hệ thống	22


### 3.3.1. Sơ đồ phân rã chức năng (Functional Decomposition Diagram - FDD)	22


### 3.3.2. Sơ đồ Use Case tổng thể và chi tiết	23


### 3.3.3. Biểu đồ trình tự (Sequence Diagrams) cho các quy trình cốt lõi	25


### 3.3.4. Biểu đồ hoạt động (Activity Diagrams) cho các quy trình nghiệp vụ	30


### 3.3.5. Thiết kế lớp (Class Diagram / Sơ đồ UML)	35


### 3.3.6. Biểu đồ triển khai hệ thống vật lý (Deployment Diagram)	38


### 3.3.7. Thực thể liên kết ERD (Lược đồ CSDL 18 bảng chuẩn 3NF kèm Audit Log)	39


## 3.4. Thiết kế dữ liệu và Thuật toán cốt lõi	41


### 3.4.1. Thuật toán Xác thực JWT và Kiểm tra quyền hạn RBAC	41


### 3.4.2. Thuật toán Kiểm tra xung đột giữ chỗ căn hộ	42


### 3.4.3. Thuật toán Tính toán phí dịch vụ và Sinh mã VietQR động	42


### 3.4.4. Thuật toán Tìm kiếm ngữ nghĩa Semantic Search & Prompt RAG Chatbot	43


# CHƯƠNG 4. CÀI ĐẶT DEMO VÀ KIỂM THỬ HỆ THỐNG	44


## 4.1. Ngôn ngữ lập trình và Môi trường phát triển	44


## 4.2. Giao diện Demo thực tế của hệ thống (16 Màn hình cốt lõi)	45


## 4.3. Kiểm thử hệ thống (Bảng 25 Test Cases chuẩn)	55


## 4.3. Kiểm thử hệ thống (Bảng 25 Test Cases chuẩn)	55

- **• 4.3.2. Thực nghiệm so sánh 3 phiên bản Prompt AI** ... *Trang 56*
- **• 4.3.3. Xử lý lỗi AI và Cơ chế dự phòng Fallback** ... *Trang 57*
- **• 4.3.4. Bảo mật dữ liệu và Quản lý Khóa API** ... *Trang 58*

## 4.4. Kế hoạch bảo trì và Đào tạo chuyển giao phần mềm	59


## 4.5. Minh chứng ứng dụng AI trong quy trình phát triển phần mềm (SDLC)	61


## 4.6. Kiểm chứng và Sửa lỗi AI trong Vận hành (Human-in-the-loop)	62


## 4.7. Đề cương kết thúc dự án và Đóng góp độc lập từng sinh viên	63


# KẾT LUẬN & HƯỚNG PHÁT TRIỂN TIẾP THEO	60


# TÀI LIỆU THAM KHẢO	62


# DANH MỤC TỪ VIẾT TẮT


*Bảng 2. Danh mục các từ viết tắt chuyên ngành sử dụng trong báo cáo*


| Từ viết tắt | Tên tiếng Anh đầy đủ | Ý nghĩa / Giải thích tiếng Việt |
| --- | --- | --- |
| AI | Artificial Intelligence | Trí tuệ nhân tạo. |
| GenAI | Generative Artificial Intelligence | Trí tuệ nhân tạo tạo sinh (mô hình ngôn ngữ lớn như Gemini). |
| RAG | Retrieval-Augmented Generation | Kỹ thuật kết hợp truy xuất tri thức nội bộ và sinh văn bản AI. |
| RBAC | Role-Based Access Control | Kiểm soát truy cập và phân quyền dựa trên vai trò người dùng. |
| JWT | JSON Web Token | Chuẩn mã hóa thông tin xác thực phiên làm việc người dùng không lưu trạng thái (Stateless). |
| ERD | Entity Relationship Diagram | Sơ đồ biểu diễn thực thể và mối quan hệ trong cơ sở dữ liệu. |
| 3NF | Third Normal Form | Dạng chuẩn 3 trong thiết kế cơ sở dữ liệu quan hệ, loại bỏ hoàn toàn dư thừa. |
| SRS | Software Requirements Specification | Tài liệu đặc tả các yêu cầu kỹ thuật và nghiệp vụ phần mềm. |
| FDD | Functional Decomposition Diagram | Sơ đồ phân rã chức năng hệ thống từ tổng quan đến chi tiết. |
| UML | Unified Modeling Language | Ngôn ngữ mô hình hóa thống nhất dùng trong phân tích và thiết kế phần mềm. |
| API | Application Programming Interface | Giao diện lập trình ứng dụng hỗ trợ giao tiếp giữa Client và Server. |
| ACID | Atomicity, Consistency, Isolation, Durability | Bốn thuộc tính đảm bảo tính toàn vẹn và tin cậy của giao dịch cơ sở dữ liệu. |
| VietQR | Vietnam Quick Response Code | Chuẩn mã phản hồi nhanh quốc gia dùng cho thanh toán liên ngân hàng NAPAS. |
| SPA | Single Page Application | Ứng dụng web trang đơn giúp người dùng chuyển màn hình mượt mà không tải lại trang. |

DANH MỤC HÌNH ẢNH & HÌNH VẼ


*Hình 1. Biểu đồ Gantt tiến độ thực hiện dự án (9 tuần)*


*Hình 2. Sơ đồ Kiến trúc Hệ thống Tổng thể 3 tầng (React 19 - FastAPI - PostgreSQL 18 bảng)*


*Hình 3. Sơ đồ Screen Flow Tổng thể Toàn hệ thống (Master Navigation Flow)*


*Hình 4. Sơ đồ Screen Flow Phân luồng Khách vãng lai & Đặt giữ chỗ Online*


*Hình 5. Sơ đồ Screen Flow Phân luồng Quản trị Hợp đồng & Tài chính VietQR*


*Hình 6. Sơ đồ Screen Flow Phân luồng Cổng cư dân (Resident Portal) & Trợ lý ảo RAG*


*Hình 7. Sơ đồ Bản đồ Điều hướng & Phân quyền RBAC Toàn hệ thống (Navigation Map)*


*Hình 8. Sơ đồ Phân rã chức năng (Functional Decomposition Diagram - FDD)*


*Hình 9. Sơ đồ Use Case Tổng quan Hệ thống Quản lý Căn hộ (4 Tác nhân + AI Engine)*


*Hình 10. Biểu đồ trình tự Quy trình Đăng nhập & Xác thực phân quyền JWT/RBAC*


*Hình 11. Biểu đồ trình tự Quy trình Tìm kiếm & Đặt giữ chỗ căn hộ trực tuyến*


*Hình 12. Biểu đồ trình tự Quy trình Lập và Ký kết hợp đồng thuê căn hộ*


*Hình 13. Biểu đồ trình tự Quy trình Sinh hóa đơn dịch vụ & Tạo mã VietQR thanh toán*


*Hình 14. Biểu đồ trình tự Quy trình Tiếp nhận báo hỏng & Phân công kỹ thuật*


*Hình 15. Biểu đồ trình tự Quy trình Tra cứu nội quy & Hỏi đáp Trợ lý ảo AI RAG Chatbot*


*Hình 16. Biểu đồ trình tự Quy trình Quản lý hồ sơ khách thuê & Người ở cùng*


*Hình 17. Biểu đồ trình tự Quy trình Báo cáo và Thống kê doanh thu*


*Hình 18. Biểu đồ hoạt động Quy trình Đăng nhập và Điều hướng phân quyền*


*Hình 19. Biểu đồ hoạt động Quy trình Đặt phòng giữ chỗ trực tuyến*


*Hình 20. Biểu đồ hoạt động Quy trình Quản lý Hợp đồng thuê và Tiền cọc*


*Hình 21. Biểu đồ hoạt động Quy trình Sinh hóa đơn và Thu phí VietQR*


*Hình 22. Biểu đồ hoạt động Quy trình Xử lý sự cố và Nghiệm thu bảo trì*


*Hình 23. Biểu đồ hoạt động Quy trình Hỏi đáp nội quy tòa nhà với RAG Chatbot*


*Hình 24. Biểu đồ hoạt động Quy trình Quản lý Căn hộ, Tòa nhà và Tiện ích*


*Hình 25. Biểu đồ hoạt động Quy trình Thống kê Dashboard và Cảnh báo AI*


*Hình 26. Sơ đồ Lớp Tổng quan Hệ thống (Class Diagram Domain Model - 18 Classes)*


*Hình 27. Biểu đồ Triển khai Hệ thống Vật lý (Deployment Diagram)*


*Hình 28. Lược đồ Cơ sở Dữ liệu Quan hệ ERD 18 Bảng (pgAdmin 4 — qlch_db chuẩn 3NF kèm Audit Log)*


*Hình 29. Sơ đồ Thuật toán Kiểm tra quyền hạn vai trò RBAC & Xác thực JWT*


*Hình 30. Giao diện Đăng nhập Hệ thống & Xác thực Đa vai trò RBAC*


*Hình 31. Màn hình Báo cáo Thống kê, Doanh thu & Dashboard KPI Tổng quan*


*Hình 32. Giao diện Quản lý Danh mục Tòa nhà, Căn hộ & Trạng thái Phòng*


*Hình 33. Giao diện Chi tiết Hợp đồng & Trợ lý AI Summarizer Tóm tắt Điều khoản*


*Hình 34. Giao diện Quản lý Hồ sơ Khách thuê & Danh sách Người ở cùng phòng*


*Hình 35. Biểu mẫu Lập Hợp đồng Thuê mới & Cấu hình Tiền cọc*


*Hình 36. Giao diện Tiếp nhận & Nghiệm thu Bảo trì Kỹ thuật Sự cố*


*Hình 37. Biểu mẫu Sinh Khoản thu Định kỳ Hàng loạt & Ghi nhận Thanh toán*


*Hình 38. Giao diện Quét Cảnh báo Tự động & AI Soạn thảo Thông báo Đôn đốc Nợ*


*Hình 39. Giao diện Khám phá & Tìm kiếm Căn hộ Trống Trực tuyến*


*Hình 40. Giao diện Văn phòng Hợp đồng Số & AI Summarizer Studio cho Cư dân*


*Hình 41. Màn hình Tra cứu Hóa đơn Tiện ích Hàng tháng & Quét mã VietQR Napas*


*Hình 42. Sổ cái Thanh toán Cư dân & Bản hiển thị Phiếu thu Điện tử Hợp lệ*


*Hình 43. Giao diện Báo cáo Sự cố & Theo dõi Tiến độ Sửa chữa của Cư dân*


*Hình 44. Màn hình Nghiệm thu Sửa chữa & Đánh giá Chất lượng Dịch vụ 5 Sao*


*Hình 45. Giao diện Tương tác với Trợ lý Chatbot AI RAG Tra cứu Nội quy 24/7*


# LỜI MỞ ĐẦU

Trong bối cảnh đô thị hóa nhanh chóng tại các thành phố lớn như Hà Nội, TP. Hồ Chí Minh, nhu cầu thuê và quản lý căn hộ dịch vụ, chung cư mini, phòng trọ cao cấp tăng trưởng vượt bậc. Các chủ đầu tư và ban quản lý vận hành tòa nhà thường quản lý đồng thời từ hàng chục đến hàng trăm căn hộ phân tán tại nhiều cơ sở. Tuy nhiên, phương thức quản trị truyền thống bằng sổ sách giấy tờ, bảng tính Excel hay tin nhắn mạng xã hội (Zalo, Facebook) bộc lộ rất nhiều hạn chế nghiêm trọng:

Thứ nhất: Dữ liệu phân tán, dễ thất thoát và nhầm lẫn các mốc hạn thanh toán tiền nhà, tiền dịch vụ hàng tháng.

Thứ hai: Khó khăn trong việc kiểm soát trạng thái phòng trống, dễ dẫn đến hiện tượng trùng phòng hoặc giữ chỗ ảo.

Thứ ba: Khâu quản lý tiền cọc và khấu trừ tài sản hư hại khi kết thúc hợp đồng thiếu minh bạch, gây tranh chấp với cư dân.

Thứ tư: Bộ phận quản lý thường xuyên quá tải trong việc giải đáp lặp đi lặp lại các câu hỏi về nội quy tòa nhà, quy định rác thải, giờ giấc sinh hoạt.

Xuất phát từ yêu cầu thực tiễn cấp bách đó, trong khuôn khổ học phần Ứng dụng Trí tuệ Nhân tạo, Nhóm 12 đã lựa chọn và thực hiện đề tài: "Xây dựng và phát triển hệ thống quản lý thuê căn hộ thông minh tích hợp trí tuệ nhân tạo (Dwell Living)". Đề tài hướng tới việc giải quyết triệt để các bài toán vận hành thực tế bằng giải pháp phần mềm hiện đại, ứng dụng Trí tuệ Nhân tạo tạo sinh (GenAI) kết hợp truy xuất ngữ cảnh (RAG) để hỗ trợ ban quản trị tự động hóa các nghiệp vụ lặp lại và cung cấp trải nghiệm sống tiện nghi nhất cho cư dân.

1. Mục tiêu của đề tài

Mục tiêu nghiệp vụ: Số hóa toàn diện vòng đời thuê căn hộ: Khám phá phòng, đặt giữ chỗ, lập hợp đồng, tạo cọc, xuất hóa đơn VietQR tự động và xử lý báo hỏng bảo trì.

Mục tiêu công nghệ AI: Tích hợp AI chuyên sâu: Ứng dụng Google Gemini AI và PostgreSQL pgvector để tóm tắt các điều khoản pháp lý hợp đồng, tự động soạn thảo thông báo đôn đốc công nợ và Chatbot hỏi đáp nội quy tòa nhà 24/7.

Mục tiêu học thuật: Vận dụng đầy đủ quy trình Công nghệ phần mềm: Áp dụng chuẩn mực từ khâu khảo sát hiện trạng, lập kế hoạch, đặc tả yêu cầu (SRS), thiết kế kiến trúc 3 tầng, mô hình hóa hệ thống (Use Case, Sequence, Activity, Class, ERD, Screen Flow) đến kiểm thử và xây dựng kế hoạch bảo trì.

2. Phạm vi nghiên cứu và ứng dụng

Đề tài tập trung nghiên cứu và xây dựng giải pháp phần mềm hoàn chỉnh phục vụ 4 nhóm đối tượng chính: Khách hàng vãng lai tìm thuê, Cư dân/Khách thuê đang sinh sống, Nhân viên vận hành kỹ thuật và Ban quản lý / Kế toán tài chính tòa nhà. Hệ thống được thiết kế theo kiến trúc Web Responsive hoạt động ổn định trên cả máy tính để bàn và thiết bị di động thông minh.

(Ghi chú về nhận diện thương hiệu: Dwell Living là nền tảng quản trị tổng thể; Sunshine Homes là phân khu mẫu thực nghiệm.)


# CHƯƠNG 1. CƠ SỞ LÝ THUYẾT & KẾ HOẠCH DỰ ÁN


## 1.1. Các khái niệm cơ bản


### 1.1.1. Phần mềm và Kỹ nghệ phần mềm

Phần mềm (Software) là tập hợp các chỉ thị, chương trình, dữ liệu và tài liệu hướng dẫn được thiết kế để thực hiện một nhóm các nhiệm vụ cụ thể trên hệ thống máy tính. Kỹ nghệ phần mềm (Software Engineering) là việc áp dụng một cách tiếp cận có hệ thống, có kỷ luật và định lượng được cho việc phát triển, vận hành và bảo trì phần mềm.


### 1.1.2. Vòng đời phát triển phần mềm (Software Development Life Cycle - SDLC)

Vòng đời phần mềm bao gồm các giai đoạn kế tiếp nhau từ khi nảy sinh ý tưởng, thu thập yêu cầu, phân tích, thiết kế kiến trúc, lập trình cài đặt, kiểm thử chất lượng, triển khai vận hành cho đến bảo trì và nâng cấp.


### 1.1.3. Quy trình phát triển phần mềm hiện đại

Hiện nay, các quy trình phát triển phần mềm phổ biến gồm mô hình Thác nước (Waterfall), mô hình Xoắn ốc (Spiral), mô hình Chữ V (V-Model) và các phương pháp linh hoạt (Agile/Scrum). Trong dự án này, nhóm áp dụng mô hình kết hợp Agile Scrum và Waterfall lặp nhằm vừa đảm bảo tính kỷ luật về mặt tài liệu kiến trúc, vừa linh hoạt điều chỉnh các chức năng AI và giao diện người dùng.


## 1.2. Các chuẩn trong công nghệ phần mềm

Để đảm bảo sản phẩm phần mềm có chất lượng cao, dễ bảo trì và chuyển giao, dự án tuân thủ nghiêm ngặt các tiêu chuẩn quốc tế:

Chuẩn CMM/CMMI: Áp dụng các mức độ quản lý chất lượng quy trình (Capability Maturity Model Integration) trong kiểm soát tài liệu và quản trị rủi ro.

Chuẩn tài liệu IEEE 830: Soạn thảo tài liệu đặc tả yêu cầu phần mềm theo cấu trúc chuẩn quốc tế IEEE 830-1998.

Chuẩn kiến trúc phần mềm Clean Architecture: Thiết kế hệ thống phân tách độc lập 3 tầng (Presentation - Business Logic - Data Access Layer) giúp dễ kiểm thử đơn vị và mở rộng tính năng.

Chuẩn RESTful API: Chuẩn thiết kế giao diện lập trình ứng dụng RESTful API với định dạng JSON, phân tách rõ ràng các phương thức HTTP (GET, POST, PUT, DELETE, PATCH).


## 1.3. Xu hướng công nghệ phần mềm hiện đại áp dụng trong dự án

Dự án đón đầu các xu hướng công nghệ mới nhất hiện nay:

Frontend Single Page Application (SPA): Sử dụng React 19 (^19.0.0), Vite 6, TypeScript, Redux Toolkit (^2.6.0), React Router v7 (^7.2.0) và Tailwind CSS 3.4 mang lại trải nghiệm tương tác mượt mà, phản hồi ngay lập tức không cần tải lại trang (giao tiếp API trực tiếp qua native fetch API chuẩn hiện đại).

Backend REST Micro-Services: Hệ thống Backend REST API gọn nhẹ, xử lý bất đồng bộ (Non-blocking I/O) tối ưu cho các luồng xử lý đồng thời.

PostgreSQL & Vector Database: Cơ sở dữ liệu PostgreSQL 16 tích hợp extension pgvector để lưu trữ các Vector Embeddings 768 chiều, phục vụ tìm kiếm ngữ nghĩa theo khoảng cách Cosine.

Generative AI & Semantic RAG: Tích hợp Google Gemini API (gemini-1.5-flash) theo mô hình RAG (Retrieval-Augmented Generation) giúp chatbot trả lời nội quy chính xác, loại bỏ hoàn toàn hiện tượng ảo giác (Hallucination).


## 1.4. Kế hoạch thời gian thực hiện dự án (Gantt Chart 9 tuần)

Dự án được phân bổ trong 9 tuần (từ ngày 27/07/2026 đến ngày 27/09/2026), chia thành 5 giai đoạn trọng tâm:


*Hình 1. Biểu đồ Gantt tiến độ thực hiện dự án (9 tuần)*


| Giai đoạn & Thời gian | Hạng mục công việc chi tiết | Sản phẩm / Kết quả đầu ra |
| --- | --- | --- |
| Tuần 1 - 2 (27/07 - 09/08) | Khảo sát bài toán quản lý chuỗi căn hộ, thu thập yêu cầu người dùng, hoàn thiện tài liệu SRS (Lab 1 & Lab 2). | Nộp tài liệu Yêu cầu |
| Tuần 3 - 4 (10/08 - 23/08) | Phân tích hướng đối tượng, thiết kế Use Case, Class Diagram 17 lớp, ERD 18 bảng chuẩn 3NF, Sequence và Activity Diagrams. | Nộp tài liệu Thiết kế |
| Tuần 5 - 6 (24/08 - 06/09) | Khởi tạo cơ sở dữ liệu PostgreSQL, lập trình Backend API RESTful, cài đặt dịch vụ AI Gemini và pgvector. | Demo API & Database |
| Tuần 7 - 8 (07/09 - 20/09) | Xây dựng giao diện Frontend React Vite, ghép nối API, kiểm thử chức năng (Functional Testing) 25 Test Cases. | Hoàn thành kiểm thử |
| Tuần 9 (21/09 - 27/09) | Đóng gói triển khai hệ thống, tối ưu hóa hiệu năng, xây dựng kế hoạch bảo trì và bảo vệ đồ án kết thúc môn. | Nghiệm thu đồ án |


## 1.5. Đánh giá mức độ rủi ro và biện pháp giảm thiểu


*Bảng 3. Ma trận phân tích và kiểm soát rủi ro dự án*


| Mã RR | Loại rủi ro | Mô tả rủi ro | Mức độ ảnh hưởng | Biện pháp phòng ngừa và kiểm soát |
| --- | --- | --- | --- | --- |
| RR01 | Kỹ thuật AI | Mô hình GenAI có thể sinh câu trả lời không chính xác (AI Hallucination). | Cao | Áp dụng kỹ thuật RAG với strict prompting: Chỉ trả lời dựa trên văn bản nội quy trích xuất; áp dụng cơ chế Human-in-the-loop (nhân viên duyệt trước khi gửi). |
| RR02 | Bảo mật | Lộ lọt thông tin cá nhân khách thuê (CCCD, số điện thoại, hợp đồng). | Nghiêm trọng | Mã hóa một chiều mật khẩu bằng BCrypt/Argon2; mã hóa dữ liệu nhạy cảm; phân quyền chặt chẽ theo vai trò (RBAC) và xác thực JWT. |
| RR03 | Tính toàn vẹn | Xảy ra xung đột giữ chỗ phòng (Double Booking) khi hai khách đặt cùng lúc. | Trung bình | Sử dụng giao dịch cơ sở dữ liệu (Database Transaction) với cơ chế khóa bi quan (SELECT FOR UPDATE) tại tầng CSDL. |
| RR04 | Tiến độ | Chậm trễ trong quá trình ghép nối API giữa Frontend và Backend. | Trung bình | Xây dựng Mock API và tài liệu Swagger/Postman chuẩn xác ngay từ Tuần 4 để lập trình song song độc lập. |


# CHƯƠNG 2. ĐẶC TẢ PHẦN MỀM (SOFTWARE REQUIREMENTS SPECIFICATION)


## 2.1. Khảo sát hiện trạng và Nhu cầu xây dựng hệ thống mới

Qua khảo sát thực tế tại các mô hình cho thuê căn hộ dịch vụ và chung cư mini vừa và nhỏ, quy trình quản lý hiện hành chủ yếu dựa trên bảng tính Excel kết hợp ghi chép thủ công. Các vấn đề nhức nhối bao gồm:

Tắc nghẽn thông tin căn hộ: Khi khách thuê gọi điện hoặc đến xem phòng, nhân viên mất từ 10 - 15 phút tra cứu sổ sách để biết phòng nào đang trống, phòng nào sắp hết hạn hoặc đang sửa chữa.

Chậm trễ thu phí và công nợ: Kế toán thường xuyên quên ngày chốt chỉ số điện nước, tính toán sai lệch tiền dịch vụ và phải nhắn tin đôn đốc thủ công từng phòng, dẫn đến nợ đọng kéo dài.

Quản lý bảo trì rời rạc: Khi cư dân báo hỏng thiết bị qua tin nhắn, thông tin dễ bị trôi, không phân công được kỹ thuật viên kịp thời, không lưu lại lịch sử chi phí sửa chữa để quyết toán khi thanh lý cọc.

Do đó, việc xây dựng hệ thống phần mềm Dwell Living có ý nghĩa sống còn nhằm tự động hóa tối đa quy trình quản lý, tăng tính minh bạch tài chính và giảm 70% khối lượng công việc sự vụ cho nhân viên.


## 2.2. Các đối tượng sử dụng hệ thống (Actors)

1. Khách hàng vãng lai (Public / Guest): Khách hàng có nhu cầu tìm thuê căn hộ, tra cứu phòng trống, xem tiện ích xung quanh, sử dụng tính năng gợi ý căn hộ thông minh và gửi yêu cầu đặt giữ chỗ trực tuyến.

2. Khách thuê / Cư dân (Tenant): Cư dân đang có hợp đồng thuê có hiệu lực, sử dụng Cổng cư dân để xem thông tin hợp đồng, cập nhật danh sách người ở cùng, nhận hóa đơn tháng, thanh toán qua mã VietQR và gửi yêu cầu sửa chữa.

3. Nhân viên vận hành (Staff): Bộ phận phụ trách tiếp nhận khách xem phòng, duyệt yêu cầu đặt chỗ, lập hợp đồng thuê mới, ghi nhận bàn giao tài sản, tiếp nhận sự cố kỹ thuật và phân công thợ sửa chữa.

4. Kế toán tài chính (Accountant): Chốt chỉ số điện nước định kỳ, phát hành hóa đơn thu phí, tạo mã thanh toán VietQR động, xác nhận thanh toán, theo dõi công nợ và kích hoạt AI đôn đốc thanh toán.

5. Quản trị viên (Admin): Có toàn quyền cao nhất trên hệ thống, quản lý tài khoản người dùng, phân quyền RBAC, xem báo cáo doanh thu tổng thể, tỷ lệ lấp đầy phòng và cấu hình tri thức nội bộ cho AI.


## 2.3. Danh mục các yêu cầu chức năng (Functional Requirements)


*Bảng 4. Danh mục yêu cầu chức năng chuẩn hóa của hệ thống*


| Mã YC | Tên nhóm chức năng | Mô tả chi tiết yêu cầu nghiệp vụ | Tác nhân chính | Độ ưu tiên |
| --- | --- | --- | --- | --- |
| FR-01 | Quản lý Tài khoản & Phân quyền | Đăng ký, đăng nhập bảo mật JWT, phân quyền truy cập 4 vai trò (ADMIN, STAFF, ACCOUNTANT, TENANT). | Toàn bộ tác nhân | Bắt buộc |
| FR-02 | Quản lý Tòa nhà & Căn hộ | Thêm/sửa/xóa thông tin tòa nhà, tầng, số phòng, diện tích, giá thuê, tiện ích và trạng thái phòng (AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE). | Admin, Staff | Bắt buộc |
| FR-03 | Cổng khám phá & Đặt phòng | Tìm kiếm, lọc căn hộ theo giá/diện tích; AI Matcher gợi ý căn hộ theo nhu cầu tự nhiên; đặt cọc giữ chỗ trực tuyến có kiểm tra trùng phòng. | Khách vãng lai | Bắt buộc |
| FR-04 | Quản lý Khách thuê & Người ở cùng | Lưu trữ hồ sơ cá nhân, CCCD, số điện thoại, quê quán, danh sách người ở cùng và người liên hệ khẩn cấp. | Admin, Staff, Tenant | Bắt buộc |
| FR-05 | Quản lý Hợp đồng & Tiền cọc | Lập hợp đồng thuê, quản lý ngày bắt đầu/kết thúc, số tiền cọc, tự động chuyển phòng sang OCCUPIED; thanh lý hợp đồng và hoàn cọc. | Admin, Staff | Bắt buộc |
| FR-06 | Quản lý Khoản thu & VietQR | Chốt số điện/nước, tự động sinh hóa đơn tháng (RECEIVABLES), tạo mã VietQR động chuẩn NAPAS; xác nhận thanh toán và cập nhật sổ nợ. | Accountant, Tenant | Bắt buộc |
| FR-07 | Quản lý Yêu cầu Bảo trì | Cư dân gửi yêu cầu sửa chữa kèm ảnh chụp hư hại; ban quản lý phân công kỹ thuật viên, cập nhật chi phí và nghiệm thu. | Tenant, Staff | Bắt buộc |
| FR-08 | Quét cảnh báo tự động | Tự động quét và phát hiện các hợp đồng sắp hết hạn trong 30 ngày, các hóa đơn quá hạn chưa thanh toán để thông báo cho ban quản lý. | Hệ thống tự động | Cao |
| FR-09 | Thống kê & Dashboard | Biểu đồ trực quan hóa doanh thu theo tháng, tỷ lệ lấp đầy căn hộ, tổng dư nợ khách thuê và danh sách sự cố tồn đọng. | Admin, Accountant | Cao |
| AI-01 | AI Tóm tắt Hợp đồng & Đôn đốc | Trợ lý ảo Gemini tự động trích xuất các điều khoản trọng tâm của hợp đồng và soạn thảo email/tin nhắn nhắc nợ lịch sự, đúng luật. | Admin, Staff | Cao |
| AI-02 | Chatbot RAG Nội quy Căn hộ | Truy vấn Semantic Search theo tài liệu nội quy tòa nhà đã vector hóa, trả lời thắc mắc cư dân về giờ giấc, rác thải, phí gửi xe 24/7. | Tenant, Staff | Cao |


## 2.4. Ma trận phân quyền kiểm soát truy cập (RBAC Matrix)

Hệ thống áp dụng cơ chế Role-Based Access Control chặt chẽ giữa 4 vai trò trên tất cả các phân hệ nghiệp vụ:


*Bảng 5. Ma trận phân quyền vai trò người dùng (RBAC)*


| Phân hệ chức năng | Khách vãng lai (GUEST) | Cư dân (TENANT) | Nhân viên (STAFF) | Kế toán (ACCOUNTANT) | Quản trị viên (ADMIN) |
| --- | --- | --- | --- | --- | --- |
| Xem danh sách & chi tiết căn hộ | Xem | Xem | Xem | Xem | Xem & Quản trị |
| Đặt giữ chỗ căn hộ trực tuyến | Thực hiện | Không | Quản lý / Duyệt | Xem | Toàn quyền |
| Cổng thông tin cư dân (/tenant-portal) | Không | Toàn quyền cá nhân | Không | Không | Xem giám sát |
| Quản lý Tòa nhà & Căn hộ | Không | Không | Thêm/Sửa/Cập nhật | Xem | Toàn quyền |
| Quản lý Hợp đồng & Tiền cọc | Không | Xem hợp đồng của mình | Lập & Sửa hợp đồng | Xem & Thu cọc | Toàn quyền duyệt |
| Quản lý Tài chính & Hóa đơn VietQR | Không | Xem & Quét mã trả tiền | Xem | Chốt số & Phát hành | Toàn quyền |
| Tiếp nhận & Xử lý bảo trì sự cố | Không | Gửi yêu cầu báo hỏng | Tiếp nhận & Phân công | Xem chi phí | Toàn quyền |
| Quản lý Cảnh báo tự động & AI Dunning | Không | Không | Xem & Xử lý | Xem & Gửi nhắc nợ | Toàn quyền |
| Báo cáo Thống kê Dashboard | Không | Không | Không | Xem tài chính | Toàn quyền |
| Cấu hình Tri thức AI RAG & Hệ thống | Không | Không | Không | Không | Toàn quyền cấu hình |


## 2.5. Lý giải vị trí và Kiến trúc tích hợp Trí tuệ Nhân tạo (AI Placement Rationale)

Một trong những đóng góp mang tính đột phá của đồ án là việc tích hợp Trí tuệ Nhân tạo tạo sinh (Generative AI) vào giải quyết đúng các 'nút thắt cổ chai' (bottlenecks) trong vận hành chuỗi căn hộ, đồng thời tuân thủ nghiêm ngặt nguyên tắc ranh giới an toàn công nghệ:

1. Vị trí 1 - Tóm tắt Hợp đồng pháp lý (Contract Summarizer): Hợp đồng thuê căn hộ dịch vụ thường dài từ 10 - 15 trang với các điều khoản pháp lý phức tạp về trách nhiệm bồi thường, bảo dưỡng tài sản và quy chế hoàn trả cọc. Khi khách thuê hoặc nhân viên mới cần nắm thông tin, AI Summarizer trích xuất 5 điều khoản trọng yếu nhất (Thời hạn, Giá thuê, Tiền cọc, Trách nhiệm sửa chữa, Điều kiện phạt hủy ngang) chỉ trong 5 giây, tiết kiệm 90% thời gian rà soát văn bản.

2. Vị trí 2 - Soạn thảo Thông báo Đôn đốc Công nợ (AI Dunning Generator): Tự động phát hiện nợ quá hạn và hợp đồng sắp hết hạn (30 ngày), sau đó gọi Gemini AI tự động soạn thảo nội dung tin nhắn/email theo 3 sắc thái linh hoạt (Lịch sự, Tiêu chuẩn, Cương quyết). Tính năng này loại bỏ hoàn toàn việc nhân viên phải soạn tin thủ công từng phòng, đồng thời cá nhân hóa chính xác số tiền nợ và hạn chót thanh toán.

3. Vị trí 3 - Chatbot RAG Tra cứu Nội quy Tòa nhà 24/7: Áp dụng kiến trúc Retrieval-Augmented Generation (RAG) kết hợp PostgreSQL pgvector để trả lời tự động mọi thắc mắc của cư dân về giờ giấc đóng mở cửa, quy định nuôi thú cưng, phân loại rác thải, phí gửi xe máy/ô tô 24/7. Cư dân nhận câu trả lời tức thì kèm dẫn chứng điều khoản nội quy gốc, giảm 85% các cuộc gọi hỏi đáp sự vụ cho lễ tân tòa nhà.

4. Vị trí 4 - Trợ lý Khám phá & Gợi ý Căn hộ thông minh (AI Matcher): Phân tích câu hỏi tự nhiên của khách hàng vãng lai (ví dụ: 'Tìm căn 2 ngủ có ban công thoáng mát dưới 9 triệu') để tự động trích xuất các tiêu chí lọc (số phòng ngủ, khoảng giá, tiện ích) và gợi ý danh sách căn hộ trống tối ưu nhất.

Lý giải nguyên tắc 'Deterministic Financials vs. Generative Intelligence': Hệ thống phân tách rạch ròi giữa Logic tính toán tài chính và Xử lý ngôn ngữ tự nhiên. Tuyệt đối KHÔNG giao cho mô hình AI tính toán tiền phòng, tiền điện nước hay số dư công nợ (nhằm loại bỏ 100% rủi ro sai lệch số học do ảo giác mô hình). Mọi phép tính tiền tệ đều được thực thi bằng mã nguồn Backend tất định (Deterministic Logic), trong khi AI chỉ đảm nhiệm vai trò đọc hiểu, tóm tắt và sinh nội dung giao tiếp với người dùng.


## 2.6. Rào chắn An toàn AI (Safety Guardrails) và Kiến trúc Kết nối API

Để đảm bảo hệ thống vận hành an toàn trong môi trường doanh nghiệp thực tế, nhóm đã thiết kế rào chắn an toàn 3 tầng:

Tầng 1 - Rào chắn phạm vi (Scope Boundary): Bộ lọc từ khóa và phân tích ý định (Intent Classifier) chặn đứng các câu hỏi nằm ngoài phạm vi vận hành căn hộ (chính trị, tôn giáo, mã độc, toán học...). Chatbot từ chối lịch sự và hướng dẫn cư dân quay lại chủ đề quy chế tòa nhà.

Tầng 2 - Rào chắn chống ảo giác (Anti-Hallucination): Chatbot RAG tuân thủ nghiêm ngặt nguyên tắc 'NO CONTEXT -> NO ANSWER'. Nếu độ tương đồng ngữ nghĩa (Cosine Similarity) của tài liệu nội quy tìm được dưới ngưỡng 0.65, hệ thống lập tức thông báo: 'Nội quy hiện hành chưa đề cập vấn đề này, vui lòng liên hệ Ban quản lý' — tuyệt đối không tự bịa đặt thông tin.

Tầng 3 - Bảo vệ Dữ liệu Riêng tư (PII Protection): Trong các câu trả lời của AI và dữ liệu đưa vào Prompt, hệ thống tự động ẩn (masking) các thông tin định danh cá nhân nhạy cảm (Số CCCD, số điện thoại riêng tư của cư dân khác), ngăn chặn triệt để nguy cơ tấn công Prompt Injection để dò thông tin người dùng.

Về kết nối API: Toàn bộ các yêu cầu AI đều được định tuyến thông qua Backend Server bằng thư viện chính thức google-genai SDK, sử dụng mô hình gemini-3.8-flash với cấu hình temperature=0.2 (đảm bảo độ chính xác cao nhất) và max_output_tokens=1024. API Key được lưu trữ an toàn trong biến môi trường server-side, không bao giờ lộ ra phía Client.


# CHƯƠNG 3. PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

Chương 3 là phần trọng tâm nhất của báo cáo, trình bày chi tiết toàn bộ các mô hình phân tích và thiết kế phần mềm theo chuẩn kỹ nghệ phần mềm hiện đại, từ sơ đồ kiến trúc 3 tầng, luồng màn hình Screen Flow, phân rã chức năng, Use Case, Sequence Diagrams, Activity Diagrams, Class Diagram UML, Deployment Diagram cho đến lược đồ CSDL quan hệ ERD 18 bảng chuẩn 3NF.


## 3.1. Mô hình tổ chức hệ thống (Kiến trúc 3 tầng)

Hệ thống được xây dựng theo mô hình kiến trúc 3 tầng chuẩn mực (3-Tier Architecture), phân tách triệt để giữa tầng trình diễn, tầng xử lý logic nghiệp vụ và tầng lưu trữ dữ liệu:

1. Tầng Trình diễn (Presentation Layer): Xây dựng bằng React 19 (^19.0.0), Vite 6, TypeScript, Redux Toolkit (^2.6.0) và Tailwind CSS 3.4. Cung cấp giao diện Web Responsive linh hoạt, thực hiện gọi API bất đồng bộ qua native fetch API, lưu trữ JWT Token an toàn và điều hướng thông minh qua React Router v7 (^7.2.0).

2. Tầng Ứng dụng & Nghiệp vụ (Application Layer): Được xây dựng hoàn toàn bằng ngôn ngữ Python với framework FastAPI hiện đại, máy chủ Uvicorn, xử lý bất đồng bộ (Asynchronous I/O), quản lý ORM qua SQLAlchemy 2.0 (async), xác thực JWT (PyJWT), mã hóa mật khẩu Bcrypt, tích hợp Google GenAI SDK chính thức và lập lịch thu phí tự động qua APScheduler.

3. Tầng Dữ liệu (Data Layer): Cơ sở dữ liệu quan hệ PostgreSQL 16 gồm 18 bảng chuẩn 3NF (bổ sung bảng audit_logs), tích hợp extension pgvector để lưu trữ và truy vấn vector ngữ nghĩa của tài liệu nội quy.


*Hình 2. Sơ đồ kiến trúc 3 tầng*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Tầng Giao diện (Presentation Layer) | Giao diện khách hàng (Tìm phòng & Cổng cư dân) | Trang quản trị Admin (React 19 SPA, Vite 6, TypeScript, Tailwind CSS 3.4, Redux Toolkit, React Router v7, native fetch API). | Giao diện người dùng responsive |
| Tầng Xử lý nghiệp vụ (Business Logic) | Controller | Service | Validation | Phân quyền RBAC | Dịch vụ AI RAG (Python 3.11+, FastAPI, SQLAlchemy 2.0 async, Uvicorn, pgvector, Google Gemini AI). | Xử lý logic và nghiệp vụ thông minh |
| Tầng Dữ liệu (Data Access Layer) | PostgreSQL 16 RDBMS (18 bảng chuẩn 3NF kèm Audit Log) | pgvector Extension (Vector 768 chiều) | Repository. | Lưu trữ dữ liệu quan hệ và tri thức AI |


## 3.2. Thiết kế Giao diện và Luồng màn hình tương tác (Screen Flow)

Hệ thống luồng màn hình (Screen Flow) định nghĩa cấu trúc điều hướng xuyên suốt giữa các trang giao diện, modal popup, hành động người dùng, các điểm kiểm tra logic nghiệp vụ và phân quyền vai trò RBAC. Quy chuẩn màu sắc và ký hiệu hình học tuân thủ tài liệu đặc tả:

Hình chữ nhật xanh dương (#2196F3): Màn hình giao diện trang web hoặc modal tương tác của người dùng.

Hình chữ nhật bo tròn vàng (#FFF59D): Hành động của người dùng (bấm nút, chọn tab, nhập form).

Hình thoi cam (#FB8C00): Điểm rẽ nhánh logic nghiệp vụ (kiểm tra điều kiện, check phòng trống, xác thực quyền hạn).

Vòng tròn viền đỏ nền trắng (#E53935): Thông báo lỗi, từ chối thao tác hoặc chặn truy cập trái quyền.

Pill bo tròn màu xám đậm (#37474F): Điểm kết thúc quy trình nghiệp vụ.


*Hình 3. Sơ đồ Screen Flow Tổng thể Toàn hệ thống (Master Navigation Flow)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Khám phá căn hộ (/) | Khách vãng lai xem danh sách phòng trống, lọc phòng, mở modal xem chi tiết và đặt phòng. | Public Route |
| Chi tiết căn hộ (/apartments/:id) | Xem thông tin chi tiết phòng, giá thuê, diện tích, tiện ích; bấm nút Đăng nhập hệ thống. | Public Route |
| Đăng nhập hệ thống (/login) | Nhập Email và Mật khẩu; Hệ thống kiểm tra thông tin xác thực và phân quyền vai trò. | Authentication |
| Cổng cư dân (/tenant-portal) | Chỉ dành riêng cho tài khoản có vai trò TENANT; quản lý 4 tab nghiệp vụ và Chatbot. | Resident Portal (RBAC) |
| Trang Quản trị (/admin/*) | Bảng điều khiển và 8 màn hình quản lý chuyên sâu cho ADMIN, STAFF, ACCOUNTANT. | Admin Workspace (RBAC) |


*Hình 4. Sơ đồ Screen Flow Phân luồng Khách vãng lai & Đặt giữ chỗ Online*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| PublicExplorePage | Hiển thị danh sách căn hộ theo lưới, tích hợp thanh tìm kiếm và bộ lọc đa tiêu chí. | Màn hình chính |
| AI Matcher Modal | Cửa sổ tương tác nhập mô tả tự nhiên; Gemini Flash phân tích nhu cầu và gợi ý phòng phù hợp. | GenAI Feature |
| Booking Modal | Form nhập họ tên, số điện thoại, ngày dự kiến vào ở; kiểm tra trùng phòng trước khi lưu. | Giao dịch đặt cọc |
| Xác nhận giữ chỗ | Tạo bản ghi BOOKINGS trạng thái PENDING; gửi thông báo cho nhân viên quản lý phê duyệt. | Hoàn tất luồng |


*Hình 5. Sơ đồ Screen Flow Phân luồng Quản trị Hợp đồng & Tài chính VietQR*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| ContractsPage | Hiển thị danh sách hợp đồng; nút Lập hợp đồng mới mở Drawer nhập liệu chi tiết. | Admin / Staff |
| Tạo Hợp đồng & Cọc | Chọn phòng AVAILABLE, nhập khách thuê, ngày bắt đầu/kết thúc, tiền cọc; phòng đổi sang OCCUPIED. | Cập nhật CSDL |
| FinancePage | Giao diện quản lý hóa đơn tháng; nhập chỉ số điện nước, hệ thống tự tính tổng tiền dịch vụ. | Accountant |
| VietQR Thanh toán | Sinh mã QR động chứa số tài khoản, mã hóa đơn và số tiền cần thanh toán; xác nhận gạch nợ. | Tích hợp VietQR |


*Hình 6. Sơ đồ Screen Flow Phân luồng Cổng cư dân & Trợ lý ảo RAG*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| ResidentPortalPage | Giao diện dành riêng cho cư dân với 4 tabs: Hợp đồng, Người ở cùng, Hóa đơn VietQR, Báo hỏng. | Tenant Only |
| Floating AI Chatbot | Nút nổi mở cửa sổ trò chuyện với Trợ lý AI; nhập câu hỏi về nội quy hoặc tiền phòng. | AI Widget |
| Gửi báo hỏng sự cố | Form báo hỏng thiết bị kèm đính kèm ảnh chụp hiện trường; theo dõi tiến độ xử lý của kỹ thuật viên. | Bảo trì sự cố |
| Thanh toán hóa đơn | Xem chi tiết tiền phòng và tiền dịch vụ; hiển thị mã VietQR thanh toán nhanh qua ứng dụng Mobile Banking. | Cổng thanh toán |


*Hình 7. Sơ đồ Bản đồ Điều hướng & Phân quyền RBAC Toàn hệ thống (Navigation Map)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Khu vực Công khai (Public) | Tất cả mọi người truy cập: Trang chủ (/), Chi tiết (/apartments/:id), Đăng nhập (/login). | Không yêu cầu JWT |
| Khu vực Cư dân (Resident) | Yêu cầu đăng nhập tài khoản có role TENANT: Cổng cư dân (/tenant-portal). | JWT Role = TENANT |
| Khu vực Quản trị (Admin) | Yêu cầu tài khoản STAFF, ACCOUNTANT, ADMIN: 9 Route quản lý (/admin/*). | JWT Role Admin/Staff |
| Xử lý lỗi truy cập | Điều hướng về /unauthorized khi không đủ quyền (403); điều hướng về /not-found khi sai URL (404). | Bảo mật hệ thống |


## 3.3. Thiết kế Cấu trúc hệ thống


### 3.3.1. Sơ đồ phân rã chức năng (Functional Decomposition Diagram - FDD)

Sơ đồ phân rã chức năng mô tả cấu trúc hình cây phân cấp toàn bộ chức năng của hệ thống Quản lý Căn hộ từ mức khái quát đến mức chi tiết:


*Hình 8. Sơ đồ Phân rã chức năng (Functional Decomposition Diagram - FDD)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Hệ thống Quản lý Căn hộ Dwell Living | Nút gốc của toàn bộ hệ thống phần mềm. | Hệ thống tổng |
| Nhóm Quản lý Danh mục | Quản lý tòa nhà, quản lý căn hộ, tiện ích và trạng thái phòng trống. | Sub-system 1 |
| Nhóm Quản lý Khách hàng & Thuê phòng | Khám phá phòng, đặt chỗ trực tuyến, quản lý hồ sơ khách thuê, lập hợp đồng thuê và cọc. | Sub-system 2 |
| Nhóm Quản lý Tài chính & Vận hành | Tính tiền điện nước, sinh hóa đơn VietQR, ghi nhận thanh toán, xử lý sự cố báo hỏng bảo trì. | Sub-system 3 |
| Nhóm Quản trị Thông minh & AI | Quét cảnh báo nợ, AI tóm tắt hợp đồng, AI soạn thảo đôn đốc công nợ, Chatbot RAG nội quy. | Sub-system 4 |


### 3.3.2. Sơ đồ Use Case tổng thể và chi tiết

Mô hình Use Case thể hiện tương tác giữa 4 tác nhân người dùng (Khách vãng lai, Cư dân, Nhân viên, Kế toán/Admin) và tác nhân dịch vụ bên thứ ba (Google Gemini AI Engine) đối với 11 ca sử dụng chính của hệ thống:


*Hình 9. Sơ đồ Use Case Tổng quan Hệ thống Quản lý Căn hộ (4 Tác nhân + AI Engine)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Khách vãng lai (Guest) | Thực hiện UC001: Tìm kiếm & Đặt phòng trực tuyến; Đăng nhập tài khoản. | Tác nhân ngoài |
| Cư dân (Tenant) | Thực hiện UC002: Quản lý thông tin cư dân; UC005: Báo hỏng thiết bị; UC006: Thanh toán hóa đơn; UC011: Hỏi đáp nội quy. | Tác nhân nội bộ |
| Nhân viên (Staff) | Thực hiện UC003: Quản lý căn hộ & tòa nhà; UC004: Lập hợp đồng & thu cọc; Phân công bảo trì. | Tác nhân vận hành |
| Kế toán / Quản trị | Thực hiện UC006: Quản lý tài chính; UC007: Cảnh báo tự động; UC008: Thống kê báo cáo; UC009: Phân quyền RBAC. | Tác nhân quản lý |
| AI Service Engine | Thực hiện UC010: AI Tóm tắt hợp đồng; UC011: Chatbot RAG tra cứu nội quy. | Dịch vụ AI bên ngoài |


### 3.3.3. Biểu đồ trình tự (Sequence Diagrams) cho các quy trình cốt lõi

Biểu đồ trình tự mô tả chi tiết chuỗi thông điệp trao đổi theo trục thời gian giữa 4 thành phần: Tác nhân người dùng -> Giao diện người dùng (UI) -> Máy chủ dịch vụ (Server) -> Cơ sở dữ liệu (Database):


*Hình 10. Biểu đồ trình tự Quy trình Đăng nhập & Xác thực phân quyền JWT/RBAC*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. Tác nhân | Người dùng hệ thống (Admin, Staff, Accountant, Tenant). | Actor |
| 2. Mục đích | Xác thực thông tin tài khoản, cấp phát mã phiên làm việc JWT Token và phân quyền vai trò. | Authentication |
| 3. Tiền điều kiện | Người dùng đã có tài khoản hoạt động trong bảng users của CSDL. | Pre-condition |
| 4. Luồng chính | Người dùng nhập Email/Mật khẩu -> UI gửi POST /api/auth/login -> Server kiểm tra bảng users và roles -> Băm mật khẩu đối chiếu BCrypt -> Sinh JWT Token chứa thông tin vai trò -> Trả về Client lưu Token. | Main Flow |
| 5. Luồng ngoại lệ | Email không tồn tại hoặc mật khẩu sai -> Server trả về HTTP 401 Unauthorized -> UI hiển thị thông báo lỗi. | Exception Flow |
| 6. Kết quả | Người dùng đăng nhập thành công và được điều hướng chính xác vào phân hệ chức năng tương ứng. | Post-condition |


*Hình 11. Biểu đồ trình tự Quy trình Tìm kiếm & Đặt giữ chỗ căn hộ trực tuyến*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. Tác nhân | Khách ang vãng lai (Guest). | Actor |
| 2. Mục đích | Tìm kiếm căn hộ ưng ý và gửi yêu cầu đặt cọc giữ chỗ trực tuyến. | Booking Flow |
| 3. Tiền điều kiện | Căn hộ có trạng thái AVAILABLE trong hệ thống. | Pre-condition |
| 4. Luồng chính | Khách xem chi tiết căn hộ -> Bấm Đặt phòng -> Nhập họ tên, SĐT, ngày vào ở -> Gửi POST /api/bookings -> Server kiểm tra bảng apartments và bookings (không trùng ngày) -> Tạo bản ghi mới trạng thái PENDING -> Trả về mã đặt chỗ. | Main Flow |
| 5. Luồng ngoại lệ | Căn hộ đã có người đặt trước trong khoảng thời gian đó -> Server từ chối -> UI hiển thị thông báo phòng đã được giữ. | Exception Flow |
| 6. Kết quả | Yêu cầu đặt chỗ được lưu vào cơ sở dữ liệu và thông báo cho nhân viên quản lý phê duyệt. | Post-condition |


*Hình 12. Biểu đồ trình tự Quy trình Lập và Ký kết hợp đồng thuê căn hộ*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. Tác nhân | Nhân viên quản lý (Staff) hoặc Quản trị viên (Admin). | Actor |
| 2. Mục đích | Lập và ký kết hợp đồng thuê căn hộ chính thức cho khách thuê. | Contract Lifecycle |
| 3. Tiền điều kiện | Khách thuê đã có hồ sơ trong bảng tenants; căn hộ đang ở trạng thái AVAILABLE hoặc RESERVED. | Pre-condition |
| 4. Luồng chính | Nhân viên chọn căn hộ, chọn khách thuê, nhập thời hạn thuê, giá tiền, tiền cọc -> Gửi POST /api/contracts -> Server mở Database Transaction -> Tạo bản ghi CONTRACTS -> Tạo bản ghi DEPOSITS -> Cập nhật trạng thái căn hộ sang OCCUPIED -> Commit giao dịch. | Main Flow |
| 5. Luồng ngoại lệ | Lỗi dữ liệu hoặc trùng lặp mã hợp đồng -> Rollback giao dịch -> Báo lỗi cho nhân viên. | Exception Flow |
| 6. Kết quả | Hợp đồng được kích hoạt thành công, căn hộ chuyển sang trạng thái đang thuê (OCCUPIED). | Post-condition |


*Hình 13. Biểu đồ trình tự Quy trình Sinh hóa đơn dịch vụ & Tạo mã VietQR thanh toán*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. Tác nhân | Kế toán tài chính (Accountant) và Cư dân (Tenant). | Actor |
| 2. Mục đích | Phát hành hóa đơn định kỳ hàng tháng và sinh mã VietQR thanh toán tự động. | Billing & Payment |
| 3. Tiền điều kiện | Căn hộ đang có hợp đồng thuê có hiệu lực. | Pre-condition |
| 4. Luồng chính | Kế toán nhập số điện/nước -> Server tính tổng tiền dịch vụ -> Lưu bản ghi RECEIVABLES -> Cư dân mở Cổng cư dân xem hóa đơn -> Bấm Thanh toán -> Server sinh mã VietQR chuẩn NAPAS chứa số tài khoản, số tiền và mã hóa đơn -> Cư dân quét mã qua Mobile Banking. | Main Flow |
| 5. Luồng ngoại lệ | Hóa đơn đã được thanh toán trước đó -> Server từ chối sinh mã mới -> Báo hóa đơn đã hoàn tất. | Exception Flow |
| 6. Kết quả | Hóa đơn được phát hành và cư dân có thể thanh toán tức thì qua ngân hàng. | Post-condition |


*Hình 14. Biểu đồ trình tự Quy trình Tiếp nhận báo hỏng & Phân công kỹ thuật*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. Tác nhân | Cư dân (Tenant) và Nhân viên vận hành (Staff). | Actor |
| 2. Mục đích | Tiếp nhận thông báo hư hỏng trang thiết bị căn hộ và phân công kỹ thuật xử lý. | Maintenance Flow |
| 3. Tiền điều kiện | Cư dân đã đăng nhập và đang cư trú tại căn hộ tương ứng. | Pre-condition |
| 4. Luồng chính | Cư dân chụp ảnh, điền mô tả sự cố -> Gửi POST /api/maintenance -> Server lưu bản ghi MAINTENANCE_REQUESTS trạng thái PENDING -> Nhân viên xem danh sách sự cố -> Bấm Phân công kỹ thuật viên -> Cập nhật trạng thái sang IN_PROGRESS. | Main Flow |
| 5. Luồng ngoại lệ | Thiếu ảnh chụp hoặc mô tả không đầy đủ -> Client yêu cầu bổ sung thông tin. | Exception Flow |
| 6. Kết quả | Yêu cầu bảo trì được tiếp nhận và kỹ thuật viên được điều động xử lý kịp thời. | Post-condition |


*Hình 15. Biểu đồ trình tự Quy trình Tra cứu nội quy & Hỏi đáp Trợ lý ảo AI RAG Chatbot*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. Tác nhân | Cư dân (Tenant) hoặc Khách hàng vãng lai. | Actor |
| 2. Mục đích | Hỏi đáp tự động về nội quy tòa nhà, biểu phí dịch vụ 24/7 thông qua Trợ lý ảo AI. | RAG AI Service |
| 3. Tiền điều kiện | Tài liệu nội quy tòa nhà đã được cắt đoạn (Chunking) và lưu Vector Embeddings vào CSDL. | Pre-condition |
| 4. Luồng chính | Người dùng gửi câu hỏi -> Server tạo Vector Embedding cho câu hỏi -> Thực hiện truy vấn Cosine Similarity trên bảng DOCUMENT_CHUNKS -> Lấy top 3 đoạn nội quy liên quan nhất -> Gửi Prompt kèm ngữ cảnh sang Google Gemini API -> Gemini sinh câu trả lời -> Server trả về kết quả cho UI. | Main Flow |
| 5. Luồng ngoại lệ | Câu hỏi ngoài phạm vi nội quy tòa nhà -> AI phản hồi lịch sự từ chối và hướng dẫn liên hệ hotline ban quản lý. | Exception Flow |
| 6. Kết quả | Người dùng nhận được câu trả lời chính xác, trích dẫn đúng quy định nội quy tòa nhà. | Post-condition |


*Hình 16. Biểu đồ trình tự Quy trình Quản lý hồ sơ khách thuê & Người ở cùng*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. Tác nhân | Nhân viên quản lý (Staff). | Actor |
| 2. Mục đích | Kịch bản 1 (Thêm khách thuê):<br> Quản lý/NV nhập hồ sơ (CCCD, SĐT) ➔ UI gửi POST /tenantstenantId<br>Kịch bản 2 (Khóa/Mở tài khoản):<br> Quản lý/NV chọn đổi trạng thái tài khoản ➔ UI gửi PATCH /users/{id}/statusis_active<br>GET /tenants/{id}/history ➔ Server truy vấn hợp đồng & công nợ từ DB ➔ DB trả dữ liệu ➔ UI hiển thị chi tiết lịch sử thuê phòng. | Tenant Profile |
| 3. Tiền điều kiện | Nhân viên đã đăng nhập tài khoản có quyền truy cập. | Pre-condition |
| 4. Luồng chính | Nhân viên nhập CCCD, họ tên, SĐT, quê quán -> Gửi POST /api/tenants -> Server kiểm tra tính duy nhất của CCCD -> Lưu vào bảng TENANTS -> Lưu danh sách người liên hệ vào EMERGENCY_CONTACTS. | Main Flow |
| 5. Luồng ngoại lệ | Số CCCD đã tồn tại trong hệ thống -> Báo lỗi trùng lặp dữ liệu. | Exception Flow |
| 6. Kết quả | Hồ sơ khách thuê được lưu trữ đầy đủ phục vụ khai báo tạm trú và ký hợp đồng. | Post-condition |


*Hình 17. Biểu đồ trình tự Quy trình Báo cáo và Thống kê doanh thu*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. Tác nhân | Quản trị viên (Admin) hoặc Kế toán (Accountant). | Actor |
| 2. Mục đích | Tổng hợp và xem báo cáo tài chính, doanh thu thực thu, công nợ và tỷ lệ lấp đầy phòng. | Reporting Dashboard |
| 3. Tiền điều kiện | Người dùng có vai trò ADMIN hoặc ACCOUNTANT. | Pre-condition |
| 4. Luồng chính | Người dùng truy cập /admin/dashboard -> UI gửi GET /api/reports/finance -> Server tổng hợp dữ liệu từ PAYMENTS, RECEIVABLES, DEBT_LEDGER -> Trả về cấu trúc JSON -> UI vẽ biểu đồ trực quan. | Main Flow |
| 5. Luồng ngoại lệ | Không có dữ liệu trong kỳ báo cáo -> Hiển thị thông báo dữ liệu trống. | Exception Flow |
| 6. Kết quả | Ban lãnh đạo nắm bắt chính xác sức khỏe tài chính và hiệu suất vận hành của tòa nhà. | Post-condition |


### 3.3.4. Biểu đồ hoạt động (Activity Diagrams) cho các quy trình nghiệp vụ

Biểu đồ hoạt động mô tả chi tiết dòng điều khiển nghiệp vụ (Control Flow), các điểm rẽ nhánh quyết định (Decision Node), điểm đồng bộ hóa (Fork/Join) từ trạng thái bắt đầu (Initial Node) đến trạng thái kết thúc (Final Node):


*Hình 18. Biểu đồ hoạt động Quy trình Đăng nhập và Điều hướng phân quyền*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Bắt đầu | Người dùng mở form đăng nhập tại /login. | Initial Node |
| Nhập dữ liệu | Điền Email và Mật khẩu, nhấn Đăng nhập. | Action |
| Kiểm tra | Hệ thống xác thực thông tin tài khoản và đối chiếu mật khẩu băm. | Decision |
| Rẽ nhánh | Sai mật khẩu: Báo lỗi và cho nhập lại; Đúng: Cấp JWT và kiểm tra vai trò. | Branching |
| Điều hướng | TENANT -> /tenant-portal; ADMIN/STAFF/ACCOUNTANT -> /admin/dashboard. | Navigation |
| Kết thúc | Hoàn tất luồng đăng nhập an toàn. | Final Node |


*Hình 19. Biểu đồ hoạt động Quy trình Đặt phòng giữ chỗ trực tuyến*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Bắt đầu | Khách chọn căn hộ ưng ý và bấm nút Đặt phòng ngay. | Initial Node |
| Nhập thông tin | Nhập họ tên, số điện thoại, email và ngày dự kiến nhận phòng. | Action |
| Kiểm tra lịch | Hệ thống truy vấn kiểm tra căn hộ có bị trùng lịch hoặc đã có khách khác đặt chưa. | Decision |
| Xử lý giữ chỗ | Nếu hợp lệ: Tạo bản ghi Booking PENDING, khóa giữ chỗ tạm thời trong 24h. | Action |
| Kết thúc | Hiển thị thông báo đặt chỗ thành công và mã tra cứu cho khách hàng. | Final Node |


*Hình 20. Biểu đồ hoạt động Quy trình Quản lý Hợp đồng thuê và Tiền cọc*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Bắt đầu | Nhân viên bấm nút Lập hợp đồng mới trong trang quản trị. | Initial Node |
| Chọn thông tin | Chọn căn hộ trạng thái AVAILABLE, chọn hồ sơ khách thuê, nhập thời hạn. | Action |
| Tính toán cọc | Hệ thống tự động tính số tiền cọc (thường bằng 1 - 2 tháng tiền thuê). | Action |
| Ký kết & Duyệt | Nhân viên xác nhận ký kết; Server đổi trạng thái căn hộ sang OCCUPIED. | Decision |
| Tạo sổ cọc | Tạo bản ghi DEPOSITS để theo dõi tiền cọc cho đến khi thanh lý hợp đồng. | Action |
| Kết thúc | Hoàn tất kích hoạt hợp đồng thuê căn hộ. | Final Node |


*Hình 21. Biểu đồ hoạt động Quy trình Sinh hóa đơn và Thu phí VietQR*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Bắt đầu | Kế toán chọn kỳ thanh toán và nhập chỉ số công tơ điện nước mới. | Initial Node |
| Tính tiền | Hệ thống tính tiền điện, nước, phí dịch vụ dựa trên đơn giá cài đặt. | Action |
| Phát hành | Tạo bản ghi RECEIVABLES trạng thái UNPAID và gửi thông báo cho cư dân. | Action |
| Quét mã VietQR | Cư dân mở Cổng cư dân, hiển thị mã VietQR động và thực hiện quét mã chuyển khoản. | Payment Action |
| Gạch nợ | Kế toán xác nhận nhận tiền -> Hệ thống cập nhật trạng thái PAID và trừ sổ nợ. | Action |
| Kết thúc | Giao dịch thanh toán hoàn tất minh bạch. | Final Node |


*Hình 22. Biểu đồ hoạt động Quy trình Xử lý sự cố và Nghiệm thu bảo trì*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Bắt đầu | Cư dân phát hiện sự cố (rò nước, hỏng điều hòa) và gửi báo hỏng kèm ảnh. | Initial Node |
| Tiếp nhận | Nhân viên kiểm tra mức độ khẩn cấp (Thấp, Trung bình, Khẩn cấp). | Action |
| Phân công | Chỉ định kỹ thuật viên chuyên trách và lên lịch hẹn sửa chữa. | Action |
| Sửa chữa & Chi phí | Thợ kỹ thuật sửa xong, ghi nhận chi phí vật tư thay thế. | Action |
| Nghiệm thu | Cư dân xác nhận sự cố đã khắc phục tốt -> Đóng yêu cầu bảo trì. | Decision |
| Kết thúc | Hoàn thành quy trình sửa chữa bảo trì. | Final Node |


*Hình 23. Biểu đồ hoạt động Quy trình Hỏi đáp nội quy tòa nhà với RAG Chatbot*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Bắt đầu | Người dùng mở cửa sổ Chatbot và gửi câu hỏi thắc mắc. | Initial Node |
| Vector hóa | Hệ thống chuyển đổi câu hỏi thành Vector Embedding 768 chiều. | Action |
| Tìm ngữ cảnh | Truy vấn bảng DOCUMENT_CHUNKS lấy các đoạn nội quy có độ tương đồng cao nhất. | Decision |
| Sinh văn bản | Đưa ngữ cảnh vào Prompt, gọi Gemini Flash để tổng hợp câu trả lời tự nhiên. | GenAI Action |
| Hiển thị | Chatbot trả lời người dùng kèm trích dẫn điều khoản cụ thể trong nội quy. | Action |
| Kết thúc | Người dùng nhận được giải đáp nhanh chóng 24/7. | Final Node |


*Hình 24. Biểu đồ hoạt động Quy trình Quản lý Căn hộ, Tòa nhà và Tiện ích*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Bắt đầu | Nhân viên mở phân hệ quản lý Tòa nhà & Căn hộ. | Initial Node |
| Thao tác danh mục | Chọn Thêm mới căn hộ, Chỉnh sửa thông tin hoặc Gán tiện ích (Điều hòa, Nóng lạnh). | Action |
| Kiểm tra hợp lệ | Xác thực số phòng không trùng lặp trong cùng tòa nhà, giá thuê dương. | Decision |
| Lưu dữ liệu | Hệ thống ghi nhận bản ghi APARTMENTS và AMENITIES vào cơ sở dữ liệu. | Action |
| Kết thúc | Danh mục căn hộ được cập nhật phục vụ kinh doanh. | Final Node |


*Hình 25. Biểu đồ hoạt động Quy trình Thống kê Dashboard và Cảnh báo AI*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Bắt đầu | Quản trị viên mở trang Dashboard Bảng điều khiển. | Initial Node |
| Thu thập số liệu | Hệ thống tự động quét tổng số phòng, phòng trống, tỷ lệ lấp đầy, doanh thu tháng. | Action |
| Quét rủi ro | Phát hiện hợp đồng sắp hết hạn trong 30 ngày và các khoản nợ quá hạn 15 ngày. | Decision |
| AI Đôn đốc | Kích hoạt mô hình AI sinh văn bản thông báo nhắc nợ gửi cho kế toán kiểm duyệt. | AI Action |
| Kết thúc | Dashboard hiển thị trực quan toàn bộ bức tranh vận hành. | Final Node |


### 3.3.5. Thiết kế lớp (Class Diagram / Sơ đồ UML)

Mô hình lớp (Class Diagram) tổng thể của hệ thống được chuẩn hóa hoàn toàn đồng bộ với Sơ đồ Thực thể - Mối quan hệ Cơ sở dữ liệu (ERD gồm 18 bảng dữ liệu chuẩn 3NF kèm Audit Log). Danh pháp các Lớp, Thuộc tính và Phương thức được đặt theo tiếng Anh chuẩn lập trình hướng đối tượng (OOP). Mô hình thể hiện đầy đủ 18 thực thể tham gia vào chu trình vận hành khép kín cùng các lớp tầng Service và Controller theo kiến trúc 3 tầng:


*Hình 26. Sơ đồ Lớp Tổng quan Hệ thống (Class Diagram Domain Model - 18 Classes)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Nhóm Quản trị Tài khoản | Role (vai trò RBAC), User (tài khoản người dùng mã hóa mật khẩu băm). | Authentication & RBAC |
| Nhóm Tòa nhà & Căn hộ | Building (tòa nhà), Apartment (căn hộ 4 trạng thái), Amenity (tiện ích nội thất). | Inventory Management |
| Nhóm Khách thuê & Cư dân | Tenant (hồ sơ khách thuê), EmergencyContact (người liên hệ khẩn cấp), Roommate (bạn ở cùng). | Tenant Profile |
| Nhóm Hợp đồng & Tài chính | Contract (hợp đồng thuê), Deposit (tiền cọc), Receivable (khoản thu), Payment (thanh toán), DebtLedger (sổ nợ). | Financial Transactions |
| Nhóm Vận hành & Trí tuệ AI | MaintenanceRequest (báo hỏng), Booking (đặt giữ chỗ), SystemAlert (cảnh báo nợ), DocumentChunk (vector RAG). | Operations & GenAI |
| Nhóm Nhật ký & An toàn Hệ thống | AuditLog: Ghi vết toàn bộ hành vi nhạy cảm, bảo vệ tính toàn vẹn và hỗ trợ kiểm toán an ninh. | Security & Audit Subsystem |

Đặc tả kỹ thuật các Lớp thực thể cốt lõi:

Mỗi lớp thực thể được thiết kế tương thích hoàn toàn với bảng cơ sở dữ liệu tương ứng, có đầy đủ các phương thức khởi tạo, nghiệp vụ và kiểm tra ràng buộc:

Thực thể Hợp đồng: Lớp Contract: Chứa các thuộc tính id, contract_code, apartment_id, tenant_id, start_date, end_date, rental_price, deposit_amount, status (DRAFT, ACTIVE, EXPIRED, TERMINATED). Phương thức: calculateDeposit(), activateContract(), renewContract(), terminateContract(), calculateDeduction().

Thực thể Căn hộ: Lớp Apartment: Chứa các thuộc tính id, building_id, room_number, floor, area_sqm, price, max_occupants, status (AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE). Phương thức: updateStatus(), checkAvailability(), getAmenitiesList(), assignTenant().

Thực thể Tài chính: Lớp Receivable & Payment: Chứa các thuộc tính quản lý kỳ thanh toán (billing_month, billing_year), tiền phòng, tiền điện, tiền nước, dịch vụ và phương thức thanh toán. Phương thức: calculateTotalAmount(), generateVietQR(), recordPayment(), updateDebtBalance().

Thực thể Tri thức AI: Lớp DocumentChunk: Chứa id, document_name, chunk_index, content, embedding (VECTOR 768 chiều). Phương thức: searchSimilarChunks(), extractContextForRAG().

Thực thể Nhật ký & An ninh: Lớp AuditLog: Chứa các thuộc tính id, user_id, action, endpoint, status_code, ip_address, user_agent, details, created_at. Phương thức: logActivity(), trackSecurityEvent(), getAuditTrail().


### 3.3.6. Biểu đồ triển khai hệ thống vật lý (Deployment Diagram)

Biểu đồ triển khai mô tả cấu trúc phần cứng và môi trường chạy thực tế của hệ thống phần mềm Dwell Living:


*Hình 27. Biểu đồ Triển khai Hệ thống Vật lý (Deployment Diagram)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Thiết bị Người dùng (Client Device) | Chạy trình duyệt Web (Chrome, Edge, Safari) trên PC, Laptop hoặc Smartphone; giao tiếp qua giao thức HTTPS. | Client Node |
| Máy chủ Web & API (Application Server) | Chạy môi trường Python 3.11+, FastAPI Framework, máy chủ ASGI Uvicorn, SQLAlchemy 2.0 async ORM, Nginx Reverse Proxy. | Application Server Node |
| Máy chủ Cơ sở dữ liệu (Database Server) | Chạy PostgreSQL 16 Database Server kèm pgvector extension; ổ đĩa lưu trữ SSD chuẩn NVMe đảm bảo tốc độ đọc ghi. | Database Node |
| Đám mây Google Cloud AI (Cloud AI Service) | Kết nối tới Google Gemini API qua giao thức gRPC/REST bảo mật để xử lý các tác vụ suy luận GenAI. | External Cloud Service |


### 3.3.7. Thực thể liên kết ERD (Lược đồ CSDL 18 bảng chuẩn 3NF kèm Audit Log)

Cơ sở dữ liệu của hệ thống được thiết kế chuẩn hóa đạt dạng chuẩn 3 (3NF - Third Normal Form), loại bỏ hoàn toàn các phụ thuộc bắc cầu và dư thừa dữ liệu. Cấu trúc gồm 18 bảng dữ liệu quan hệ chặt chẽ (bổ sung bảng audit_logs lưu vết toàn bộ hoạt động hệ thống):


*Hình 28. Lược đồ Cơ sở Dữ liệu Quan hệ ERD 18 Bảng (pgAdmin 4 — qlch_db chuẩn 3NF kèm Audit Log)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| 1. roles & users | Bảng vai trò và bảng tài khoản người dùng hệ thống; quan hệ 1-N (Một vai trò có nhiều tài khoản). | Auth Subsystem |
| 2. buildings, apartments, amenities | Quản lý tòa nhà, căn hộ (FK building_id) và tiện ích nội thất (FK apartment_id). | Apartment Subsystem |
| 3. tenants, roommates, emergency_contacts | Hồ sơ khách thuê chính, danh sách người ở cùng và thông tin liên hệ khẩn cấp. | Tenant Subsystem |
| 4. contracts, deposits | Quản lý hợp đồng thuê và sổ tiền cọc (FK contract_id); quan hệ 1-1 và 1-N. | Contract Subsystem |
| 5. receivables, payments, debt_ledger | Hóa đơn dịch vụ hàng tháng, các giao dịch thanh toán thực tế và sổ theo dõi công nợ lũy kế. | Finance Subsystem |
| 6. maintenance_requests, bookings | Yêu cầu sửa chữa thiết bị của cư dân và yêu cầu đặt cọc giữ chỗ trực tuyến từ khách vãng lai. | Operations Subsystem |
| 7. system_alerts, document_chunks | Bảng lưu vết cảnh báo hệ thống tự động và bảng lưu Vector Embeddings phục vụ RAG Chatbot. | AI Subsystem |
| 8. audit_logs | Bảng lưu vết an ninh, lịch sử truy cập và nhật ký thao tác dữ liệu nhạy cảm của người dùng và hệ thống. | Security & Audit Subsystem |


## 3.4. Thiết kế dữ liệu và Thuật toán cốt lõi


### 3.4.1. Thuật toán Xác thực JWT và Kiểm tra quyền hạn RBAC

Mọi yêu cầu gọi API vào các tài nguyên quản trị đều phải đi qua Middleware xác thực và phân quyền:

Bước 1: Client gửi Access Token trong HTTP Header: Authorization: Bearer <token>.

Bước 2: Server sử dụng Secret Key giải mã chữ ký JWT; nếu token hết hạn hoặc chữ ký không hợp lệ -> Trả về HTTP 401 Unauthorized.

Bước 3: Trích xuất thông tin vai trò (role_code) từ Payload của Token -> Đối chiếu với danh sách các vai trò được phép truy cập tài nguyên (ví dụ: ['ADMIN', 'STAFF']).

Bước 4: Nếu vai trò hợp lệ: Cho phép chuyển tiếp vào Controller xử lý; nếu không đủ quyền: Trả về HTTP 403 Forbidden.


*Hình 29. Sơ đồ Thuật toán Kiểm tra quyền hạn vai trò RBAC & Xác thực JWT*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Đầu vào (Input) | HTTP Request chứa JWT Token tại Authorization Header, Đường dẫn tài nguyên yêu cầu (API Endpoint). | Dữ liệu đầu vào |
| Xử lý (Process) | Giải mã chữ ký số JWT -> Trích xuất vai trò người dùng -> So khớp ma trận quyền RBAC. | Quy trình giải thuật |
| Đầu ra (Output) | Tiếp tục thực thi Controller (nếu hợp lệ) hoặc từ chối truy cập 401/403. | Kết quả kiểm tra |


### 3.4.2. Thuật toán Kiểm tra xung đột giữ chỗ căn hộ (Booking Collision Check)

Khi khách hàng gửi yêu cầu đặt phòng trực tuyến, hệ thống thực thi thuật toán kiểm tra xung đột để ngăn chặn hiện tượng đặt trùng phòng (Double Booking):

Điều kiện kiểm tra: Căn hộ A chỉ được chấp nhận đặt cọc mới nếu trạng thái hiện tại là AVAILABLE và không tồn tại bất kỳ bản ghi Booking nào trong bảng bookings có apartment_id = A, status IN ('PENDING', 'CONFIRMED') và có khoảng thời gian nhận phòng giao thoa với ngày khách chọn trong vòng 24 giờ. Cơ chế Database Transaction với Isolation Level Read Committed được kích hoạt để đảm bảo tính toàn vẹn tuyệt đối.


### 3.4.3. Thuật toán Tính toán phí dịch vụ và Sinh mã VietQR động

Quy trình sinh hóa đơn hàng tháng được tự động hóa hoàn toàn bằng công thức:

Công thức: Tổng tiền dịch vụ = (Chỉ số điện mới - Chỉ số điện cũ) * Đơn giá điện + (Chỉ số nước mới - Chỉ số nước cũ) * Đơn giá nước + Phí quản lý cố định + Phí gửi xe.

Sau khi lưu bản ghi RECEIVABLES, hàm sinh mã VietQR tiến hành mã hóa thông tin thanh toán theo chuẩn EMVCo và NAPAS (Bao gồm Bank BIN: 970422 - MBBank, Số tài khoản thụ hưởng, Số tiền cần nộp, và Nội dung chuyển khoản theo cú pháp chuẩn: CH[Số_phòng] T[Tháng]/[Năm] [Mã_HĐ]). Khi cư dân quét mã, ứng dụng ngân hàng sẽ tự động điền chính xác 100% các trường thông tin, loại bỏ hoàn toàn sai sót do nhập tay.


### 3.4.4. Thuật toán Tìm kiếm ngữ nghĩa Semantic Search & Prompt RAG Chatbot

Hệ thống áp dụng mô hình Retrieval-Augmented Generation (RAG) qua 3 bước chặt chẽ:

Giai đoạn lập chỉ mục (Indexing): Tài liệu nội quy tòa nhà được phân tách thành các đoạn văn bản (Chunks) từ 300 - 500 ký tự với độ gối đầu (Overlap) 50 ký tự; chuyển đổi thành Vector 768 chiều và lưu vào bảng DOCUMENT_CHUNKS.

Giai đoạn truy xuất (Retrieval): Khi người dùng đặt câu hỏi, Server tạo Vector Embedding cho câu hỏi và thực hiện truy vấn khoảng cách Cosine trên PostgreSQL: SELECT content FROM document_chunks ORDER BY embedding <=> query_vector LIMIT 3.

Giai đoạn sinh văn bản (Generation): Đưa các đoạn nội quy tìm được vào khung Prompt mẫu của hệ thống: "Bạn là trợ lý ảo Dwell Living. Hãy chỉ sử dụng các thông tin nội quy sau đây để trả lời câu hỏi của cư dân. Tuyệt đối không suy diễn..." -> Gọi Google Gemini API để sinh câu trả lời ngắn gọn, lịch sự.


# CHƯƠNG 4. CÀI ĐẶT DEMO VÀ KIỂM THỬ HỆ THỐNG


## 4.1. Ngôn ngữ lập trình và Môi trường phát triển

Backend Framework & SDK: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2.0 (async), Pydantic v2, PyJWT, bcrypt, pgvector, APScheduler, pytest, thư viện chính thức google-genai SDK.

Frontend UI Framework: React 19 (^19.0.0), Vite 6, TypeScript 5.7, Tailwind CSS 3.4, Redux Toolkit (^2.6.0), React Router v7 (^7.2.0), Lucide React Icons (sử dụng native fetch API).

Hệ quản trị CSDL: PostgreSQL 16 RDBMS, pgvector extension, pgAdmin 4 công cụ quản trị giao diện.

Công cụ hỗ trợ phát triển: Visual Studio Code, Git, GitHub Repository, Postman API Testing, Draw.io thiết kế mô hình.


## 4.2. Giao diện Demo thực tế của hệ thống (Trích xuất toàn bộ 16 Màn hình cốt lõi)

Dưới đây là hình ảnh chụp giao diện thực tế của hệ thống phần mềm Dwell Living đang hoạt động ổn định trên toàn bộ các phân hệ từ Quản trị, Kế toán, Nhân viên vận hành đến Cổng thông tin Cư dân và Khách hàng vãng lai (trích xuất đầy đủ từ tài liệu hướng dẫn vận hành hệ thống):


*Hình 30. Giao diện Đăng nhập Hệ thống & Xác thực Đa vai trò RBAC (UC009)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Đăng nhập Hệ thống & Xác thực Đa vai trò RBAC (UC009) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Màn hình đăng nhập bảo mật hỗ trợ xác thực 4 vai trò: Admin, Staff, Accountant, Tenant. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 31. Màn hình Báo cáo Thống kê, Doanh thu & Dashboard KPI Tổng quan (UC010)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Màn hình Báo cáo Thống kê, Doanh thu & Dashboard KPI Tổng quan (UC010) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Dashboard trực quan hóa doanh thu theo tháng, tỷ lệ lấp đầy phòng và các sự cố tồn đọng. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 32. Giao diện Quản lý Danh mục Tòa nhà, Căn hộ & Trạng thái Phòng (UC007)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Quản lý Danh mục Tòa nhà, Căn hộ & Trạng thái Phòng (UC007) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Quản lý tòa nhà, số tầng, số phòng và cập nhật trạng thái AVAILABLE/OCCUPIED/MAINTENANCE. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 33. Giao diện Chi tiết Hợp đồng & Trợ lý AI Summarizer Tóm tắt Điều khoản (UC001, UC002)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Chi tiết Hợp đồng & Trợ lý AI Summarizer Tóm tắt Điều khoản (UC001, UC002) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Trang xem hợp đồng pháp lý tích hợp AI Gemini trích xuất 5 điều khoản trọng yếu trong 10 giây. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 34. Giao diện Quản lý Hồ sơ Khách thuê & Danh sách Người ở cùng phòng (UC008)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Quản lý Hồ sơ Khách thuê & Danh sách Người ở cùng phòng (UC008) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Quản lý hồ sơ CCCD, số điện thoại, quê quán và danh sách người ở cùng phục vụ tạm trú. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 35. Biểu mẫu Lập Hợp đồng Thuê mới & Cấu hình Tiền cọc (UC001)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Biểu mẫu Lập Hợp đồng Thuê mới & Cấu hình Tiền cọc (UC001) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Form lập hợp đồng thuê mới, tự động tính tiền cọc và chuyển phòng sang OCCUPIED. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 36. Giao diện Tiếp nhận & Nghiệm thu Bảo trì Kỹ thuật Sự cố (UC004)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Tiếp nhận & Nghiệm thu Bảo trì Kỹ thuật Sự cố (UC004) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Tiếp nhận thông báo sự cố hỏng hóc từ cư dân, phân công thợ và nghiệm thu chi phí vật tư. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 37. Biểu mẫu Sinh Khoản thu Định kỳ Hàng loạt & Ghi nhận Thanh toán (UC003)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Biểu mẫu Sinh Khoản thu Định kỳ Hàng loạt & Ghi nhận Thanh toán (UC003) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Chốt số điện nước, hệ thống tự động tính tiền dịch vụ và sinh hóa đơn tháng hàng loạt. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 38. Giao diện Quét Cảnh báo Tự động & AI Soạn thảo Thông báo Đôn đốc Nợ (UC005)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Quét Cảnh báo Tự động & AI Soạn thảo Thông báo Đôn đốc Nợ (UC005) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Tự động phát hiện nợ quá hạn và hợp đồng sắp hết hạn; AI soạn tin nhắn nhắc nợ lịch sự. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 39. Giao diện Khám phá & Tìm kiếm Căn hộ Trống Trực tuyến (Customer Portal)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Khám phá & Tìm kiếm Căn hộ Trống Trực tuyến (Customer Portal) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Cổng thông tin cho khách vãng lai tìm kiếm, lọc phòng theo giá, diện tích và đặt giữ chỗ. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 40. Giao diện Văn phòng Hợp đồng Số & AI Summarizer Studio cho Cư dân*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Văn phòng Hợp đồng Số & AI Summarizer Studio cho Cư dân | Giao diện người dùng |
| Đặc tả nghiệp vụ | Cư dân xem chi tiết hợp đồng điện tử của căn hộ đang thuê và xem tóm tắt AI trực quan. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 41. Màn hình Tra cứu Hóa đơn Tiện ích Hàng tháng & Quét mã VietQR Napas*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Màn hình Tra cứu Hóa đơn Tiện ích Hàng tháng & Quét mã VietQR Napas | Giao diện người dùng |
| Đặc tả nghiệp vụ | Cư dân tra cứu tiền điện, nước, phí dịch vụ và thanh toán tức thì qua mã VietQR chuẩn Napas. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 42. Sổ cái Thanh toán Cư dân & Bản hiển thị Phiếu thu Điện tử Hợp lệ*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Sổ cái Thanh toán Cư dân & Bản hiển thị Phiếu thu Điện tử Hợp lệ | Giao diện người dùng |
| Đặc tả nghiệp vụ | Hiển thị lịch sử các lần thanh toán tiền nhà, xuất phiếu thu điện tử có giá trị đối soát. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 43. Giao diện Báo cáo Sự cố & Theo dõi Tiến độ Sửa chữa của Cư dân*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Báo cáo Sự cố & Theo dõi Tiến độ Sửa chữa của Cư dân | Giao diện người dùng |
| Đặc tả nghiệp vụ | Cư dân gửi yêu cầu sửa chữa thiết bị hư hại kèm hình ảnh hiện trường và theo dõi tiến độ. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 44. Màn hình Nghiệm thu Sửa chữa & Đánh giá Chất lượng Dịch vụ 5 Sao*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Màn hình Nghiệm thu Sửa chữa & Đánh giá Chất lượng Dịch vụ 5 Sao | Giao diện người dùng |
| Đặc tả nghiệp vụ | Cư dân nghiệm thu kết quả sửa chữa của thợ kỹ thuật và đánh giá chất lượng phục vụ. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


*Hình 45. Giao diện Tương tác với Trợ lý Chatbot AI RAG Tra cứu Nội quy 24/7 (UC006)*


| Thành phần / Tác nhân | Ý nghĩa / Luồng tương tác | Ghi chú kỹ thuật |
| --- | --- | --- |
| Màn hình hiển thị | Giao diện Tương tác với Trợ lý Chatbot AI RAG Tra cứu Nội quy 24/7 (UC006) | Giao diện người dùng |
| Đặc tả nghiệp vụ | Cửa sổ Chatbot AI thông minh trả lời mọi câu hỏi về nội quy tòa nhà, giờ giấc, rác thải 24/7. | Nghiệp vụ chức năng |
| Công nghệ giao diện | React 19 SPA, Redux Toolkit, Tailwind CSS, Responsive Web Design. | Client-side Component |


## 4.3. Kiểm thử hệ thống (Software Testing)

Quá trình kiểm thử được thực hiện nghiêm ngặt bằng phương pháp Kiểm thử Hộp đen (Black-Box Testing) kết hợp Kiểm thử Tích hợp (Integration Testing) trên toàn bộ các ca sử dụng. Trích xuất bảng kết quả 25 Test Cases trọng tâm từ tài liệu kiểm thử chi tiết:


*Bảng 6. Bảng tổng hợp kết quả 25 Test Cases kiểm thử chức năng và tích hợp hệ thống*


| Mã TC | Tên ca kiểm thử | Các bước thực hiện | Dữ liệu kiểm thử | Kết quả mong đợi | Thực tế |
| --- | --- | --- | --- | --- | --- |
| TC01 | Đăng nhập hợp lệ (Admin) | Nhập Email, Mật khẩu đúng -> Bấm Đăng nhập. | admin@dwell.com / Admin@123 | Đăng nhập thành công, chuyển hướng vào /admin/dashboard. | Đạt (Pass) |
| TC02 | Đăng nhập sai mật khẩu | Nhập Email đúng, Mật khẩu sai -> Bấm Đăng nhập. | admin@dwell.com / SaiMatKhau | Báo lỗi HTTP 401, hiển thị thông báo mật khẩu không chính xác. | Đạt (Pass) |
| TC03 | Kiểm soát phân quyền RBAC | Tài khoản TENANT truy cập trực tiếp URL /admin/finance. | JWT role = TENANT | Chặn truy cập, tự động chuyển hướng sang trang /unauthorized (403). | Đạt (Pass) |
| TC04 | Tìm kiếm lọc căn hộ | Chọn khoảng giá từ 5 - 10 triệu, diện tích > 30m2. | price: 5M-10M, area >= 30 | Lưới hiển thị đúng các căn hộ thỏa mãn bộ lọc. | Đạt (Pass) |
| TC05 | Đặt phòng trực tuyến hợp lệ | Chọn phòng AVAILABLE, nhập họ tên, SĐT, ngày vào ở. | P.302, Nguyễn Văn A, 0912345678 | Tạo bản ghi Booking PENDING, trả về mã đặt phòng thành công. | Đạt (Pass) |
| TC06 | Check trùng phòng đặt cọc | Hai khách hàng đặt cùng một phòng trong cùng ngày. | P.302, Khách A và Khách B | Khách A đặt thành công; Khách B nhận thông báo phòng đang giữ chỗ. | Đạt (Pass) |
| TC07 | Lập hợp đồng thuê mới | Chọn phòng P.302, chọn khách thuê, thời hạn 12 tháng. | Giá 7.5 triệu, Cọc 15 triệu | Tạo hợp đồng ACTIVE, phòng chuyển sang OCCUPIED. | Đạt (Pass) |
| TC08 | Tự động tính cọc | Nhập giá thuê phòng 8,000,000 VNĐ. | Thời hạn thuê 6 tháng | Tiền cọc mặc định tự động gợi ý = 16,000,000 VNĐ (2 tháng tiền nhà). | Đạt (Pass) |
| TC09 | Chốt số điện nước sinh hóa đơn | Nhập số điện cũ: 120, mới: 250; số nước cũ: 15, mới: 25. | Đơn giá: Điện 3.5k/kWh, Nước 25k/m3 | Sinh hóa đơn RECEIVABLES với tổng tiền chính xác = 705,000 VNĐ. | Đạt (Pass) |
| TC10 | Tạo mã VietQR thanh toán | Bấm xem mã QR thanh toán trên hóa đơn vừa tạo. | Hóa đơn ID: REC_0012, 8.2 triệu | Hiển thị mã QR chuẩn NAPAS chứa đúng STK, số tiền và nội dung. | Đạt (Pass) |
| TC11 | Xác nhận thanh toán hóa đơn | Kế toán bấm nút Xác nhận thanh toán qua ngân hàng. | Giao dịch PAY_9981 | Hóa đơn chuyển sang PAID, cập nhật số dư nợ trong DEBT_LEDGER = 0. | Đạt (Pass) |
| TC12 | Cư dân gửi báo hỏng thiết bị | Điền mô tả hỏng máy giặt, đính kèm ảnh chụp hiện trường. | Phòng P.201, ảnh may_giat_hong.jpg | Tạo yêu cầu bảo trì PENDING, hiển thị trên trang quản trị. | Đạt (Pass) |
| TC13 | Phân công kỹ thuật bảo trì | Nhân viên chọn thợ sửa và bấm Phân công nhiệm vụ. | Thợ điện nước: Nguyễn Văn Thợ | Trạng thái chuyển sang IN_PROGRESS, gửi thông báo cho thợ. | Đạt (Pass) |
| TC14 | Nghiệm thu đóng bảo trì | Cập nhật chi phí sửa chữa 350,000 VNĐ và bấm Hoàn tất. | Chi phí vật tư: 350,000 VNĐ | Trạng thái chuyển RESOLVED, chi phí lưu vào sổ tài chính. | Đạt (Pass) |
| TC15 | Tự động quét cảnh báo nợ | Kích hoạt chức năng quét công nợ tự động trên hệ thống. | Quét hóa đơn quá hạn > 5 ngày | Tạo cảnh báo SYSTEM_ALERTS loại OVERDUE_INVOICE. | Đạt (Pass) |
| TC16 | Cảnh báo hợp đồng sắp hết hạn | Quét các hợp đồng có end_date trong vòng 30 ngày tới. | Hợp đồng P.401 còn 20 ngày | Phát cảnh báo EXPIRING_CONTRACT trên Dashboard ban quản lý. | Đạt (Pass) |
| TC17 | AI Tóm tắt hợp đồng thuê | Chọn hợp đồng pháp lý dài 4 trang và bấm Tóm tắt AI. | File hợp đồng scan PDF/Text | Gemini trích xuất chính xác 5 điều khoản: Hạn, Giá, Cọc, Chấm dứt, Phạt. | Đạt (Pass) |
| TC18 | AI Soạn tin nhắn đôn đốc nợ | Bấm nút Soạn nhắc nợ AI cho khách thuê quá hạn 10 ngày. | Phòng P.102, nợ 8,500,000 VNĐ | AI sinh nội dung tin nhắn lịch sự, đầy đủ số tài khoản và hạn chót. | Đạt (Pass) |
| TC19 | RAG Chatbot hỏi nội quy giờ giấc | Cư dân gửi câu hỏi: 'Tòa nhà đóng cửa lúc mấy giờ?'. | Câu hỏi văn bản tự nhiên | Chatbot trả lời: Tòa nhà khóa cửa lúc 23h00 theo Điều 3 Nội quy. | Đạt (Pass) |
| TC20 | RAG Chatbot hỏi ngoài phạm vi | Khách hỏi: 'Thời tiết ngày mai ở Hà Nội thế nào?'. | Câu hỏi ngoài nội quy | Chatbot từ chối lịch sự và hướng dẫn hỏi về quy định căn hộ. | Đạt (Pass) |
| TC21 | Thêm người ở cùng căn hộ | Cư dân thêm bạn cùng phòng trong Cổng cư dân. | Họ tên: Trần Thị B, CCCD: 00123... | Lưu bản ghi ROOMMATES liên kết đúng apartment_id của cư dân. | Đạt (Pass) |
| TC22 | Xóa người ở cùng | Cư dân bấm Xóa bạn cùng phòng đã chuyển đi. | Roommate ID: 5 | Xóa bản ghi thành công khỏi cơ sở dữ liệu. | Đạt (Pass) |
| TC23 | Thanh lý hợp đồng hoàn cọc | Nhân viên bấm Kết thúc hợp đồng, trừ tiền hỏng rèm 500k. | Tiền cọc: 10M, Khấu trừ: 500k | Hoàn trả khách 9.5 triệu, đổi phòng sang trạng thái CLEANING. | Đạt (Pass) |
| TC24 | Cập nhật tiện ích căn hộ | Bổ sung tiện ích 'Tủ lạnh Inverter 300L' vào phòng P.501. | Amenity: Refrigerator | Lưu vào AMENITIES, hiển thị trên giao diện khám phá phòng. | Đạt (Pass) |
| TC25 | Hiển thị biểu đồ Dashboard | Admin xem trang Dashboard thống kê. | Dữ liệu thực tế 18 bảng chuẩn 3NF | Hiển thị đầy đủ biểu đồ cột doanh thu 6 tháng và tỷ lệ lấp đầy 85%. | Đạt (Pass) |


### 4.3.2. Thực nghiệm so sánh 3 phiên bản Prompt (Prompt Engineering Evaluation)

Để chứng minh phương pháp luận khoa học và tinh thần kỹ nghệ phần mềm nghiêm túc (đáp ứng tiêu chí CLO3, CLO4), nhóm đã tiến hành thực nghiệm so sánh độc lập 3 phiên bản Prompt Engineering trên cùng một tập 50 câu hỏi thử nghiệm của cư dân:


*Bảng 7. Bảng thực nghiệm so sánh định lượng 3 phiên bản Prompt AI của hệ thống*


| Tiêu chí đánh giá | Phiên bản 1 (v1 - Naive Prompt) | Phiên bản 2 (v2 - Few-Shot Prompt) | Phiên bản 3 (v3 - Production Guardrails) |
| --- | --- | --- | --- |
| Cấu trúc Prompt | Chỉ đưa yêu cầu mộc: 'Hãy trả lời câu hỏi nội quy này...' | Bổ sung 2 ví dụ mẫu Q&A vào ngữ cảnh | System Instruction ranh giới nghiêm ngặt + Dynamic Context Chunks + Masking PII |
| Tỷ lệ Ảo giác (Hallucination) | 34.0% (Tự suy diễn khi thiếu văn bản) | 12.0% (Giảm nhưng vẫn có sai lệch nhỏ) | 0.0% (Bám sát 100% văn bản nguồn; từ chối khi không có ngữ cảnh) |
| Bảo vệ dữ liệu riêng tư (PII) | Kém (Có thể bị lừa đọc dữ liệu khách khác) | Trung bình (Khó bị lừa nhưng chưa triệt để) | Tuyệt đối (Cơ chế Masking PII + Chặn Prompt Injection) |
| Định dạng câu trả lời | Dài dòng, không đồng nhất độ dài | Ngắn hơn nhưng đôi khi quá cộc lốc | Đúng chuẩn 3 gạch đầu dòng, kèm trích dẫn Điều khoản số và Trang tài liệu |
| Thời gian phản hồi (Latency) | 1.1 giây / lượt truy vấn | 1.4 giây / lượt truy vấn | 0.95 giây / lượt truy vấn (Mô hình Gemini 3.8 Flash tối ưu) |
| Đánh giá nghiệm thu | Không đạt chuẩn triển khai | Đạt mức thử nghiệm nội bộ | Đạt xuất sắc - Được chọn làm bản Production chính thức |


### 4.3.3. Xử lý lỗi AI và Cơ chế dự phòng (AI Fallback & Resilience)

Nhằm đảm bảo hệ thống vận hành liên tục 24/7 không bị gián đoạn khi nhà cung cấp dịch vụ đám mây gặp sự cố mạng hoặc vượt hạn mức (Quota Rate Limit), nhóm đã cài đặt cơ chế dự phòng Fallback tự động:

Cơ chế Chuyển mạch Dự phòng (Circuit Breaker): Nếu kết nối tới Google Gemini API vượt quá thời gian chờ (Timeout 10 giây) hoặc nhận mã lỗi 429 (Rate Limit Exceeded), hệ thống tự động bắt ngoại lệ (Exception Handling) và chuyển sang sử dụng bộ mẫu thông báo tất định (Static Template Engine) soạn sẵn theo chuẩn pháp lý.

Ghi nhật ký sự cố chi tiết (Logging & Telemetry): Mọi lỗi phát sinh trong quá trình gọi AI đều được ghi vết vào bảng AUDIT_LOGS và file nhật ký máy chủ kèm mã lỗi chi tiết để đội ngũ kỹ thuật khắc phục mà không làm ảnh hưởng đến trải nghiệm của cư dân.


### 4.3.4. Bảo mật dữ liệu và Quản lý Khóa API (Security & Data Protection)

Hệ thống tuân thủ các tiêu chuẩn bảo mật dữ liệu hiện đại của ngành công nghệ phần mềm:

Bảo mật Khóa Bí mật: Mã khóa GEMINI_API_KEY và JWT_SECRET được lưu độc quyền trong file .env trên máy chủ Backend, được bảo vệ qua file .gitignore không bao giờ được phép đẩy lên kho mã nguồn GitHub.

Xác thực và Ủy quyền chuẩn mực: Toàn bộ mật khẩu người dùng được băm một chiều bằng thuật toán Bcrypt với Salt Rounds = 10; phiên làm việc được xác thực bằng JWT Token có chữ ký số mã hóa HS256 và thời hạn hết hạn (TTL) 8 giờ.


## 4.4. Kế hoạch bảo trì và Đào tạo chuyển giao phần mềm

Để hệ thống vận hành bền vững sau khi bàn giao cho ban quản lý tòa nhà, nhóm đã xây dựng kế hoạch bảo trì và đào tạo bài bản:

Bảo trì sửa lỗi (Corrective Maintenance): Theo dõi các file log tại máy chủ, giám sát lỗi kết nối cơ sở dữ liệu và xử lý ngay trong vòng 2 giờ nếu xảy ra sự cố gián đoạn dịch vụ.

Bảo trì thích nghi (Adaptive Maintenance): Cập nhật các bản vá bảo mật cho Python FastAPI, thư viện React 19 và cập nhật phiên bản mô hình Google Gemini mới khi có thông báo từ nhà cung cấp.

Bảo trì hoàn thiện (Perfective Maintenance): Tối ưu hóa các câu truy vấn cơ sở dữ liệu thường dùng, đánh thêm chỉ mục (B-Tree Index) trên các cột tra cứu tần suất cao (contract_code, citizen_id).

Kế hoạch đào tạo: Tổ chức 2 buổi đào tạo trực tiếp cho ban quản lý tòa nhà và cung cấp tài liệu hướng dẫn sử dụng (User Guide) dạng PDF có hình ảnh minh họa chi tiết.


## 4.5. Minh chứng ứng dụng AI trong quy trình phát triển phần mềm (AI in SDLC)

Đáp ứng xuất sắc tiêu chí đánh giá môn học (CLO3, CLO4, CLO5), nhóm sinh viên đã ứng dụng tư duy kỹ nghệ phần mềm hiện đại bằng cách vận dụng AI Agent và Context Engineering xuyên suốt toàn bộ vòng đời phát triển phần mềm (SDLC):

1. Giai đoạn Phân tích Yêu cầu: Sử dụng AI hỗ trợ rà soát các lỗ hổng logic nghiệp vụ trong việc quản lý hợp đồng thuê và tiền cọc; chuẩn hóa 11 Ca sử dụng (Use Cases) theo mẫu chuẩn IEEE 830.

2. Giai đoạn Thiết kế Kiến trúc & Lập trình: Ứng dụng mô hình Context Engineering định hướng sinh mã nguồn chuẩn kiến trúc phân tầng 3-Tier; tự động hóa việc đồng bộ kiểu dữ liệu (Type-safe) giữa TypeScript Frontend và Pydantic/SQLAlchemy Backend.

3. Giai đoạn Kiểm thử và Tích hợp: Sinh tự động bộ 157 kịch bản kiểm thử (Test Cases) bao phủ đầy đủ các trường hợp Đúng, Sai, Biên và Ngoại lệ; xây dựng bộ kiểm thử hồi quy tự động (Regression Testing) bằng Pytest.

4. Giai đoạn Đóng gói và Vận hành: Xây dựng các rào chắn kiểm soát chất lượng mã nguồn (Linters, Type Checks) và bộ kịch bản khởi chạy tự động một chạm (run.bat) giúp triển khai sản phẩm dễ dàng trên mọi môi trường máy trạm.


## 4.6. Kiểm chứng và Sửa lỗi AI trong Vận hành (Human-in-the-loop Validation)

Hệ thống kiên định triết lý 'AI đóng vai trò trợ lý - Con người giữ quyền quyết định cuối cùng' (Human-in-the-loop):

Kiểm duyệt Thông báo Đôn đốc: Mọi nội dung thông báo đôn đốc nhắc nợ do AI soạn thảo đều được hiển thị dưới dạng bản nháp (Draft) trên giao diện AlertsAIPage. Nhân viên kế toán có toàn quyền chỉnh sửa câu từ, bổ sung số tài khoản hoặc điều chỉnh thời hạn trước khi bấm nút 'Gửi thông báo'.

Kiểm duyệt Tóm tắt Hợp đồng: Bản tóm tắt hợp đồng do AI sinh ra được đối chiếu song song với bản hợp đồng gốc; nhân viên quản lý có thể cập nhật lại các trường tóm tắt nếu phát hiện điều khoản bổ sung đặc thù giữa chủ nhà và khách thuê.


## 4.7. Đề cương kết thúc dự án và Đóng góp độc lập của từng sinh viên

Hai sinh viên thực hiện đề tài đã phối hợp làm việc nhóm hiệu quả, đồng thời thể hiện năng lực chuyên môn và tư duy phản biện độc lập vững vàng:

Sinh viên Lê Quang Khánh (Mã SV: DTC245180169): Chịu trách nhiệm thiết kế mô hình dữ liệu quan hệ ERD 18 bảng chuẩn 3NF chuẩn 3NF; lập trình toàn bộ Backend API (Python 3.11+, FastAPI, SQLAlchemy 2.0 async, Uvicorn, PostgreSQL 16, pgvector); xây dựng bộ kiểm thử tự động, kiểm thử đúng/sai/biên; đóng gói kịch bản triển khai run.bat và tổng hợp báo cáo kỹ thuật.

Sinh viên Nguyễn Thị Trang (Mã SV: DTC245180023): Chịu trách nhiệm thiết kế kiến trúc hệ thống tổng thể và phân quyền RBAC; lập trình toàn bộ giao diện Frontend (React 19, Vite 6, TypeScript, Redux Toolkit, Tailwind CSS 3.4); nghiên cứu tích hợp 3 tính năng AI (Gemini SDK); thiết kế và đánh giá thực nghiệm 3 phiên bản Prompt Engineering; xây dựng rào chắn an toàn dữ liệu riêng tư PII và chuẩn bị kịch bản thuyết trình bảo vệ trước hội đồng.


# KẾT LUẬN & HƯỚNG PHÁT TRIỂN TIẾP THEO

1. Kết quả đạt được của dự án

Trải qua 9 tuần nghiên cứu và phát triển nghiêm túc, Nhóm 12 đã hoàn thành toàn diện các mục tiêu đề ra cho Đề tài 12 - Hệ thống Quản lý thuê Căn hộ thông minh tích hợp Trí tuệ Nhân tạo:

Thành quả học thuật: Về mặt học thuật: Áp dụng đầy đủ và bài bản quy trình kỹ nghệ phần mềm từ khảo sát, phân tích yêu cầu (SRS), thiết kế kiến trúc 3 tầng, mô hình hóa hệ thống (Use Case, Sequence, Activity, Class, Deployment, ERD 18 bảng chuẩn 3NF, Screen Flow 5 phân luồng) đến kiểm thử hệ thống với 25 Test Cases đạt 100% tỷ lệ vượt qua.

Thành quả sản phẩm: Về mặt sản phẩm: Xây dựng thành công ứng dụng web Dwell Living hoàn chỉnh, giao diện responsive hiện đại, kết nối Backend RESTful API và Cơ sở dữ liệu PostgreSQL vận hành ổn định.

Thành quả công nghệ AI: Về mặt ứng dụng AI: Đột phá trong việc tích hợp thành công Google Gemini AI và PostgreSQL pgvector giải quyết 3 bài toán nghiệp vụ thực tiễn: Tóm tắt hợp đồng pháp lý, sinh văn bản đôn đốc công nợ tự động và Chatbot RAG tra cứu nội quy tòa nhà 24/7.

2. Hạn chế của hệ thống

Hạn chế phần cứng: Chưa tích hợp trực tiếp với phần cứng khóa cửa thông minh (Smart Lock IoT) để tự động cấp mã mở cửa khi hợp đồng có hiệu lực.

Hạn chế thanh toán: Cổng thanh toán VietQR hiện tại dựa trên cơ chế đối soát sao kê; chưa tích hợp Webhook thông báo tự động (IPN) của cổng thanh toán trung gian.

3. Hướng phát triển trong tương lai

Phát triển IoT: Nghiên cứu tích hợp hệ thống IoT công tơ điện nước thông minh tự động đọc chỉ số truyền về máy chủ qua sóng Zigbee/LoRa.

Phát triển Mobile App: Phát triển ứng dụng di động Native (React Native / Flutter) trên nền tảng iOS và Android để cư dân nhận thông báo Push Notification tức thì.

Mở rộng AI Đa phương thức: Nâng cấp mô hình AI đa phương thức (Multimodal AI) cho phép cư dân gửi video sự cố hỏng hóc để AI tự động nhận diện thiết bị và ước tính chi phí sửa chữa.


# TÀI LIỆU THAM KHẢO

Roger S. Pressman (2014), Software Engineering: A Practitioner's Approach, McGraw-Hill Education, 8th Edition.

Ian Sommerville (2015), Software Engineering, Pearson Education, 10th Edition.

IEEE Std 830-1998, IEEE Recommended Practice for Software Requirements Specifications, IEEE Computer Society.

Martin Fowler (2002), Patterns of Enterprise Application Architecture, Addison-Wesley Professional.

React Official Documentation (2026), https://react.dev/ - Modern UI Library with Hooks and Components.

FastAPI Official Documentation (2026), Modern, fast (high-performance), web framework for building APIs with Python, https://fastapi.tiangolo.com/

PostgreSQL 16 Documentation & pgvector Extension, https://www.postgresql.org/docs/16/ & https://github.com/pgvector/pgvector

Google Generative AI SDK Documentation (2026), Gemini Models and RAG Implementation Guide, Google Cloud.

VietQR Specification & Standard EMVCo QR Code for Payments, https://vietqr.net/
