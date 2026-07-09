const {
  app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, safeStorage,
} = require('electron');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createQrDataUrl } = require('./qr');

// ═══════════════════════════════════════════════════
//  Paths
// ═══════════════════════════════════════════════════

const DEV_URL = 'http://localhost:5173';
const isDev = process.env.NODE_ENV === 'development';

const DATA_DIR = path.join(os.homedir(), '.otp2fa');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const ICON_FILE = path.join(__dirname, 'assets', 'TOTP.png');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function distFile(file) {
  return path.join(__dirname, '..', 'dist', file);
}

function createTrayIcon() {
  const size = process.platform === 'darwin' ? 18 : 24;
  const img = nativeImage.createFromPath(ICON_FILE).resize({ width: size, height: size });
  if (process.platform === 'darwin') img.setTemplateImage(true);
  return img;
}

function createAppIcon() {
  return nativeImage.createFromPath(ICON_FILE);
}

// ═══════════════════════════════════════════════════
//  Local secret encryption
// ═══════════════════════════════════════════════════

function readJsonFile(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (_) {}
  return fallback;
}

function normalizeData(data) {
  return {
    version: 1,
    keys: Array.isArray(data?.keys) ? data.keys : [],
    config: {
      salt: typeof data?.config?.salt === 'string' ? data.config.salt : '',
      hideDock: typeof data?.config?.hideDock === 'boolean' ? data.config.hideDock : true,
    },
    avatarData: typeof data?.avatarData === 'string' ? data.avatarData : null,
  };
}

function getAppData() {
  if (fs.existsSync(DATA_FILE)) {
    return normalizeData(readJsonFile(DATA_FILE, {}));
  }

  const initialData = normalizeData({});
  saveAppData(initialData);
  return initialData;
}

function saveAppData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalizeData(data), null, 2), 'utf-8');
}

function updateAppData(updater) {
  const data = getAppData();
  updater(data);
  saveAppData(data);
  return data;
}

function getSalt() {
  return getAppData().config.salt;
}

function saveConfig(config) {
  updateAppData((data) => {
    Object.assign(data.config, config);
  });
}

function getDockHide() {
  return getAppData().config.hideDock;
}

