// One-time build tool: renders build/icon.svg to a multi-resolution
// build/icon.ico for the Windows installer/taskbar/desktop shortcut.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

const svgPath = path.join(__dirname, '../build/icon.svg');
const icoPath = path.join(__dirname, '../build/icon.ico');
const sizes = [16, 24, 32, 48, 64, 128, 256];

async function main() {
  const svgBuffer = fs.readFileSync(svgPath);
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer())
  );
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`Wrote ${icoPath} (${sizes.join(', ')}px)`);
}

main().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
