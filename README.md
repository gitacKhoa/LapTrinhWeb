# Hệ thống Tra cứu Kết quả Thi Trực tuyến

Website tra cứu điểm thi cho sinh viên/học sinh — Bài tập lớn môn Lập trình Web.

## Mô tả

Tra cứu điểm thi theo tên hoặc mã số, xem bảng điểm chi tiết theo môn học, thống kê tỷ lệ đậu/rớt, và phân quyền theo 3 vai trò: Admin, Giáo viên, Sinh viên.

## Công nghệ sử dụng

- **Front-end**: HTML, CSS, JavaScript
- **Back-end**: Node.js, Express.js
- **Database**: MySQL

## Cấu trúc thư mục

```
project-tra-cuu-diem/
├── backend/
│   ├── routes/         # Định nghĩa các endpoint API
│   ├── controllers/    # Xử lý logic nghiệp vụ
│   ├── models/         # Thao tác với database
│   └── config/         # Kết nối DB, cấu hình
├── frontend/
│   ├── css/
│   ├── js/
│   └── pages/
├── server.js            # File khởi động server
├── schema.sql            # Cấu trúc database
├── .env.example           # File mẫu cấu hình môi trường
└── .gitignore
```

## Hướng dẫn cài đặt (lần đầu clone project về)

### 1. Clone repo về máy

```bash
git clone https://github.com/gitacKhoa/LapTrinhWeb.git
cd LapTrinhWeb
```

### 2. Cài các thư viện

```bash
npm install
```

### 3. Tạo file cấu hình môi trường

Copy file mẫu và điền thông tin thật của máy mình:

```bash
cp .env.example .env
```

Mở file `.env` vừa tạo, điền mật khẩu MySQL của bạn:

```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mat_khau_mysql_cua_ban
DB_NAME=diem_thi
JWT_SECRET=thay_doi_chuoi_bi_mat_nay
```

**Lưu ý:** File `.env` không được đưa lên Git (đã có trong `.gitignore`), mỗi người tự tạo và điền riêng.

### 4. Tạo database

Cách 1 — dùng dòng lệnh (Git Bash):
```bash
mysql -u root -p < schema.sql
Nhấn nút Execute (⚡) để chạy.

Schema mới tạo các bảng `users`, `courses` và `grades`. Nếu database đã tồn tại từ phiên bản cũ, hãy chạy lại toàn bộ `schema.sql` trên database trống để có đủ cột và bảng mới.
```

Cách 2 — dùng MySQL Workbench:
1. Mở Workbench, kết nối `localhost` với user `root`.
2. **File → Open SQL Script** → chọn `schema.sql`.
3. Nhấn nút Execute (⚡) để chạy.

### 5. Chạy server

```bash
npm run dev
```

Mở trình duyệt vào `http://localhost:3000/pages/index.html` để kiểm tra.

### 6. Tạo dữ liệu tài khoản và dữ liệu mẫu

Sau khi chạy `schema.sql`, chạy thêm:

```bash
mysql -u root -p < seed.sql
```

Tài khoản mặc định:

- Admin: `ADMIN001` / `admin123`
- Giảng viên: `GV0001` đến `GV0025` / `gv123456`
- Sinh viên: `SV000001` đến `SV000600` / `123456`

## API chính

### Kiến trúc backend

- `backend/config/db.js`: MySQL connection pool, dùng `utf8mb4`.
- `backend/models/`: truy vấn dữ liệu theo thực thể.
- `backend/controllers/`: xử lý nghiệp vụ, hiện có `auth.controller.js`.
- `backend/middleware/auth.middleware.js`: xác thực JWT và phân quyền.
- `backend/routes/api.routes.js`: khai báo endpoint và kết nối controller/model.
- `scripts/repair-vietnamese-data.js`: công cụ sửa dữ liệu bị lỗi mã hóa tiếng Việt nếu cần.

Sau khi đăng nhập, token được lưu ở trình duyệt và tự gửi qua header `Authorization: Bearer ...`. Xóa token bằng nút Đăng xuất hoặc xóa dữ liệu website khi đổi tài khoản.

- `GET /api/health`: kiểm tra server và kết nối MySQL.
- `POST /api/auth/login`: đăng nhập bằng MSSV/email và mật khẩu.
- `GET|POST /api/students`, `PUT|DELETE /api/students/:id`: quản lý sinh viên.
- `GET|POST /api/courses`, `PUT|DELETE /api/courses/:id`: quản lý học phần.
- `GET /api/lecturers`: danh sách giảng viên.
- `GET /api/grades?studentId=...` hoặc `?courseId=...`: tra cứu điểm.
- `POST /api/grades`: lưu/upsert điểm chuyên cần, giữa kỳ, cuối kỳ và trạng thái.

Các endpoint đọc cũng yêu cầu JWT. Endpoint ghi dữ liệu sẽ trả `403` nếu vai trò không phù hợp; không dùng cách ẩn nút ở frontend làm cơ chế bảo mật.

Frontend gọi các API này qua cùng origin `/api`, nên không cần mở frontend bằng file `file://`. Các nút thêm, sửa, xóa ở trang sinh viên/học phần và nút lưu nháp ở trang nhập điểm đều lưu trực tiếp vào MySQL.

## Quy trình làm việc nhóm (Git)

- Nhánh `main`: code ổn định, dùng để nộp bài/demo.
- Nhánh `dev`: nhánh tích hợp chung.
- Mỗi tính năng làm trên nhánh riêng: `feature/ten-tinh-nang`.

Quy trình:
```bash
git checkout dev
git pull origin dev
git checkout -b feature/ten-tinh-nang

# ... code ...

git add .
git commit -m "Mo ta ngan gon thay doi"
git push origin feature/ten-tinh-nang
```

Sau đó tạo Pull Request vào `dev` trên GitHub để review trước khi merge.

**Luôn `git pull` trước khi bắt đầu code mỗi buổi**, để tránh xung đột.

## Phân quyền hệ thống

| Vai trò | Quyền hạn |
|---|---|
| Admin | Quản lý tài khoản, toàn quyền hệ thống |
| Giáo viên | Nhập/sửa điểm cho môn mình dạy |
| Sinh viên | Chỉ xem điểm của chính mình |

## Thành viên nhóm

- [Tên bạn]
- [Tên bạn học]
