CREATE DATABASE IF NOT EXISTS diem_thi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE diem_thi;
ALTER DATABASE diem_thi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ho_ten VARCHAR(100) NOT NULL,
  mssv VARCHAR(20) UNIQUE,
  email VARCHAR(100) UNIQUE NOT NULL,
  mat_khau VARCHAR(255) NOT NULL,
  vai_tro ENUM('admin', 'giao_vien', 'sinh_vien') NOT NULL DEFAULT 'sinh_vien',
  nganh VARCHAR(100),
  khoa_hoc VARCHAR(20),
  khoa VARCHAR(100),
  so_dien_thoai VARCHAR(30),
  dia_chi VARCHAR(255),
  trang_thai VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_mon VARCHAR(20) UNIQUE NOT NULL,
  ten_mon VARCHAR(100) NOT NULL,
  tin_chi TINYINT NOT NULL DEFAULT 3,
  khoa VARCHAR(100),
  hoc_ky VARCHAR(30),
  giang_vien_id INT NULL,
  trang_thai VARCHAR(30) NOT NULL DEFAULT 'draft',
  FOREIGN KEY (giang_vien_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sinh_vien_id INT NOT NULL,
  mon_hoc_id INT NOT NULL,
  diem_chuyen_can DECIMAL(4,2),
  diem_giua_ky DECIMAL(4,2),
  diem_cuoi_ky DECIMAL(4,2),
  diem_tong_ket DECIMAL(4,2),
  ghi_chu VARCHAR(255),
  trang_thai VARCHAR(30) NOT NULL DEFAULT 'draft',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_course (sinh_vien_id, mon_hoc_id),
  FOREIGN KEY (sinh_vien_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mon_hoc_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_students (
  sinh_vien_id INT NOT NULL,
  mon_hoc_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sinh_vien_id, mon_hoc_id),
  FOREIGN KEY (sinh_vien_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mon_hoc_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS terms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ma_hoc_ky VARCHAR(30) UNIQUE NOT NULL,
  ten_hoc_ky VARCHAR(150) NOT NULL,
  nam_hoc VARCHAR(20) NOT NULL,
  ngay_bat_dau DATE NOT NULL,
  ngay_ket_thuc DATE NOT NULL,
  trang_thai VARCHAR(30) NOT NULL DEFAULT 'upcoming'
);

CREATE TABLE IF NOT EXISTS exams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  term_id INT NOT NULL,
  course_id INT NOT NULL,
  ten_ky_thi VARCHAR(100) NOT NULL,
  phong_thi VARCHAR(50),
  bat_dau DATETIME NOT NULL,
  ket_thuc DATETIME NOT NULL,
  trang_thai VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  loai VARCHAR(50) NOT NULL,
  noi_dung VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pending_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NULL,
  owner_id INT NULL,
  noi_dung VARCHAR(255) NOT NULL,
  han_xu_ly DATE,
  trang_thai VARCHAR(30) NOT NULL DEFAULT 'pending',
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);