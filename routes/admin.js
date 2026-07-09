const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protectAdmin } = require('../middleware/auth');
const Student = require('../models/Student');
const Result = require('../models/Result');
const Fee = require('../models/Fee');
const { Attendance, Notice, Admin, Inquiry, News, Gallery, Faculty, StudyMaterial } = require('../models/Others');
const { generateEnrollmentNo } = require('../utils/enrollmentGenerator');

router.use(protectAdmin);

// ── MULTER SETUP ──────────────────────────────
function makeUploader(folder, maxMB = 5) {
  const dir = path.join(__dirname, `../uploads/${folder}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dir),
      filename: (req, file, cb) => cb(null, `${folder}_${Date.now()}${path.extname(file.originalname)}`)
    }),
    limits: { fileSize: maxMB * 1024 * 1024 }
  });
}

// ── DASHBOARD STATS ───────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalStudents, activeStudents, totalInquiries, newInquiries,
           unpaidFees, totalNotices, totalFaculty, totalNews] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isActive: true }),
      Inquiry.countDocuments(),
      Inquiry.countDocuments({ status: 'New' }),
      Fee.countDocuments({ dueAmount: { $gt: 0 } }),
      Notice.countDocuments({ isActive: true }),
      Faculty.countDocuments({ isActive: true }),
      News.countDocuments({ isPublished: true })
    ]);

    const recentInquiries = await Inquiry.find().sort({ createdAt: -1 }).limit(5);
    const recentStudents = await Student.find().sort({ createdAt: -1 }).limit(5);

    // Fee collection this month
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const monthlyFees = await Fee.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]);

    res.json({
      success: true,
      stats: { totalStudents, activeStudents, totalInquiries, newInquiries, unpaidFees, totalNotices, totalFaculty, totalNews },
      monthlyFeeCollection: monthlyFees[0]?.total || 0,
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
    const { course, admissionYear } = req.body;
    // Auto-generate enrollment number
    if (!req.body.enrollmentNo && course) {
      req.body.enrollmentNo = await generateEnrollmentNo(course, admissionYear);
    }
    const student = await Student.create(req.body);
    res.status(201).json({ success: true, message: `Student add ho gaya! Enrollment: ${student.enrollmentNo}`, student });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists.' });
    res.status(500).json({ error: 'Student add nahi hua: ' + err.message });
  }
});

router.put('/students/:id', async (req, res) => {
  try {
    // Enrollment number ko edit ke time change nahi hone dena
    delete req.body.enrollmentNo;
    delete req.body._id;
    delete req.body.createdAt;
    delete req.body.updatedAt;

    // Agar password blank aaye to purana password same rahe
    if (!req.body.password) delete req.body.password;

    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!student) return res.status(404).json({ error: 'Student nahi mila.' });

    res.json({ success: true, message: 'Student update ho gaya!', student });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email ya phone already exists.' });
    }
    res.status(500).json({ error: 'Update nahi hua: ' + err.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) return res.status(404).json({ error: 'Student nahi mila.' });

    res.json({
      success: true,
      message: `Student "${student.name}" permanently delete ho gaya.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi hua: ' + err.message });
  }
});

// ── FACULTY ───────────────────────────────────
router.get('/faculty', async (req, res) => {
  try {
    const { search, department } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } }
    ];
    if (department) query.department = department;
    const faculty = await Faculty.find(query).sort({ createdAt: -1 });
    res.json({ success: true, faculty });
  } catch (err) {
    res.status(500).json({ error: 'Faculty load nahi hui.' });
  }
});

router.post('/faculty', async (req, res) => {
  try {
    const faculty = await Faculty.create(req.body);
    res.status(201).json({ success: true, message: 'Faculty add ho gayi!', faculty });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists.' });
    res.status(500).json({ error: 'Faculty add nahi hui: ' + err.message });
  }
});

router.put('/faculty/:id', async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!faculty) return res.status(404).json({ error: 'Faculty member nahi mila.' });
    res.json({ success: true, message: 'Faculty update ho gayi!', faculty });
  } catch (err) {
    res.status(500).json({ error: 'Update nahi hua.' });
  }
});

