const {
  app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

// ═══════════════════════════════════════════════════
//  Paths
// ═══════════════════════════════════════════════════

const DEV_URL = 'http://localhost:5173';
const isDev = process.env.NODE_ENV === 'development';

const DATA_DIR = app.getPath('userData');
const KEYS_FILE = path.join(DATA_DIR, 'totp-keys.json');
const CONFIG_FILE = path.join(DATA_DIR, 'totp-config.json');
const AVATAR_FILE = path.join(DATA_DIR, 'avatar.png');

function distFile(file) {
  return path.join(__dirname, '..', 'dist', file);
}

// ═══════════════════════════════════════════════════
//  PNG Icon Generator
// ═══════════════════════════════════════════════════

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([t, data]);
  const csum = Buffer.alloc(4); csum.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, t, data, csum]);
}

function makeIcon(w, h, rgba) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4, di = y * (1 + w * 4) + 1 + x * 4;
      raw[di] = rgba[si]; raw[di+1] = rgba[si+1];
      raw[di+2] = rgba[si+2]; raw[di+3] = rgba[si+3];
    }
  }
  const compressed = zlib.deflateSync(raw);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createTrayIcon() {
  const s = 24, cx = s/2, cy = s/2, r = cx - 2;
  const rgba = Buffer.alloc(s * s * 4, 0);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - cx + 0.5, y - cy + 0.5), i = (y * s + x) * 4;
      if (d <= r) {
        rgba[i]=0x16; rgba[i+1]=0x77; rgba[i+2]=0xff; rgba[i+3]=255;
      } else if (d <= r+0.8) {
        const a = Math.round((1-(d-r))*255);
        rgba[i]=0x16; rgba[i+1]=0x77; rgba[i+2]=0xff; rgba[i+3]=a;
      }
    }
  const png = makeIcon(s, s, rgba);
  const img = nativeImage.createFromBuffer(png, { width: s, height: s });
  if (process.platform === 'darwin') img.setTemplateImage(true);
  return img;
}

function createAppIcon() {
  const s = 256, cx = s/2, cy = s/2, r = cx - 8;
  const rgba = Buffer.alloc(s * s * 4, 0);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - cx + 0.5, y - cy + 0.5), i = (y * s + x) * 4;
      if (d <= r) {
        rgba[i]=0x16; rgba[i+1]=0x77; rgba[i+2]=0xff; rgba[i+3]=255;
      } else if (d <= r+2) {
        const a = Math.round(Math.max(0,Math.min(255,(1-(d-r))*255)));
        rgba[i]=0x16; rgba[i+1]=0x77; rgba[i+2]=0xff; rgba[i+3]=a;
      }
    }
  const png = makeIcon(s, s, rgba);
  return nativeImage.createFromBuffer(png, { width: s, height: s });
}

// ═══════════════════════════════════════════════════
//  AES Encryption with Salt
// ═══════════════════════════════════════════════════

function getSalt() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (cfg.salt) return cfg.salt;
    }
  } catch (_) {}
  const salt = crypto.randomBytes(32).toString('hex');
  saveConfig({ salt });
  return salt;
}

function saveConfig(config) {
  const existing = {};
  try {
    if (fs.existsSync(CONFIG_FILE))
      Object.assign(existing, JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')));
  } catch (_) {}
  Object.assign(existing, config);
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(existing, null, 2), 'utf-8');
}

