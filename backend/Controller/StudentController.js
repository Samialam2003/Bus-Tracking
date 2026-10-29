const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const Student = require('../Model/Student');

const router = express.Router();

// Multer storage config (rely on Multer only; directory must exist at runtime)
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const base = `student_${Date.now()}`;
    cb(null, `${base}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if ((file.mimetype || '').startsWith('image/')) return cb(null, true);
    return cb(new Error('Only image uploads are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware for student session auth
async function studentAuth(req, res, next) {
  try {
    const id = req.session && req.session.studentId;
    if (!id) return res.status(401).json({ error: 'Not authenticated' });
    const stu = await Student.findById(id);
    if (!stu) return res.status(401).json({ error: 'Invalid session' });
    req.student = stu;
    next();
  } catch (e) {
    return res.status(500).json({ error: 'Auth failed', details: e.message });
  }
}

// POST /student/register
router.post('/register', async (req, res) => {
  try {
    const { name, age, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const exists = await Student.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 10);
    const stu = await Student.create({ name, age, email, passwordHash, photo: null });
    return res.status(201).json({ message: 'Student registered', data: { _id: stu._id, name: stu.name, age: stu.age, email: stu.email, photo: stu.photo } });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// POST /student/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const stu = await Student.findOne({ email });
    if (!stu) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, stu.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    req.session.studentId = stu._id.toString();
    return res.status(200).json({ success: true, message: 'Login successful' });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// GET /student/me
router.get('/me', studentAuth, async (req, res) => {
  try {
    const s = await Student.findById(req.student._id)
      .populate('waitingForDriver', '_id name email driverPhoto')
      .populate('selectedArea', '_id areaName areaType location');
    if (!s) return res.status(404).json({ error: 'Profile not found' });
    return res.status(200).json({ data: {
      _id: s._id,
      name: s.name,
      age: s.age,
      email: s.email,
      photo: s.photo,
      waitingForDriver: s.waitingForDriver || null,
      selectedArea: s.selectedArea || null,
      selectionNote: s.selectionNote || null
    }});
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
});

// POST /student/select — set temporary selections { hostId, driverId, note }
router.post('/select', studentAuth, async (req, res) => {
  try {
    const { hostId, driverId, note } = req.body || {};
    if (!hostId || !driverId) return res.status(400).json({ error: 'hostId and driverId are required' });
    req.student.selectedArea = hostId;
    req.student.waitingForDriver = driverId;
    if (typeof note === 'string') req.student.selectionNote = note;
    await req.student.save();

    const io = req.app.get('io');
    // Notify hosts for real-time updates
    io && io.to('hosts').emit('student-selection-changed', { studentId: req.student._id, hostId, driverId, action: 'select' });
    // Also notify the specific area room if needed
    io && io.to(`area_${hostId}`).emit('student-selection', { studentId: req.student._id, hostId, driverId });

    return res.status(200).json({ message: 'Selection saved' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save selection', details: err.message });
  }
});

// POST /student/clear-selection — clear selections
router.post('/clear-selection', studentAuth, async (req, res) => {
  try {
    const prevArea = req.student.selectedArea;
    const prevDriver = req.student.waitingForDriver;
    req.student.selectedArea = null;
    req.student.waitingForDriver = null;
    req.student.selectionNote = null;
    await req.student.save();

    const io = req.app.get('io');
    io && io.to('hosts').emit('student-selection-changed', { studentId: req.student._id, hostId: prevArea, driverId: prevDriver, action: 'clear' });
    if (prevArea) io && io.to(`area_${prevArea}`).emit('student-selection', { studentId: req.student._id, hostId: prevArea, driverId: prevDriver, cleared: true });

    return res.status(200).json({ message: 'Selection cleared' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear selection', details: err.message });
  }
});

// GET /student/list — host-only list of students with their selections
router.get('/list', async (req, res) => {
  try {
    const token = req.headers['x-host-token'];
    if (token !== 'HOST_TOKEN_SANDESH') return res.status(403).json({ error: 'Invalid or missing host token' });
    const students = await Student.find({})
      .sort({ createdAt: -1 })
      .populate('waitingForDriver', '_id name email')
      .populate('selectedArea', '_id areaName');
    return res.status(200).json({ data: students.map(s => ({
      _id: s._id,
      name: s.name,
      email: s.email,
      waitingForDriver: s.waitingForDriver,
      selectedArea: s.selectedArea
    }))});
  } catch (err) {
    return res.status(500).json({ error: 'Failed to list students', details: err.message });
  }
});

// POST /student/photo - upload/update student photo (multipart/form-data, field: photo)
router.post('/photo', studentAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const publicPath = `/uploads/${req.file.filename}`;
    req.student.photo = publicPath;
    await req.student.save();
    return res.status(200).json({ message: 'Photo uploaded', url: publicPath });
  } catch (err) {
    return res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});
 
router.get('/photo/me', studentAuth, async (req, res) => {
  try {
    const p = req.student.photo;
    if (!p) return res.status(404).json({ error: 'No photo set' });
    const base = path.basename(p);
    const abs = path.join(__dirname, '..', 'uploads', base);
    return res.sendFile(abs);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve photo', details: err.message });
  }
});
 
router.get('/:id/photo', async (req, res) => {
  try {
    const stu = await Student.findById(req.params.id);
    if (!stu || !stu.photo) return res.status(404).json({ error: 'Photo not found' });
    const base = path.basename(stu.photo);
    const abs = path.join(__dirname, '..', 'uploads', base);
    return res.sendFile(abs);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve photo', details: err.message });
  }
});

module.exports = router;
