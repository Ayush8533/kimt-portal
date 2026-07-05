// utils/enrollmentGenerator.js
// Enrollment format: KIMT/2026/BCA/001
// Auto-increments per course per year

const Student = require('../models/Student');

async function generateEnrollmentNo(course, admissionYear) {
  const year = admissionYear || new Date().getFullYear();

  // Course ko short code mein convert karo
  const courseCode = course
    .toUpperCase()
    .replace(/\s+/g, '')
    .substring(0, 6); // max 6 chars

  // Is year + course ke saare students dhundho
  const prefix = `KIMT/${year}/${courseCode}/`;

  // Existing students with same prefix
  const existing = await Student.find({
    enrollmentNo: { $regex: `^${prefix}` }
  }).select('enrollmentNo').sort({ enrollmentNo: -1 });

  let nextNum = 1;

  if (existing.length > 0) {
    // Last enrollment ka number nikalo
    const last = existing[0].enrollmentNo;
    const parts = last.split('/');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  // 3-digit zero-padded number
  const serial = String(nextNum).padStart(3, '0');

  return `${prefix}${serial}`;
}

module.exports = { generateEnrollmentNo };