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
      examType,
      semester,
      session,
      isPublished,
      subjects
    } = req.body;

    if (!enrollmentNo) {
      return res.status(400).json({ error: 'Enrollment No. missing hai.' });
    }

    if (!session || !String(session).trim()) {
      return res.status(400).json({ error: 'Session missing hai.' });
    }

    if (!Array.isArray(subjects) || !subjects.length) {
      return res.status(400).json({ error: 'Kam se kam ek subject add karo.' });
    }

    const foundStudent = await Student.findOne({
      enrollmentNo: String(enrollmentNo).trim()
    });

    if (!foundStudent) {
      return res.status(404).json({
        error: 'Is enrollment number ka student nahi mila.'
      });
    }

    const publishNow =
      isPublished === true ||
      isPublished === 'true';

    const common = {
      student: foundStudent._id,
      enrollmentNo: foundStudent.enrollmentNo,
      name: foundStudent.name,
      course: foundStudent.course,
      examType: examType || 'Main',
      semester: Number(semester),
      session: String(session).trim(),
      isPublished: publishNow,
      publishedAt: publishNow ? new Date() : undefined,
      publishedBy: req.admin._id
    };

    const documents = subjects.map((item, index) => {
      const subject = String(item.subject || item.name || '').trim();

      if (!subject) {
        throw new Error(`Subject ${index + 1} ka naam missing hai.`);
      }

      const internalObtained = Number(item.internalObtained) || 0;
      const internalTotal = Number(item.internalTotal) || 0;
      const externalObtained = Number(item.externalObtained) || 0;
      const externalTotal = Number(item.externalTotal) || 0;

      const marksObtained =
        item.marksObtained !== '' &&
        item.marksObtained !== undefined &&
        item.marksObtained !== null
          ? Number(item.marksObtained)
          : internalObtained + externalObtained;

      const maxMarks =
        item.maxMarks !== '' &&
        item.maxMarks !== undefined &&
        item.maxMarks !== null
          ? Number(item.maxMarks)
          : (internalTotal + externalTotal || 100);

      if (marksObtained < 0 || maxMarks <= 0 || marksObtained > maxMarks) {
        throw new Error(
          `${subject}: marks 0 se total marks ke beech hone chahiye.`
        );
      }

      const percentage = (marksObtained / maxMarks) * 100;
      const passed = marksObtained >= maxMarks * 0.33;

      const grade =
        String(item.grade || '').trim() ||
        (
          percentage >= 75 ? 'A' :
          percentage >= 60 ? 'B' :
          percentage >= 45 ? 'C' :
          passed ? 'D' : 'F'
        );

      return {
        ...common,
        subject,
        subjectCode: String(item.subjectCode || item.code || '').trim(),
        internalObtained,
        internalTotal,
        externalObtained,
        externalTotal,
        marksObtained,
        maxMarks,
        totalMarks: maxMarks,
        obtainedMarks: marksObtained,
        percentage: Number(percentage.toFixed(2)),
        grade,
        isPassed: passed,
        result: passed ? 'Pass' : 'Fail'
      };
    });

    const savedResults = await Result.insertMany(documents);

    res.status(201).json({
      success: true,
      message: `${savedResults.length} subject result add ho gaye!`,
      results: savedResults
    });
  } catch (err) {
    console.error('ADD MULTI RESULT ERROR:', err);
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
      totalAmount,
      paidAmount,
      dueAmount,
      paymentMode,
      transactionId
    } = req.body;

    if (!enrollmentNo || !String(enrollmentNo).trim()) {
      return res.status(400).json({
        error: 'Enrollment No. missing hai.'
      });
    }

    const student = await Student.findOne({
      enrollmentNo: String(enrollmentNo).trim()
    });

    if (!student) {
      return res.status(404).json({
        error: 'Is enrollment number ka student nahi mila.'
      });
    }

    const paid = Math.max(Number(paidAmount) || 0, 0);
    const enteredDue = Math.max(Number(dueAmount) || 0, 0);

    // New form totalAmount bhejta hai. Old form ke liye paid + due fallback hai.
    const total = Math.max(
      Number(totalAmount) || (paid + enteredDue),
      0
    );

    if (total <= 0) {
      return res.status(400).json({
        error: 'Total amount 0 se zyada hona chahiye.'
      });
    }

    if (paid > total) {
      return res.status(400).json({
        error: 'Paid amount total amount se zyada nahi ho sakta.'
      });
    }

    const allowedFeeTypes = [
      'Total',
      'Total Fee',
      'Institute Fee',
      'Tuition Fee',
      'Exam Fee',
      'Library Fee',
      'Hostel Fee',
      'Sports Fee',
      'Other'
    ];

    const selectedFeeType = allowedFeeTypes.includes(feeType)
      ? feeType
      : 'Other';

    const fee = await Fee.create({
      student: student._id,
      name: student.name,
      enrollmentNo: student.enrollmentNo,
      course: student.course,
      semester: student.semester,
      session: student.session,

      feeType: selectedFeeType,
      totalAmount: total,
      paidAmount: paid,
      paymentMode: paymentMode || 'Online',
      transactionId: String(transactionId || '').trim()
    });

    res.status(201).json({
      success: true,
      message: 'Fee record add ho gaya!',
      fee
    });
  } catch (err) {
    console.error('ADD FEE ERROR:', err);
    res.status(500).json({
      error: 'Fee add nahi hua: ' + err.message
    });
  }
});

router.put('/fees/:id', async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee record nahi mila.' });

    const total = Math.max(Number(req.body.totalAmount) || 0, 0);
    const paid = Math.max(Number(req.body.paidAmount) || 0, 0);

    if (total <= 0) return res.status(400).json({ error: 'Total amount 0 se zyada hona chahiye.' });
    if (paid > total) return res.status(400).json({ error: 'Paid amount total amount se zyada nahi ho sakta.' });

    fee.feeType = req.body.feeType || fee.feeType;
    fee.totalAmount = total;
    fee.paidAmount = paid;
    fee.paymentMode = req.body.paymentMode || fee.paymentMode || 'Online';
    fee.transactionId = String(req.body.transactionId || '').trim();

    await fee.save();

    res.json({ success: true, message: 'Fee record update ho gaya!', fee });
  } catch (err) {
    res.status(500).json({ error: 'Fee update nahi hui: ' + err.message });
  }
});

router.delete('/fees/:id', async (req, res) => {
  try {
    const fee = await Fee.findByIdAndDelete(req.params.id);
    if (!fee) return res.status(404).json({ error: 'Fee record nahi mila.' });

    res.json({ success: true, message: 'Fee record permanently delete ho gaya.' });
  } catch (err) {
    res.status(500).json({ error: 'Fee delete nahi hui: ' + err.message });
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