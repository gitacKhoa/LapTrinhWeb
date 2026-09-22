const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../config/db');
const authController = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

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

async function assertCourseAccess(req, courseId) {
  const [courses] = await pool.query('SELECT id, giang_vien_id FROM courses WHERE id=?', [
    courseId,
  ]);
  if (!courses.length) {
    const error = new Error('Không tìm thấy học phần');
    error.status = 404;
    throw error;
  }
  if (req.auth.role === 'giao_vien' && String(courses[0].giang_vien_id) !== String(req.auth.id)) {
    const error = new Error('Bạn chỉ được nhập điểm cho học phần mình phụ trách');
    error.status = 403;
    throw error;
  }
  return courses[0];
}

function normalizeGradeInput(input, rowNumber) {
  const studentId = input.studentId ?? input.sinh_vien_id;
  const courseId = input.courseId ?? input.mon_hoc_id;
  if (!studentId || !courseId) {
    const error = new Error(`Dòng ${rowNumber}: thiếu studentId hoặc courseId`);
    error.status = 400;
    throw error;
  }
  const scores = [
    validateScore(input.attendance ?? input.diem_chuyen_can, `Dòng ${rowNumber} - Điểm chuyên cần`),
    validateScore(input.midterm ?? input.diem_giua_ky, `Dòng ${rowNumber} - Điểm giữa kỳ`),
    validateScore(input.final ?? input.diem_cuoi_ky, `Dòng ${rowNumber} - Điểm cuối kỳ`),
  ];
  const total = scores.every((score) => score !== null)
    ? Number((scores[0] * 0.1 + scores[1] * 0.3 + scores[2] * 0.6).toFixed(2))
    : null;
  return {
    studentId,
    courseId,
    scores,
    total,
    note: input.note ?? input.ghi_chu ?? '',
    status: input.status || 'draft',
  };
}

async function assertStudentInCourse(studentId, courseId) {
  const [students] = await pool.query(
    `SELECT cs.sinh_vien_id FROM course_students cs
    JOIN users u ON u.id=cs.sinh_vien_id
    WHERE (cs.sinh_vien_id=? OR u.mssv=?) AND cs.mon_hoc_id=? AND u.vai_tro='sinh_vien'`,
    [studentId, studentId, courseId]
  );
  if (!students.length) {
    const error = new Error('Sinh viên không thuộc danh sách của học phần');
    error.status = 400;
    throw error;
  }
  return students[0].sinh_vien_id;
}

async function upsertGrade(connection, grade) {
  const [result] = await connection.query(
    `INSERT INTO grades (sinh_vien_id,mon_hoc_id,diem_chuyen_can,diem_giua_ky,diem_cuoi_ky,diem_tong_ket,ghi_chu,trang_thai)
    VALUES (?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE diem_chuyen_can=VALUES(diem_chuyen_can),diem_giua_ky=VALUES(diem_giua_ky),diem_cuoi_ky=VALUES(diem_cuoi_ky),diem_tong_ket=VALUES(diem_tong_ket),ghi_chu=VALUES(ghi_chu),trang_thai=VALUES(trang_thai)`,
    [grade.studentId, grade.courseId, ...grade.scores, grade.total, grade.note, grade.status]
  );
  return { id: result.insertId, total: grade.total };
}

router.get(
  '/health',
  asyncRoute(async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  })
);

router.get(
  '/dashboard',
  asyncRoute(async (req, res) => {
    const [[students]] = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE vai_tro='sinh_vien'"
    );
    const [[lecturers]] = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE vai_tro='giao_vien'"
    );
    const [[courses]] = await pool.query(
      "SELECT COUNT(*) AS total FROM courses WHERE trang_thai <> 'closed'"
    );
    const [[unpublished]] = await pool.query(
      "SELECT COUNT(*) AS total FROM grades WHERE trang_thai <> 'published'"
    );
    const [pending] =
      await pool.query(`SELECT p.noi_dung AS item, u.ho_ten AS owner, p.trang_thai AS status,
    DATE_FORMAT(p.han_xu_ly, '%d/%m/%Y') AS deadline FROM pending_actions p LEFT JOIN users u ON u.id=p.owner_id
    WHERE p.trang_thai <> 'done' ORDER BY p.han_xu_ly`);
    const [activity] = await pool.query(`SELECT a.noi_dung AS text,
    DATE_FORMAT(a.created_at, '%d/%m/%Y %H:%i') AS time FROM activity_logs a ORDER BY a.created_at DESC LIMIT 20`);
    res.json({
      stats: {
        students: students.total,
        lecturers: lecturers.total,
        courses: courses.total,
        unpublished: unpublished.total,
      },
      pending,
      activity,
    });
  })
);

