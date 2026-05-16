const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

const { File, User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'noauth' });
  const token = auth.split(' ')[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid' });
  }
}

router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'nofile' });
  const saved = await File.create({ filename: req.file.filename, origName: req.file.originalname, mime: req.file.mimetype, path: req.file.filename, uploaderId: req.user.id });
  res.json({ id: saved.id, origName: saved.origName });
});

router.get('/list', authMiddleware, async (req, res) => {
  const files = await File.findAll({ include: [{ model: User, attributes: ['username'] }], order: [['createdAt', 'DESC']] });
  res.json(files.map(f => ({ id: f.id, origName: f.origName, mime: f.mime, uploader: f.User ? f.User.username : null, path: '/uploads/' + f.path })));
});

router.get('/view/:id', authMiddleware, async (req, res) => {
  const f = await File.findByPk(req.params.id);
  if (!f) return res.status(404).json({ error: 'nofile' });
  const full = path.join(UPLOAD_DIR, f.path);
  const ext = path.extname(f.origName).toLowerCase();
  try {
    if (ext === '.pdf') return res.sendFile(full);
    if (ext === '.txt') return res.sendFile(full);
    if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.convertToHtml({ path: full });
      return res.send(result.value);
    }
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
      const wb = XLSX.readFile(full);
      const first = wb.SheetNames[0];
      const html = XLSX.utils.sheet_to_html(wb.Sheets[first]);
      return res.send(html);
    }
    // fallback: send as download
    res.sendFile(full);
  } catch (err) {
    res.status(500).json({ error: 'convert' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'forbidden' });
  const f = await File.findByPk(req.params.id);
  if (!f) return res.status(404).json({ error: 'nofile' });
  const full = path.join(UPLOAD_DIR, f.path);
  try {
    fs.unlinkSync(full);
  } catch (e) {}
  await f.destroy();
  res.json({ ok: true });
});

module.exports = router;
