const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: String,
  code: String,
  maxMarks: Number,
  obtainedMarks: Number,
  grade: String,
  status: { type: String, enum: ['Pass', 'Fail', 'Absent'], default: 'Pass' }
});

const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentNo: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  semester: { type: Number, required: true },
  session: { type: String, required: true }, // "2024-25"
  examType: { type: String, enum: ['Mid Term', 'End Term', 'Practical', 'Internal'], default: 'End Term' },

  subjects: [subjectSchema],

  totalMarks: { type: Number },
  obtainedMarks: { type: Number },
  percentage: { type: Number },
  grade: { type: String },
  result: { type: String, enum: ['Pass', 'Fail', 'Compartment', 'Absent'], default: 'Pass' },
  rank: { type: Number },

  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
