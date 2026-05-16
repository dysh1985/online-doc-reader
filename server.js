const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const { sequelize } = require('./models');

const authRouter = require('./routes/auth');
const filesRouter = require('./routes/files');

const app = express();
app.use(cors());
app.use(express.json());

const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/', express.static(PUBLIC_DIR));

app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);

const PORT = process.env.PORT || 3000;

async function start() {
  await sequelize.sync();
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
