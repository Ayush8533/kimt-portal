// =============================================
// routes/inquiry.js — Inquiry form submission handler
// =============================================
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Simple JSON-file based storage (replace with DB in production)
const INQUIRIES_FILE = path.join(__dirname, '..', 'data', 'inquiries.json');

function ensureDataDir() {
  const dir = path.dirname(INQUIRIES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(INQUIRIES_FILE)) fs.writeFileSync(INQUIRIES_FILE, '[]');
}

function saveInquiry(inquiry) {
  ensureDataDir();
  const existing = JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf8') || '[]');
  existing.push({ ...inquiry, id: Date.now(), createdAt: new Date().toISOString() });
  fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(existing, null, 2));
}

// Input validation
function validateInquiry({ name, phone, email, course, message }) {
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name = 'Full name is required (min 2 characters).';
  }

  if (!phone || !/^[6-9]\d{9}$/.test(phone.trim())) {
    errors.phone = 'A valid 10-digit Indian mobile number is required.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }

  if (name && name.trim().length > 100) {
    errors.name = 'Name is too long.';
  }

  if (message && message.trim().length > 1000) {
    errors.message = 'Message is too long (max 1000 characters).';
  }

  return errors;
}

// POST /api/inquiry
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, course, message } = req.body;

    const errors = validateInquiry({ name, phone, email, course, message });
    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ success: false, errors });
    }

    const inquiry = {
      name: name.trim(),
      phone: phone.trim(),
      email: (email || '').trim() || null,
      course: course || 'Not specified',
      message: (message || '').trim() || null,
      ip: req.ip
    };

    // Save to file storage
    try {
      saveInquiry(inquiry);
    } catch (saveErr) {
      console.error('Failed to save inquiry:', saveErr.message);
      // Don't fail the request just because file save failed
    }

    // Build WhatsApp deep-link for the college team
    const waMsg = encodeURIComponent(
      `🔔 New Inquiry from KIMT Website\n\n` +
      `Name: ${inquiry.name}\n` +
      `Phone: ${inquiry.phone}\n` +
      `Email: ${inquiry.email || 'Not provided'}\n` +
      `Course: ${inquiry.course}\n` +
      `Message: ${inquiry.message || 'No message'}\n\n` +
      `Received: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    );
    const whatsappUrl = `https://wa.me/919084147587?text=${waMsg}`;

    res.json({
      success: true,
      message: 'Inquiry received! Our team will contact you soon.',
      whatsappUrl
    });

  } catch (err) {
    console.error('Inquiry route error:', err.message);
    res.status(500).json({ success: false, error: 'Server error. Please call us at +91 9084147587.' });
  }
});

// GET /api/inquiry — for admin (protected by token)
router.get('/', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    ensureDataDir();
    const inquiries = JSON.parse(fs.readFileSync(INQUIRIES_FILE, 'utf8') || '[]');
    res.json({ success: true, total: inquiries.length, inquiries });
  } catch (err) {
    res.status(500).json({ error: 'Could not read inquiries.' });
  }
});

module.exports = router;
