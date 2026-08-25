const express = require('express');
const pool = require('../config/db');
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function validateScore(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    const error = new Error(`${field} phải nằm trong khoảng 0 đến 10`);
    error.status = 400;
    throw error;
  }
  return score;
}

router.get('/health', asyncRoute(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
}));

router.get('/dashboard', asyncRoute(async (req, res) => {
  const [[students]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE vai_tro='sinh_vien'");
  const [[lecturers]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE vai_tro='giao_vien'");
  const [[courses]] = await pool.query("SELECT COUNT(*) AS total FROM courses WHERE trang_thai <> 'closed'");
  const [[unpublished]] = await pool.query("SELECT COUNT(*) AS total FROM grades WHERE trang_thai <> 'published'");
  const [pending] = await pool.query(`SELECT p.noi_dung AS item, u.ho_ten AS owner, p.trang_thai AS status,
    DATE_FORMAT(p.han_xu_ly, '%d/%m/%Y') AS deadline FROM pending_actions p LEFT JOIN users u ON u.id=p.owner_id
    WHERE p.trang_thai <> 'done' ORDER BY p.han_xu_ly`);
  const [activity] = await pool.query(`SELECT a.noi_dung AS text,
    DATE_FORMAT(a.created_at, '%d/%m/%Y %H:%i') AS time FROM activity_logs a ORDER BY a.created_at DESC LIMIT 20`);
  res.json({ stats: { students: students.total, lecturers: lecturers.total, courses: courses.total, unpublished: unpublished.total }, pending, activity });
}));

router.post('/auth/login', asyncRoute(async (req, res) => {
  return authController.login(req, res);
}));

router.use(authenticate);

router.patch('/users/:id/password', authorize('admin', 'giao_vien', 'sinh_vien'), asyncRoute(async (req, res) => {
  if (req.auth.role !== 'admin' && String(req.auth.id) !== String(req.params.id)) return res.status(403).json({ message: 'Bạn chỉ được đổi mật khẩu của mình' });
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  const [rows] = await pool.query('SELECT id FROM users WHERE id=? AND mat_khau=?', [req.params.id, currentPassword]);
  if (!rows.length) return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
  await pool.query('UPDATE users SET mat_khau=? WHERE id=?', [newPassword, req.params.id]);
  res.json({ message: 'Đã đổi mật khẩu' });
}));

router.get('/students', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT u.id, u.mssv AS studentId, u.ho_ten AS name, u.email,
    u.nganh AS major, u.khoa_hoc AS cohort, COALESCE(SUM(c.tin_chi), 0) AS credits,
    ROUND(COALESCE(AVG(g.diem_tong_ket), 0) / 10 * 4, 2) AS gpa, u.trang_thai AS status
    FROM users u LEFT JOIN grades g ON g.sinh_vien_id = u.id LEFT JOIN courses c ON c.id = g.mon_hoc_id
    WHERE u.vai_tro = 'sinh_vien' GROUP BY u.id ORDER BY u.id DESC`);
  res.json(rows);
}));

router.post('/students', authorize('admin'), asyncRoute(async (req, res) => {
  const { mssv, name, email, password = '123456', major = '', cohort = '', status = 'active' } = req.body;
  if (!mssv || !name || !email) return res.status(400).json({ message: 'MSSV, họ tên và email là bắt buộc' });
  const [result] = await pool.query(`INSERT INTO users
    (ho_ten, mssv, email, mat_khau, vai_tro, nganh, khoa_hoc, trang_thai)
    VALUES (?, ?, ?, ?, 'sinh_vien', ?, ?, ?)`, [name, mssv, email, password, major, cohort, status]);
  res.status(201).json({ id: result.insertId });
}));

router.get('/students/:id', asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT u.id, u.mssv AS studentId, u.ho_ten AS name, u.email, u.nganh AS major, u.khoa_hoc AS cohort, u.trang_thai AS status, u.so_dien_thoai AS phone, u.dia_chi AS address, COALESCE(SUM(c.tin_chi),0) AS credits, ROUND(COALESCE(AVG(g.diem_tong_ket),0)/10*4,2) AS gpa FROM users u LEFT JOIN grades g ON g.sinh_vien_id=u.id LEFT JOIN courses c ON c.id=g.mon_hoc_id WHERE u.id=? AND u.vai_tro='sinh_vien' GROUP BY u.id", [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
  res.json(rows[0]);
}));

router.put('/students/:id', authorize('admin', 'sinh_vien'), asyncRoute(async (req, res) => {
  if (req.auth.role === 'sinh_vien' && String(req.auth.id) !== String(req.params.id)) return res.status(403).json({ message: 'Bạn chỉ được sửa hồ sơ của mình' });
  const { name, email, major = '', cohort = '', status = 'active', phone = '', address = '' } = req.body;
  await pool.query("UPDATE users SET ho_ten=?, email=?, nganh=?, khoa_hoc=?, trang_thai=?, so_dien_thoai=?, dia_chi=? WHERE id=? AND vai_tro='sinh_vien'",
    [name, email, major, cohort, status, phone, address, req.params.id]);
  res.json({ message: 'Đã cập nhật sinh viên' });
}));

router.delete('/students/:id', authorize('admin'), asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM users WHERE id=? AND vai_tro='sinh_vien'", [req.params.id]);
  res.status(204).end();
}));

router.get('/lecturers', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT u.id, u.mssv AS lecturerId, u.ho_ten AS name, u.email,
    u.khoa AS dept, u.trang_thai AS status, COUNT(DISTINCT c.id) AS courses,
    COUNT(DISTINCT g.sinh_vien_id) AS students FROM users u LEFT JOIN courses c ON c.giang_vien_id=u.id
    LEFT JOIN grades g ON g.mon_hoc_id=c.id WHERE u.vai_tro='giao_vien' GROUP BY u.id ORDER BY u.id DESC`);
  res.json(rows);
}));

