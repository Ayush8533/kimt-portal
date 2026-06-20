const express = require('express');
const router = express.Router();
const { protectStudent } = require('../middleware/auth');
const Fee = require('../models/Fee');

// ── CREATE ORDER ──────────────────────────────
router.post('/create-order', protectStudent, async (req, res) => {
  try {
    const { feeId } = req.body;
    const fee = await Fee.findOne({ _id: feeId, student: req.student._id });
    if (!fee) return res.status(404).json({ error: 'Fee record nahi mila.' });
    if (fee.status === 'Paid') return res.status(400).json({ error: 'Yeh fee already paid hai.' });

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const order = await razorpay.orders.create({
      amount: fee.dueAmount * 100, // paise mein
      currency: 'INR',
      receipt: `kimt_${feeId}_${Date.now()}`,
      notes: {
        studentName: req.student.name,
        enrollmentNo: req.student.enrollmentNo || '',
        feeType: fee.feeType,
        semester: fee.semester
      }
    });

    // Save order ID
    await Fee.findByIdAndUpdate(feeId, { razorpayOrderId: order.id });

    res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
      student: {
        name: req.student.name,
        email: req.student.email,
        phone: req.student.phone
      },
      fee: {
        amount: fee.dueAmount,
        description: `${fee.feeType} Fee - Sem ${fee.semester} (${fee.session})`
      }
    });
  } catch (err) {
    console.error('Payment order error:', err);
    res.status(500).json({ error: 'Payment order create nahi hua.' });
  }
});

// ── VERIFY PAYMENT ────────────────────────────
router.post('/verify', protectStudent, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, feeId } = req.body;
    const crypto = require('crypto');

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Update fee record
    const fee = await Fee.findOneAndUpdate(
      { _id: feeId, student: req.student._id },
      {
        status: 'Paid',
        paidAmount: (await Fee.findById(feeId)).totalAmount,
        dueAmount: 0,
        paymentMode: 'Online',
        razorpayPaymentId: razorpay_payment_id,
        paidAt: new Date(),
        receiptNo: 'KIMT-' + Date.now()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Payment successful! Receipt generate ho gaya.',
      fee,
      receiptNo: fee.receiptNo
    });
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ error: 'Payment verify nahi hua.' });
  }
});

// ── PAYMENT HISTORY ───────────────────────────
router.get('/history', protectStudent, async (req, res) => {
  try {
    const payments = await Fee.find({
      student: req.student._id,
      status: 'Paid'
    }).sort({ paidAt: -1 });

    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ error: 'Payment history load nahi hua.' });
  }
});

module.exports = router;
