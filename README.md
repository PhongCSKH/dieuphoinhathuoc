# Ứng Dụng Điều Phối Đa Màn Hình Nhà Thuốc (QMS Multi-View)

Hệ thống theo dõi & điều phối đa màn hình gọi số QMS dành cho Trung tâm Nhà thuốc Bệnh viện Đa khoa Tâm Anh, cho phép hiển thị đồng thời nhiều quầy phát thuốc trên cùng một giao diện thay vì mở nhiều tab trình duyệt riêng lẻ.

---

## 🚀 Các Tính Năng Chính
1. **Lưới Hiển Thị Đa Dạng**:
   - **Lưới 4 (2x2)**: Mặc định hiển thị đồng thời 4 Nhà thuốc (Nhà thuốc 1, 2, 3, 4).
   - **1 To + 3 Phụ**: Ưu tiên 1 quầy chính ở vị trí nổi bật nhất.
   - **Lưới 2 (1x2)** & **Lưới 6 (2x3)**: Linh hoạt mở rộng khi có thêm Nhà thuốc 5, 6...
2. **Thu Phóng Thông Minh (Smart Zoom Scale)**:
   - Tùy chỉnh tỉ lệ thu phóng (65% -> 110%) toàn cục hoặc theo từng ô để hiển thị đầy đủ danh sách bệnh nhân trên mọi kích thước TV/màn hình vi tính.
3. **Phóng To Nhanh (1-Click Focus)**:
   - Click nút phóng to trên bất kỳ quầy nào để xem chi tiết toàn màn hình quầy đó, nhấn `Esc` để quay về lưới 4.
4. **Đồng Hồ Kỹ Thuật Số & Toàn Màn Hình (Kiosk Mode)**:
   - Đồng hồ thời gian thực hỗ trợ theo dõi ca trực.
   - Nút `F11` phóng to toàn màn hình tràn viền chuyên dụng cho TV phòng điều phối.
5. **Quản Lý & Sao Lưu Dữ Liệu**:
   - Thêm/sửa/xóa URL quầy phát thuốc.
   - Tự động lưu cấu hình vào máy (`localStorage`), không lo mất dữ liệu khi F5.
   - Xuất / Nhập cấu hình bằng file JSON.

---

## 🛠 Hướng Dẫn Đẩy Lên GitHub & Triển Khai `dieuphoi.xulydulieu.site`

### Bước 1: Tạo Repository mới trên GitHub
1. Đăng nhập vào [GitHub](https://github.com/) (tài khoản `PhongCSKH` hoặc tài khoản cá nhân của bạn).
2. Bấm nút **New repository**.
3. Đặt tên repository (ví dụ: `dieu-phoi-nha-thuoc` hoặc `dieuphoi`).
4. Để chế độ **Public** và **KHÔNG** tích chọn "Add a README file" hay ".gitignore".
5. Bấm **Create repository**.

### Bước 2: Đẩy Code lên GitHub
Mở PowerShell tại thư mục dự án này và chạy:
```powershell
# 1. Liên kết với kho GitHub của bạn (thay username và repo_name tương ứng)
git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git

# 2. Đẩy code lên nhánh main
git push -u origin main
```

### Bước 3: Kích Hoạt GitHub Pages
1. Vào repository trên GitHub > bấm vào tab **Settings** > chọn mục **Pages** ở cột bên trái.
2. Tại mục **Build and deployment** > **Source**: Chọn **GitHub Actions**.
3. File workflow `.github/workflows/deploy.yml` đã được cài sẵn sẽ tự động chạy build và publish trang web.

### Bước 4: Trỏ Tên Miền Con `dieuphoi.xulydulieu.site`
Vào trang quản trị DNS tên miền `xulydulieu.site` (nhà cung cấp tên miền của bạn như Cloudflare, PA Việt Nam, Mắt Bão...):
- Thêm một bản ghi **CNAME**:
  - **Tên (Name / Host)**: `dieuphoi`
  - **Loại (Type)**: `CNAME`
  - **Giá trị (Value / Target)**: `<USERNAME>.github.io` (ví dụ `phongcskh.github.io`)
- File `public/CNAME` đã được cấu hình sẵn nội dung `dieuphoi.xulydulieu.site`, nên sau khi trỏ DNS, trang web sẽ tự động kích hoạt HTTPS chứng chỉ SSL miễn phí tại:
  👉 **`https://dieuphoi.xulydulieu.site/`**

---

## 💻 Chạy Thử Trên Máy Cục Bộ (Localhost)
```powershell
# Chạy máy chủ phát triển
npm run dev
```
Trình duyệt sẽ tự động mở tại `http://localhost:3000`.
