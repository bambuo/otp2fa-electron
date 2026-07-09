const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD = path.join(__dirname, '..', 'build');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
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

function makePNG(w, h, rgba) {
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

function genIcon(size) {
  const cx = size/2, cy = size/2, r = cx - size*0.04;
  const rgba = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx + 0.5, y - cy + 0.5), i = (y * size + x) * 4;
      if (d <= r) {
        rgba[i]=0x16; rgba[i+1]=0x77; rgba[i+2]=0xff; rgba[i+3]=255;
      } else if (d <= r+2) {
        const a = Math.round(Math.max(0, Math.min(255, (1-(d-r))*255)));
        rgba[i]=0x16; rgba[i+1]=0x77; rgba[i+2]=0xff; rgba[i+3]=a;
      }
    }
  return makePNG(size, size, rgba);
}

// Generate PNGs for Linux
fs.writeFileSync(path.join(BUILD, 'icon.png'), genIcon(512));
console.log('✓ icon.png (512x512)');

// Generate iconset for macOS .icns
const iconsetDir = path.join(BUILD, 'OTP.2FA.iconset');
fs.rmSync(iconsetDir, { recursive: true, force: true });
fs.mkdirSync(iconsetDir, { recursive: true });

const sizes = [16, 32, 64, 128, 256, 512];
for (const s of sizes) {
  fs.writeFileSync(path.join(iconsetDir, `icon_${s}x${s}.png`), s <= 256 ? genIcon(s) : genIcon(s));
  if (s <= 256) fs.writeFileSync(path.join(iconsetDir, `icon_${s}x${s}@2x.png`), genIcon(s * 2));
}
console.log('✓ iconset generated');

// Convert to .icns using macOS iconutil (macOS only)
try {
  execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(BUILD, 'icon.icns')}"`, { stdio: 'pipe' });
  console.log('✓ icon.icns created');
} catch (e) {
  console.log('⚠ icon.icns requires macOS iconutil (run on macOS)');
}

// Generate .ico placeholder (electron-builder can use png-pngs or rely on conversion)
console.log('✓ icon.png ready (Windows electron-builder will auto-convert)');
console.log('\nDone! Run: npm run dist');