router.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    return authController.login(req, res);
  })
);

router.use(authenticate);

router.get(
  '/users/me',
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT u.id, u.mssv AS studentId, u.ho_ten AS name, u.email,
    u.vai_tro AS role, u.nganh AS major, u.khoa_hoc AS cohort, u.khoa AS dept,
    u.so_dien_thoai AS phone, u.dia_chi AS address, u.trang_thai AS status
    FROM users u WHERE u.id=? LIMIT 1`,
      [req.auth.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    const user = rows[0];
    if (user.role === 'sinh_vien') {
      const [stats] = await pool.query(
        `SELECT COALESCE(SUM(c.tin_chi), 0) AS credits,
      ROUND(COALESCE(AVG(g.diem_tong_ket), 0) / 10 * 4, 2) AS gpa
      FROM users u LEFT JOIN grades g ON g.sinh_vien_id = u.id
      LEFT JOIN courses c ON c.id = g.mon_hoc_id
      WHERE u.id = ? AND u.vai_tro = 'sinh_vien' GROUP BY u.id`,
        [req.auth.id]
      );
      Object.assign(user, stats[0] || { credits: 0, gpa: 0 });
    }

    res.json(user);
  })
);

router.get(
  '/students/me',
  authorize('sinh_vien'),
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT u.id, u.mssv AS studentId, u.ho_ten AS name, u.email,
    u.nganh AS major, u.khoa_hoc AS cohort, u.so_dien_thoai AS phone, u.dia_chi AS address,
    u.trang_thai AS status, COALESCE(SUM(c.tin_chi), 0) AS credits,
    ROUND(COALESCE(AVG(g.diem_tong_ket), 0) / 10 * 4, 2) AS gpa
    FROM users u LEFT JOIN grades g ON g.sinh_vien_id = u.id
    LEFT JOIN courses c ON c.id = g.mon_hoc_id
    WHERE u.id = ? AND u.vai_tro = 'sinh_vien' GROUP BY u.id`,
      [req.auth.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    res.json(rows[0]);
  })
);

