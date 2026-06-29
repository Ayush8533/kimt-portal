const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const { Admin } = require('../models/Others');

const signToken = (id, type = 'Student') =>
  jwt.sign({ id, type }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── STUDENT SIGNUP ─────────────────────────────
router.post('/Student/signup', async (req, res) => {
  try {
    const { name, email, phone, password, course, session } = req.body;

    if (!name || !email || !phone || !password || !course) {
      return res.status(400).json({ error: 'Saari required fields bharo.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password kam se kam 6 characters ka hona chahiye.' });
    }

    const exists = await Student.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Yeh email already registered hai.' });

    const student = await Student.create({
      name, email, phone, password, course,
      session: session || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1 - 2000),
      admissionYear: new Date().getFullYear()
    });

    const token = signToken(student._id, 'Student');
    res.status(201).json({
      success: true,
      message: 'Account ban gaya! Admin se verification ke baad poora access milega.',
      token,
      student: student.toJSON()
    });
  } catch (err) {
    console.error('Student signup error:', err);
    res.status(500).json({ error: 'Server error. Dobara try karo.' });
  }
});

// ── STUDENT LOGIN ──────────────────────────────
router.post('/Student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email aur password dono chahiye.' });
    }

    const student = await Student.findOne({ email: email.toLowerCase() }).select('+password');
    if (!student) return res.status(401).json({ error: 'Email ya password galat hai.' });
    if (!student.isActive) return res.status(401).json({ error: 'Account deactivate hai. Admin se contact karo.' });

    const isMatch = await student.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Email ya password galat hai.' });

    const token = signToken(student._id, 'Student');
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      student: student.toJSON()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── ADMIN LOGIN ────────────────────────────────
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email aur password chahiye.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });
    if (!admin.isActive) return res.status(401).json({ error: 'Account disabled.' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken(admin._id, 'admin');
    res.json({
      success: true,
      message: 'Admin login successful!',
      token,
      admin: admin.toJSON()
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});


// ── CHANGE PASSWORD ───────────────────────────
router.put('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Login required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current aur New Password dono required hain.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password minimum 6 characters ka hona chahiye.'
      });
    }

    let user;

    if (decoded.type === 'admin') {
      user = await Admin.findById(decoded.id).select('+password');
    } else {
      user = await Student.findById(decoded.id).select('+password');
    }

    if (!user) {
      return res.status(404).json({ error: 'User nahi mila.' });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Current password galat hai.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password successfully change ho gaya.'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Password change nahi hua.'
    });
  }
});

// ── GET CURRENT USER ───────────────────────────
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Not logged in.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'admin') {
      const admin = await Admin.findById(decoded.id);
      return res.json({ success: true, type: 'admin', user: admin });
    } else {
      const student = await Student.findById(decoded.id);
      return res.json({ success: true, type: 'student', user: student });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid token.' });
  }
});

module.exports = router;
