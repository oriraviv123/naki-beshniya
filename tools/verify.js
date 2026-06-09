const sharp = require('sharp');
(async () => {
  const meta = await sharp('C:\\1mil\\tools\\shot-tall.png').metadata();
  console.log('tall:', meta.width, 'x', meta.height);
  // crop bundles + offer region (roughly lower third)
  const crops = [
    { name: 'v_offer', top: Math.round(meta.height*0.70), h: Math.round(meta.height*0.16) },
    { name: 'v_compare', top: Math.round(meta.height*0.55), h: Math.round(meta.height*0.13) },
  ];
  for (const c of crops) {
    const h = Math.min(c.h, meta.height - c.top);
    await sharp('C:\\1mil\\tools\\shot-tall.png')
      .extract({ left: 0, top: c.top, width: meta.width, height: h })
      .toFile(`C:\\1mil\\tools\\${c.name}.png`);
    console.log('wrote', c.name, 'top', c.top, 'h', h);
  }
})();
