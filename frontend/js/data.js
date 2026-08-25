/* =========================================================
   MOCK DATA — dùng chung cho toàn bộ demo UI
   (Trong dự án thật, dữ liệu này sẽ lấy từ API /api/... )
   ========================================================= */

const MOCK = {
  students: [
    { id: "22110234", name: "Nguyễn Văn An",   major: "CNTT",        cohort: "K19", credits: 96,  gpa: 3.42, status: "active" },
    { id: "22110567", name: "Trần Thị Bích",   major: "CN Đa phương tiện", cohort: "K19", credits: 88,  gpa: 3.15, status: "active" },
    { id: "21109981", name: "Lê Hoàng Cường",  major: "CNTT",        cohort: "K18", credits: 118, gpa: 2.68, status: "active" },
    { id: "22110812", name: "Phạm Thu Duyên",  major: "Kỹ thuật phần mềm", cohort: "K19", credits: 92,  gpa: 3.71, status: "active" },
    { id: "20108845", name: "Vũ Minh Đức",     major: "CNTT",        cohort: "K17", credits: 130, gpa: 3.05, status: "graduated" },
    { id: "22110099", name: "Đặng Ngọc Hà",    major: "CN Đa phương tiện", cohort: "K19", credits: 70,  gpa: 2.41, status: "warning" },
    { id: "21109456", name: "Bùi Quang Huy",   major: "Kỹ thuật phần mềm", cohort: "K18", credits: 104, gpa: 3.28, status: "active" },
    { id: "22110678", name: "Hồ Thị Kim Liên", name2:"", major: "CNTT", cohort: "K19", credits: 84,  gpa: 3.55, status: "active" },
  ],

  lecturers: [
    { id: "GV0231", name: "TS. Nguyễn Văn A", dept: "Khoa CNTT",        courses: 2, students: 108, status: "active" },
    { id: "GV0187", name: "ThS. Trần Thị B",  dept: "Khoa CN Đa phương tiện", courses: 3, students: 142, status: "active" },
    { id: "GV0304", name: "PGS. Lê Văn C",    dept: "Khoa CNTT",        courses: 1, students: 62,  status: "active" },
  ],

  courses: [
    { code: "IT4409", name: "Lập trình Web",        credits: 3, dept: "Khoa CNTT", lecturer: "TS. Nguyễn Văn A", semester: "2026 — HK1", students: 62, status: "entering" },
    { code: "IT4062", name: "Cơ sở dữ liệu",         credits: 3, dept: "Khoa CNTT", lecturer: "PGS. Lê Văn C",   semester: "2026 — HK1", students: 58, status: "review" },
    { code: "MM3201", name: "Thiết kế đồ họa số",    credits: 2, dept: "Khoa CN Đa phương tiện", lecturer: "ThS. Trần Thị B", semester: "2026 — HK1", students: 46, status: "published" },
    { code: "MA1101", name: "Giải tích 1",           credits: 3, dept: "Khoa Khoa học cơ bản", lecturer: "—", semester: "2026 — HK1", students: 210, status: "draft" },
    { code: "MM3305", name: "Kỹ xảo điện ảnh",       credits: 3, dept: "Khoa CN Đa phương tiện", lecturer: "ThS. Trần Thị B", semester: "2026 — HK1", students: 38, status: "published" },
  ],

  // Bảng điểm chi tiết cho lớp IT4409 — dùng cho màn hình Nhập điểm
  classIT4409: [
    { mssv: "22110234", name: "Nguyễn Văn An",  attendance: 9.0, midterm: 8.0, final: 8.5, note: "" },
    { mssv: "22110567", name: "Trần Thị Bích",  attendance: 8.5, midterm: 7.5, final: 9.0, note: "" },
    { mssv: "22110812", name: "Phạm Thu Duyên", attendance: 10,  midterm: 9.0, final: 9.5, note: "" },
    { mssv: "22110099", name: "Đặng Ngọc Hà",   attendance: 6.0, midterm: 4.0, final: null, note: "Chưa nộp bài cuối kỳ" },
    { mssv: "22110678", name: "Hồ Thị Kim Liên",attendance: 9.5, midterm: 8.5, final: 8.0, note: "" },
    { mssv: "21109981", name: "Lê Hoàng Cường",  attendance: 7.0, midterm: 5.5, final: 6.0, note: "" },
    { mssv: "21109456", name: "Bùi Quang Huy",  attendance: 8.0, midterm: 7.0, final: 7.5, note: "" },
  ],

  // Bảng điểm tra cứu của sinh viên hiện tại (demo: Nguyễn Văn An)
  myGrades: [
    { code: "IT4409", name: "Lập trình Web",       credits: 3, qt: 9.0, gk: 8.0, ck: 8.5, total: 8.4, letter: "A",  semester: "2026-HK1", status: "published" },
    { code: "IT4062", name: "Cơ sở dữ liệu",        credits: 3, qt: 8.0, gk: 7.5, ck: 8.0, total: 7.8, letter: "B+", semester: "2026-HK1", status: "published" },
    { code: "MA1101", name: "Giải tích 1",          credits: 3, qt: null, gk: null, ck: null, total: null, letter: "—", semester: "2026-HK1", status: "draft" },
    { code: "IT3103", name: "Cấu trúc dữ liệu",     credits: 4, qt: 8.5, gk: 8.0, ck: 9.0, total: 8.5, letter: "A",  semester: "2025-HK2", status: "published" },
    { code: "IT2035", name: "Toán rời rạc",         credits: 3, qt: 7.0, gk: 6.5, ck: 7.0, total: 6.8, letter: "B",  semester: "2025-HK2", status: "published" },
    { code: "PE1010", name: "Giáo dục thể chất 1",  credits: 1, qt: 9.0, gk: 9.0, ck: null, total: 9.0, letter: "A",  semester: "2025-HK1", status: "published" },
  ],

  timeline: [
    { term: "2025 — Học kỳ 1", credits: 18, gpa: 3.21 },
    { term: "2025 — Học kỳ 2", credits: 20, gpa: 3.45 },
    { term: "2026 — Học kỳ 1", credits: 15, gpa: 3.42 },
  ],

  activity: [
    { text: "Nguyễn Văn A cập nhật điểm IT4409 — Lập trình Web", time: "10 phút trước" },
    { text: "Trần Thị B công bố điểm MM3201 — Thiết kế đồ họa số", time: "48 phút trước" },
    { text: "Admin duyệt bảng điểm IT4062 — Cơ sở dữ liệu", time: "2 giờ trước" },
    { text: "Lê Văn C gửi bảng điểm IT4062 để duyệt", time: "5 giờ trước" },
  ],

  pending: [
    { item: "Điểm HK1 — IT4062 chưa duyệt",       owner: "PGS. Lê Văn C",   status: "under_review", deadline: "26/08/2026" },
    { item: "MA1101 — Giải tích 1 chưa nhập điểm", owner: "Chưa phân công", status: "draft",         deadline: "30/08/2026" },
    { item: "MM3305 — chờ công bố điểm",           owner: "ThS. Trần Thị B", status: "submitted",     deadline: "24/08/2026" },
  ],
};

function gradeLevel(score) {
  if (score === null || score === undefined) return { label: "—", cls: "neutral" };
  if (score >= 8.5) return { label: "A", cls: "success" };
  if (score >= 7.0) return { label: "B", cls: "success" };
  if (score >= 5.5) return { label: "C", cls: "warning" };
  if (score >= 4.0) return { label: "D", cls: "warning" };
  return { label: "F", cls: "danger" };
}

function statusBadge(status) {
  const map = {
    active:       { label: "Đang học",     cls: "success" },
    graduated:    { label: "Đã tốt nghiệp", cls: "info" },
    warning:      { label: "Cảnh báo học vụ", cls: "danger" },
    draft:        { label: "Nháp",          cls: "neutral" },
    entering:     { label: "Đang nhập",     cls: "warning" },
    review:       { label: "Đang duyệt",    cls: "info" },
    submitted:    { label: "Đã gửi",        cls: "info" },
    under_review: { label: "Đang chờ duyệt", cls: "warning" },
    published:    { label: "Đã công bố",    cls: "success" },
    locked:       { label: "Đã khóa",       cls: "neutral" },
  };
  return map[status] || { label: status, cls: "neutral" };
}