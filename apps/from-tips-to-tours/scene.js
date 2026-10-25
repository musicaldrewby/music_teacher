import {environment} from './content.js';
import {performanceProfile} from './performance.js';
import {Audience} from './crowd.js';
export class StageScene {
 constructor(canvas,getState){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.getState=getState;this.audience=new Audience();this.cheerUntil=0;this.art=new Image();this.extra=new Image();this.hero=new Image();this.band=new Image();this.gearArt=new Image();this.gearArt.src='assets/art/gear-sheet.png';this.art.src='assets/art/career-atlas.png';this.extra.src='assets/art/encore-atlas.png';this.hero.src='assets/art/guitarist-sheet.png';this.band.src='assets/art/band-sheet.png';this.hit=0;this.last=0;this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);}
 pulse(){this.hit=performance.now();}
 cheer(){this.cheerUntil=performance.now()+2600;}
 sprite(img,rect,x,bottom,height,clip=null){if(!img.complete||!img.naturalWidth)return;const c=this.ctx,[sx,sy,sw,sh]=rect,scale=height/sh,w=sw*scale,left=x-w/2,top=bottom-height;c.save();if(clip){c.beginPath();clip.forEach(([px,py],i)=>i?c.lineTo(left+px*scale,top+py*scale):c.moveTo(left+px*scale,top+py*scale));c.closePath();c.clip();}c.drawImage(img,sx,sy,sw,sh,Math.round(left),Math.round(top),Math.round(w),Math.round(height));c.restore();}
 frame(now){requestAnimationFrame(this.frame);if(document.hidden||now-this.last<80)return;this.last=now;const s=this.getState();if(!s)return;const chapter=Math.floor(s.venue/6),env=environment(s.venue),art=env.cell,c=this.ctx,motion=s.settings.motion&&!matchMedia('(prefers-reduced-motion:reduce)').matches;const t=motion?now/1000:0;
 c.clearRect(0,0,682,384);c.imageSmoothingEnabled=false;
 const source=env.columns===2?this.extra:this.art;
 if(source.complete&&source.naturalWidth){const w=source.naturalWidth/env.columns,h=Math.floor(source.naturalHeight/env.rows),sy=Math.floor(art/env.columns)*h;c.drawImage(source,(art%env.columns)*w,sy,w,Math.floor(art/env.columns)===env.rows-1?source.naturalHeight-sy:h,0,0,682,384);}else{c.fillStyle='#201d36';c.fillRect(0,0,682,384);c.fillStyle='#534156';c.fillRect(0,260,682,124);}
 // Small lighting changes leave the background and camera steady.
 if(chapter>=2&&!env.private&&motion){for(let i=0;i<3;i++){c.save();c.globalCompositeOperation='screen';c.globalAlpha=.025+.012*Math.sin(t*.8+i*2);c.fillStyle=['#ffc66a','#b783f0','#78b4ff'][i];c.beginPath();c.moveTo(160+i*160,60);c.lineTo(80+i*160,315);c.lineTo(240+i*160,315);c.closePath();c.fill();c.restore();}}
 const floor=env.floor,profile=performanceProfile(s);
 const drummer=profile.drums,bassist=profile.bass,keys=profile.keys;
 if(drummer)this.sprite(this.band,[20,250,734,618],chapter<2?478:350,floor-22+(motion?Math.round(Math.sin(t*5.86)):0),profile.fullKit?130:108);
 if(bassist)this.sprite(this.band,[777,186,539,669],490,floor-7,148,[[0,0],[539,0],[539,314],[478,314],[478,669],[0,669]]);
 if(keys)this.sprite(this.band,[1255,196,503,660],190,floor-8,142,[[65,0],[503,0],[503,660],[0,660],[0,304],[65,304]]);
 const playing=s.owned.some(n=>n>0)||now-this.hit<750;
 const frame=motion&&playing?Math.floor(t*3.5)%4:0;
 const rects=[[45,170,440,630],[490,170,430,630],[920,170,440,630],[1370,170,404,630]];
 // Constant scale and baseline keep the musician grounded during every pose.
 this.sprite(this.hero,rects[frame],chapter<2?341:337,floor,chapter<2?176:160);
 // Separate purchased props keep the original scene and character art intact.
 if(s.gear.guitar>0)this.sprite(this.gearArt,[1147,8,263,504],chapter<2?145:90,floor-1,96);
 if(profile.electric)this.sprite(this.gearArt,[142,513,251,506],chapter<2?202:137,floor-1,101);
 if(s.gear.amp>0)this.sprite(this.gearArt,profile.stack?[619,4,298,503]:[118,170,297,309],chapter<2?572:610,floor-3,profile.stack?105:55);
 if(profile.pedals)this.sprite(this.gearArt,[536,684,465,225],337,floor+12,23);
 if(profile.award&&env.private)this.sprite(this.gearArt,[1114,562,332,413],583,floor-178,55);
 if(s.owned[1]>0){for(let i=0;i<Math.min(5,1+Math.floor(s.owned[1]/10));i++){c.fillStyle='#211e32';c.fillRect(79+i*5,floor-9-i*3,27,10);c.fillStyle='#b8a3b4';c.fillRect(83+i*5,floor-7-i*3,19,4);c.fillStyle='#342e42';c.fillRect(86+i*5,floor-6-i*3,4,2);c.fillRect(96+i*5,floor-6-i*3,4,2);}}
 if(!env.private)this.audience.draw(c,s.venue,s.fans,t,motion,now<this.cheerUntil);
 if(motion&&playing){for(let i=0;i<4;i++){const phase=(t*.45+i*.25)%1;c.globalAlpha=Math.sin(phase*Math.PI)*.6;c.fillStyle=i%2?'#ffc971':'#dda5f5';const x=340+Math.sin(t*.5+i*3)*45+phase*30,y=floor-92-phase*65;c.fillRect(Math.floor(x),Math.floor(y),4,3);c.fillRect(Math.floor(x)+3,Math.floor(y)-8,2,9);c.fillRect(Math.floor(x)+4,Math.floor(y)-8,4,2);}c.globalAlpha=1;}
 if(chapter>=5&&motion){for(let i=0;i<17;i++){c.globalAlpha=.15+.45*Math.max(0,Math.sin(t*.8+i));c.fillStyle=i%2?'#cbb5ff':'#a7eaff';const x=(i*197+39)%682,y=(i*53+80)%220;c.fillRect(x,y,2,2);}c.globalAlpha=1;}
 }
}
