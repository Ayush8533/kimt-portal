const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
adminSchema.methods.comparePassword = async function (p) {
  return bcrypt.compare(p, this.password);
};
adminSchema.methods.toJSON = function () {
  const o = this.toObject(); delete o.password; return o;
};

// ── NOTICE ────────────────────────────────────
const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['General', 'Exam', 'Fee', 'Event', 'Holiday', 'Urgent'], default: 'General' },
  targetAudience: { type: String, enum: ['All', 'Students', 'Faculty', 'Admin'], default: 'All' },
  isPinned: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  attachmentUrl: { type: String },
  postedBy: { type: String, default: 'Admin' }
}, { timestamps: true });

// ── ATTENDANCE ────────────────────────────────
const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
  markedBy: { type: String }
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
  fileUrl: { type: String },         // uploaded file path
  externalLink: { type: String },    // YouTube / Drive link
  type: { type: String, enum: ['PDF', 'Video', 'Link', 'Notes', 'Assignment'], default: 'PDF' },
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
  const o = this.toObject(); delete o.password; return o;
};

module.exports = {
  Admin: mongoose.model('Admin', adminSchema),
  Notice: mongoose.model('Notice', noticeSchema),
  Attendance: mongoose.model('Attendance', attendanceSchema),
  News: mongoose.model('News', newsSchema),
  Gallery: mongoose.model('Gallery', gallerySchema),
  StudyMaterial: mongoose.model('StudyMaterial', studyMaterialSchema),
  Faculty: mongoose.model('Faculty', facultySchema)
};
