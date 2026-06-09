const sharp = require('sharp');
const D = 'C:\\Users\\orira\\Desktop';
const OUT = 'C:\\1mil\\tools\\candidates';
const fs = require('fs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// candidate crop boxes {file, left, top, width, height, name}
const jobs = [
  { src: '2.webp', name: 'c_prod_studio', left: 690, top: 18, width: 415, height: 405 },
  { src: '3.webp', name: 'c_hero_life',   left: 233, top: 148, width: 420, height: 315 },
  { src: '6.webp', name: 'c_dog_life',    left: 224, top: 55,  width: 490, height: 390 },
  { src: '5.webp', name: 'c_prod_cut',    left: 195, top: 110, width: 340, height: 490 },
];

(async () => {
  for (const j of jobs) {
    try {
      await sharp(`${D}\\${j.src}`)
        .extract({ left: j.left, top: j.top, width: j.width, height: j.height })
        .toFile(`${OUT}\\${j.name}.webp`);
      console.log(`OK ${j.name} from ${j.src}`);
    } catch (e) {
      console.log(`ERR ${j.name}: ${e.message}`);
    }
  }
})();
