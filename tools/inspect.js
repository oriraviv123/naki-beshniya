const sharp = require('sharp');
const fs = require('fs');
const dir = 'C:\\Users\\orira\\Desktop';
(async () => {
  for (let i = 1; i <= 10; i++) {
    const p = `${dir}\\${i}.webp`;
    try {
      const m = await sharp(p).metadata();
      console.log(`${i}.webp: ${m.width} x ${m.height} (${m.format})`);
    } catch (e) {
      console.log(`${i}.webp: ERROR ${e.message}`);
    }
  }
})();
