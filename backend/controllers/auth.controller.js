const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

const roleMap = { student: 'sinh_vien', lecturer: 'giao_vien', admin: 'admin' };

async function login(req, res) {
  const { account, password, role } = req.body;
  const databaseRole = roleMap[role];
  if (!databaseRole || !account || !password) {
    return res.status(400).json({ message: 'Tài khoản, mật khẩu và vai trò là bắt buộc' });
  }

  const user = await userModel.findByAccount(account);
  if (!user || user.vai_tro !== databaseRole || user.trang_thai !== 'active') {
    return res.status(401).json({ message: 'Tài khoản, mật khẩu hoặc vai trò không đúng' });
  }

  const validPassword = user.mat_khau.startsWith('$2')
    ? await bcrypt.compare(password, user.mat_khau)
    : password === user.mat_khau;
  if (!validPassword)
    return res.status(401).json({ message: 'Tài khoản, mật khẩu hoặc vai trò không đúng' });

  if (!user.mat_khau.startsWith('$2')) {
    await userModel.updatePassword(user.id, await bcrypt.hash(password, 12));
  }

  const token = jwt.sign(
    { id: user.id, role: user.vai_tro },
    process.env.JWT_SECRET || 'change-this-secret',
    { expiresIn: '8h' }
  );
  delete user.mat_khau;
  res.json({ token, user });
}

module.exports = { login };