router.delete('/faculty/:id', async (req, res) => {
  try {
    await Faculty.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Faculty member deactivate ho gaya.' });
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
    const {
      enrollmentNo,
      subject,
      subjectCode,
      examType,
      semester,
      session,
      maxMarks,
      marksObtained,
      grade,
      internalObtained,
      internalTotal,
      externalObtained,
      externalTotal,
      isPublished
    } = req.body;

    if (!enrollmentNo) return res.status(400).json({ error: 'Enrollment No. missing hai.' });
    if (!subject) return res.status(400).json({ error: 'Subject missing hai.' });
    if (!session) return res.status(400).json({ error: 'Session missing hai.' });

    const foundStudent = await Student.findOne({
      enrollmentNo: enrollmentNo.trim()
    });

    if (!foundStudent) {
      return res.status(404).json({ error: 'Is enrollment number ka student nahi mila.' });
    }

    const max = Number(maxMarks) || 100;
    const obtained = Number(marksObtained) || 0;
    const percent = max > 0 ? (obtained / max) * 100 : 0;
    const passed = obtained >= max * 0.33;
    const publishNow = isPublished === true || isPublished === 'true';

    const result = await Result.create({
      student: foundStudent._id,
      enrollmentNo: foundStudent.enrollmentNo,
      name: foundStudent.name,
      course: foundStudent.course,

      subject: subject.trim(),
      subjectCode: subjectCode || '',
      examType: examType || 'Main',
      semester: Number(semester),
      session: session.trim(),

      internalObtained: Number(internalObtained) || 0,
      internalTotal: Number(internalTotal) || 0,
      externalObtained: Number(externalObtained) || 0,
      externalTotal: Number(externalTotal) || 0,

      maxMarks: max,
      marksObtained: obtained,
      totalMarks: max,
      obtainedMarks: obtained,
      percentage: Number(percent.toFixed(2)),
      grade: grade || (percent >= 75 ? 'A' : percent >= 60 ? 'B' : percent >= 45 ? 'C' : passed ? 'D' : 'F'),
      isPassed: passed,
      result: passed ? 'Pass' : 'Fail',
      isPublished: publishNow,
      publishedAt: publishNow ? new Date() : undefined,
      publishedBy: req.admin._id
    });

    res.status(201).json({
      success: true,
      message: 'Result add ho gaya!',
      result
    });

  } catch (err) {
    res.status(500).json({
      error: 'Result add nahi hua: ' + err.message
    });
  }
});


// Bulk result upload
router.post('/results/bulk', async (req, res) => {
  try {
    const { results } = req.body;
    if (!Array.isArray(results) || !results.length)
      return res.status(400).json({ error: 'Results array zaroori hai.' });
    const saved = await Result.insertMany(
      results.map(r => ({ ...r, publishedBy: req.admin._id }))
    );
    res.status(201).json({ success: true, message: `${saved.length} results upload ho gaye!`, count: saved.length });
  } catch (err) {
    res.status(500).json({ error: 'Bulk upload nahi hua: ' + err.message });
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
    const { status, course, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status === 'due') query.dueAmount = { $gt: 0 };
    else if (status === 'paid') query.dueAmount = 0;

    const fees = await Fee.find(query)
      .populate('student', 'name phone enrollmentNo course')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalCollected = await Fee.aggregate([
      { $group: { _id: null, total: { $sum: '$paidAmount' }, due: { $sum: '$dueAmount' } } }
    ]);

    res.json({
      success: true, fees,
      summary: {
        totalCollected: totalCollected[0]?.total || 0,
        totalDue: totalCollected[0]?.due || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Fees load nahi hui.' });
  }
});

router.post('/fees', async (req, res) => {
  try {
    const {
      enrollmentNo,
      feeType,
      paidAmount,
      dueAmount,
      paymentMode,
      transactionId
    } = req.body;

    if (!enrollmentNo) {
      return res.status(400).json({ error: 'Enrollment No. missing hai.' });
    }

    const student = await Student.findOne({
      enrollmentNo: enrollmentNo.trim()
    });

    if (!student) {
      return res.status(404).json({
        error: 'Is enrollment number ka student nahi mila.'
      });
    }

    const paid = Number(paidAmount) || 0;
    const due = Number(dueAmount) || 0;
    const total = paid + due;

    const fee = await Fee.create({
      student: student._id,
      name: student.name,
      enrollmentNo: student.enrollmentNo,
      course: student.course,
      semester: student.semester,
      session: student.session,

      feeType: feeType || 'Tuition Fee',
      paidAmount: paid,
      dueAmount: due,
      totalAmount: total,
      paymentMode: paymentMode || 'Cash',
      transactionId: transactionId || ''
    });

    res.status(201).json({
      success: true,
      message: 'Fee record add ho gaya!',
      fee
    });

  } catch (err) {
    res.status(500).json({
      error: 'Fee add nahi hua: ' + err.message
    });
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
    const notice = await Notice.create({ ...req.body, postedBy: req.admin.name || 'Admin' });
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

// ── NEWS ──────────────────────────────────────
router.get('/news', async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    res.json({ success: true, news });
  } catch (err) {
    res.status(500).json({ error: 'News load nahi hua.' });
  }
});

router.post('/news', async (req, res) => {
  try {
    const news = await News.create(req.body);
    res.status(201).json({ success: true, message: 'News add ho gayi!', news });
  } catch (err) {
    res.status(500).json({ error: 'News add nahi hui.' });
  }
});

router.put('/news/:id', async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, message: 'News update ho gayi!', news });
  } catch (err) {
    res.status(500).json({ error: 'Update nahi hua.' });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    await News.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'News delete ho gayi.' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi hua.' });
  }
});

