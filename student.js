const express = require('express');
const router = express.Router();
const { protectStudent } = require('../middleware/auth');
const Student = require('../models/Student');
const Result = require('../models/Result');
const Fee = require('../models/Fee');
const { Attendance, Notice } = require('../models/Others');

// All routes require student login
router.use(protectStudent);

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
