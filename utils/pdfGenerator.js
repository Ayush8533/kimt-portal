// PDF Generator — Fee Receipt
// Uses 'pdfkit' — install: npm install pdfkit
// Usage: generateFeeReceipt(receiptData) => returns Buffer

const PDFDocument = require('pdfkit');

function generateFeeReceipt(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const PRIMARY = '#0b3c91';
    const ACCENT  = '#ffb703';
    const GRAY    = '#64748b';
    const BLACK   = '#1e293b';

    // ── HEADER BAR ──────────────────────────────
    doc.rect(0, 0, 595, 90).fill(PRIMARY);

    doc.fontSize(20).fillColor('#ffffff')
       .font('Helvetica-Bold')
       .text('KIMT — Fee Receipt', 50, 22, { align: 'center' });

    doc.fontSize(10).fillColor('rgba(255,255,255,0.8)')
       .font('Helvetica')
       .text('Krishna Institute of Management and Technology, Bareilly', 50, 50, { align: 'center' });

    doc.fontSize(9).fillColor(ACCENT)
       .text('www.kimtonline.org  |  +91 9084147587', 50, 68, { align: 'center' });

    // ── RECEIPT BADGE ────────────────────────────
    doc.rect(400, 100, 145, 40).fill(ACCENT);
    doc.fontSize(9).fillColor(BLACK).font('Helvetica-Bold')
       .text('RECEIPT NO.', 408, 107);
    doc.fontSize(12).fillColor(BLACK).font('Helvetica-Bold')
       .text(`#${data.receiptNo}`, 408, 119);

    // ── STUDENT INFO BOX ─────────────────────────
    doc.rect(50, 100, 330, 40).fill('#f0f4ff');
    doc.fontSize(9).fillColor(GRAY).font('Helvetica')
       .text('Student Name', 60, 107);
    doc.fontSize(12).fillColor(BLACK).font('Helvetica-Bold')
       .text(data.studentName, 60, 119);

    // ── DIVIDER ──────────────────────────────────
    doc.moveTo(50, 155).lineTo(545, 155).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // ── INFO GRID ────────────────────────────────
    const col1 = 50, col2 = 200, col3 = 350;
    let y = 170;

    function infoRow(label1, val1, label2, val2, label3, val3) {
      doc.fontSize(8).fillColor(GRAY).font('Helvetica');
      doc.text(label1, col1, y);
      if (label2) doc.text(label2, col2, y);
      if (label3) doc.text(label3, col3, y);
      doc.fontSize(10).fillColor(BLACK).font('Helvetica-Bold');
      doc.text(val1, col1, y + 12);
      if (val2) doc.text(val2, col2, y + 12);
      if (val3) doc.text(val3, col3, y + 12);
      y += 38;
    }

    infoRow(
      'Enrollment No.', data.enrollmentNo || 'N/A',
      'Course', data.course,
      'Semester', `Sem ${data.semester}`
    );
    infoRow(
      'Session', data.session || '2024-25',
      'Payment Mode', data.paymentMode || 'Online',
      'Transaction ID', data.transactionId || 'N/A'
    );
    infoRow(
      'Payment Date',
      new Date(data.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      'Fee Type', data.feeType || 'Tuition Fee',
      '', ''
    );

    // ── DIVIDER ──────────────────────────────────
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 20;

    // ── FEE TABLE HEADER ─────────────────────────
    doc.rect(50, y, 495, 28).fill(PRIMARY);
    doc.fontSize(10).fillColor('#fff').font('Helvetica-Bold');
    doc.text('Fee Description', 60, y + 9);
    doc.text('Amount (₹)', 430, y + 9, { width: 100, align: 'right' });
    y += 28;

    // ── FEE ROWS ─────────────────────────────────
    function feeRow(label, amount, bg = '#ffffff') {
      doc.rect(50, y, 495, 26).fill(bg);
      doc.fontSize(10).fillColor(BLACK).font('Helvetica');
      doc.text(label, 60, y + 8);
      doc.text(`₹${Number(amount).toLocaleString('en-IN')}`, 430, y + 8, { width: 100, align: 'right' });
      y += 26;
    }

    feeRow(data.feeType || 'Tuition Fee', data.amount, '#f8fafc');
    if (data.dueAmount > 0) feeRow('Remaining Due', data.dueAmount, '#fff8f0');

    // ── TOTAL BAR ────────────────────────────────
    doc.rect(50, y, 495, 34).fill(ACCENT);
    doc.fontSize(12).fillColor(BLACK).font('Helvetica-Bold');
    doc.text('Amount Paid', 60, y + 11);
    doc.text(`₹${Number(data.amount).toLocaleString('en-IN')}`, 430, y + 11, { width: 100, align: 'right' });
    y += 50;

    // ── STATUS STAMP ─────────────────────────────
    doc.circle(297, y + 30, 38).fill('#f0fdf4');
    doc.fontSize(11).fillColor('#166534').font('Helvetica-Bold')
       .text('✓ PAID', 260, y + 22, { width: 74, align: 'center' });
    y += 90;

    // ── DIVIDER ──────────────────────────────────
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 20;

    // ── FOOTER ───────────────────────────────────
    doc.fontSize(8).fillColor(GRAY).font('Helvetica')
       .text('This is a computer-generated receipt and does not require a physical signature.', 50, y, { align: 'center' })
       .text('For queries: kimtiinfo@gmail.com | +91 9084147587', 50, y + 14, { align: 'center' });

    // ── BOTTOM BAR ───────────────────────────────
    doc.rect(0, 780, 595, 62).fill(PRIMARY);
    doc.fontSize(9).fillColor('rgba(255,255,255,0.7)')
       .text(`Generated on: ${new Date().toLocaleString('en-IN')}  |  KIMT Bareilly  |  kimtonline.org`, 50, 795, { align: 'center' });

    doc.end();
  });
}

module.exports = { generateFeeReceipt };
