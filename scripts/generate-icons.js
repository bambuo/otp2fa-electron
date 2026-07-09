const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const BUILD = path.join(__dirname, '..', 'build');
const SOURCE_ICON = path.join(__dirname, '..', 'electron', 'assets', 'TOTP.png');
fs.mkdirSync(BUILD, { recursive: true });

function resizePng(size, outFile) {
  execFileSync('sips', ['-z', String(size), String(size), SOURCE_ICON, '--out', outFile], { stdio: 'pipe' });
  return fs.readFileSync(outFile);
}

function makeIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 0;
  entry[1] = 0;
  entry[2] = 0;
  entry[3] = 0;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

function icnsEntry(type, png) {
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, 'ascii');
  header.writeUInt32BE(png.length + 8, 4);
  return Buffer.concat([header, png]);
}

function makeIcns() {
  const entries = [
    icnsEntry('icp4', fs.readFileSync(path.join(iconsetDir, 'icon_16x16.png'))),
    icnsEntry('icp5', fs.readFileSync(path.join(iconsetDir, 'icon_32x32.png'))),
    icnsEntry('icp6', fs.readFileSync(path.join(iconsetDir, 'icon_32x32@2x.png'))),
    icnsEntry('ic07', fs.readFileSync(path.join(iconsetDir, 'icon_128x128.png'))),
    icnsEntry('ic08', fs.readFileSync(path.join(iconsetDir, 'icon_256x256.png'))),
    icnsEntry('ic09', fs.readFileSync(path.join(iconsetDir, 'icon_512x512.png'))),
    icnsEntry('ic10', fs.readFileSync(path.join(iconsetDir, 'icon_512x512@2x.png'))),
  ];
  const body = Buffer.concat(entries);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([header, body]);
}

if (!fs.existsSync(SOURCE_ICON)) {
  throw new Error(`Missing source icon: ${SOURCE_ICON}`);
}

// Generate PNGs for Linux
resizePng(512, path.join(BUILD, 'icon.png'));
console.log('✓ icon.png (512x512)');
fs.writeFileSync(path.join(BUILD, 'icon.ico'), makeIco(resizePng(256, path.join(BUILD, 'icon-256.png'))));
console.log('✓ icon.ico (256x256)');

// Generate iconset for macOS .icns
const iconsetDir = path.join(BUILD, 'OTP.2FA.iconset');
fs.rmSync(iconsetDir, { recursive: true, force: true });
fs.mkdirSync(iconsetDir, { recursive: true });

const sizes = [16, 32, 128, 256, 512];
for (const s of sizes) {
  resizePng(s, path.join(iconsetDir, `icon_${s}x${s}.png`));
  resizePng(s * 2, path.join(iconsetDir, `icon_${s}x${s}@2x.png`));
}
console.log('✓ iconset generated');

// Convert to .icns using macOS iconutil when available, with a local writer fallback.
try {
  execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(BUILD, 'icon.icns')}"`, { stdio: 'pipe' });
  console.log('✓ icon.icns created');
} catch (e) {
  fs.writeFileSync(path.join(BUILD, 'icon.icns'), makeIcns());
  console.log('✓ icon.icns created');
}

console.log('\nDone! Run: npm run dist');
