const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  enrollmentNo: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  semester: { type: Number },
  session: { type: String },

  // Fee breakdown
  feeType: { type: String, enum: ['Total', 'Tuition Fee', 'Exam Fee', 'Library Fee', 'Hostel Fee', 'Sports Fee', 'Other'], default: 'Tuition Fee' },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number },
  dueDate: { type: Date },

  // Payment info
  status: { type: String, enum: ['Paid', 'Partial', 'Unpaid', 'Overdue'], default: 'Unpaid' },
  paymentMode: { type: String, enum: ['Online', 'Cash', 'DD', 'Cheque'] },
  transactionId: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  paidAt: { type: Date },

  // Receipt
  receiptNo: { type: String, unique: true, sparse: true },
  remarks: { type: String }
}, { timestamps: true });

// Auto calculate due amount
feeSchema.pre('save', function (next) {
  this.dueAmount = this.totalAmount - this.paidAmount;
  if (this.dueAmount <= 0) this.status = 'Paid';
  else if (this.paidAmount > 0) this.status = 'Partial';
  next();
});

module.exports = mongoose.model('Fee', feeSchema);
