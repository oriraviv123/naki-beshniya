/** @type {import('next').NextConfig} */

// CSP מותאם בדיוק לצד-שלישי שבו האתר משתמש:
//   jQuery (code.jquery.com), SUMIT SDK (app.sumit.co.il),
//   טוקניזציה (api/*.sumit.co.il), פונטים של גוגל.
// בפיתוח (next dev) ריאקט זקוק ל-'unsafe-eval' ול-WebSocket עבור Hot Reload/hydration,
// אחרת הדף לא הופך אינטראקטיבי (כפתורים/בחירה לא מגיבים) ב-localhost.
// בפרודקשן ה-CSP נשאר מחמיר — בלי eval, עם upgrade-insecure-requests.
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://code.jquery.com https://app.sumit.co.il https://connect.facebook.net${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://www.facebook.com",
  `connect-src 'self' https://api.sumit.co.il https://app.sumit.co.il https://*.sumit.co.il https://www.facebook.com https://connect.facebook.net${isDev ? ' ws: wss:' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const nextConfig = {
  poweredByHeader: false, // לא לחשוף "X-Powered-By: Next.js"
  // הדף הראשי (index.html הסטטי) מוגש כפי שהוא דרך public/ — העיצוב נשמר 100%.
  async rewrites() {
    return [{ source: '/', destination: '/index.html' }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
