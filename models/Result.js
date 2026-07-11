const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: '' },

  internalObtained: { type: Number, default: 0 },
  internalTotal: { type: Number, default: 0 },
  externalObtained: { type: Number, default: 0 },
  externalTotal: { type: Number, default: 0 },

  maxMarks: { type: Number, default: 100 },
  obtainedMarks: { type: Number, required: true },
  grade: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Pass', 'Fail', 'Absent'],
    default: 'Pass'
  }
}, { _id: false });

const resultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  enrollmentNo: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  course: { type: String, required: true, trim: true },

  // Each subject is stored as one Result document.
  // This keeps old records compatible while allowing one form to submit many subjects.
  subject: { type: String, required: true, trim: true },
  subjectCode: { type: String, trim: true, default: '' },

  semester: { type: Number, required: true },
  session: { type: String, required: true, trim: true },

  examType: {
    type: String,
    enum: [
      'Main',
      'Re-Appear',
      'Special',
      'Mid Term',
      'End Term',
      'End Semester',
      'Practical',
      'Internal'
    ],
    default: 'Main'
  },

  internalObtained: { type: Number, default: 0 },
  internalTotal: { type: Number, default: 0 },
  externalObtained: { type: Number, default: 0 },
  externalTotal: { type: Number, default: 0 },

  maxMarks: { type: Number, default: 100 },
  marksObtained: { type: Number, required: true },
  isPassed: { type: Boolean, default: true },

  // Old bulk-format compatibility
  subjects: [subjectSchema],

  totalMarks: { type: Number },
  obtainedMarks: { type: Number },
  percentage: { type: Number },
  grade: { type: String },
  result: {
    type: String,
    enum: ['Pass', 'Fail', 'Compartment', 'Absent'],
    default: 'Pass'
  },
  rank: { type: Number },

  publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
