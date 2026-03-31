const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC_WEBP = path.join(ROOT, 'logo.webp');
const OUT_DIR = path.join(ROOT, 'build');
const OUT_PNG = path.join(OUT_DIR, 'icon.png');
const OUT_ICO = path.join(OUT_DIR, 'icon.ico');

function buildIcoFromPng(pngBuffer, width, height) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(width >= 256 ? 0 : width, 0);
  entry.writeUInt8(height >= 256 ? 0 : height, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  if (!fs.existsSync(SRC_WEBP)) {
    throw new Error('Source logo.webp not found: ' + SRC_WEBP);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const png = await sharp(SRC_WEBP)
    .resize(256, 256, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const ico = buildIcoFromPng(png, 256, 256);

  fs.writeFileSync(OUT_PNG, png);
  fs.writeFileSync(OUT_ICO, ico);

  console.log('Icon files generated:');
  console.log(' - ' + OUT_PNG);
  console.log(' - ' + OUT_ICO);
}

main().catch((err) => {
  console.error('prepare-icon failed:', err.message || err);
  process.exit(1);
});