router.get(
  '/lecturers/me',
  authorize('giao_vien', 'admin'),
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT u.id, u.mssv AS lecturerId, u.ho_ten AS name, u.email,
    u.khoa AS dept, u.trang_thai AS status FROM users u WHERE u.id = ? AND u.vai_tro = 'giao_vien'`,
      [req.auth.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy giảng viên' });
    res.json(rows[0]);
  })
);

router.patch(
  '/users/:id/password',
  authorize('admin', 'giao_vien', 'sinh_vien'),
  asyncRoute(async (req, res) => {
    if (req.auth.role !== 'admin' && String(req.auth.id) !== String(req.params.id))
      return res.status(403).json({ message: 'Bạn chỉ được đổi mật khẩu của mình' });
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    const [rows] = await pool.query('SELECT id FROM users WHERE id=? AND mat_khau=?', [
      req.params.id,
      currentPassword,
    ]);
    if (!rows.length) return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
    await pool.query('UPDATE users SET mat_khau=? WHERE id=?', [newPassword, req.params.id]);
    res.json({ message: 'Đã đổi mật khẩu' });
  })
);

router.get(
  '/students',
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(`SELECT u.id, u.mssv AS studentId, u.ho_ten AS name, u.email,
    u.nganh AS major, u.khoa_hoc AS cohort, u.so_dien_thoai AS phone, u.dia_chi AS address, COALESCE(SUM(c.tin_chi), 0) AS credits,
    ROUND(COALESCE(AVG(g.diem_tong_ket), 0) / 10 * 4, 2) AS gpa, u.trang_thai AS status
    FROM users u LEFT JOIN grades g ON g.sinh_vien_id = u.id LEFT JOIN courses c ON c.id = g.mon_hoc_id
    WHERE u.vai_tro = 'sinh_vien' GROUP BY u.id ORDER BY u.id DESC`);
    res.json(rows);
  })
);

router.post(
  '/students',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    const {
      mssv,
      name,
      email,
      password = '123456',
      major = '',
      cohort = '',
      phone = '',
      address = '',
      status = 'active',
    } = req.body;
    if (!mssv || !name || !email)
      return res.status(400).json({ message: 'MSSV, họ tên và email là bắt buộc' });
    const [result] = await pool.query(
      `INSERT INTO users
    (ho_ten, mssv, email, mat_khau, vai_tro, nganh, khoa_hoc, so_dien_thoai, dia_chi, trang_thai)
    VALUES (?, ?, ?, ?, 'sinh_vien', ?, ?, ?, ?, ?)`,
      [name, mssv, email, password, major, cohort, phone, address, status]
    );
    res.status(201).json({ id: result.insertId });
  })
);

router.get(
  '/students/:id',
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT u.id, u.mssv AS studentId, u.ho_ten AS name, u.email, u.nganh AS major, u.khoa_hoc AS cohort, u.trang_thai AS status, u.so_dien_thoai AS phone, u.dia_chi AS address, COALESCE(SUM(c.tin_chi),0) AS credits, ROUND(COALESCE(AVG(g.diem_tong_ket),0)/10*4,2) AS gpa FROM users u LEFT JOIN grades g ON g.sinh_vien_id=u.id LEFT JOIN courses c ON c.id=g.mon_hoc_id WHERE u.id=? AND u.vai_tro='sinh_vien' GROUP BY u.id",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });
    res.json(rows[0]);
  })
);

router.put(
  '/students/:id',
  authorize('admin', 'sinh_vien'),
  asyncRoute(async (req, res) => {
    if (req.auth.role === 'sinh_vien' && String(req.auth.id) !== String(req.params.id))
      return res.status(403).json({ message: 'Bạn chỉ được sửa hồ sơ của mình' });

    const [existingRows] = await pool.query(
      "SELECT ho_ten, email, nganh, khoa_hoc, trang_thai, so_dien_thoai, dia_chi FROM users WHERE id=? AND vai_tro='sinh_vien' LIMIT 1",
      [req.params.id]
    );
    if (!existingRows.length) return res.status(404).json({ message: 'Không tìm thấy sinh viên' });

    const current = existingRows[0];
    const {
      name = current.ho_ten,
      email = current.email,
      major = current.nganh,
      cohort = current.khoa_hoc,
      status = current.trang_thai,
      phone = current.so_dien_thoai,
      address = current.dia_chi,
    } = req.body || {};

    await pool.query(
      "UPDATE users SET ho_ten=?, email=?, nganh=?, khoa_hoc=?, trang_thai=?, so_dien_thoai=?, dia_chi=? WHERE id=? AND vai_tro='sinh_vien'",
      [name, email, major, cohort, status, phone, address, req.params.id]
    );
    res.json({ message: 'Đã cập nhật sinh viên' });
  })
);

router.delete(
  '/students/:id',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    await pool.query("DELETE FROM users WHERE id=? AND vai_tro='sinh_vien'", [req.params.id]);
    res.status(204).end();
  })
);

router.get(
  '/lecturers',
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(`SELECT u.id, u.mssv AS lecturerId, u.ho_ten AS name, u.email,
    u.khoa AS dept, u.trang_thai AS status, COUNT(DISTINCT c.id) AS courses,
    COUNT(DISTINCT g.sinh_vien_id) AS students FROM users u LEFT JOIN courses c ON c.giang_vien_id=u.id
    LEFT JOIN grades g ON g.mon_hoc_id=c.id WHERE u.vai_tro='giao_vien' GROUP BY u.id ORDER BY u.id DESC`);
    res.json(rows);
  })
);

router.post(
  '/lecturers',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    const {
      lecturerId,
      name,
      email,
      password = 'gv123456',
      dept = '',
      status = 'active',
    } = req.body;
    if (!lecturerId || !name || !email)
      return res.status(400).json({ message: 'Mã, họ tên và email là bắt buộc' });
    const [result] = await pool.query(
      "INSERT INTO users (ho_ten,mssv,email,mat_khau,vai_tro,khoa,trang_thai) VALUES (?,?,?,?,'giao_vien',?,?)",
      [name, lecturerId, email, password, dept, status]
    );
    res.status(201).json({ id: result.insertId });
  })
);

router.put(
  '/lecturers/:id',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    const { name, email, dept = '', status = 'active' } = req.body;
    await pool.query(
      "UPDATE users SET ho_ten=?,email=?,khoa=?,trang_thai=? WHERE id=? AND vai_tro='giao_vien'",
      [name, email, dept, status, req.params.id]
    );
    res.json({ message: 'Đã cập nhật giảng viên' });
  })
);

router.delete(
  '/lecturers/:id',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    await pool.query("DELETE FROM users WHERE id=? AND vai_tro='giao_vien'", [req.params.id]);
    res.status(204).end();
  })
);

router.get(
  '/courses',
  asyncRoute(async (req, res) => {
    const courseFilter = req.auth.role === 'giao_vien' ? 'WHERE c.giang_vien_id=?' : '';
    const courseParams = req.auth.role === 'giao_vien' ? [req.auth.id] : [];
    const [rows] = await pool.query(
      `SELECT c.id, c.ma_mon AS code, c.ten_mon AS name, c.tin_chi AS credits,
    c.khoa AS dept, c.hoc_ky AS semester, c.trang_thai AS status, u.ho_ten AS lecturer,
    COUNT(DISTINCT cs.sinh_vien_id) AS students,
    COUNT(DISTINCT CASE WHEN g.diem_tong_ket IS NOT NULL THEN g.sinh_vien_id END) AS graded
    FROM courses c LEFT JOIN users u ON u.id=c.giang_vien_id
    LEFT JOIN course_students cs ON cs.mon_hoc_id=c.id
    LEFT JOIN grades g ON g.mon_hoc_id=c.id AND g.sinh_vien_id=cs.sinh_vien_id
    ${courseFilter} GROUP BY c.id ORDER BY c.id DESC`,
      courseParams
    );
    res.json(rows);
  })
);

router.post(
  '/courses',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    const {
      code,
      name,
      credits = 3,
      dept = '',
      semester = '',
      lecturerId = null,
      status = 'draft',
    } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'Mã và tên học phần là bắt buộc' });
    const [result] = await pool.query(
      'INSERT INTO courses (ma_mon,ten_mon,tin_chi,khoa,hoc_ky,giang_vien_id,trang_thai) VALUES (?,?,?,?,?,?,?)',
      [code, name, credits, dept, semester, lecturerId, status]
    );
    res.status(201).json({ id: result.insertId });
  })
);

router.put(
  '/courses/:id',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    const {
      code,
      name,
      credits = 3,
      dept = '',
      semester = '',
      lecturerId = null,
      status = 'draft',
    } = req.body;
    await pool.query(
      'UPDATE courses SET ma_mon=?,ten_mon=?,tin_chi=?,khoa=?,hoc_ky=?,giang_vien_id=?,trang_thai=? WHERE id=?',
      [code, name, credits, dept, semester, lecturerId, status, req.params.id]
    );
    res.json({ message: 'Đã cập nhật học phần' });
  })
);

router.delete(
  '/courses/:id',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    await pool.query('DELETE FROM courses WHERE id=?', [req.params.id]);
    res.status(204).end();
  })
);

router.get(
  '/grades',
  asyncRoute(async (req, res) => {
    const params = [];
    const conditions = [];
    if (req.query.courseId) {
      conditions.push('g.mon_hoc_id=?');
      params.push(req.query.courseId);
    }
    if (req.query.studentId) {
      conditions.push('g.sinh_vien_id=?');
      params.push(req.query.studentId);
    }
    if (req.auth.role === 'giao_vien') {
      conditions.push('c.giang_vien_id=?');
      params.push(req.auth.id);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT g.id, cs.sinh_vien_id AS studentId, u.mssv, u.ho_ten AS name,
    cs.mon_hoc_id AS courseId, c.ma_mon AS code, c.ten_mon AS courseName, g.diem_chuyen_can AS attendance,
    g.diem_giua_ky AS midterm, g.diem_cuoi_ky AS final, g.diem_tong_ket AS total, g.ghi_chu AS note,
    g.trang_thai AS status, c.tin_chi AS credits, c.hoc_ky AS semester,
    CASE WHEN g.diem_tong_ket >= 8.5 THEN 'A' WHEN g.diem_tong_ket >= 7 THEN 'B'
      WHEN g.diem_tong_ket >= 5.5 THEN 'C' WHEN g.diem_tong_ket >= 4 THEN 'D' ELSE 'F' END AS letter
    FROM course_students cs JOIN users u ON u.id=cs.sinh_vien_id JOIN courses c ON c.id=cs.mon_hoc_id
    LEFT JOIN grades g ON g.sinh_vien_id=cs.sinh_vien_id AND g.mon_hoc_id=cs.mon_hoc_id ${where.replaceAll('g.sinh_vien_id', 'cs.sinh_vien_id').replaceAll('g.mon_hoc_id', 'cs.mon_hoc_id')} ORDER BY u.mssv`,
      params
    );
    res.json(rows);
  })
);

