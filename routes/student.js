const express = require('express');
const router = express.Router();
const { protectStudent } = require('../middleware/auth');
const Student = require('../models/Student');
const Result = require('../models/Result');
const Fee = require('../models/Fee');
const { Attendance, Notice } = require('../models/Others');

const multer = require('multer');const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protectStudent } = require('../middleware/auth');
const Student = require('../models/Student');
const Result = require('../models/Result');
const Fee = require('../models/Fee');
const { Attendance, Notice, StudyMaterial } = require('../models/Others');

// All routes require student login
router.use(protectStudent);

// ── MULTER CONFIG (Photo Upload) ──────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `student_${req.student._id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Sirf JPG, PNG, WEBP allowed hai.'));
  }
});

// ── PROFILE ───────────────────────────────────
router.get('/profile', (req, res) => {
  res.json({ success: true, student: req.student });
});

router.put('/profile', async (req, res) => {
  try {
    const allowed = ['phone', 'address', 'fatherName', 'motherName'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    const student = await Student.findByIdAndUpdate(req.student._id, updates, { new: true });
    res.json({ success: true, message: 'Profile update ho gaya!', student });
  } catch (err) {
    res.status(500).json({ error: 'Profile update nahi hua.' });
  }
});

// ── PHOTO UPLOAD ──────────────────────────────
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Photo select karo.' });

    // Delete old photo if exists
    const student = await Student.findById(req.student._id);
    if (student.photo) {
      const oldPath = path.join(__dirname, '../uploads/photos', student.photo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const filename = req.file.filename;
    await Student.findByIdAndUpdate(req.student._id, { photo: filename });
    res.json({ success: true, message: 'Photo upload ho gaya!', photo: `/uploads/photos/${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Photo upload failed.' });
  }
});

// ── RESULTS ───────────────────────────────────
router.get('/results', async (req, res) => {
  try {
    const results = await Result.find({
      student: req.student._id,
      isPublished: true
    }).sort({ semester: -1, createdAt: -1 });
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Results load nahi hue.' });
  }
});

router.get('/results/:id', async (req, res) => {
  try {
    const result = await Result.findOne({
      _id: req.params.id,
      student: req.student._id,
      isPublished: true
    });
    if (!result) return res.status(404).json({ error: 'Result nahi mila.' });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: 'Result load nahi hua.' });
  }
});

// ── FEES ──────────────────────────────────────
router.get('/fees', async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.student._id }).sort({ createdAt: -1 });
    const totalDue = fees.reduce((sum, f) => sum + (f.dueAmount || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    res.json({ success: true, fees, summary: { totalDue, totalPaid } });
  } catch (err) {
    res.status(500).json({ error: 'Fee records load nahi hue.' });
  }
});

// Fee Receipt data (for PDF)
router.get('/fees/:id/receipt', async (req, res) => {
  try {
    const fee = await Fee.findOne({ _id: req.params.id, student: req.student._id });
    if (!fee) return res.status(404).json({ error: 'Receipt nahi mili.' });
    res.json({
      success: true,
      receipt: {
        receiptNo: fee._id.toString().slice(-8).toUpperCase(),
        studentName: req.student.name,
        enrollmentNo: req.student.enrollmentNo || 'N/A',
        course: req.student.course,
        semester: req.student.semester,
        feeType: fee.feeType || 'Tuition Fee',
        amount: fee.paidAmount,
        dueAmount: fee.dueAmount,
        paymentDate: fee.createdAt,
        paymentMode: fee.paymentMode || 'Online',
        session: req.student.session || '2024-25',
        transactionId: fee.transactionId || 'N/A'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Receipt load nahi hui.' });
  }
});

// ── ATTENDANCE ────────────────────────────────
router.get('/attendance', async (req, res) => {
  try {
    const { subject, month } = req.query;
    const query = { student: req.student._id };
    if (subject) query.subject = subject;
    if (month) {
      const start = new Date(month + '-01');
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      query.date = { $gte: start, $lte: end };
    }
    const records = await Attendance.find(query).sort({ date: -1 });
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    res.json({
      success: true, records,
      summary: { total, present, absent: total - present, percentage }
    });
  } catch (err) {
    res.status(500).json({ error: 'Attendance load nahi hui.' });
  }
});

// ── NOTICES ───────────────────────────────────
router.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find({
      isActive: true,
      targetAudience: { $in: ['All', 'Students'] },
      $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }]
    }).sort({ isPinned: -1, createdAt: -1 }).limit(20);
    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ error: 'Notices load nahi hue.' });
  }
});

// ── STUDY MATERIAL ────────────────────────────
router.get('/materials', async (req, res) => {
  try {
    const { subject } = req.query;
    const query = {
      course: req.student.course,
      semester: req.student.semester,
      isActive: true
    };
    if (subject) query.subject = subject;
    const materials = await StudyMaterial.find(query).sort({ createdAt: -1 });
    res.json({ success: true, materials });
  } catch (err) {
    res.status(500).json({ error: 'Study material load nahi hua.' });
  }
});

// ── DOCUMENTS ─────────────────────────────────
router.get('/documents', (req, res) => {
  const docs = req.student.documents || {};
  res.json({
    success: true,
    documents: {
      idCard: docs.idCard ? `/uploads/${docs.idCard}` : null,
      admitCard: docs.admitCard ? `/uploads/${docs.admitCard}` : null,
      marksheet: docs.marksheet ? `/uploads/${docs.marksheet}` : null,
    }
  });
});

// ── DASHBOARD SUMMARY ─────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const [fees, results, attendance, notices] = await Promise.all([
      Fee.find({ student: req.student._id }),
      Result.find({ student: req.student._id, isPublished: true }),
      Attendance.find({ student: req.student._id }),
      Notice.find({
        isActive: true,
        targetAudience: { $in: ['All', 'Students'] },
        $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }]
      }).limit(5).sort({ isPinned: -1, createdAt: -1 })
    ]);

    const totalPaid = fees.reduce((s, f) => s + (f.paidAmount || 0), 0);
    const totalDue = fees.reduce((s, f) => s + (f.dueAmount || 0), 0);
    const present = attendance.filter(r => r.status === 'Present').length;
    const attendancePct = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

    res.json({
      success: true,
      summary: {
        feeSummary: { totalPaid, totalDue },
        resultCount: results.length,
        attendancePercentage: attendancePct,
        noticeCount: notices.length,
        recentNotices: notices
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Summary load nahi hua.' });
  }
});

module.exports = router;

const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'students');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `student-${req.student._id}-${Date.now()}${ext}`);
  }
});

const uploadPhoto = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return cb(new Error('Sirf JPG, PNG ya WEBP photo upload karo.'));
    cb(null, true);
  }
});

// All routes require student login
router.use(protectStudent);

// ── PROFILE ───────────────────────────────────
router.get('/profile', (req, res) => {
  const student = req.student.toJSON ? req.student.toJSON() : req.student;
  if (student.photo) student.photoUrl = `/uploads/students/${student.photo}`;
  res.json({ success: true, student });
});

router.put('/profile', async (req, res) => {
  try {
    const allowed = ['phone', 'address', 'fatherName', 'motherName'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const student = await Student.findByIdAndUpdate(req.student._id, updates, { new: true });
    res.json({ success: true, message: 'Profile update ho gaya!', student });
  } catch (err) {
    res.status(500).json({ error: 'Profile update nahi hua.' });
  }
});

router.post('/profile/photo', uploadPhoto.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Photo select karo.' });

    if (req.student.photo) {
      const oldPath = path.join(uploadDir, req.student.photo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const student = await Student.findByIdAndUpdate(
      req.student._id,
      { photo: req.file.filename },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Photo upload ho gayi!',
      photoUrl: `/uploads/students/${student.photo}`,
      student
    });
  } catch (err) {
    res.status(500).json({ error: 'Photo upload nahi hui.' });
  }
});

// ── RESULTS ───────────────────────────────────
router.get('/results', async (req, res) => {
  try {
    const results = await Result.find({
      student: req.student._id,
      isPublished: true
    }).sort({ semester: -1, createdAt: -1 });

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Results load nahi hue.' });
  }
});

router.get('/results/:id', async (req, res) => {
  try {
    const result = await Result.findOne({
      _id: req.params.id,
      student: req.student._id,
      isPublished: true
    });
    if (!result) return res.status(404).json({ error: 'Result nahi mila.' });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: 'Result load nahi hua.' });
  }
});

// ── FEES ──────────────────────────────────────
router.get('/fees', async (req, res) => {
  try {
    const fees = await Fee.find({ student: req.student._id }).sort({ createdAt: -1 });
    const totalDue = fees.reduce((sum, f) => sum + (f.dueAmount || 0), 0);
    const totalPaid = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);

    res.json({ success: true, fees, summary: { totalDue, totalPaid } });
  } catch (err) {
    res.status(500).json({ error: 'Fee records load nahi hue.' });
  }
});

// ── ATTENDANCE ────────────────────────────────
router.get('/attendance', async (req, res) => {
  try {
    const { subject, month } = req.query;
    const query = { student: req.student._id };
    if (subject) query.subject = subject;
    if (month) {
      const start = new Date(month + '-01');
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      query.date = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(query).sort({ date: -1 });
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    res.json({
      success: true,
      records,
      summary: { total, present, absent: total - present, percentage }
    });
  } catch (err) {
    res.status(500).json({ error: 'Attendance load nahi hui.' });
  }
});

// ── NOTICES ───────────────────────────────────
router.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find({
      isActive: true,
      targetAudience: { $in: ['All', 'Students'] },
      $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }]
    }).sort({ isPinned: -1, createdAt: -1 }).limit(20);

    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ error: 'Notices load nahi hue.' });
  }
});

// ── DOCUMENTS ─────────────────────────────────
router.get('/documents', (req, res) => {
  const docs = req.student.documents || {};
  res.json({
    success: true,
    documents: {
      idCard: docs.idCard ? `/uploads/${docs.idCard}` : null,
      admitCard: docs.admitCard ? `/uploads/${docs.admitCard}` : null,
      marksheet: docs.marksheet ? `/uploads/${docs.marksheet}` : null,
    }
  });
});

module.exports = router;
