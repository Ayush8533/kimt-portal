const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v2: cloudinary } = require('cloudinary');

const { protectStudent } = require('../middleware/auth');

const Student = require('../models/Student');
const Result = require('../models/Result');
const Fee = require('../models/Fee');

const {
  Attendance,
  Notice,
  StudyMaterial
} = require('../models/Others');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


// ==========================================
// PROTECT ALL STUDENT ROUTES
// ==========================================

router.use(protectStudent);


// ==========================================
// MULTER CONFIG - STUDENT PHOTO UPLOAD
// ==========================================

const uploadDir = path.join(
  __dirname,
  '..',
  'uploads',
  'students'
);

fs.mkdirSync(uploadDir, {
  recursive: true
});


const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, uploadDir);

  },

  filename: (req, file, cb) => {

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    cb(
      null,
      `student-${req.student._id}-${Date.now()}${ext}`
    );

  }

});


const uploadPhoto = multer({

  storage: storage,

  limits: {
    fileSize: 2 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowed.includes(file.mimetype)) {

      return cb(
        new Error(
          'Sirf JPG, PNG ya WEBP photo upload karo.'
        )
      );

    }

    cb(null, true);

  }

});


// ==========================================
// PROFILE
// ==========================================

router.get('/profile', (req, res) => {

  const student = req.student.toJSON
    ? req.student.toJSON()
    : req.student;

  if (student.photo) {

    student.photoUrl =
      `/uploads/students/${student.photo}`;

  }

  res.json({

    success: true,

    student: student

  });

});


router.put('/profile', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      fatherName,
      motherName,
      dob,
      gender,
      course,
      semester,
      session
    } = req.body;

    const student = await Student.findById(req.student._id);

    if (!student) {
      return res.status(404).json({
        error: 'Student nahi mila.'
      });
    }

    student.name = name;
    student.email = email;
    student.phone = phone;
    student.address = address;
    student.fatherName = fatherName;
    student.motherName = motherName;
    student.dob = dob || undefined;
    student.gender = gender;
    student.course = course;
    student.semester = Number(semester);
    student.session = session;

    await student.save();

    const updatedStudent = await Student.findById(req.student._id).select('-password');

    res.json({
      success: true,
      message: 'Profile update ho gaya!',
      student: updatedStudent
    });

  } catch (err) {
    console.error('PROFILE UPDATE ERROR:', err);

    res.status(500).json({
      error: 'Profile update nahi hua.'
    });
  }
});

// ==========================================
// PROFILE PHOTO UPLOAD
// ==========================================

router.post(

  '/profile/photo',

uploadPhoto.single('photo'),

async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Photo select karo.'
      });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      folder: 'kimt/students',
      resource_type: 'image'
    });

    if (req.student.photoPublicId) {
      await cloudinary.uploader.destroy(req.student.photoPublicId);
    }

    const student = await Student.findByIdAndUpdate(
      req.student._id,
      {
        photo: uploadResult.secure_url,
        photoPublicId: uploadResult.public_id
      },
      {
        new: true
      }
    );

    res.json({
      success: true,
      message: 'Photo upload ho gayi!',
      photoUrl: student.photo,
      student: student
    });

  } catch (err) {
    console.error('PHOTO UPLOAD ERROR:', err);

    res.status(500).json({
      error: 'Photo upload nahi hui.'
    });
  }
}
);

// ==========================================
// RESULTS
// ==========================================

router.get('/results', async (req, res) => {
  try {
    const results = await Result.find({
      student: req.student._id,
      isPublished: true
    }).sort({ session: -1, semester: -1, subjectCode: 1, subject: 1, createdAt: -1 });

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: 'Results load nahi hue.' });
  }
});


router.get('/results/:id', async (req, res) => {

  try {

    const result =
      await Result.findOne({

        _id:
          req.params.id,

        student:
          req.student._id,

        isPublished:
          true

      });


    if (!result) {

      return res.status(404).json({

        error:
          'Result nahi mila.'

      });

    }


    res.json({

      success: true,

      result: result

    });


  } catch (err) {

    res.status(500).json({

      error:
        'Result load nahi hua.'

    });

  }

});


// ==========================================
// FEES
// ==========================================

router.get('/fees', async (req, res) => {

  try {

    const fees =
      await Fee.find({

        student:
          req.student._id

      }).sort({

        createdAt: -1

      });


    const totalDue =
      fees.reduce(

        (sum, fee) =>
          sum +
          (fee.dueAmount || 0),

        0

      );


    const totalPaid =
      fees.reduce(

        (sum, fee) =>
          sum +
          (fee.paidAmount || 0),

        0

      );


    res.json({

      success: true,

      fees: fees,

      summary: {

        totalDue:
          totalDue,

        totalPaid:
          totalPaid

      }

    });


  } catch (err) {

    res.status(500).json({

      error:
        'Fee records load nahi hue.'

    });

  }

});


// ==========================================
// FEE RECEIPT
// ==========================================

