require('dotenv').config();
const mysql = require('mysql2/promise');

async function repair() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  await connection.query("UPDATE users SET ho_ten=CONCAT('Giảng viên ', LPAD(SUBSTRING(mssv,3),4,'0')), khoa=CASE WHEN MOD(CAST(SUBSTRING(mssv,3) AS UNSIGNED),2)=0 THEN 'Khoa CNTT' ELSE 'Khoa Kinh tế' END WHERE vai_tro='giao_vien'");
  await connection.query("UPDATE users SET ho_ten=CONCAT('Sinh viên ', LPAD(SUBSTRING(mssv,3),4,'0')) WHERE vai_tro='sinh_vien'");
  await connection.query("UPDATE users SET ho_ten='Quản trị viên hệ thống', khoa='Phòng Đào tạo' WHERE mssv='ADMIN001'");
  await connection.query("UPDATE users SET ho_ten=CONCAT('Sinh viên ', LPAD(SUBSTRING(mssv,3),6,'0')), nganh=CASE WHEN MOD(CAST(SUBSTRING(mssv,3) AS UNSIGNED),3)=0 THEN 'Kỹ thuật phần mềm' WHEN MOD(CAST(SUBSTRING(mssv,3) AS UNSIGNED),2)=0 THEN 'CN Đa phương tiện' ELSE 'CNTT' END WHERE vai_tro='sinh_vien'");
  await connection.query("UPDATE courses SET ten_mon=CASE ma_mon WHEN 'IT4409' THEN 'Lập trình Web' WHEN 'IT4062' THEN 'Cơ sở dữ liệu' WHEN 'MM3201' THEN 'Thiết kế đồ họa số' WHEN 'MA1101' THEN 'Giải tích 1' WHEN 'IT3103' THEN 'Cấu trúc dữ liệu' END, khoa=CASE WHEN ma_mon IN ('IT4409','IT4062','IT3103') THEN 'Khoa CNTT' ELSE 'Khoa CN Đa phương tiện' END");
  await connection.query("UPDATE terms SET ten_hoc_ky=CASE ma_hoc_ky WHEN '2026-HK1' THEN 'Học kỳ 1, năm học 2026-2027' WHEN '2026-HK2' THEN 'Học kỳ 2, năm học 2026-2027' WHEN '2025-HK2' THEN 'Học kỳ 2, năm học 2025-2026' END");
  await connection.query("UPDATE pending_actions p JOIN courses c ON c.id=p.course_id SET p.noi_dung=CONCAT(c.ma_mon, ' - cần xử lý bảng điểm')");
  const [badRows] = await connection.query("SELECT COUNT(*) AS total FROM users WHERE ho_ten LIKE '%?%' OR khoa LIKE '%?%' OR nganh LIKE '%?%'");
  await connection.end();
  console.log(`Vietnamese data repaired; corrupted user rows remaining: ${badRows[0].total}`);
}

repair().catch(error => { console.error(error.message); process.exit(1); });
