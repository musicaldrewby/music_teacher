// Delivery derivatives only. Source artwork and original alpha channels are retained.
// Run with NODE_PATH pointing to an installation of sharp.
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
  let original = 0, delivery = 0;
  for (const file of (await fs.readdir(path.join(root, 'artwork/originals'))).sort()) {
    if (!file.endsWith('.png')) continue;
    const src = path.join(root, 'artwork/originals', file);
    const out = path.join(root, 'dist/assets', file.replace('.png', '.webp'));
    const bg = file.includes('background');
    const meta = await sharp(src).metadata();
    if (!bg && !meta.hasAlpha) throw new Error('Missing transparency: ' + file);
    await sharp(src).resize({width:bg ? 1600 : 640, height:bg ? undefined : 640,fit:'inside',withoutEnlargement:true})
      .webp({quality:bg ? 84 : 88,alphaQuality:100,effort:5}).toFile(out);
    const input = (await fs.stat(src)).size, output = (await fs.stat(out)).size;
    original += input; delivery += output;
    console.log(file.replace('.png','') + ': ' + Math.round(output/1024) + ' KiB' + (meta.hasAlpha ? ' (alpha)' : ''));
  }
  console.log(JSON.stringify({originalBytes:original,deliveryBytes:delivery,reductionPercent:Math.round((1-delivery/original)*100)}));
})();
