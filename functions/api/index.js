const cloudbase = require('@cloudbase/node-sdk');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const ADMIN_CODE = process.env.ADMIN_CODE || '';
const envId = process.env.TCB_ENV_ID || process.env.TCB_ENV_ID;
const app = cloudbase.init({ env: envId });
const db = app.database();
const storage = app.storage();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE',
};

function response(body, status = 200) {
  return { statusCode: status, headers, body: JSON.stringify(body) };
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (err) { return {}; }
  }
  return body;
}

function getToken(event) {
  const auth = event.headers && (event.headers.Authorization || event.headers.authorization);
  if (!auth) return null;
  const token = auth.split(' ')[1];
  try { return jwt.verify(token, JWT_SECRET); } catch (err) { return null; }
}

async function getUserByUsername(username) {
  const res = await db.collection('users').where({ username }).get();
  return (res.data || [])[0] || null;
}

async function getFileById(id) {
  const res = await db.collection('files').doc(id).get();
  return (res.data || [])[0] || null;
}

async function saveFileMetadata(item) {
  const res = await db.collection('files').add(item);
  return res.id;
}

async function deleteFileRecord(id) {
  await db.collection('files').doc(id).remove();
}

async function getTempUrl(fileID) {
  const res = await app.storage().getTempFileURL({ fileList: [{ fileID, maxAge: 60 * 60 }] });
  return res.fileList[0].tempFileURL;
}

async function downloadFileToTemp(fileID, name) {
  const tmpPath = path.join(os.tmpdir(), `${Date.now()}-${name}`);
  await app.storage().downloadFile({ fileID, downloadPath: tmpPath });
  return tmpPath;
}

async function handleAuthRegister(body) {
  const { username, password, adminCode } = body;
  if (!username || !password) return response({ error: 'Missing username or password' }, 400);
  const existing = await getUserByUsername(username);
  if (existing) return response({ error: 'Username exists' }, 400);
  const hash = await bcrypt.hash(password, 10);
  const isAdmin = adminCode && adminCode === ADMIN_CODE;
  const res = await db.collection('users').add({ username, passwordHash: hash, isAdmin });
  const token = jwt.sign({ id: res.id, username, isAdmin }, JWT_SECRET);
  return response({ token });
}

async function handleAuthLogin(body) {
  const { username, password } = body;
  if (!username || !password) return response({ error: 'Missing username or password' }, 400);
  const user = await getUserByUsername(username);
  if (!user) return response({ error: 'Invalid credentials' }, 400);
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return response({ error: 'Invalid credentials' }, 400);
  const token = jwt.sign({ id: user._id || user.id || '', username: user.username, isAdmin: user.isAdmin }, JWT_SECRET);
  return response({ token });
}

async function handleUpload(body, user) {
  const { name, type, data } = body;
  if (!name || !data) return response({ error: 'Missing file upload data' }, 400);
  const buffer = Buffer.from(data, 'base64');
  const cloudPath = `uploads/${Date.now()}-${name}`;
  const uploadResult = await app.uploadFile({ cloudPath, fileContent: buffer });
  const fileID = uploadResult.fileID || uploadResult.fileid || uploadResult.fileId;
  const item = {
    origName: name,
    mime: type || 'application/octet-stream',
    fileID,
    uploaderId: user.id,
    uploader: user.username,
    createdAt: Date.now()
  };
  const id = await saveFileMetadata(item);
  return response({ id, origName: name, fileID });
}

async function handleFileList() {
  const res = await db.collection('files').orderBy('createdAt', 'desc').get();
  const list = (res.data || []).map(f => ({ id: f._id || f.id, origName: f.origName, mime: f.mime, uploader: f.uploader, fileID: f.fileID }));
  return response({ list });
}

async function handleView(id) {
  const file = await getFileById(id);
  if (!file) return response({ error: 'File not found' }, 404);
  const ext = (file.origName || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'pdf', 'txt'].includes(ext)) {
    const url = await getTempUrl(file.fileID);
    return response({ type: 'url', url, ext, origName: file.origName });
  }
  const tmpPath = await downloadFileToTemp(file.fileID, file.origName);
  const buffer = fs.readFileSync(tmpPath);
  fs.unlinkSync(tmpPath);
  if (['docx', 'doc'].includes(ext)) {
    const result = await mammoth.convertToHtml({ buffer });
    return response({ type: 'html', html: result.value, ext, origName: file.origName });
  }
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const html = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName]);
    return response({ type: 'html', html, ext, origName: file.origName });
  }
  const url = await getTempUrl(file.fileID);
  return response({ type: 'url', url, ext, origName: file.origName });
}

async function handleDelete(id, user) {
  if (!user || !user.isAdmin) return response({ error: 'Forbidden' }, 403);
  const file = await getFileById(id);
  if (!file) return response({ error: 'File not found' }, 404);
  await db.collection('files').doc(id).remove();
  await app.storage().deleteFile({ fileList: [file.fileID] });
  return response({ ok: true });
}

exports.main = async (event) => {
  if (event.method === 'OPTIONS') {
    return response({ ok: true });
  }
  const body = parseBody(event.body);
  const tokenUser = getToken(event);
  const method = event.method || 'GET';
  const path = event.path || '';

  if (method === 'POST' && path.endsWith('/auth/register')) return handleAuthRegister(body);
  if (method === 'POST' && path.endsWith('/auth/login')) return handleAuthLogin(body);
  if (path.endsWith('/files/list')) return tokenUser ? handleFileList() : response({ error: 'Unauthorized' }, 401);
  if (path.endsWith('/files/view') || path.includes('/files/view/')) {
    const id = path.split('/files/view/')[1];
    return tokenUser ? handleView(id) : response({ error: 'Unauthorized' }, 401);
  }
  if (method === 'POST' && path.endsWith('/files/upload')) {
    if (!tokenUser) return response({ error: 'Unauthorized' }, 401);
    return handleUpload(body, tokenUser);
  }
  if (method === 'DELETE' && path.includes('/files/')) {
    const id = path.split('/files/')[1];
    return handleDelete(id, tokenUser);
  }
  return response({ error: 'Not found' }, 404);
};
