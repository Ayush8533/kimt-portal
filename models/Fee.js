const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  enrollmentNo: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  course: { type: String, required: true, trim: true },
  semester: { type: Number },
  session: { type: String },

  feeType: {
    type: String,
    enum: [
      'Total',
      'Total Fee',
      'Institute Fee',
      'Tuition Fee',
      'Exam Fee',
      'Library Fee',
      'Hostel Fee',
      'Sports Fee',
      'Other'
    ],
    default: 'Tuition Fee'
  },

  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
  dueAmount: { type: Number, default: 0, min: 0 },
  dueDate: { type: Date },

  status: {
    type: String,
    enum: ['Paid', 'Partial', 'Unpaid', 'Overdue'],
    default: 'Unpaid'
  },
  paymentMode: {
    type: String,
    enum: ['Online', 'Cash', 'DD', 'Cheque'],
    default: 'Online'
  },
  transactionId: { type: String, trim: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  paidAt: { type: Date },

  receiptNo: { type: String, unique: true, sparse: true },
  remarks: { type: String }
}, { timestamps: true });

feeSchema.pre('save', function (next) {
  const total = Number(this.totalAmount) || 0;
  const paid = Number(this.paidAmount) || 0;

  this.totalAmount = total;
  this.paidAmount = paid;
  this.dueAmount = Math.max(total - paid, 0);

  if (this.dueAmount <= 0) {
    this.status = 'Paid';
    if (paid > 0 && !this.paidAt) this.paidAt = new Date();
  } else if (paid > 0) {
    this.status = 'Partial';
  } else {
    this.status = 'Unpaid';
  }

  next();
});

module.exports = mongoose.model('Fee', feeSchema);
