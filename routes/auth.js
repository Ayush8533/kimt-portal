// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const { Admin } = require('../models/Others');
const { generateEnrollmentNo } = require('../utils/enrollmentGenerator');

const JWT_SECRET = process.env.JWT_SECRET || 'kimt_secret_2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function signToken(id, role) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ── STUDENT SIGNUP ────────────────────────────
router.post('/student/signup', async (req, res) => {
  try {
    const { name, phone, email, course, password, admissionYear } = req.body;

    if (!name || !phone || !email || !course || !password)
      return res.status(400).json({ error: 'Saare fields zaroori hain.' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password kam se kam 6 characters ka hona chahiye.' });

    const exists = await Student.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(400).json({ error: 'Ye email already registered hai.' });

    // ── AUTO ENROLLMENT NUMBER ────────────────
    const year = admissionYear || new Date().getFullYear();
    const enrollmentNo = await generateEnrollmentNo(course, year);
    // ─────────────────────────────────────────

    const student = await Student.create({
      name,
      phone,
      email,
      course,
      password,
      admissionYear: year,
      enrollmentNo,       // ← auto generated
      semester: 1,
      isActive: true,
      isVerified: false
    });

    const token = signToken(student._id, 'student');

    res.status(201).json({
      success: true,
      message: `Registration ho gaya! Enrollment No: ${enrollmentNo}`,
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        course: student.course,
        enrollmentNo: student.enrollmentNo,
        semester: student.semester
      }
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Registration nahi ho paya. Dobara try karo.' });
  }
});

// ── STUDENT LOGIN ─────────────────────────────
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email aur password dono daalo.' });

    const student = await Student.findOne({ email: email.toLowerCase() }).select('+password');
    if (!student)
      return res.status(401).json({ error: 'Email ya password galat hai.' });

    if (!student.isActive)
      return res.status(403).json({ error: 'Account deactivate hai. Admin se contact karo.' });

    const isMatch = await student.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ error: 'Email ya password galat hai.' });

    const token = signToken(student._id, 'student');

    res.json({
      success: true,
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        course: student.course,
        enrollmentNo: student.enrollmentNo,
        semester: student.semester,
        photo: student.photo
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login nahi hua. Dobara try karo.' });
  }
});

// ── ADMIN LOGIN ───────────────────────────────
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email aur password dono daalo.' });

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin)
      return res.status(401).json({ error: 'Admin nahi mila.' });

    if (!admin.isActive)
      return res.status(403).json({ error: 'Account deactivate hai.' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ error: 'Password galat hai.' });

    const token = signToken(admin._id, 'admin');

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login nahi hua.' });
  }
});

// ── FORGOT PASSWORD ───────────────────────────
router.post('/student/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const student = await Student.findOne({ email: email?.toLowerCase() });
    // Always return success (security best practice)
    res.json({ success: true, message: 'Agar email registered hai toh reset link bhej diya gaya hai.' });

    if (student) {
      const resetToken = jwt.sign({ id: student._id }, JWT_SECRET, { expiresIn: '1h' });
      // TODO: email bhejo with reset link
      // await sendResetEmail(student.email, resetToken);
      console.log(`Reset token for ${email}:`, resetToken);
    }
  } catch (err) {
    res.status(500).json({ error: 'Kuch error aaya.' });
  }
});

// ── CHANGE PASSWORD ───────────────────────────
router.post('/student/change-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ error: 'Token aur new password zaroori hai.' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const student = await Student.findById(decoded.id).select('+password');
    if (!student)
      return res.status(404).json({ error: 'Student nahi mila.' });

    student.password = newPassword;
    await student.save();

    res.json({ success: true, message: 'Password change ho gaya!' });
  } catch (err) {
    res.status(400).json({ error: 'Token invalid ya expire ho gaya.' });
  }
});

// ── GENERATE ENROLLMENT (Admin use) ──────────
// Admin manually kisi student ka enrollment generate kar sake
router.post('/admin/generate-enrollment', async (req, res) => {
  try {
    const { studentId, course, admissionYear } = req.body;
    if (!studentId || !course)
      return res.status(400).json({ error: 'studentId aur course zaroori hai.' });

    const student = await Student.findById(studentId);
    if (!student)
      return res.status(404).json({ error: 'Student nahi mila.' });

    if (student.enrollmentNo)
      return res.status(400).json({ error: `Enrollment already assign hai: ${student.enrollmentNo}` });

    const enrollmentNo = await generateEnrollmentNo(course, admissionYear);
    student.enrollmentNo = enrollmentNo;
    await student.save();

    res.json({ success: true, enrollmentNo, message: `Enrollment assign ho gaya: ${enrollmentNo}` });
  } catch (err) {
    res.status(500).json({ error: 'Enrollment generate nahi hua.' });
  }
});

module.exports = router;