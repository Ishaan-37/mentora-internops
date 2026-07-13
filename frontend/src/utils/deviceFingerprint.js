// src/utils/deviceFingerprint.js
// Generates a stable device fingerprint stored in localStorage.
// Uses browser properties that don't change between sessions:
//   - Screen resolution + color depth
//   - Timezone
//   - Browser language
//   - Platform / OS
//   - Browser user agent
//   - Canvas fingerprint (subtle rendering differences per GPU/driver)
//
// This is NOT perfect (can be spoofed by tech-savvy users) but it
// is strong enough to prevent casual attendance fraud by students.
// Combined with geo-fence, it forms a solid two-factor check.

const STORAGE_KEY = 'internops_device_id';

// Simple hash function (djb2) — no crypto needed, just needs to be consistent
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Canvas fingerprint — draws text and gets pixel data
// Different GPUs/drivers render fonts slightly differently
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width  = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font         = '14px Arial';
    ctx.fillStyle    = '#0d3fc7';
    ctx.fillText('InternOps🎓', 2, 2);
    ctx.fillStyle    = 'rgba(102,204,0,0.7)';
    ctx.font         = '12px sans-serif';
    ctx.fillText('IIT Jammu RISE', 4, 20);
    return hashString(canvas.toDataURL());
  } catch {
    return 'no-canvas';
  }
}

// Collect all stable device properties
function collectProperties() {
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const tz     = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang   = navigator.language || navigator.userLanguage || 'unknown';
  const platform = navigator.platform || 'unknown';
  const ua     = navigator.userAgent || 'unknown';
  const canvas = getCanvasFingerprint();
  const cores  = navigator.hardwareConcurrency || 0;
  const mem    = navigator.deviceMemory || 0;

  return {
    screen, tz, lang, platform,
    ua, canvas, cores, mem,
  };
}

// Generate a human-readable device label
function getDeviceLabel() {
  const ua = navigator.userAgent;
  let browser = 'Browser';
  let os      = 'Unknown OS';

  if (ua.includes('Firefox'))        browser = 'Firefox';
  else if (ua.includes('Edg'))       browser = 'Edge';
  else if (ua.includes('Chrome'))    browser = 'Chrome';
  else if (ua.includes('Safari'))    browser = 'Safari';

  if (ua.includes('Windows'))        os = 'Windows';
  else if (ua.includes('Android'))   os = 'Android';
  else if (ua.includes('iPhone'))    os = 'iPhone';
  else if (ua.includes('iPad'))      os = 'iPad';
  else if (ua.includes('Mac'))       os = 'Mac';
  else if (ua.includes('Linux'))     os = 'Linux';

  return `${browser} on ${os}`;
}

// Main export — returns { deviceHash, deviceLabel }
// Generates once, caches in localStorage
export function getDeviceFingerprint() {
  // Check if we already computed and cached it this session
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  const props = collectProperties();
  const raw   = Object.values(props).join('|');
  const deviceHash  = hashString(raw);
  const deviceLabel = getDeviceLabel();

  const fingerprint = { deviceHash, deviceLabel };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fingerprint));

  return fingerprint;
}

// Reset — used if intern changes their registered device (admin flow)
export function clearDeviceFingerprint() {
  localStorage.removeItem(STORAGE_KEY);
}
