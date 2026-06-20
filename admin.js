const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
const Student = require('../models/Student');
const Result = require('../models/Result');
const Fee = require('../models/Fee');
const { Attendance, Notice, Admin, Inquiry } = require('../models/Others');

router.use(protectAdmin);

// ── DASHBOARD STATS ───────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalStudents, activeStudents, totalInquiries, newInquiries,
           unpaidFees, totalNotices] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isActive: true }),
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ status: 'New' }),
      Fee.countDocuments({ status: { $in: ['Unpaid', 'Overdue'] } }),
      Notice.countDocuments({ isActive: true })
    ]);

    // Recent inquiries
    const recentInquiries = await Inquiry.find().sort({ createdAt: -1 }).limit(5);
    // Recent students
    const recentStudents = await Student.find().sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      stats: { totalStudents, activeStudents, totalInquiries, newInquiries, unpaidFees, totalNotices },
      recentInquiries,
      recentStudents
    });
  } catch (err) {
    res.status(500).json({ error: 'Stats load nahi hue.' });
  }
});

// ── STUDENTS ──────────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const { search, course, isActive, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { enrollmentNo: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
    if (course) query.course = course;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const total = await Student.countDocuments(query);
    const students = await Student.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), students });
  } catch (err) {
    res.status(500).json({ error: 'Students load nahi hue.' });
  }
});

router.get('/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student nahi mila.' });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ error: 'Student load nahi hua.' });
  }
});

router.post('/students', async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json({ success: true, message: 'Student add ho gaya!', student });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists.' });
    res.status(500).json({ error: 'Student add nahi hua: ' + err.message });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!student) return res.status(404).json({ error: 'Student nahi mila.' });
    res.json({ success: true, message: 'Student update ho gaya!', student });
  } catch (err) {
    res.status(500).json({ error: 'Update nahi hua.' });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Student deactivate ho gaya.' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi hua.' });
  }
});

// ── RESULTS ───────────────────────────────────
router.get('/results', async (req, res) => {
  try {
    const { course, semester, session } = req.query;
    const query = {};
    if (course) query.course = course;
    if (semester) query.semester = Number(semester);
    if (session) query.session = session;

    const results = await Result.find(query).populate('student', 'name enrollmentNo').sort({ createdAt: -1 });
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Results load nahi hue.' });
  }
});

router.post('/results', async (req, res) => {
  try {
    const result = await Result.create({ ...req.body, publishedBy: req.admin._id });
    res.status(201).json({ success: true, message: 'Result add ho gaya!', result });
  } catch (err) {
    res.status(500).json({ error: 'Result add nahi hua: ' + err.message });
  }
});

router.put('/results/:id/publish', async (req, res) => {
  try {
    const result = await Result.findByIdAndUpdate(req.params.id,
      { isPublished: true, publishedAt: new Date(), publishedBy: req.admin._id },
      { new: true }
    );
    res.json({ success: true, message: 'Result publish ho gaya!', result });
  } catch (err) {
    res.status(500).json({ error: 'Publish nahi hua.' });
  }
});

router.delete('/results/:id', async (req, res) => {
  try {
    await Result.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Result delete ho gaya.' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi hua.' });
  }
});

// ── FEES ──────────────────────────────────────
router.get('/fees', async (req, res) => {
  try {
    const { status, course, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (course) query.course = course;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { enrollmentNo: { $regex: search, $options: 'i' } }
    ];

    const fees = await Fee.find(query).populate('student', 'name phone').sort({ createdAt: -1 });
    const totalCollected = await Fee.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    res.json({
      success: true,
      fees,
      totalCollected: totalCollected[0]?.total || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Fees load nahi hui.' });
  }
});

router.post('/fees', async (req, res) => {
  try {
    const fee = await Fee.create(req.body);
    res.status(201).json({ success: true, message: 'Fee record add ho gaya!', fee });
  } catch (err) {
    res.status(500).json({ error: 'Fee add nahi hua: ' + err.message });
  }
});

router.put('/fees/:id', async (req, res) => {
  try {
    const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!fee) return res.status(404).json({ error: 'Fee record nahi mila.' });
    res.json({ success: true, message: 'Fee update ho gaya!', fee });
  } catch (err) {
    res.status(500).json({ error: 'Update nahi hua.' });
  }
});

// ── NOTICES ───────────────────────────────────
router.get('/notices', async (req, res) => {
  try {
    const notices = await Notice.find().sort({ isPinned: -1, createdAt: -1 });
    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ error: 'Notices load nahi hue.' });
  }
});

router.post('/notices', async (req, res) => {
  try {
    const notice = await Notice.create({ ...req.body, postedBy: req.admin._id });
    res.status(201).json({ success: true, message: 'Notice post ho gaya!', notice });
  } catch (err) {
    res.status(500).json({ error: 'Notice post nahi hua.' });
  }
});

router.put('/notices/:id', async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: 'Notice update ho gaya!', notice });
  } catch (err) {
    res.status(500).json({ error: 'Update nahi hua.' });
  }
});

router.delete('/notices/:id', async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notice delete ho gaya.' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi hua.' });
  }
});

// ── INQUIRIES ─────────────────────────────────
router.get('/inquiries', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const inquiries = await Inquiry.find(query).sort({ createdAt: -1 });
    res.json({ success: true, inquiries });
  } catch (err) {
    res.status(500).json({ error: 'Inquiries load nahi hui.' });
  }
});

router.put('/inquiries/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: 'Inquiry update ho gayi!', inquiry });
  } catch (err) {
    res.status(500).json({ error: 'Update nahi hua.' });
  }
});

// ── ATTENDANCE ────────────────────────────────
router.post('/attendance', async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const saved = await Attendance.insertMany(
      records.map(r => ({ ...r, markedBy: req.admin._id }))
    );
    res.status(201).json({ success: true, message: `${saved.length} attendance records save ho gaye!` });
  } catch (err) {
    res.status(500).json({ error: 'Attendance save nahi hua.' });
  }
});

module.exports = router;