function encryptSecret(plaintext, salt) {
  const key = crypto.scryptSync(salt, 'totp-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return JSON.stringify({ iv: iv.toString('hex'), data: encrypted, tag: authTag });
}

function decryptSecret(stored, salt) {
  const { iv, data, tag } = JSON.parse(stored);
  const key = crypto.scryptSync(salt, 'totp-salt', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

// ═══════════════════════════════════════════════════
//  Store
// ═══════════════════════════════════════════════════

function getStore() {
  try {
    if (fs.existsSync(KEYS_FILE))
      return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf-8'));
  } catch (_) {}
  return { keys: [] };
}

function saveStore(store) {
  fs.writeFileSync(KEYS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function addKey(name, secret) {
  const store = getStore();
  const id = crypto.randomUUID();
  const salt = getSalt();
  store.keys.push({
    id,
    name: name.trim(),
    secret: encryptSecret(secret, salt),
    createdAt: Date.now(),
  });
  saveStore(store);
  return id;
}

function removeKey(id) {
  const store = getStore();
  store.keys = store.keys.filter(k => k.id !== id);
  saveStore(store);
}

function getAllKeys() {
  return getStore().keys;
}

function decodeSecret(encoded) {
  const salt = getSalt();
  try { return decryptSecret(encoded, salt); } catch (_) { return ''; }
}

// ═══════════════════════════════════════════════════
//  TOTP (RFC 6238)
// ═══════════════════════════════════════════════════

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(s) {
  s = s.toUpperCase().replace(/\s/g, '').replace(/=+$/, '');
  const bytes = [];
  let buffer = 0, bits = 0;
  for (const ch of s) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error('Invalid base32 char');
    buffer = (buffer << 5) | idx;
    bits += 5;
    if (bits >= 8) { bytes.push((buffer >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, counter) {
  const key = base32Decode(secret);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset+1] << 16) |
                 (hmac[offset+2] << 8) | hmac[offset+3];
  return String(binary % 1000000).padStart(6, '0');
}

function computeCodes(keys, timeStep = 30) {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / timeStep);
  const remaining = timeStep - (now % timeStep);
  return keys.map(key => {
    const secret = decodeSecret(key.secret);
    if (!secret) return { id: key.id, name: key.name, current: '------', remaining, error: true };
    return {
      id: key.id,
      name: key.name,
      current: generateTOTP(secret, counter),
      past: generateTOTP(secret, counter - 1),
      next: generateTOTP(secret, counter + 1),
      remaining,
    };
  });
}

// ═══════════════════════════════════════════════════
//  Windows & Tray
// ═══════════════════════════════════════════════════

let mainWindow = null;
let popupWindow = null;
let tray = null;

function resolveURL(file) {
  return isDev ? `${DEV_URL}/${file}` : distFile(file);
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    minWidth: 360,
    minHeight: 480,
    frame: false,
    title: '2FA 验证码生成器',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(resolveURL('index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createPopupWindow(bounds) {
  if (popupWindow && !popupWindow.isDestroyed()) popupWindow.close();

  const win = new BrowserWindow({
    width: 300,
    height: 260,
    x: bounds.x,
    y: bounds.y,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  popupWindow = win;
  win.loadURL(resolveURL('popup.html'));

  win.once('ready-to-show', () => {
    if (!win || win.isDestroyed()) return;
    win.show();
    win.focus();
    setTimeout(async () => {
      try {
        const h = await win.webContents.executeJavaScript(
          'document.documentElement.scrollHeight'
        );
        if (h > 40 && !win.isDestroyed()) {
          win.setSize(300, Math.min(Math.max(h, 120), 420));
        }
      } catch (_) {}
    }, 100);
  });

  win.on('blur', () => {
    setTimeout(() => {
      if (win && !win.isDestroyed()) win.close();
    }, 150);
  });

  win.on('closed', () => {
    if (popupWindow === win) popupWindow = null;
  });
}

function showPopup() {
  if (!tray || tray.isDestroyed()) return;
  const tb = tray.getBounds();
  const pw = 300, ph = 340;
  let x, y;

  if (process.platform === 'darwin') {
    x = Math.round(tb.x + tb.width/2 - pw/2);
    y = Math.round(tb.y + tb.height + 4);
  } else {
    x = Math.round(tb.x + tb.width/2 - pw/2);
    y = Math.round(tb.y - ph - 4);
  }

  const displays = screen.getAllDisplays();
  const display = displays.find(d => x >= d.bounds.x && x < d.bounds.x + d.bounds.width) || displays[0];
  const db = display.bounds;
  x = Math.max(db.x+4, Math.min(x, db.x+db.width-pw-4));
  y = Math.max(db.y+4, Math.min(y, db.y+db.height-ph-4));

  createPopupWindow({ x, y, width: pw, height: ph });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  const ctxMenu = Menu.buildFromTemplate([
    { label: '打开主窗口', click: createMainWindow },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip('2FA 验证码生成器');

  // 左键 → 自定义弹窗；右键 → 原生菜单
  tray.on('click', () => showPopup());
  tray.on('right-click', () => tray.popUpContextMenu(ctxMenu));
}

// ═══════════════════════════════════════════════════
//  IPC Handlers
// ═══════════════════════════════════════════════════

ipcMain.handle('keys:list', () => getAllKeys());

ipcMain.handle('keys:add', (_, name, secret) => {
  if (!name || !name.trim()) throw new Error('请输入名称');
  if (!secret || !secret.trim()) throw new Error('请输入密钥');
  const cleaned = secret.toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z2-7]{16,}$/.test(cleaned)) throw new Error('密钥格式无效');
  return addKey(name, secret);
});

ipcMain.handle('keys:remove', (_, id) => removeKey(id));

ipcMain.handle('codes:get', () => computeCodes(getAllKeys()));

ipcMain.handle('codes:top', () => computeCodes(getAllKeys().slice(0, 3)));

ipcMain.handle('secret:decode', (_, encoded) => decodeSecret(encoded));

ipcMain.handle('salt:get', () => getSalt());

ipcMain.handle('salt:save', (_, salt) => {
  if (!/^[a-f0-9]{32,}$/i.test(salt)) throw new Error('Salt 格式无效 (需 32 位以上十六进制)');
  saveConfig({ salt });
  const store = getStore();
  for (const key of store.keys) {
    try {
      const oldSecret = decryptSecret(key.secret, getSalt());
      key.secret = encryptSecret(oldSecret, salt);
    } catch (_) { /* skip */ }
  }
  saveStore(store);
});

ipcMain.handle('avatar:save', (_, dataUrl) => {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  fs.writeFileSync(AVATAR_FILE, Buffer.from(base64, 'base64'));
});

ipcMain.handle('avatar:get', () => {
  try {
    if (fs.existsSync(AVATAR_FILE)) {
      const data = fs.readFileSync(AVATAR_FILE);
      return `data:image/png;base64,${data.toString('base64')}`;
    }
  } catch (_) {}
  return null;
});

ipcMain.handle('main:open', () => createMainWindow());

ipcMain.handle('win:minimize', () => mainWindow?.minimize());
ipcMain.handle('win:close', () => { if (mainWindow) mainWindow.close(); });

// ═══════════════════════════════════════════════════
//  App Lifecycle
// ═══════════════════════════════════════════════════

app.isQuitting = false;
app.on('before-quit', () => { app.isQuitting = true; });

app.whenReady().then(() => {
  createTray();
  if (process.platform === 'darwin') {
    app.dock.setIcon(createAppIcon());
    app.dock.setMenu(Menu.buildFromTemplate([
      { label: '打开主窗口', click: createMainWindow },
    ]));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => createMainWindow());