function encryptSecret(plaintext, salt) {
  if (safeStorage?.isEncryptionAvailable()) {
    return JSON.stringify({
      v: 2,
      alg: 'safeStorage',
      data: safeStorage.encryptString(plaintext).toString('base64'),
    });
  }
  if (!salt) throw new Error('系统加密不可用，请先启用系统钥匙串/凭据存储');
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

function decodeStoredSecret(encoded, salt = getSalt()) {
  try {
    const parsed = JSON.parse(encoded);
    if (parsed?.v === 2 && parsed.alg === 'safeStorage') {
      if (!safeStorage?.isEncryptionAvailable()) return '';
      return safeStorage.decryptString(Buffer.from(parsed.data, 'base64'));
    }
    if (parsed?.iv && parsed?.data && parsed?.tag && salt) return decryptSecret(encoded, salt);
  } catch (_) {
    try { return Buffer.from(encoded, 'base64').toString('utf-8'); } catch (__) { return ''; }
  }
  if (salt) {
    try { return decryptSecret(encoded, salt); } catch (_) {}
  }
  return '';
}

function publicKey(key) {
  return {
    id: key.id,
    name: key.name,
    createdAt: key.createdAt,
  };
}

// ═══════════════════════════════════════════════════
//  Store
// ═══════════════════════════════════════════════════

function getStore() {
  return { keys: getAppData().keys };
}

function saveStore(store) {
  updateAppData((data) => {
    data.keys = Array.isArray(store.keys) ? store.keys : [];
  });
}

function addKey(name, secret) {
  const store = getStore();
  const id = crypto.randomUUID();
  const salt = getSalt();
  const encoded = encryptSecret(secret, salt);
  store.keys.push({
    id,
    name: name.trim(),
    secret: encoded,
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
  return decodeStoredSecret(encoded);
}

function getPublicKeys() {
  return getAllKeys().map(publicKey);
}

function migrateSecretsToSafeStorage() {
  if (!safeStorage?.isEncryptionAvailable()) return;
  const store = getStore();
  let changed = false;
  for (const key of store.keys) {
    const secret = decodeStoredSecret(key.secret);
    if (!secret) continue;
    try {
      const parsed = JSON.parse(key.secret);
      if (parsed?.v === 2 && parsed.alg === 'safeStorage') continue;
    } catch (_) {}
    key.secret = encryptSecret(secret, getSalt());
    changed = true;
  }
  if (changed) saveStore(store);
}

function getSecurityStatus() {
  return {
    encryptionAvailable: !!safeStorage?.isEncryptionAvailable(),
    encryptedWithSystemStorage: !!safeStorage?.isEncryptionAvailable(),
  };
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
    try {
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
    } catch (_) {
      return { id: key.id, name: key.name, current: '------', remaining, error: true };
    }
  });
}

function getOtpAuthUrl(id) {
  const key = getAllKeys().find(item => item.id === id);
  if (!key) throw new Error('密钥不存在');
  const secret = decodeSecret(key.secret);
  if (!secret) throw new Error('密钥无法解密');
  return `otpauth://totp/${encodeURIComponent(key.name)}?secret=${encodeURIComponent(secret)}&issuer=2FA-App`;
}

// ═══════════════════════════════════════════════════
//  Windows & Tray
// ═══════════════════════════════════════════════════

let mainWindow = null;
let popupWindow = null;
let tray = null;

function loadAppWindow(win, file) {
  if (isDev) {
    return win.loadURL(`${DEV_URL}/${file}`);
  }
  return win.loadFile(distFile(file));
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
    transparent: true,
    backgroundColor: '#00000000',
    title: 'OTP.2FA',
    icon: createAppIcon(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  loadAppWindow(mainWindow, 'index.html');

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
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    icon: createAppIcon(),
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  popupWindow = win;
  loadAppWindow(win, 'popup.html');

  win.once('ready-to-show', () => {
    if (!win || win.isDestroyed()) return;
    win.show();
    win.focus();
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

  tray.setToolTip('OTP.2FA');

  // 左键 → 自定义弹窗；右键 → 原生菜单
  tray.on('click', () => showPopup());
  tray.on('right-click', () => tray.popUpContextMenu(ctxMenu));
}

// ═══════════════════════════════════════════════════
//  IPC Handlers
// ═══════════════════════════════════════════════════

ipcMain.handle('keys:list', () => getPublicKeys());

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

ipcMain.handle('qr:get', (_, id) => createQrDataUrl(getOtpAuthUrl(id)));

ipcMain.handle('security:status', () => getSecurityStatus());

ipcMain.handle('avatar:save', (_, dataUrl) => {
  updateAppData((data) => {
    data.avatarData = typeof dataUrl === 'string' ? dataUrl : null;
  });
});

ipcMain.handle('avatar:get', () => {
  return getAppData().avatarData;
});

ipcMain.handle('main:open', () => createMainWindow());

ipcMain.handle('win:minimize', () => mainWindow?.minimize());
ipcMain.handle('win:close', () => { if (mainWindow) mainWindow.close(); });

ipcMain.handle('dock:get', () => getDockHide());
ipcMain.handle('dock:set', (_, hide) => {
  saveConfig({ hideDock: !!hide });
  if (process.platform === 'darwin') {
    if (hide) {
      app.setActivationPolicy('accessory');
    } else {
      app.setActivationPolicy('regular');
      app.dock.show();
    }
  }
});

// ═══════════════════════════════════════════════════
//  App Lifecycle
// ═══════════════════════════════════════════════════

app.isQuitting = false;
app.on('before-quit', () => { app.isQuitting = true; });

app.whenReady().then(() => {
  migrateSecretsToSafeStorage();
  if (process.platform === 'darwin') {
    app.setActivationPolicy(getDockHide() ? 'accessory' : 'regular');
  }
  Menu.setApplicationMenu(null);
  createTray();
  if (process.platform === 'darwin' && getDockHide()) {
    app.dock.hide();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => createMainWindow());
