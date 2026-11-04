import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const ctx={window:{}};vm.runInNewContext(fs.readFileSync('dist/apps.js','utf8'),ctx);
const {ARCADE_APPS:apps,ARCADE_REGIONS:regions}=ctx.window;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const listing=regions.map(r=>`<section><h2>${esc(r.name)}</h2><ul>${apps.filter(a=>[a.region,...(a.additionalRegions||[])].includes(r.id)).map(a=>`<li><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)} ↗</a><p>${esc(a.description)}</p>${a.mirrorUrl?`<a class="edition" href="${esc(a.mirrorUrl)}" target="_blank" rel="noopener noreferrer">Play the GitHub edition ↗</a>`:''}</li>`).join('')}</ul></section>`).join('');
fs.writeFileSync('dist/directory.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All ${apps.length} apps — Mr. Drew’s Arcade</title><link rel="icon" href="assets/favicon.svg"><style>body{font:17px/1.6 system-ui,sans-serif;color:#183b4e;background:#fff2dc;max-width:900px;padding:35px 22px;margin:auto}h1,h2{font-family:Georgia,serif;line-height:1.2}h1{font-size:42px}h2{font-size:29px}a{color:#216676;text-underline-offset:4px}section{margin-top:32px;border-top:1px solid #cdb58e;padding-top:10px}li{margin:22px 0}li a{font-weight:700}.edition{font-size:14px}li p{font-size:14px;margin:5px 0;color:#56737b}footer{border-top:1px solid #cdb58e;padding-top:25px;margin-top:35px;font-size:13px}</style></head><body><a href="index.html">← Back to the arcade</a><h1>Every app, in one place.</h1><p>${apps.length} music apps by Drew Wichman. Each app opens in a new tab.</p>${listing}<footer>Created by Drew Wichman. <a href="https://www.buymeacoffee.com/musicaldrewby" target="_blank" rel="noopener noreferrer">Buy me a coffee ↗</a></footer></body></html>`);
fs.writeFileSync('dist/.nojekyll','');
fs.writeFileSync('dist/README-GITHUB.txt',`MR. DREW’S MUSIC ARCADE

The arcade and its ${apps.length} apps now live in this repository.

Open: https://musicaldrewby.github.io/music_teacher/
Directory: https://musicaldrewby.github.io/music_teacher/directory.html

See README.md for the complete app list, source layout, saved-work transfer notes, and the Music Lab VR Listening Room server exception.

Created by Drew Wichman.
`);
fs.mkdirSync('dist/downloads',{recursive:true});
const files=['assets/cabinet-resonant-valley.webp','assets/resonant-valley-screen.webp','assets/resonant-valley-harp.webp','assets/fonts/pixelify-sans-latin-700-normal.woff2','assets/fonts/PIXELIFY-LICENSE.txt','assets/mallet-measure-free-screen.svg','assets/cabinet-from-tips-to-tours.webp','assets/from-tips-to-tours-screen.webp','assets/cabinet-autoharp.webp','assets/autoharp-screen.webp','assets/cabinet-poison-rhythm.webp','assets/poison-rhythm-screen.webp','.nojekyll','README-GITHUB.txt','index.html','style.css','app.js','beach-audio.js','day-night.js','arcade-surprises.js','assets/seagull-sprites.webp','assets/sailboat.webp','assets/boardwalk-crab.webp','assets/lantern-moth.webp','assets/audio/arcade-beach.mp3','assets/audio/arcade-day-night.mp3','apps.js','directory.html','assets/boardwalk.webp','assets/boardwalk-night.webp','assets/cabinets.webp','assets/cabinet-copper.webp','assets/cabinet-seafoam.webp','assets/cabinet-nautical.webp','assets/cabinet-carnival.webp','assets/cabinet-grand-theater.webp','assets/cabinet-orbit.webp','assets/cabinet-midnight-vector.webp','assets/cabinet-sunset-stripe.webp','assets/cabinet-laser-lime.webp','assets/cabinet-indigo-wave.webp','assets/cabinet-felt-fable.webp','assets/cabinet-music-stoplight.webp','assets/cabinet-orbit-studio.png','assets/orbit-studio-screen.svg','assets/cabinet-mcp-circuit.webp','assets/album-covers.webp','assets/favicon.svg','assets/fonts/nunito.ttf','assets/fonts/nunito-OFL.txt','assets/fonts/lilitaone.ttf','assets/fonts/lilitaone-OFL.txt'];
execFileSync('python3',['-c',`import zipfile,re,json\nfrom pathlib import Path\nroot=Path('dist')\nfiles=json.loads(${JSON.stringify(JSON.stringify(files))})\nwith zipfile.ZipFile(root/'downloads/mr-drews-music-arcade-github.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:\n for name in files:\n  p=root/name\n  if name=='index.html':\n   text=re.sub(r'<a href="downloads/[^"]+"[^>]*>Download website</a>','',p.read_text())\n   z.writestr(name,text)\n  else:z.write(p,name)\n`]);
console.log(JSON.stringify({apps:apps.length,files:files.length,zip:'dist/downloads/mr-drews-music-arcade-github.zip'}));
