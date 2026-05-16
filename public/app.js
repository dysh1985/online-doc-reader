const API_BASE = window.API_BASE || '';
let token = localStorage.getItem('token');
const sidebar = document.getElementById('sidebar');
const toggleSidebar = document.getElementById('toggle-sidebar');
const fullscreenBtn = document.getElementById('btn-fullscreen');

function setAuth(t, username) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
  document.getElementById('auth').classList.toggle('hidden', !!t);
  document.getElementById('app').classList.toggle('hidden', !t);
  document.getElementById('current-user').textContent = username || '';
}

document.getElementById('btn-login').onclick = async () => {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  const j = await res.json();
  if (j.token) { setAuth(j.token, username); loadFiles(); } else alert('登录失败，请检查用户名或密码');
};

document.getElementById('btn-reg').onclick = async () => {
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;
  const adminCode = document.getElementById('reg-admin').value.trim();
  const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, adminCode }) });
  const j = await res.json();
  if (j.token) { setAuth(j.token, username); loadFiles(); } else alert('注册失败，请检查输入');
};

document.getElementById('btn-logout').onclick = () => setAuth(null);

document.getElementById('btn-upload').onclick = async () => {
  const file = document.getElementById('file-input').files[0];
  if (!file) return alert('请选择文件');
  const data = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  const res = await fetch(`${API_BASE}/files/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ name: file.name, type: file.type, data: base64 }) });
  if (res.ok) { await loadFiles(); alert('上传成功'); } else alert('上传失败');
};

toggleSidebar.onclick = () => {
  sidebar.classList.toggle('collapsed');
  const collapsed = sidebar.classList.contains('collapsed');
  toggleSidebar.textContent = collapsed ? '→' : '←';
};

fullscreenBtn.onclick = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen().catch(() => {});
    fullscreenBtn.textContent = '退出全屏';
  } else {
    await document.exitFullscreen().catch(() => {});
    fullscreenBtn.textContent = '全屏';
  }
};

async function loadFiles() {
  const res = await fetch(`${API_BASE}/files/list`, { headers: { 'Authorization': 'Bearer ' + token } });
  const list = await res.json();
  const ul = document.getElementById('file-list');
  ul.innerHTML = '';
  (list || []).forEach(f => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.style.maxWidth = '180px';
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = f.origName;
    a.onclick = e => { e.preventDefault(); openFile(f.id, f.origName); };
    left.appendChild(a);
    const meta = document.createElement('div');
    meta.className = 'small';
    meta.textContent = f.uploader ? `上传者：${f.uploader}` : '';
    left.appendChild(meta);
    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '8px';
    const viewBtn = document.createElement('button');
    viewBtn.textContent = '预览';
    viewBtn.onclick = () => openFile(f.id, f.origName);
    right.appendChild(viewBtn);
    li.appendChild(left);
    li.appendChild(right);
    ul.appendChild(li);
  });
}

async function openFile(id, name) {
  const ext = name.split('.').pop().toLowerCase();
  const area = document.getElementById('viewer-area');
  area.innerHTML = '加载中...';
  const res = await fetch(`${API_BASE}/files/view/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
  if (!res.ok) { area.textContent = '无法预览该文件'; return; }
  const data = await res.json();
  if (!res.ok) { area.textContent = data.error || '无法预览该文件'; return; }
  if (data.type === 'url') {
    if (['pdf'].includes(data.ext)) {
      area.innerHTML = `<iframe src="${data.url}"></iframe>`;
      return;
    }
    if (['png','jpg','jpeg','gif','webp','bmp'].includes(data.ext)) {
      area.innerHTML = `<img src="${data.url}" alt="${name}" />`;
      return;
    }
    if (data.ext === 'txt') {
      const text = await fetch(data.url).then(r => r.text());
      area.textContent = text;
      return;
    }
    area.innerHTML = `<iframe src="${data.url}" style="width:100%;height:100%;border:0"></iframe>`;
    return;
  }
  if (data.type === 'html') {
    area.innerHTML = data.html;
    return;
  }
  area.textContent = '无法预览该文件';
}

if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    setAuth(token, payload.username);
    loadFiles();
  } catch (err) {
    setAuth(null);
  }
} else {
  setAuth(null);
}