// ── GALLERY ───────────────────────────────────
const galleryUpload = makeUploader('gallery', 5);

router.get('/gallery', async (req, res) => {
  try {
    const gallery = await Gallery.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, gallery });
  } catch (err) {
    res.status(500).json({ error: 'Gallery load nahi hui.' });
  }
});

router.post('/gallery', galleryUpload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file ? `/uploads/gallery/${req.file.filename}` : req.body.imageUrl;
    if (!imageUrl) return res.status(400).json({ error: 'Image zaroori hai.' });
    const item = await Gallery.create({ title: req.body.title, imageUrl, category: req.body.category || 'General' });
    res.status(201).json({ success: true, message: 'Image add ho gayi!', item });
  } catch (err) {
    res.status(500).json({ error: 'Gallery add nahi hua.' });
  }
});

router.delete('/gallery/:id', async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);
    if (item?.imageUrl?.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', item.imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await Gallery.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Image delete ho gayi.' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi hua.' });
  }
});

// ── STUDY MATERIAL ────────────────────────────
const materialUpload = makeUploader('materials', 20);

router.get('/materials', async (req, res) => {
  try {
    const { course, semester, subject } = req.query;
    const query = {};
    if (course) query.course = course;
    if (semester) query.semester = Number(semester);
    if (subject) query.subject = { $regex: subject, $options: 'i' };
    const materials = await StudyMaterial.find(query).sort({ createdAt: -1 });
    res.json({ success: true, materials });
  } catch (err) {
    res.status(500).json({ error: 'Materials load nahi hue.' });
  }
});

router.post('/materials', materialUpload.single('file'), async (req, res) => {
  try {
    const fileUrl = req.file ? req.file.filename : null;
    const material = await StudyMaterial.create({
      ...req.body,
      fileUrl,
      uploadedBy: req.admin.name || 'Admin'
    });
    res.status(201).json({ success: true, message: 'Material upload ho gaya!', material });
  } catch (err) {
    res.status(500).json({ error: 'Material upload nahi hua: ' + err.message });
  }
});

router.delete('/materials/:id', async (req, res) => {
  try {
    const mat = await StudyMaterial.findById(req.params.id);
    if (mat?.fileUrl) {
      const filePath = path.join(__dirname, '../uploads/materials', mat.fileUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await StudyMaterial.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Material delete ho gaya.' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi hua.' });
  }
});

// ── ATTENDANCE ────────────────────────────────
router.post('/attendance', async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const saved = await Attendance.insertMany(
      records.map(r => ({ ...r, markedBy: req.admin.name || 'Admin' }))
    );
    res.status(201).json({ success: true, message: `${saved.length} records save ho gaye!` });
  } catch (err) {
    res.status(500).json({ error: 'Attendance save nahi hua.' });
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

module.exports = router;