const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Cần đăng nhập để tiếp tục' });

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET || 'change-this-secret');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
    next();
  };
}

module.exports = { authenticate, authorize };
