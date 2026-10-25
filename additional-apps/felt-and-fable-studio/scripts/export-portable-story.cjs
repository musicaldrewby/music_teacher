// Export illustrated stories without dependencies on the hosted artwork catalog.
const fs=require('fs'),path=require('path'),h=require('./app-harness.cjs');
const {Image,createCanvas}=require('@napi-rs/canvas');
async function loadImage(source){const im=new Image();im.src='data:image/png;base64,'+(Buffer.isBuffer(source)?source:fs.readFileSync(source)).toString('base64');await im.decode();return im;}
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/export-portable-story.cjs INPUT OUTPUT');
(async()=>{
 await h.ready;
 const p=JSON.parse(fs.readFileSync(input,'utf8'));
 const ids=new Set();
 function walk(items,fn){for(const o of items){fn(o);if(o.children)walk(o.children,fn)}}
 for(const s of p.scenes){
  if(s.bg>=0){const key='bg'+s.bg;ids.add(key);s.items.unshift({id:s.id+'-portable-background',name:'Story backdrop',type:'asset',asset:key,x:800,y:450,w:1600,h:900,bw:1600,bh:900,rotation:0,opacity:1,fiber:0,stitch:false,locked:true,depth:'back'});s.bg=-1;}
 }
 function collect(o){if(o.type==='puppet'||o.storyProp)throw Error('Export complete illustrated assets, not rigged puppets or stateful props.');if(o.type==='asset')ids.add(o.asset);for(const q of o.illustration?.poses||[])ids.add(q.asset)}
 p.scenes.forEach(s=>walk(s.items,collect));walk(p.custom||[],collect);
 const archive=path.resolve(__dirname,'../art-source/don-gato');
 const metadata=new Map(JSON.parse(fs.readFileSync(path.join(archive,'asset-metadata.json'))).map(a=>[a.id,a]));
 const sheets=new Map();
 const imports={},mapping=new Map();
 for(const key of ids){
  h.context.assetKey=key;const replacement='import-story-'+key;mapping.set(key,replacement);
  if(p.imports?.[key]){imports[replacement]=p.imports[key];continue;}
  const a=metadata.get(key);
  if(a){
   if(!sheets.has(a.donGatoSheet))sheets.set(a.donGatoSheet,await loadImage(path.join(archive,a.donGatoSheet+'.png')));
   const im=sheets.get(a.donGatoSheet),[x,y,w,h]=a.donGatoCrop||[0,0,im.width,im.height],c=createCanvas(w,h);
   c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);imports[replacement]=c.toDataURL('image/png');
  }else{
   await h.run('ensureAsset(assetKey)');
   imports[replacement]=h.run('(()=>{const im=imageMap.get(assetKey);if(!im)throw Error("Missing asset "+assetKey);const c=makeCanvas(im.width,im.height);c.getContext("2d").drawImage(im,0,0);return c.toDataURL("image/png")})()');
  }
 }
 function rewrite(o){if(o.type==='asset')o.asset=mapping.get(o.asset);for(const q of o.illustration?.poses||[])q.asset=mapping.get(q.asset)}
 p.scenes.forEach(s=>walk(s.items,rewrite));walk(p.custom||[],rewrite);p.imports=imports;p.active=0;
 p.notes=(p.notes||'')+' Self-contained project: artwork is embedded. Open story, then choose Present for manual phrase advancement.';
 h.context.project=p;h.run('validateProject(project)');
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(p));
 console.log(JSON.stringify({file:output,scenes:p.scenes.length,embeddedAssets:ids.size,bytes:fs.statSync(output).size}));
})().catch(e=>{console.error(e);process.exit(1)});
