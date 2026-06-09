/** @type {import('next').NextConfig} */
const nextConfig = {
  // הדף הראשי (index.html הסטטי) מוגש כפי שהוא דרך public/ — העיצוב נשמר 100%.
  async rewrites() {
    return [{ source: '/', destination: '/index.html' }];
  },
};

export default nextConfig;
