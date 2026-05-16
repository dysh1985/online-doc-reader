const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const ADMIN_CODE = process.env.ADMIN_CODE || '';

router.post('/register', async (req, res) => {
  const { username, password, adminCode } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  try {
    const exists = await User.findOne({ where: { username } });
    if (exists) return res.status(400).json({ error: 'exists' });
    const hash = await bcrypt.hash(password, 10);
    const isAdmin = adminCode && adminCode === ADMIN_CODE;
    const user = await User.create({ username, passwordHash: hash, isAdmin });
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'server' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(400).json({ error: 'invalid' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.status(400).json({ error: 'invalid' });
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'server' });
  }
});

module.exports = router;
