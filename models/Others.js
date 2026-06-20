const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Attendance ────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentNo: String,
  course: String,
  semester: Number,
  subject: String,
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

// ── Notice ────────────────────────────────────
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['General', 'Exam', 'Fee', 'Admission', 'Event', 'Holiday'], default: 'General' },
  targetAudience: { type: String, enum: ['All', 'Students', 'Staff'], default: 'All' },
  isActive: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
  attachment: { type: String },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  expiresAt: { type: Date }
}, { timestamps: true });

// ── Admin ─────────────────────────────────────
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'admin', 'staff'], default: 'admin' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (pwd) {
  return await bcrypt.compare(pwd, this.password);
};

adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// ── Inquiry ───────────────────────────────────
const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  course: { type: String },
  message: { type: String },
  status: { type: String, enum: ['New', 'Contacted', 'Admitted', 'Not Interested'], default: 'New' },
  notes: { type: String },
  source: { type: String, default: 'Website' }
}, { timestamps: true });

module.exports = {
  Attendance: mongoose.model('Attendance', attendanceSchema),
  Notice: mongoose.model('Notice', noticeSchema),
  Admin: mongoose.model('Admin', adminSchema),
  Inquiry: mongoose.model('Inquiry', inquirySchema)
};
