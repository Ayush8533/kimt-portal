const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── ATTENDANCE ────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentNo: String,
  course: String,
  semester: Number,
  subject: String,
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
  markedBy: { type: String }
}, { timestamps: true });

// ── NOTICE ────────────────────────────────────
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: {
    type: String,
    enum: ['General', 'Exam', 'Fee', 'Admission', 'Event', 'Holiday', 'Urgent'],
    default: 'General'
  },
  targetAudience: {
    type: String,
    enum: ['All', 'Students', 'Faculty', 'Staff'],
    default: 'All'
  },
  isActive: { type: Boolean, default: true },
  isPinned: { type: Boolean, default: false },
  attachmentUrl: { type: String },
  attachment: { type: String }, // backward compat
  postedBy: { type: String, default: 'Admin' },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

// ── ADMIN ─────────────────────────────────────
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

// ── INQUIRY ───────────────────────────────────
const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  course: { type: String },
  message: { type: String },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Admitted', 'Not Interested', 'Rejected'],
    default: 'New'
  },
  notes: { type: String },
  source: { type: String, default: 'Website' }
}, { timestamps: true });

// ── NEWS ──────────────────────────────────────
const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  imageUrl: { type: String },
  isPublished: { type: Boolean, default: true },
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// ── GALLERY ───────────────────────────────────
const gallerySchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  category: { type: String, default: 'General' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// ── STUDY MATERIAL ────────────────────────────
const studyMaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  course: { type: String, required: true },
  semester: { type: Number, required: true },
  description: { type: String },
  fileUrl: { type: String },
  externalLink: { type: String },
  type: {
    type: String,
    enum: ['PDF', 'Video', 'Link', 'Notes', 'Assignment'],
    default: 'PDF'
  },
  uploadedBy: { type: String, default: 'Admin' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// ── FACULTY ───────────────────────────────────
const facultySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String },
  department: { type: String },
  designation: { type: String },
  subjects: [{ type: String }],
  photo: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

facultySchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
facultySchema.methods.comparePassword = async function (p) {
  return bcrypt.compare(p, this.password);
};
facultySchema.methods.toJSON = function () {
  const o = this.toObject();
  delete o.password;
  return o;
};

// ── EXPORTS ───────────────────────────────────
module.exports = {
  Attendance:    mongoose.model('Attendance',    attendanceSchema),
  Notice:        mongoose.model('Notice',        noticeSchema),
  Admin:         mongoose.model('Admin',         adminSchema),
  Inquiry:       mongoose.model('Inquiry',       inquirySchema),
  News:          mongoose.model('News',          newsSchema),
  Gallery:       mongoose.model('Gallery',       gallerySchema),
  StudyMaterial: mongoose.model('StudyMaterial', studyMaterialSchema),
  Faculty:       mongoose.model('Faculty',       facultySchema)
};