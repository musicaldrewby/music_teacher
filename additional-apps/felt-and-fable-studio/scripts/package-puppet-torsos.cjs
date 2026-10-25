const artFs=require('fs'),artPath=require('path');artFs.mkdirSync(artPath.resolve(__dirname,'../public/assets/prepared'),{recursive:true});
// Pack generated torso replacements into the original atlases. Other body parts
// retain their original source artwork; runtime IDs and atlas coordinates stay stable.
const fs=require('fs'),path=require('path'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'art-source/puppets/manifest.json')));
(async()=>{for(const actor of manifest){
 const atlas=await loadImage(path.join(root,actor.path)),body=await loadImage(path.join(root,'art-source/puppets/torso-v2',actor.slug+'.png'));
 const sample=createCanvas(body.width,body.height),g=sample.getContext('2d');g.drawImage(body,0,0);const d=g.getImageData(0,0,body.width,body.height).data;let l=body.width,t=body.height,r=0,b=0;
 for(let y=0;y<body.height;y++)for(let x=0;x<body.width;x++)if(d[(y*body.width+x)*4+3]>24){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
 const c=createCanvas(atlas.width,atlas.height),ctx=c.getContext('2d');ctx.drawImage(atlas,0,0);const [x,y,w,h]=actor.parts.torso;ctx.clearRect(x-8,y-8,w+16,h+16);ctx.drawImage(body,l,t,r-l+1,b-t+1,x,y,w,h);
 const png=path.join(root,'art-source/puppets/torso-v2',actor.slug+'-atlas.png');fs.writeFileSync(png,c.toBuffer('image/png'));
 const data='data:image/webp;base64,'+c.encodeSync('webp',97).toString('base64');fs.writeFileSync(path.join(root,'public/assets/prepared/cinema-'+actor.slug+'-rig2.js'),'FELT_DATA["cinema-'+actor.slug+'"]='+JSON.stringify(data)+';\n');console.log(actor.slug,'torso bounds',[l,t,r-l+1,b-t+1]);
}})().catch(e=>{console.error(e);process.exitCode=1});
