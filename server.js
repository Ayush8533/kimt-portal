const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Auto-create first admin
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
app.use('/api/auth', require('./routes/auth'));
app.use('/api/student', require('./routes/student'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/chat', rateLimit({ windowMs: 60000, max: 20 }), require('./routes/chat'));
app.use('/api/inquiry', require('./routes/inquiry'));

// ── Health Check ──────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'KIMT Complete System v2.0', timestamp: new Date().toISOString() });
});
// ── Serve HTML pages ──────────────────────────

app.get('/student/*', (req, res) => 
  res.sendFile(path.join(__dirname, 'public', 'student', 'index.html'))
);


// Admin dashboard page
app.get('/admin-panel/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});


// Admin login page
app.get('/admin-panel/*', (req, res) => 
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'))
);


app.get('*', (req, res) => 
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
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
