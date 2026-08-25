function gradeLevel(score) {
  if (score === null || score === undefined) return { label: '—', cls: 'neutral' };
  if (score >= 8.5) return { label: 'A', cls: 'success' };
  if (score >= 7) return { label: 'B', cls: 'success' };
  if (score >= 5.5) return { label: 'C', cls: 'warning' };
  if (score >= 4) return { label: 'D', cls: 'warning' };
  return { label: 'F', cls: 'danger' };
}

function statusBadge(status) {
  const map = { active: ['Đang học', 'success'], graduated: ['Đã tốt nghiệp', 'info'], warning: ['Cảnh báo học vụ', 'danger'], draft: ['Nháp', 'neutral'], entering: ['Đang nhập', 'warning'], review: ['Đang duyệt', 'info'], submitted: ['Đã gửi', 'info'], under_review: ['Đang chờ duyệt', 'warning'], published: ['Đã công bố', 'success'], locked: ['Đã khóa', 'neutral'] };
  const [label, cls] = map[status] || [status || '—', 'neutral'];
  return { label, cls };
}
