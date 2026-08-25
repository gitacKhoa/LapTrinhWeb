const pool = require('../config/db');

async function findByAccount(account) {
  const [rows] = await pool.query(
    'SELECT id, ho_ten, mssv, email, mat_khau, vai_tro, trang_thai FROM users WHERE mssv = ? OR email = ? LIMIT 1',
    [account, account]
  );
  return rows[0] || null;
}

async function updatePassword(id, passwordHash) {
  await pool.query('UPDATE users SET mat_khau=? WHERE id=?', [passwordHash, id]);
}

module.exports = { findByAccount, updatePassword };
