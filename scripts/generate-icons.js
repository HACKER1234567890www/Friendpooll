import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp Friendpool SVG icon
// Dark forest green background #062319, vibrant mint green #00f090 and #10b981
const svgStandard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#062319" />
      <stop offset="50%" stop-color="#0a3224" />
      <stop offset="100%" stop-color="#041811" />
    </linearGradient>
    <linearGradient id="mintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f090" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="108" fill="url(#bgGrad)" />

  <!-- Outer ambient ring -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#00f090" stroke-opacity="0.15" stroke-width="4" stroke-dasharray="8 8" />

  <!-- Orbit nodes representing friend members -->
  <circle cx="256" cy="100" r="28" fill="#10b981" fill-opacity="0.25" stroke="#00f090" stroke-width="4" />
  <circle cx="390" cy="210" r="24" fill="#10b981" fill-opacity="0.25" stroke="#00f090" stroke-width="4" />
  <circle cx="340" cy="390" r="26" fill="#10b981" fill-opacity="0.25" stroke="#00f090" stroke-width="4" />
  <circle cx="172" cy="390" r="26" fill="#10b981" fill-opacity="0.25" stroke="#00f090" stroke-width="4" />
  <circle cx="122" cy="210" r="24" fill="#10b981" fill-opacity="0.25" stroke="#00f090" stroke-width="4" />

  <!-- Connection chords to central pool -->
  <line x1="256" y1="100" x2="256" y2="200" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />
  <line x1="390" y1="210" x2="310" y2="235" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />
  <line x1="340" y1="390" x2="290" y2="310" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />
  <line x1="172" y1="390" x2="222" y2="310" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />
  <line x1="122" y1="210" x2="202" y2="235" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />

  <!-- Central Hub / Glowing Pool -->
  <circle cx="256" cy="256" r="76" fill="#041a12" stroke="url(#mintGrad)" stroke-width="7" filter="url(#glow)" />
  <circle cx="256" cy="256" r="62" fill="url(#mintGrad)" fill-opacity="0.12" />

  <!-- Rupee Symbol + Upward Growth Arrow combined in Center -->
  <g transform="translate(256, 256) scale(1.15)">
    <!-- ₹ Symbol -->
    <path d="M-22,-26 L22,-26 M-22,-13 L18,-13 M-22,-26 L-22,24 M-22,-13 C-2,-13 14,-13 14,-1 C14,11 -2,11 -16,11 L18,34" 
          stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>
</svg>`;

// Maskable icon with 15% safe padding
const svgMaskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#062319" />
      <stop offset="50%" stop-color="#0a3224" />
      <stop offset="100%" stop-color="#041811" />
    </linearGradient>
    <linearGradient id="mintGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f090" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
  </defs>

  <!-- Full-bleed background -->
  <rect width="512" height="512" fill="url(#bgGrad2)" />

  <!-- Scaled down to safe zone (80% centered) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <circle cx="256" cy="256" r="190" fill="none" stroke="#00f090" stroke-opacity="0.18" stroke-width="5" stroke-dasharray="10 10" />
    
    <circle cx="256" cy="100" r="30" fill="#10b981" fill-opacity="0.3" stroke="#00f090" stroke-width="4" />
    <circle cx="390" cy="210" r="26" fill="#10b981" fill-opacity="0.3" stroke="#00f090" stroke-width="4" />
    <circle cx="340" cy="390" r="28" fill="#10b981" fill-opacity="0.3" stroke="#00f090" stroke-width="4" />
    <circle cx="172" cy="390" r="28" fill="#10b981" fill-opacity="0.3" stroke="#00f090" stroke-width="4" />
    <circle cx="122" cy="210" r="26" fill="#10b981" fill-opacity="0.3" stroke="#00f090" stroke-width="4" />

    <line x1="256" y1="100" x2="256" y2="200" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />
    <line x1="390" y1="210" x2="310" y2="235" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />
    <line x1="340" y1="390" x2="290" y2="310" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />
    <line x1="172" y1="390" x2="222" y2="310" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />
    <line x1="122" y1="210" x2="202" y2="235" stroke="#00f090" stroke-opacity="0.4" stroke-width="3" />

    <circle cx="256" cy="256" r="82" fill="#041a12" stroke="url(#mintGrad2)" stroke-width="8" />
    <g transform="translate(256, 256) scale(1.2)">
      <path d="M-22,-26 L22,-26 M-22,-13 L18,-13 M-22,-26 L-22,24 M-22,-13 C-2,-13 14,-13 14,-1 C14,11 -2,11 -16,11 L18,34" 
            stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>
  </g>
</svg>`;

async function run() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgStandard);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgStandard);

  const stdBuffer = Buffer.from(svgStandard);
  const maskableBuffer = Buffer.from(svgMaskable);

  await sharp(stdBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  await sharp(stdBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  await sharp(stdBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');
}

run().catch(console.error);