router.get(
  '/fees/:id/receipt',
  async (req, res) => {

    try {

      const fee =
        await Fee.findOne({

          _id:
            req.params.id,

          student:
            req.student._id

        });


      if (!fee) {

        return res.status(404).json({

          error:
            'Receipt nahi mili.'

        });

      }


      res.json({

        success: true,

        receipt: {

          receiptNo:
            fee._id
              .toString()
              .slice(-8)
              .toUpperCase(),

          studentName:
            req.student.name,

          enrollmentNo:
            req.student.enrollmentNo ||
            'N/A',

          course:
            req.student.course,

          semester:
            req.student.semester,

          feeType:
            fee.feeType ||
            'Tuition Fee',

          amount:
            fee.paidAmount,

          dueAmount:
            fee.dueAmount,

          paymentDate:
            fee.createdAt,

          paymentMode:
            fee.paymentMode ||
            'Online',

          session:
            req.student.session ||
            '2024-25',

          transactionId:
            fee.transactionId ||
            'N/A'

        }

      });


    } catch (err) {

      res.status(500).json({

        error:
          'Receipt load nahi hui.'

      });

    }

  }

);


// ==========================================
// ATTENDANCE
// ==========================================

router.get(
  '/attendance',
  async (req, res) => {

    try {

      const {
        subject,
        month
      } = req.query;


      const query = {

        student:
          req.student._id

      };


      if (subject) {

        query.subject =
          subject;

      }


      if (month) {

        const start =
          new Date(
            month + '-01'
          );


        const end =
          new Date(

            start.getFullYear(),

            start.getMonth() + 1,

            0,

            23,

            59,

            59,

            999

          );


        query.date = {

          $gte: start,

          $lte: end

        };

      }


      const records =
        await Attendance.find(
          query
        ).sort({

          date: -1

        });


      const total =
        records.length;


      const present =
        records.filter(

          (record) =>
            record.status ===
            'Present'

        ).length;


      const percentage =
        total > 0

          ? Math.round(

              (
                present /
                total
              ) * 100

            )

          : 0;


      res.json({

        success: true,

        records: records,

        summary: {

          total:
            total,

          present:
            present,

          absent:
            total - present,

          percentage:
            percentage

        }

      });


    } catch (err) {

      res.status(500).json({

        error:
          'Attendance load nahi hui.'

      });

    }

  }

);


// ==========================================
// NOTICES
// ==========================================

router.get('/notices', async (req, res) => {

  try {

    const notices =
      await Notice.find({

        isActive: true,

        targetAudience: {

          $in: [
            'All',
            'Students'
          ]

        },

        $or: [

          {
            expiresAt: null
          },

          {
            expiresAt: {
              $gte:
                new Date()
            }
          }

        ]

      })
      .sort({

        isPinned: -1,

        createdAt: -1

      })
      .limit(20);


    res.json({

      success: true,

      notices: notices

    });


  } catch (err) {

    res.status(500).json({

      error:
        'Notices load nahi hue.'

    });

  }

});


// ==========================================
// STUDY MATERIAL
// ==========================================

router.get('/materials', async (req, res) => {

  try {

    const {
      subject
    } = req.query;


    const query = {

      course:
        req.student.course,

      semester:
        req.student.semester,

      isActive:
        true

    };


    if (subject) {

      query.subject =
        subject;

    }


    const materials =
      await StudyMaterial.find(
        query
      ).sort({

        createdAt: -1

      });


    res.json({

      success: true,

      materials: materials

    });


  } catch (err) {

    res.status(500).json({

      error:
        'Study material load nahi hua.'

    });

  }

});


// ==========================================
// DOCUMENTS
// ==========================================

router.get('/documents', (req, res) => {

  const docs =
    req.student.documents || {};


  res.json({

    success: true,

    documents: {

      idCard:
        docs.idCard
          ? `/uploads/${docs.idCard}`
          : null,

      admitCard:
        docs.admitCard
          ? `/uploads/${docs.admitCard}`
          : null,

      marksheet:
        docs.marksheet
          ? `/uploads/${docs.marksheet}`
          : null

    }

  });

});


// ==========================================
// DASHBOARD SUMMARY
// ==========================================

router.get('/summary', async (req, res) => {

  try {

    const [

      fees,

      results,

      attendance,

      notices

    ] = await Promise.all([

      Fee.find({

        student:
          req.student._id

      }),

      Result.find({

        student:
          req.student._id,

        isPublished:
          true

      }),

      Attendance.find({

        student:
          req.student._id

      }),

      Notice.find({

        isActive: true,

        targetAudience: {

          $in: [
            'All',
            'Students'
          ]

        },

        $or: [

          {
            expiresAt: null
          },

          {
            expiresAt: {

              $gte:
                new Date()

            }
          }

        ]

      })
      .sort({

        isPinned: -1,

        createdAt: -1

      })
      .limit(5)

    ]);


    const totalPaid =
      fees.reduce(

        (sum, fee) =>
          sum +
          (fee.paidAmount || 0),

        0

      );


    const totalDue =
      fees.reduce(

        (sum, fee) =>
          sum +
          (fee.dueAmount || 0),

        0

      );


    const present =
      attendance.filter(

        (record) =>
          record.status ===
          'Present'

      ).length;


    const attendancePct =
      attendance.length > 0

        ? Math.round(

            (
              present /
              attendance.length
            ) * 100

          )

        : 0;


    res.json({

      success: true,

      summary: {

        feeSummary: {

          totalPaid:
            totalPaid,

          totalDue:
            totalDue

        },

        resultCount:
          results.length,

        attendancePercentage:
          attendancePct,

        noticeCount:
          notices.length,

        recentNotices:
          notices

      }

    });


  } catch (err) {

    res.status(500).json({

      error:
        'Summary load nahi hua.'

    });

  }

});


// ==========================================
// EXPORT ROUTER - ONLY ONCE AT END
// ==========================================

module.exports = router;