router.get(
  '/terms',
  asyncRoute(async (req, res) => {
    const [rows] =
      await pool.query(`SELECT t.*, COUNT(DISTINCT c.id) AS courses, COUNT(DISTINCT g.sinh_vien_id) AS students
    FROM terms t LEFT JOIN courses c ON c.hoc_ky=t.ma_hoc_ky LEFT JOIN grades g ON g.mon_hoc_id=c.id
    GROUP BY t.id ORDER BY t.ngay_bat_dau DESC`);
    res.json(rows);
  })
);

router.get(
  '/exams',
  asyncRoute(async (req, res) => {
    const [rows] =
      await pool.query(`SELECT e.*, t.ma_hoc_ky AS termCode, c.ma_mon AS courseCode, c.ten_mon AS courseName
    FROM exams e JOIN terms t ON t.id=e.term_id JOIN courses c ON c.id=e.course_id ORDER BY e.bat_dau`);
    res.json(rows);
  })
);

router.post(
  '/exams',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    const { termId, courseId, name, room = '', startAt, endAt, status = 'scheduled' } = req.body;
    if (!termId || !courseId || !name || !startAt || !endAt)
      return res.status(400).json({ message: 'Học kỳ, học phần, tên và thời gian là bắt buộc' });
    const [result] = await pool.query(
      'INSERT INTO exams (term_id,course_id,ten_ky_thi,phong_thi,bat_dau,ket_thuc,trang_thai) VALUES (?,?,?,?,?,?,?)',
      [termId, courseId, name, room, startAt, endAt, status]
    );
    res.status(201).json({ id: result.insertId });
  })
);

