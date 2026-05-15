/**
 * Generates PWA icons (192x192 and 512x512 PNG) from an inline SVG.
 * Run once: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { writeFileSync } from 'fs'

// Lightning bolt on dark violet background — matches the app theme
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#0f172a"/>
  <path d="M62 8 L28 54 h22 L38 92 L74 46 H52 Z" fill="#7c3aed"/>
</svg>`

for (const size of [192, 512]) {
  const buf = await sharp(Buffer.from(svg(size)))
    .resize(size, size)
    .png()
    .toBuffer()
  writeFileSync(`public/icon-${size}.png`, buf)
  console.log(`Created public/icon-${size}.png`)
}
