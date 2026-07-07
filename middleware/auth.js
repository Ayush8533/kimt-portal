const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const { Admin } = require('../models/Others');

const JWT_SECRET = process.env.JWT_SECRET || 'kimt_secret_2026';

// ── PROTECT STUDENT ───────────────────────────
exports.protectStudent = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] ||
                  req.cookies?.studentToken;
    if (!token) return res.status(401).json({ error: 'Login required.' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const student = await Student.findById(decoded.id);
    if (!student || !student.isActive)
      return res.status(401).json({ error: 'Account not found or deactivated.' });

    req.student = student;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
  }
};

// ── PROTECT ADMIN ─────────────────────────────
exports.protectAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] ||
                  req.cookies?.adminToken;
    if (!token) return res.status(401).json({ error: 'Admin login required.' });

    const decoded = jwt.verify(token, JWT_SECRET);

    // Support both role-based and type-based tokens
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin' && decoded.type !== 'admin')
      return res.status(403).json({ error: 'Access denied. Admin only.' });

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive)
      return res.status(401).json({ error: 'Admin account not found or deactivated.' });

    req.admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ── SUPERADMIN ONLY ───────────────────────────
exports.superAdminOnly = (req, res, next) => {
  if (req.admin?.role !== 'superadmin')
    return res.status(403).json({ error: 'Superadmin access required.' });
  next();
};