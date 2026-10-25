// Import the new acting atlases with a common foot anchor and posture-aware scale.
const fs=require('fs'),path=require('path'),{createCanvas,Image}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'../story-source/sleepy-hollow'),dir=root+'/art-source/acting';
module.exports=async p=>{
 const meta=JSON.parse(fs.readFileSync(root+'/asset-metadata.json'));
 async function load(name){const im=new Image();im.src='data:image/png;base64,'+fs.readFileSync(dir+'/'+name).toString('base64');await im.decode();return im;}
 function register(key,c,quality=76){const b=c.toBuffer('image/webp',quality);fs.writeFileSync(root+'/art/'+key+'.webp',b);meta[key]=[c.width,c.height];p.imports['import-sleepy-'+key]='data:image/webp;base64,'+b.toString('base64');}
 function tight(im,box,outW,outH,targetHeight,foot){
  const c=createCanvas(box[2]-box[0],box[3]-box[1]),g=c.getContext('2d');g.drawImage(im,box[0],box[1],c.width,c.height,0,0,c.width,c.height);const data=g.getImageData(0,0,c.width,c.height).data;
  let x0=c.width,y0=c.height,x1=0,y1=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
  x0=Math.max(0,x0-2);y0=Math.max(0,y0-2);x1=Math.min(c.width,x1+3);y1=Math.min(c.height,y1+3);
  const w=x1-x0,h=y1-y0,k=Math.min(targetHeight/h,(outW-24)/w),d=createCanvas(outW,outH);d.getContext('2d').drawImage(c,x0,y0,w,h,(outW-w*k)/2,foot-h*k,w*k,h*k);return d;
 }
 const atlases=[
 ['ichabod-everyday-atlas.png',622,625,[['ichabod-attentive',480],['ichabod-teach',480],['ichabod-invitation',465],['ichabod-greet',455]]],
 ['ichabod-listening-atlas.png',622,603,[['ichabod-seated-listen',405],['ichabod-seated-uneasy',405],['ichabod-chores',480],['ichabod-disappointed',450]]],
 ['brom-quiet-atlas.png',627,605,[['brom-watch',425],['brom-seated-listen',425],['brom-converse',480],['brom-knowing',480]]],
 ['katrina-quiet-atlas.png',627,605,[['katrina-seated-listen',410],['katrina-welcome',480],['katrina-skeptical',480],['katrina-reply',480]]]
 ];
 for(const [file,x,y,poses]of atlases){const im=await load(file),boxes=[[0,0,x,y],[x,0,im.width,y],[0,y,x,im.height],[x,y,im.width,im.height]];for(let n=0;n<4;n++)register(poses[n][0],tight(im,boxes[n],512,520,poses[n][1],508));}
 for(const key of ['lodging-stable-dusk','orchard-lane-dusk','lodging-stable-morning']){const im=await load(key+'.png'),c=createCanvas(1600,900);c.getContext('2d').drawImage(im,0,0,1600,900);register(key,c);}
 const im=await load('ichabod-ready-gunpowder.png');register('ichabod-ready-gunpowder',tight(im,[0,0,im.width,im.height],900,600,550,570));
 for(const key of ['mounted-sad','mounted-uneasy']){const im=await load(key+'.png'),c=createCanvas(900,600);c.getContext('2d').drawImage(im,0,0,900,600);register(key,c,76);}
 fs.writeFileSync(root+'/asset-metadata.json',JSON.stringify(meta,null,2));return meta;
};
