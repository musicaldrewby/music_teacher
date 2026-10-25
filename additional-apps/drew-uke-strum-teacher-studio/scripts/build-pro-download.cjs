// Build a full, self-contained Pro edition for opening from an extracted ZIP.
// All application code and fetch-based assets are local bytes; no server is needed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),out=path.resolve(process.argv[2]||path.join(root,'release'));
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf','.txt':'text/plain','.md':'text/plain'};
const files={};function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,f.name);if(f.isDirectory())walk(full);else{const name=path.relative(dist,full).split(path.sep).join('/');files[name]={type:types[path.extname(name)]||'application/octet-stream',data:fs.readFileSync(full).toString('base64')};}}}walk(dist);
const dataURI=name=>{if(!files[name])throw Error('Missing bundled file: '+name);return 'data:'+files[name].type+';base64,'+files[name].data;};
const code=name=>fs.readFileSync(path.join(dist,name),'utf8');
let html=code('index.html');
// CSS and images are embedded before parsing, so no file: requests are necessary.
const embedCSS=css=>css.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,(match,q,url)=>/^(data:|https?:|#)/.test(url)?match:'url("'+dataURI(url.replace(/^\.\//,''))+'")');
html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,name)=>'<style>'+embedCSS(code(name))+'</style>');
html=html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g,(_,a,src,b)=>a+(files[src]?dataURI(src):src)+b);
html=html.replace(/<script src="([^"]+)"><\/script>/g,(_,name)=>'<script>'+code(name).replace(/<\/script/gi,'<\\/script')+'</script>');
const runtime=`(function(){
 'use strict';
 const files=${JSON.stringify(files).replace(/</g,'\\u003c')},base=new URL('.',location.href),nativeFetch=window.fetch.bind(window),urls=new Map();
 function bytes(name){return Uint8Array.from(atob(files[name].data),c=>c.charCodeAt(0));}
 function blobURL(name){if(!urls.has(name))urls.set(name,URL.createObjectURL(new Blob([bytes(name)],{type:files[name].type})));return urls.get(name);}
 window.fetch=async function(input,init){const value=typeof input==='string'||input instanceof URL?input:input.url,url=new URL(value,base);const name=url.origin===base.origin&&url.pathname.startsWith(base.pathname)?decodeURIComponent(url.pathname.slice(base.pathname.length)):'';if(Object.hasOwn(files,name)){if(init?.signal?.aborted)throw new DOMException('Aborted','AbortError');return new Response(bytes(name),{status:200,headers:{'Content-Type':files[name].type}});}return nativeFetch(input,init);};
 window.EMBEDDED_ART=Object.fromEntries(Object.entries(files).filter(([name,f])=>f.type.startsWith('image/')).map(([name])=>[name,blobURL(name)]));
 window.UKE_VIDEO_MODULE_URL=blobURL('vendor/mediabunny.min.mjs');
 window.UKE_PRO_DOWNLOAD=true;
})();`;
new vm.Script(runtime);
html=html.replace('</head>','<script>'+runtime.replace(/<\/script/gi,'<\\/script')+'</script>\n</head>');
fs.writeFileSync(path.join(out,'Open-Uke-Strum-Pro.html'),html);
fs.mkdirSync(path.join(out,'help'),{recursive:true});fs.copyFileSync(path.join(dist,'help/Teacher-Studio-Manual.pdf'),path.join(out,'help/Teacher-Studio-Manual.pdf'));
const licenseNames=Object.keys(files).filter(n=>(/license|ofl|source\.txt|readme/i.test(n)||n==='vendor/fontkit-package.json')&&!n.startsWith('help/'));
for(const name of licenseNames){const target=path.join(out,'Third-party-notices',name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(dist,name),target);}
const readme=`MR. DREW'S UKE STRUM - TEACHER STUDIO PRO
Created by Drew Wichman
Release: October 10, 2026

START HERE
1. Extract / unzip this entire folder. Do not open the app inside the ZIP preview.
2. Open Open-Uke-Strum-Pro.html in your desktop web browser.
3. Press the welcome button, choose a song, and press Play to enable sound.
4. More options > How to use opens Help. Open PDF manual opens the included guide.

The full Pro app includes instruments, artwork, fonts, melody notation, PDFs,
and video export. It does not require the private hosted Site or a login.
Keep the help folder beside the HTML file so the manual links work.

SAVE YOUR SONGS
Save song stores a named copy in that browser. Export current song creates a
JSON backup you can move to another computer. Export before moving the HTML,
changing browsers, clearing browser data, or replacing an older app release.
Import song file adds those backups to My songs. Your songs are not in this ZIP.

VIDEO
Fast MP4 render needs browser support for H.264 and AAC encoding. If unavailable,
try the Live recording option; it takes the full song length and may use WebM.
A renamed WebM is not an MP4. Keep the window visible during Live recording.
Use the manual's video and troubleshooting chapters for detailed instructions.

STUDENT DISPLAY
Use Classroom view in this window for a projector. A separate student-display
window may be restricted when the app is opened as a local file. If it stays on
the waiting screen, present the main classroom window instead.

FILES
Open-Uke-Strum-Pro.html       Complete Pro application
help/Teacher-Studio-Manual.pdf  Illustrated step-by-step manual
Third-party-notices/         Licenses for bundled libraries, fonts, and sounds

The app creator credit remains. Exported composition videos have no app watermark.
Bundled third-party components retain their respective licenses and credits.
`;
fs.writeFileSync(path.join(out,'START-HERE.txt'),readme);
console.log(JSON.stringify({directory:out,htmlBytes:Buffer.byteLength(html),embeddedFiles:Object.keys(files).length,manual:'help/Teacher-Studio-Manual.pdf'}));
