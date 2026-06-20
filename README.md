# KIMT Bareilly — Complete College Management System v2.0

## 🗂️ Project Structure

```
kimt-complete/
├── server.js                    ← Main backend server
├── package.json
├── .env.example                 ← Copy to .env
│
├── models/
│   ├── Student.js               ← Student database model
│   ├── Result.js                ← Results model
│   ├── Fee.js                   ← Fee records model
│   └── Others.js                ← Admin, Notice, Attendance, Inquiry
│
├── routes/
│   ├── auth.js                  ← Login/Signup APIs
│   ├── student.js               ← Student portal APIs
│   ├── admin.js                 ← Admin panel APIs
│   ├── payment.js               ← Razorpay payment APIs
│   ├── chat.js                  ← AI chatbot (Claude)
│   └── inquiry.js               ← Website inquiry form
│
├── middleware/
│   └── auth.js                  ← JWT token verification
│
└── public/
    ├── index.html               ← Main website
    ├── style.css
    ├── script.js
    ├── images/                  ← College images yahan daalo
    ├── student/
    │   ├── index.html           ← Student Login/Signup
    │   └── dashboard.html       ← Student Dashboard
    └── admin/
        ├── index.html           ← Admin Login
        └── dashboard.html       ← Admin Panel
```

---

## ⚡ Setup (Local)

### Step 1 — Install
```bash
npm install
```

### Step 2 — .env setup
```bash
copy .env.example .env
```
`.env` file mein yeh values daalo:
```
MONGODB_URI=mongodb+srv://kimtiinfo_db_user:surJ243CE0Yz50mU@kimt-cluster.yeotooj.mongodb.net/kimtdb?appName=kimt-cluster
ANTHROPIC_API_KEY=sk-ant-xxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxx
JWT_SECRET=koi_bhi_lamba_random_string
ADMIN_EMAIL=admin@kimt.edu.in
ADMIN_PASSWORD=Admin@KIMT2026
```

### Step 3 — Start
```bash
npm start
```

---

## 🌐 URLs

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Main Website |
| http://localhost:3000/student/ | Student Login |
| http://localhost:3000/student/dashboard.html | Student Dashboard |
| http://localhost:3000/admin-panel/ | Admin Login |
| http://localhost:3000/admin-panel/dashboard.html | Admin Panel |
| http://localhost:3000/api/health | Server Health Check |

---

## 👨‍💼 Default Admin Login
- Email: `admin@kimt.edu.in`
- Password: `Admin@KIMT2026`

(Pehli baar login ke baad password zaroor badlo!)

---

## 🎓 Student Portal Features
- ✅ Signup / Login
- ✅ Dashboard (results, fees, attendance, notices)
- ✅ Results dekhna (semester-wise)
- ✅ Fee status + Online payment (Razorpay)
- ✅ Attendance record
- ✅ Documents download
- ✅ Notices

## ⚙️ Admin Panel Features
- ✅ Dashboard (stats, recent activities)
- ✅ Students manage (add/edit/activate/deactivate)
- ✅ Results upload + publish
- ✅ Fee records manage + mark paid
- ✅ Notices post karna
- ✅ Inquiries manage (status update + WhatsApp)
- ✅ Attendance mark karna

---

## 🚀 Deploy on Railway

1. GitHub par push karo
2. railway.app → New Project → GitHub repo
3. Environment variables add karo (.env ki saari values)
4. Deploy! ✅

Railway URL milne ke baad `script.js` mein fetch URLs update karo.
