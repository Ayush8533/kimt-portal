const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  // Login credentials
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },

  // Personal info
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  fatherName: { type: String, trim: true },
  motherName: { type: String, trim: true },
  dob: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  address: { type: String },
  photo: { type: String }, // file path

  // Academic info
  enrollmentNo: { type: String, unique: true, sparse: true },
  course: { type: String, required: true },
  branch: { type: String },
  semester: { type: Number, default: 1 },
  session: { type: String }, // e.g. "2024-25"
  admissionYear: { type: Number },
  rollNo: { type: String },

  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  // Documents
  documents: {
    idCard: { type: String },
    admitCard: { type: String },
    marksheet: { type: String }
  }
}, { timestamps: true });

// Hash password before save
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
studentSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
studentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Student', studentSchema);
