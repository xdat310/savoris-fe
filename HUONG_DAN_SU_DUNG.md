# Hướng dẫn sử dụng Savoris Platform

> **Phiên bản:** 2.0 · **Cập nhật:** Tháng 10/2026  
> Hệ thống quản lý nhà hàng Savoris — bao gồm ứng dụng web cho khách, nhân viên và ban quản lý.

---

## Mục lục

1. [Dành cho khách hàng](#1-dành-cho-khách-hàng)
2. [Đăng nhập hệ thống nhân viên](#2-đăng-nhập-hệ-thống-nhân-viên)
3. [Phục vụ (WAITER)](#3-phục-vụ-waiter)
4. [Bếp (CHEF)](#4-bếp-chef)
5. [Kho (WAREHOUSE)](#5-kho-warehouse)
6. [Quản lý chi nhánh (BRANCH_MANAGER)](#6-quản-lý-chi-nhánh-branch_manager)
7. [Quản trị viên (ADMIN)](#7-quản-trị-viên-admin)
8. [Luồng thường gặp](#8-luồng-thường-gặp)

---

## 1. Dành cho khách hàng

### 1.1 Trang chủ công khai

Truy cập **https://dine-chain-fe.vercel.app** để xem trang nhà hàng Savoris.  
Trang gồm: Hero ảnh bìa, phần Câu chuyện, Thư viện ảnh, Hành trình (mốc lịch sử), Người sáng lập, Thực đơn, thông tin chi nhánh.

### 1.2 Đặt bàn trực tuyến

1. Nhấn **ĐẶT BÀN TRỰC TUYẾN** trên trang chủ (hoặc nút **ĐẶT BÀN** ở nav).
2. Chọn **chi nhánh** từ dropdown.
3. Chọn **ngày**, **giờ** và **số khách**.
4. Nhập **họ tên** và **số điện thoại**.
5. Nhấn **Xác nhận đặt bàn** — hệ thống ghi nhận yêu cầu, quản lý chi nhánh sẽ xác nhận qua điện thoại hoặc SMS.

> Đặt bàn chỉ cho phép các khung giờ còn chỗ. Nếu giờ mong muốn đã đầy, hệ thống sẽ tự động ẩn slot đó.

### 1.3 Gọi món tại bàn (Dine-in QR)

1. Quét mã QR trên bàn bằng camera điện thoại.
2. Trang gọi món mở ra — chọn món, điền số lượng, nhấn **Gửi lên bếp**.
3. Theo dõi trạng thái món ngay trên trang (Đang nấu → Xong, chờ bưng → Đã bưng).
4. Nhấn **Yêu cầu tính tiền** khi ăn xong — nhân viên thu ngân sẽ đến thanh toán.

### 1.4 Đặt đồ mang về (Takeaway)

1. Vào **https://dine-chain-fe.vercel.app/mang-ve**.
2. Chọn chi nhánh, thêm món vào giỏ, nhập thông tin người nhận.
3. Nhấn **Đặt đơn** — nhận mã đơn hàng để theo dõi.
4. Theo dõi đơn tại **/don-mang-ve/[mã-token]** (link được hiện ngay sau khi đặt).

---

## 2. Đăng nhập hệ thống nhân viên

Truy cập: **https://dine-chain-fe.vercel.app/nv/dang-nhap**  
(Hoặc hệ thống tự chuyển hướng khi vào `/nv/`)

| Vai trò | Tài khoản demo | Mật khẩu |
|---|---|---|
| Quản trị viên (ADMIN) | `admin` | `savoris123` |
| Quản lý chi nhánh | `quanly` | `savoris123` |
| Phục vụ / Thu ngân | `phucvu` | `savoris123` |
| Đầu bếp | `daubep` | `savoris123` |
| Kho | `kho` | `savoris123` |

> Tài khoản nhân viên do quản lý chi nhánh tạo và cấp mật khẩu ban đầu.

---

## 3. Phục vụ (WAITER)

Phục vụ có quyền truy cập: **POS (Bán hàng)** và **Đơn mang về**.

### 3.1 Tạo đơn tại bàn

1. Vào **Bán hàng** — chọn bàn trên sơ đồ.
2. Nhấn **+ Món** để thêm món vào đơn.
3. Nhấn **Gửi bếp** — bếp nhận được ngay lập tức.
4. Khi khách muốn thanh toán: nhấn **Tính tiền**, chọn phương thức (Tiền mặt / Chuyển khoản / Quét QR SePay).
5. Nhấn **Hoàn tất thanh toán** — đơn đóng, bàn giải phóng.

### 3.2 Đơn mang về

- Tab **Đơn mang về**: xem danh sách đơn takeaway đang chờ, đang chuẩn bị và đã xong.
- Nhấn **Xác nhận nhận đơn** sau khi khách lấy hàng.

### 3.3 Yêu cầu hủy món đang nấu

Khi khách muốn hủy một món đã gửi bếp (đang COOKING hoặc READY):

1. Trên màn hình POS, nhấn nút **⚠ Báo bếp hủy** bên cạnh món.
2. Nhập **lý do hủy** (VD: "Khách đổi ý", "Đặt nhầm").
3. Nhấn **Gửi yêu cầu** — bếp sẽ thấy yêu cầu ngay lập tức.
4. Khi bếp xử lý xong, phục vụ nhận thông báo kết quả.

### 3.4 Chia hóa đơn

1. Trên đơn đang mở, nhấn nút **✂ Chia hóa đơn** (biểu tượng kéo).
2. Chọn chế độ:
   - **Chia đều**: nhập số người → hệ thống tính tiền mỗi người.
   - **Theo món**: tick từng món vào từng người, xem tổng riêng.
3. Đóng modal → tiến hành thu tiền từng người bình thường.

---

## 4. Bếp (CHEF)

Bếp chỉ truy cập được màn hình **KDS (Kitchen Display System)**.

### 4.1 Màn hình KDS

- Hiển thị tất cả ticket theo bàn/đơn, sắp xếp theo thời gian.
- Màu sắc: **vàng** = chờ nấu, **xanh** = đang nấu, **xanh lá** = xong.
- Nhấn **BẮT ĐẦU** để chuyển sang "Đang nấu", nhấn **XONG** khi món hoàn thành.

### 4.2 Xử lý yêu cầu hủy món (Void Queue)

Banner đỏ ở đầu màn hình xuất hiện khi có yêu cầu hủy từ phục vụ:

- **✓ Chấp nhận hủy** — món bị hủy, nguyên liệu được hoàn kho, tiền trừ khỏi hóa đơn.
- **↻ Làm lại miễn phí** — hủy món cũ, tạo lệnh nấu mới không tính thêm tiền.
- **$ Khách vẫn trả** — bác yêu cầu hủy, món giữ nguyên trạng thái, khách vẫn phải trả.

### 4.3 Chế độ Batch

Khi nhiều đơn cùng có một món:

1. Nhấn **Gộp theo món** trên banner peak.
2. Hệ thống hiển thị ticket gộp (VD: "Phở bò × 5").
3. Nhấn **XONG TẤT CẢ** để đánh dấu hoàn tất cùng lúc.

---

## 5. Kho (WAREHOUSE)

Kho có quyền truy cập: **Kho hàng** và **Nhập kho**.

### 5.1 Xem tồn kho

Vào **Kho hàng**: danh sách nguyên liệu, số lượng tồn, đơn vị tính.  
Lọc theo **Chi nhánh** để xem riêng từng địa điểm.

### 5.2 Nhập kho

1. Vào **Nhập kho**.
2. Chọn **nguyên liệu**, nhập **số lượng** và **đơn giá**.
3. Nhấn **Lưu phiếu nhập** — tồn kho cập nhật ngay lập tức.

> Kho tự động trừ nguyên liệu mỗi khi bếp bắt đầu nấu (dựa trên công thức BOM đã cài đặt).

---

## 6. Quản lý chi nhánh (BRANCH_MANAGER)

Quản lý truy cập tất cả các màn hình của phục vụ + bếp + kho, thêm:

- **Quản lý** → tabs: Nhân viên / Ca làm / Menu chi nhánh / Đặt bàn / Cài đặt chi nhánh

### 6.1 Quản lý nhân viên

- Xem danh sách, tạo tài khoản mới, đặt lại mật khẩu, cho nghỉ việc.

### 6.2 Xếp ca làm việc

- Tạo ca (tên, giờ vào, giờ ra).
- Xếp nhân viên vào ca cụ thể theo ngày.
- Bảng công tính lương tự động dựa trên giờ chấm công thực tế.

### 6.3 Quản lý đặt bàn

Tab **Đặt bàn** trong trang Quản lý:

1. Xem danh sách đặt bàn đang chờ xác nhận.
2. Nhấn **Xác nhận** hoặc **Huỷ** cho từng đơn.
3. Tạo đặt bàn mới thay mặt khách (nhập SĐT, tên, giờ, số khách).

### 6.4 Menu chi nhánh

- Đặt giá riêng cho từng món (để trống = theo giá chung của chuỗi).
- Bật/tắt món: **Báo hết** / **Bán lại**.

---

## 7. Quản trị viên (ADMIN)

ADMIN có toàn quyền trên toàn hệ thống.

### 7.1 Dashboard toàn chuỗi

**Toàn chuỗi** → tab **Tổng quan hôm nay**:
- Doanh thu thực thu, số đơn hoàn tất/đang mở.
- Tải bếp từng chi nhánh (% so với ngưỡng cảnh báo).
- Cảnh báo chi nhánh quá tải.

### 7.2 Menu chung

**Toàn chuỗi** → tab **Menu chung**:
- Thêm/sửa/xóa danh mục và món ăn.
- Upload ảnh món (Cloudinary, backend xử lý — API key không lộ ra frontend).
- Cài đặt công thức nguyên liệu (BOM) cho từng món.

### 7.3 Khuyến mãi & VAT

- **Khuyến mãi**: tạo mã giảm giá, giảm theo % hoặc số tiền cố định, giới hạn số lần dùng.
- **VAT**: cài đặt % thuế VAT toàn chuỗi.

### 7.4 Chuyển khoản & QR SePay

**Toàn chuỗi** → tab **Chuyển khoản**:
- Cài đặt tài khoản ngân hàng nhận tiền.
- Cài đặt QR tự động xác nhận qua SePay webhook.

### 7.5 Mã QR bàn

**Mã QR** (menu trái):
- Xem và tải QR cho từng bàn của từng chi nhánh.
- In QR để dán lên bàn.

### 7.6 Website CMS — Chỉnh sửa trang công khai

**Website → Trang chủ** (menu trái):

| Tab | Nội dung có thể chỉnh |
|---|---|
| **Hero** | Ảnh/slideshow/video bìa, overlay, badge, mô tả, nút CTA |
| **Story** | Các section giới thiệu nhà hàng (ảnh + tiêu đề + nội dung) |
| **Gallery** | Thư viện ảnh (thêm/xóa/sắp xếp) |
| **Hành trình** | 6 mốc thời gian (năm, tiêu đề, mô tả) |
| **Manifesto** | Trích dẫn sáng lập viên |
| **Người sáng lập** | Ảnh chân dung, tên, chức danh, tiểu sử, chữ ký |
| **Footer & Nav** | Mạng xã hội, copyright, menu điều hướng |

> Mọi thay đổi được lưu ngay lên database và hiển thị trực tiếp trên trang công khai.

### 7.7 Quản lý chi nhánh (Admin level)

**Chi nhánh** (menu trái):
- Xem/sửa thông tin chi nhánh (địa chỉ, giờ mở cửa, Google Maps embed, có nhận mang về hay không).
- Tạo chi nhánh mới.

### 7.8 Cài đặt hệ thống

**Cài đặt** (menu trái):
- Cài đặt toàn cục cho hệ thống.

---

## 8. Luồng thường gặp

### Luồng khách ăn tại bàn

```
Khách quét QR → Chọn món → Gửi bếp
→ Bếp thấy ticket → Bắt đầu nấu → Xong
→ Phục vụ bưng món → Khách ăn
→ Khách yêu cầu tính tiền → Phục vụ thanh toán
→ Đơn hoàn tất → Bàn trống
```

### Luồng hủy món

```
Khách muốn hủy → Phục vụ nhấn "Báo bếp hủy" → Nhập lý do
→ Bếp thấy yêu cầu ở panel đỏ
→ Bếp chọn: [Chấp nhận hủy | Làm lại miễn phí | Khách vẫn trả]
→ Phục vụ nhận thông báo → Hóa đơn cập nhật tự động
```

### Luồng takeaway

```
Khách vào /mang-ve → Đặt đơn → Nhận mã token
→ Nhà hàng nhận đơn (tab Đơn mang về) → Xác nhận → Bếp nấu
→ Phục vụ đóng gói → Khách đến lấy → Hoàn tất
```

### Luồng đặt bàn

```
Khách nhấn "Đặt bàn" → Chọn chi nhánh + giờ + số khách → Gửi
→ Quản lý thấy trong tab "Đặt bàn" → Xác nhận / Huỷ
→ Khách đến nhà hàng đúng giờ
```

---

## Hỗ trợ

Mọi thắc mắc kỹ thuật về hệ thống, liên hệ team phát triển tại:  
**GitHub:** https://github.com/phamcuongdev26/DineChain_fe  
**Email:** contact.tamtrung@gmail.com