router.get(
  '/approvals',
  asyncRoute(async (req, res) => {
    const [rows] =
      await pool.query(`SELECT c.id AS courseId, CONCAT(c.ma_mon, ' — ', c.ten_mon) AS item,
    u.ho_ten AS owner, COUNT(g.id) AS students, MAX(g.updated_at) AS sentAt, c.trang_thai AS status
    FROM courses c LEFT JOIN users u ON u.id=c.giang_vien_id LEFT JOIN grades g ON g.mon_hoc_id=c.id
    WHERE c.trang_thai IN ('review','submitted','published') GROUP BY c.id ORDER BY sentAt DESC`);
    res.json(rows);
  })
);

router.patch(
  '/approvals/:courseId',
  authorize('admin', 'giao_vien'),
  asyncRoute(async (req, res) => {
    const { status } = req.body;
    if (!['review', 'submitted', 'published', 'draft'].includes(status))
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    await assertCourseAccess(req, req.params.courseId);
    if (req.auth.role === 'giao_vien' && !['submitted', 'draft'].includes(status))
      return res
        .status(403)
        .json({ message: 'Giảng viên chỉ được gửi hoặc đưa bảng điểm về nháp' });
    await pool.query('UPDATE courses SET trang_thai=? WHERE id=?', [status, req.params.courseId]);
    await pool.query('UPDATE grades SET trang_thai=? WHERE mon_hoc_id=?', [
      status,
      req.params.courseId,
    ]);
    res.json({ message: 'Đã cập nhật trạng thái duyệt điểm' });
  })
);

