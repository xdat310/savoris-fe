# Savoris — giao diện nhân viên

React + Vite + TypeScript. Gọi backend Spring Boot qua `/api/v1` (Vite tự chuyển tiếp sang `http://localhost:8080`, nên không vướng CORS khi chạy dev).

## Chạy

```bash
# 1. Backend (thư mục cạnh repo này), cần PostgreSQL đang chạy
cd ../DineChain && ./mvnw spring-boot:run

# 2. Frontend (repo này)
npm install
npm run dev          # http://localhost:5173
```

Tài khoản demo (database trống sẽ tự có dữ liệu mẫu): `owner` / `Owner@123`; `manager1..9`, `cashier1..9`, `chef1..9`, `waiter1..9` / `Staff@123`. Màn hình đăng nhập có nút điền nhanh.

## Màn hình theo vai trò

| Vai trò | Vào thẳng | Làm gì |
|---|---|---|
| Thu ngân, phục vụ | Bán hàng | Sơ đồ bàn, gọi món từ bảng phấn, gọi thêm / huỷ món, mã khuyến mãi, tích điểm theo SĐT, thu tiền mặt và tiền thối |
| Đầu bếp | Bếp | Hàng đợi món (gọi trước làm trước), nhận nấu → xong → bưng, báo hết món, tải bếp |
| Quản lý chi nhánh | Quản lý | Nhân viên, ca làm & bảng công, giá riêng / hết món, đặt bàn, sức chứa bếp; thêm Bán hàng, Bếp, Kho |
| Kho | Kho & nhập hàng | Tồn kho, nguyên liệu sắp hết, phiếu nhập |
| Chủ chuỗi | Toàn chuỗi | 9 chi nhánh trên một bảng, menu chung, khuyến mãi, VAT; chọn chi nhánh để xem mọi màn hình khác |

Mọi vai trò có "Ca của tôi" để chấm công vào/ra.

## Lệnh khác

```bash
npm run build      # kiểm tra kiểu + build production vào dist/
npm run lint
npm run gen:api    # sinh lại src/api/types.ts từ Swagger của backend đang chạy
```