router.post('/lecturers', authorize('admin'), asyncRoute(async (req, res) => {
  const { lecturerId, name, email, password='gv123456', dept='', status='active' } = req.body;
  if (!lecturerId || !name || !email) return res.status(400).json({ message: 'Mã, họ tên và email là bắt buộc' });
  const [result] = await pool.query("INSERT INTO users (ho_ten,mssv,email,mat_khau,vai_tro,khoa,trang_thai) VALUES (?,?,?,?,'giao_vien',?,?)", [name, lecturerId, email, password, dept, status]);
  res.status(201).json({ id: result.insertId });
}));

router.put('/lecturers/:id', authorize('admin'), asyncRoute(async (req, res) => {
  const { name, email, dept='', status='active' } = req.body;
  await pool.query("UPDATE users SET ho_ten=?,email=?,khoa=?,trang_thai=? WHERE id=? AND vai_tro='giao_vien'", [name, email, dept, status, req.params.id]);
  res.json({ message: 'Đã cập nhật giảng viên' });
}));

router.delete('/lecturers/:id', authorize('admin'), asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM users WHERE id=? AND vai_tro='giao_vien'", [req.params.id]);
  res.status(204).end();
}));

router.get('/courses', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT c.id, c.ma_mon AS code, c.ten_mon AS name, c.tin_chi AS credits,
    c.khoa AS dept, c.hoc_ky AS semester, c.trang_thai AS status, u.ho_ten AS lecturer,
    COUNT(g.id) AS students FROM courses c LEFT JOIN users u ON u.id=c.giang_vien_id
    LEFT JOIN grades g ON g.mon_hoc_id=c.id GROUP BY c.id ORDER BY c.id DESC`);
  res.json(rows);
}));

router.post('/courses', authorize('admin'), asyncRoute(async (req, res) => {
  const { code, name, credits=3, dept='', semester='', lecturerId=null, status='draft' } = req.body;
  if (!code || !name) return res.status(400).json({ message: 'Mã và tên học phần là bắt buộc' });
  const [result] = await pool.query('INSERT INTO courses (ma_mon,ten_mon,tin_chi,khoa,hoc_ky,giang_vien_id,trang_thai) VALUES (?,?,?,?,?,?,?)',
    [code, name, credits, dept, semester, lecturerId, status]);
  res.status(201).json({ id: result.insertId });
}));

router.put('/courses/:id', authorize('admin'), asyncRoute(async (req, res) => {
  const { code, name, credits=3, dept='', semester='', lecturerId=null, status='draft' } = req.body;
  await pool.query('UPDATE courses SET ma_mon=?,ten_mon=?,tin_chi=?,khoa=?,hoc_ky=?,giang_vien_id=?,trang_thai=? WHERE id=?',
    [code, name, credits, dept, semester, lecturerId, status, req.params.id]);
  res.json({ message: 'Đã cập nhật học phần' });
}));

router.delete('/courses/:id', authorize('admin'), asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM courses WHERE id=?', [req.params.id]);
  res.status(204).end();
}));

router.get('/grades', asyncRoute(async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.courseId) { where = 'WHERE g.mon_hoc_id=?'; params.push(req.query.courseId); }
  if (req.query.studentId) { where = 'WHERE g.sinh_vien_id=?'; params.push(req.query.studentId); }
  const [rows] = await pool.query(`SELECT g.id, g.sinh_vien_id AS studentId, u.mssv, u.ho_ten AS name,
    g.mon_hoc_id AS courseId, c.ma_mon AS code, c.ten_mon AS courseName, g.diem_chuyen_can AS attendance,
    g.diem_giua_ky AS midterm, g.diem_cuoi_ky AS final, g.diem_tong_ket AS total, g.ghi_chu AS note,
    g.trang_thai AS status, c.tin_chi AS credits, c.hoc_ky AS semester,
    CASE WHEN g.diem_tong_ket >= 8.5 THEN 'A' WHEN g.diem_tong_ket >= 7 THEN 'B'
      WHEN g.diem_tong_ket >= 5.5 THEN 'C' WHEN g.diem_tong_ket >= 4 THEN 'D' ELSE 'F' END AS letter
    FROM grades g JOIN users u ON u.id=g.sinh_vien_id JOIN courses c ON c.id=g.mon_hoc_id ${where} ORDER BY u.mssv`, params);
  res.json(rows);
}));

router.get('/terms', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT t.*, COUNT(DISTINCT c.id) AS courses, COUNT(DISTINCT g.sinh_vien_id) AS students
    FROM terms t LEFT JOIN courses c ON c.hoc_ky=t.ma_hoc_ky LEFT JOIN grades g ON g.mon_hoc_id=c.id
    GROUP BY t.id ORDER BY t.ngay_bat_dau DESC`);
  res.json(rows);
}));

