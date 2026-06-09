const sharp = require('sharp');
const D = 'C:\\Users\\orira\\Desktop';
const A = 'C:\\1mil\\assets';
const fs = require('fs');
if (!fs.existsSync(A)) fs.mkdirSync(A, { recursive: true });

(async () => {
  // Main product (two mitts, cream bg)
  await sharp(`${D}\\2.webp`).extract({ left: 690, top: 18, width: 415, height: 405 })
    .toFile(`${A}\\product.webp`);
  // Demo: hair lifted off couch
  await sharp(`${D}\\3.webp`).extract({ left: 233, top: 148, width: 420, height: 315 })
    .toFile(`${A}\\demo-couch.webp`);
  // Lifestyle: grooming dog
  await sharp(`${D}\\6.webp`).extract({ left: 224, top: 55, width: 490, height: 390 })
    .toFile(`${A}\\lifestyle-dog.webp`);
  // Features infographic (full, clean)
  await sharp(`${D}\\5.webp`).toFile(`${A}\\features.webp`);
  // Square thumbnail of single mitt for sticky bar / cart
  await sharp(`${D}\\2.webp`).extract({ left: 770, top: 70, width: 300, height: 300 })
    .toFile(`${A}\\thumb.webp`);

  for (const f of ['product','demo-couch','lifestyle-dog','features','thumb']) {
    const m = await sharp(`${A}\\${f}.webp`).metadata();
    console.log(`${f}.webp -> ${m.width}x${m.height}`);
  }
})();
