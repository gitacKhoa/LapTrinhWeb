USE diem_thi;

INSERT IGNORE INTO users (ho_ten, mssv, email, mat_khau, vai_tro, khoa, trang_thai)
VALUES ('Quản trị viên hệ thống', 'ADMIN001', 'admin@academic.edu.vn', 'admin123', 'admin', 'Phòng Đào tạo', 'active');

INSERT IGNORE INTO users (ho_ten, mssv, email, mat_khau, vai_tro, khoa, trang_thai)
WITH RECURSIVE seq AS (SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 25)
SELECT CONCAT('Giảng viên ', LPAD(n, 3, '0')), CONCAT('GV', LPAD(n, 4, '0')), CONCAT('gv', LPAD(n, 3, '0'), '@academic.edu.vn'), 'gv123456', 'giao_vien', CASE WHEN MOD(n, 2) = 0 THEN 'Khoa CNTT' ELSE 'Khoa Kinh tế' END, 'active' FROM seq;

INSERT IGNORE INTO users (ho_ten, mssv, email, mat_khau, vai_tro, nganh, khoa_hoc, trang_thai)
WITH RECURSIVE seq AS (SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 600)
SELECT CONCAT('Sinh viên ', LPAD(n, 4, '0')), CONCAT('SV', LPAD(n, 6, '0')), CONCAT('sv', LPAD(n, 4, '0'), '@sv.academic.edu.vn'), '123456', 'sinh_vien', CASE WHEN MOD(n, 3) = 0 THEN 'Kỹ thuật phần mềm' WHEN MOD(n, 2) = 0 THEN 'CN Đa phương tiện' ELSE 'CNTT' END, CONCAT('K', 17 + MOD(n, 3)), 'active' FROM seq;

INSERT IGNORE INTO terms (ma_hoc_ky, ten_hoc_ky, nam_hoc, ngay_bat_dau, ngay_ket_thuc, trang_thai)
VALUES
('2026-HK1', 'Học kỳ 1, năm học 2026-2027', '2026-2027', '2026-09-05', '2027-01-15', 'active'),
('2026-HK2', 'Học kỳ 2, năm học 2026-2027', '2026-2027', '2027-02-20', '2027-06-30', 'upcoming'),
('2025-HK2', 'Học kỳ 2, năm học 2025-2026', '2025-2026', '2026-02-15', '2026-06-30', 'closed');

INSERT IGNORE INTO courses (ma_mon, ten_mon, tin_chi, khoa, hoc_ky, giang_vien_id, trang_thai)
SELECT source.ma_mon, source.ten_mon, source.tin_chi, source.khoa, source.hoc_ky,
  (SELECT id FROM users WHERE mssv = source.ma_gv), source.trang_thai
FROM (SELECT 'IT4409' ma_mon, 'Lập trình Web' ten_mon, 3 tin_chi, 'Khoa CNTT' khoa, '2026-HK1' hoc_ky, 'GV0001' ma_gv, 'entering' trang_thai
UNION ALL SELECT 'IT4062', 'Cơ sở dữ liệu', 3, 'Khoa CNTT', '2026-HK1', 'GV0002', 'review'
UNION ALL SELECT 'MM3201', 'Thiết kế đồ họa số', 2, 'Khoa CN Đa phương tiện', '2026-HK1', 'GV0003', 'published'
UNION ALL SELECT 'MA1101', 'Giải tích 1', 3, 'Khoa Khoa học cơ bản', '2026-HK1', 'GV0004', 'draft'
UNION ALL SELECT 'IT3103', 'Cấu trúc dữ liệu', 4, 'Khoa CNTT', '2025-HK2', 'GV0001', 'published') source;

INSERT IGNORE INTO grades (sinh_vien_id, mon_hoc_id, diem_chuyen_can, diem_giua_ky, diem_cuoi_ky, diem_tong_ket, ghi_chu, trang_thai)
SELECT u.id, c.id, 7 + MOD(u.id, 4) * .5, 6 + MOD(u.id, 5) * .5, 6 + MOD(u.id, 6) * .6,
  ROUND((7 + MOD(u.id, 4) * .5) * .1 + (6 + MOD(u.id, 5) * .5) * .3 + (6 + MOD(u.id, 6) * .6) * .6, 2), '', c.trang_thai
FROM users u CROSS JOIN courses c WHERE u.vai_tro = 'sinh_vien' AND c.ma_mon = 'IT4409';

INSERT IGNORE INTO pending_actions (course_id, owner_id, noi_dung, han_xu_ly, trang_thai)
SELECT c.id, c.giang_vien_id, CONCAT(c.ma_mon, ' - cần xử lý bảng điểm'), '2026-08-30', 'pending'
FROM courses c WHERE c.trang_thai IN ('entering', 'review');

INSERT INTO exams (term_id, course_id, ten_ky_thi, phong_thi, bat_dau, ket_thuc, trang_thai)
SELECT t.id, c.id, 'Thi cuối kỳ', CONCAT('P.', 100 + c.id), '2026-12-20 07:30:00', '2026-12-20 09:30:00', 'scheduled'
FROM terms t JOIN courses c ON c.hoc_ky=t.ma_hoc_ky
WHERE t.ma_hoc_ky='2026-HK1' AND NOT EXISTS (SELECT 1 FROM exams e WHERE e.term_id=t.id AND e.course_id=c.id);

INSERT INTO activity_logs (user_id, loai, noi_dung)
SELECT u.id, 'seed', CONCAT(u.ho_ten, ' được tạo trong hệ thống') FROM users u
WHERE u.mssv = 'ADMIN001' AND NOT EXISTS (SELECT 1 FROM activity_logs WHERE loai = 'seed');
