const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  course: { type: String, required: true },
  semester: { type: Number, required: true },
  session: { type: String }, // "2024-25"
  subject: { type: String, required: true },
  examType: { type: String, default: 'End Semester' },

  maxMarks: { type: Number, default: 100 },
  marksObtained: { type: Number, required: true },
  grade: { type: String },
  isPassed: { type: Boolean, default: true },
  rank: { type: Number },

  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