router.get('/exams', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT e.*, t.ma_hoc_ky AS termCode, c.ma_mon AS courseCode, c.ten_mon AS courseName
    FROM exams e JOIN terms t ON t.id=e.term_id JOIN courses c ON c.id=e.course_id ORDER BY e.bat_dau`);
  res.json(rows);
}));

router.post('/exams', authorize('admin'), asyncRoute(async (req, res) => {
  const { termId, courseId, name, room='', startAt, endAt, status='scheduled' } = req.body;
  if (!termId || !courseId || !name || !startAt || !endAt) return res.status(400).json({ message: 'Học kỳ, học phần, tên và thời gian là bắt buộc' });
  const [result] = await pool.query('INSERT INTO exams (term_id,course_id,ten_ky_thi,phong_thi,bat_dau,ket_thuc,trang_thai) VALUES (?,?,?,?,?,?,?)', [termId, courseId, name, room, startAt, endAt, status]);
  res.status(201).json({ id: result.insertId });
}));

router.get('/approvals', asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`SELECT c.id AS courseId, CONCAT(c.ma_mon, ' — ', c.ten_mon) AS item,
    u.ho_ten AS owner, COUNT(g.id) AS students, MAX(g.updated_at) AS sentAt, c.trang_thai AS status
    FROM courses c LEFT JOIN users u ON u.id=c.giang_vien_id LEFT JOIN grades g ON g.mon_hoc_id=c.id
    WHERE c.trang_thai IN ('review','submitted','published') GROUP BY c.id ORDER BY sentAt DESC`);
  res.json(rows);
}));

router.patch('/approvals/:courseId', authorize('admin'), asyncRoute(async (req, res) => {
  const { status } = req.body;
  if (!['review', 'submitted', 'published', 'draft'].includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  await pool.query('UPDATE courses SET trang_thai=? WHERE id=?', [status, req.params.courseId]);
  await pool.query('UPDATE grades SET trang_thai=? WHERE mon_hoc_id=?', [status, req.params.courseId]);
  res.json({ message: 'Đã cập nhật trạng thái duyệt điểm' });
}));

router.post('/terms', authorize('admin'), asyncRoute(async (req, res) => {
  const { code, name, schoolYear, startDate, endDate, status='upcoming' } = req.body;
  const [result] = await pool.query('INSERT INTO terms (ma_hoc_ky,ten_hoc_ky,nam_hoc,ngay_bat_dau,ngay_ket_thuc,trang_thai) VALUES (?,?,?,?,?,?)', [code, name, schoolYear, startDate, endDate, status]);
  res.status(201).json({ id: result.insertId });
}));

router.post('/grades', authorize('admin', 'giao_vien'), asyncRoute(async (req, res) => {
  const { studentId, courseId, attendance, midterm, final, note='', status='draft' } = req.body;
  if (!studentId || !courseId) return res.status(400).json({ message: 'Sinh viên và học phần là bắt buộc' });
  const scores = [validateScore(attendance, 'Điểm chuyên cần'), validateScore(midterm, 'Điểm giữa kỳ'), validateScore(final, 'Điểm cuối kỳ')];
  const total = scores.every(score => score !== null) ? Number((scores[0]*.1 + scores[1]*.3 + scores[2]*.6).toFixed(2)) : null;
  const [result] = await pool.query(`INSERT INTO grades (sinh_vien_id,mon_hoc_id,diem_chuyen_can,diem_giua_ky,diem_cuoi_ky,diem_tong_ket,ghi_chu,trang_thai)
    VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE diem_chuyen_can=VALUES(diem_chuyen_can),diem_giua_ky=VALUES(diem_giua_ky),diem_cuoi_ky=VALUES(diem_cuoi_ky),diem_tong_ket=VALUES(diem_tong_ket),ghi_chu=VALUES(ghi_chu),trang_thai=VALUES(trang_thai)`,
    [studentId, courseId, ...scores, total, note, status]);
  res.status(201).json({ id: result.insertId, total });
}));

router.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.code === 'ER_DUP_ENTRY' ? 'Dữ liệu đã tồn tại' : 'Lỗi máy chủ' });
});

module.exports = router;