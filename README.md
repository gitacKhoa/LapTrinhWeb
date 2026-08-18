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