router.post(
  '/terms',
  authorize('admin'),
  asyncRoute(async (req, res) => {
    const { code, name, schoolYear, startDate, endDate, status = 'upcoming' } = req.body;
    const [result] = await pool.query(
      'INSERT INTO terms (ma_hoc_ky,ten_hoc_ky,nam_hoc,ngay_bat_dau,ngay_ket_thuc,trang_thai) VALUES (?,?,?,?,?,?)',
      [code, name, schoolYear, startDate, endDate, status]
    );
    res.status(201).json({ id: result.insertId });
  })
);

router.post(
  '/grades',
  authorize('admin', 'giao_vien'),
  asyncRoute(async (req, res) => {
    const grade = normalizeGradeInput(req.body, 1);
    await assertCourseAccess(req, grade.courseId);
    grade.studentId = await assertStudentInCourse(grade.studentId, grade.courseId);
    res.status(201).json(await upsertGrade(pool, grade));
  })
);

router.post(
  '/grades/bulk',
  authorize('admin', 'giao_vien'),
  asyncRoute(async (req, res) => {
    if (!Array.isArray(req.body.grades) || !req.body.grades.length)
      return res.status(400).json({ message: 'Danh sách điểm không được để trống' });
    const grades = req.body.grades.map((input, index) => normalizeGradeInput(input, index + 1));
    const courseIds = [...new Set(grades.map((grade) => String(grade.courseId)))];
    for (const courseId of courseIds) await assertCourseAccess(req, courseId);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const grade of grades) {
        grade.studentId = await assertStudentInCourse(grade.studentId, grade.courseId);
        await upsertGrade(connection, grade);
      }
      await connection.commit();
      res.status(201).json({ saved: grades.length });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

router.post(
  '/grades/import',
  authorize('admin', 'giao_vien'),
  upload.single('file'),
  asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn file Excel' });
    let rows;
    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    } catch (error) {
      return res.status(400).json({ message: 'File Excel không hợp lệ' });
    }
    if (!rows.length) return res.status(400).json({ message: 'File Excel không có dữ liệu' });
    const courseId = req.body.courseId;
    const grades = rows.map((row, index) =>
      normalizeGradeInput(
        {
          studentId: row.studentId || row.StudentId || row.MSSV || row.mssv,
          courseId: row.courseId || row.CourseId || courseId,
          attendance: row.attendance ?? row.Attendance ?? row['Chuyên cần'],
          midterm: row.midterm ?? row.Midterm ?? row['Giữa kỳ'],
          final: row.final ?? row.Final ?? row['Cuối kỳ'],
          note: row.note ?? row.Note ?? row['Ghi chú'],
          status: req.body.status || 'draft',
        },
        index + 2
      )
    );
    const result = await (async () => {
      const response = await fetch(`${req.protocol}://${req.get('host')}/api/grades/bulk`, {
        method: 'POST',
        headers: { authorization: req.get('authorization'), 'content-type': 'application/json' },
        body: JSON.stringify({ grades }),
      });
      const body = await response.json();
      if (!response.ok) {
        const error = new Error(body.message);
        error.status = response.status;
        throw error;
      }
      return body;
    })();
    res.status(201).json({ ...result, rows: rows.length });
  })
);

router.use((error, req, res, next) => {
  console.error(error);
  res
    .status(error.status || 500)
    .json({ message: error.code === 'ER_DUP_ENTRY' ? 'Dữ liệu đã tồn tại' : 'Lỗi máy chủ' });
});

module.exports = router;
