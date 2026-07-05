const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ── Create upload folders if not exist ────────
['uploads/photos', 'uploads/documents', 'uploads/materials'].forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// ── Security ──────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ─────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/chat', rateLimit({ windowMs: 1 * 60 * 1000, max: 20 }));

// ── Static Files ──────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Database ──────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await seedAdmin();
  })
  .catch(err => console.error('❌ MongoDB error:', err.message));

async function seedAdmin() {
  try {
    const { Admin } = require('./models/Others');
    const exists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (!exists) {
      await Admin.create({
        name: 'KIMT Admin',
        email: process.env.ADMIN_EMAIL || 'admin@kimt.edu.in',
        password: process.env.ADMIN_PASSWORD || 'Admin@KIMT2026',
        role: 'superadmin'
      });
      console.log('✅ Default admin created:', process.env.ADMIN_EMAIL);
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

// ── API Routes ────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/chat',    rateLimit({ windowMs: 60000, max: 20 }), require('./routes/chat'));
app.use('/api/inquiry', require('./routes/inquiry'));

// ── PDF Receipt Route ─────────────────────────
const { protectStudent } = require('./middleware/auth');
const { generateFeeReceipt } = require('./utils/pdfGenerator');
const Fee = require('./models/Fee');

app.get('/api/student/fees/:id/download', protectStudent, async (req, res) => {
  try {
    const fee = await Fee.findOne({ _id: req.params.id, student: req.student._id });
    if (!fee) return res.status(404).json({ error: 'Fee record nahi mila.' });

    const receiptData = {
      receiptNo: fee._id.toString().slice(-8).toUpperCase(),
      studentName: req.student.name,
      enrollmentNo: req.student.enrollmentNo || 'N/A',
      course: req.student.course,
      semester: req.student.semester,
      feeType: fee.feeType || 'Tuition Fee',
      amount: fee.paidAmount,
      dueAmount: fee.dueAmount || 0,
      paymentDate: fee.createdAt,
      paymentMode: fee.paymentMode || 'Online',
      session: req.student.session || '2024-25',
      transactionId: fee.transactionId || 'N/A'
    };

    const pdfBuffer = await generateFeeReceipt(receiptData);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="KIMT-Receipt-${receiptData.receiptNo}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF error:', err.message);
    res.status(500).json({ error: 'PDF generate nahi hua.' });
  }
});

// ── Health Check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'KIMT Complete System v2.0', timestamp: new Date().toISOString() });
});

// ── Serve HTML Pages ──────────────────────────
app.get('/student/profile',    (req, res) => res.sendFile(path.join(__dirname, 'public/student/profile.html')));
app.get('/student/fees',       (req, res) => res.sendFile(path.join(__dirname, 'public/student/fees.html')));
app.get('/student/result',     (req, res) => res.sendFile(path.join(__dirname, 'public/student/result.html')));
app.get('/student/attendance', (req, res) => res.sendFile(path.join(__dirname, 'public/student/attendance.html')));
app.get('/student/notices',    (req, res) => res.sendFile(path.join(__dirname, 'public/student/notices.html')));
app.get('/student/material',   (req, res) => res.sendFile(path.join(__dirname, 'public/student/material.html')));

app.get('/student/*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/student/index.html'))
);

app.get('/admin-panel/dashboard.html', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/admin/dashboard.html'))
);
app.get('/admin-panel/*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/admin/index.html'))
);

app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/index.html'))
);

// ── Error Handler ─────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`🚀 KIMT Server running at http://localhost:${PORT}`);
});

module.exports = app;
