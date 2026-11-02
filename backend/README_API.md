# HƯỚNG DẪN KHỞI CHẠY & DANH SÁCH API MODULE KHOẢN VAY (QUỸ TÍN DỤNG)

Hệ thống Backend xây dựng theo kiến trúc **Clean Architecture**, **Domain-Driven Design (DDD)** và **SOLID**, sử dụng **Node.js**, **TypeScript (Strict mode)**, **MongoDB** và **Prisma ORM**.

---

## 1. Cấu hình môi trường (.env)

Tạo hoặc kiểm tra file `.env` tại thư mục gốc:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="mongodb://localhost:27017/n_qtd"
JWT_SECRET=dev-secret-key-do-not-use-in-production
JWT_EXPIRES_IN=24h
API_PREFIX=/api/v1
LOG_LEVEL=debug
```

*(Nếu bạn dùng MongoDB Atlas hoặc replica set khác, chỉ cần thay đổi `DATABASE_URL` trong file `.env`)*

---

## 2. Các lệnh khởi chạy (CLI Scripts)

| Lệnh | Ý nghĩa |
|---|---|
| `npm run typecheck` | Kiểm tra toàn bộ TypeScript type (0 lỗi) |
| `npm run build` | Compile dự án từ TypeScript sang JavaScript (`dist/`) |
| `npm run prisma:generate` | Tạo Prisma Client từ schema |
| `npm run prisma:db-push` | Đồng bộ chỉ mục (Indexes) sang MongoDB |
| `npm run prisma:seed` | Nạp dữ liệu mẫu ban đầu (bảng lãi suất, giá đất, thành viên) |
| `npm run dev` | Khởi chạy server môi trường phát triển (tự động reload) |
| `npm start` | Chạy production build (`dist/server.js`) |

---

## 3. Tổng hợp danh sách API Endpoints (/api/v1)

### 3.1. Quản lý Thành viên (Member)
- `POST /api/v1/members`: Tạo thành viên mới (kiểm tra trùng mã thành viên, CCCD).
- `GET /api/v1/members`: Danh sách thành viên (tìm kiếm họ tên/mã/CCCD, phân trang).
- `GET /api/v1/members/:id`: Chi tiết thành viên.
- `PUT /api/v1/members/:id`: Cập nhật thông tin thành viên.

### 3.2. Bảng Lãi Suất (Interest Rate)
- `POST /api/v1/interest-rates`: Tạo bảng lãi suất theo bậc tiền vay & kỳ hạn.
- `GET /api/v1/interest-rates/current?termType=NGAN_HAN`: Lấy bảng lãi suất đang hiệu lực.
- `GET /api/v1/interest-rates`: Danh sách lịch sử bảng lãi suất.
- `GET /api/v1/interest-rates/:id`: Chi tiết bảng lãi suất.

### 3.3. Quy định Giá đất (Asset Pricing Rules)
- `POST /api/v1/asset-pricing-rules`: Tạo định mức giá đất của Quỹ (đất ruộng, cập kênh, cập lộ).
- `GET /api/v1/asset-pricing-rules/calculate?landCategory=Đất ruộng&area=500`: Tính nhanh định giá tài sản.
- `GET /api/v1/asset-pricing-rules`: Danh sách bảng giá đất.
- `GET /api/v1/asset-pricing-rules/:id`: Chi tiết định mức giá.
- `PUT /api/v1/asset-pricing-rules/:id`: Cập nhật định mức giá.

### 3.4. Quản lý Khoản Vay (Loan)
- `POST /api/v1/loans`: Tạo khoản vay mới (Tín chấp / Thế chấp; Ngắn hạn 12T / Trung hạn 24T).
  + Tự động khóa lãi suất theo bảng lãi suất hiện hành tại ngày cấp.
  + Kiểm tra hạn mức tín chấp tối đa 100tr cho 1 thành viên.
- `GET /api/v1/loans`: Danh sách khoản vay (lọc theo trạng thái, kỳ hạn, người vay, ngày tháng).
- `GET /api/v1/loans/:id`: Chi tiết khoản vay (gồm người thừa kế, phương án vay, tài sản, giải ngân, trả nợ).
- `GET /api/v1/loans/:id/summary`: **Tóm tắt tài chính & dư nợ thực tế**:
  + Tổng số tiền vay được duyệt
  + Tổng giải ngân, số tiền còn được giải ngân
  + Dư nợ gốc thực tế còn lại
  + Kiểm tra tự động quá hạn (quá 9 ngày kể từ ngày đáo hạn).
- `PUT /api/v1/loans/:id`: Cập nhật hồ sơ khoản vay.
- `PATCH /api/v1/loans/:id/status`: Cập nhật trạng thái (`DA_HOAN_THANH_HO_SO`, `DA_TAT_TOAN`...).
  + Kiểm tra vay thế chấp phải có tài sản >= tổng vay / 70% và có HĐ thế chấp mới cho hoàn thành hồ sơ.
  + Kiểm tra dư nợ gốc phải bằng 0 mới cho tất toán.

### 3.5. Tài sản thế chấp (Collateral)
- `POST /api/v1/loans/:loanId/collaterals`: Thêm sổ đỏ vào khoản vay (kiểm tra không dùng chung tài sản cho khoản vay khác chưa tất toán).
- `GET /api/v1/loans/:loanId/collaterals`: Danh sách tài sản của khoản vay.
- `GET /api/v1/collaterals/:id`: Chi tiết tài sản.
- `PUT /api/v1/collaterals/:id`: Cập nhật tài sản.
- `DELETE /api/v1/collaterals/:id`: Xóa tài sản khỏi khoản vay.

### 3.6. Giải ngân (Disbursement)
- `POST /api/v1/loans/:loanId/disbursements`: Ghi nhận giải ngân (1 lần hoặc nhiều lần, kiểm tra không vượt hạn mức).
  + Lần giải ngân đầu tiên tự động tạo ngày đáo hạn (`maturityDate`) và chuyển trạng thái sang `DA_GIAI_NGAN`.
- `GET /api/v1/loans/:loanId/disbursements`: Lịch sử giải ngân.

### 3.7. Trả nợ & Tính lãi (Repayment)
- `GET /api/v1/loans/:loanId/repayments/estimate-interest?days=90`: Ước tính tiền lãi cần đóng theo công thức Quỹ:
  `Lãi = Dư nợ gốc giảm dần × Lãi suất năm × Số ngày / 365`.
- `POST /api/v1/loans/:loanId/repayments`: Ghi nhận trả nợ (gốc và/hoặc lãi).
  + Tự động tất toán nếu nợ gốc còn lại = 0.
- `GET /api/v1/loans/:loanId/repayments`: Lịch sử các đợt trả nợ.

