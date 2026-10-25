import * as THREE from 'three';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// Room coordinates are meters. Photo-derived dimensions are deliberately kept
// together so a measured survey can update the shell without rebuilding assets.
export const ROOM = { width: 9.4, depth: 12.6, height: 5.3 };
// Rear-wall order follows Drew's annotated placement correction. Local +X is
// the viewer's right when facing this wall. All touching edges share one value.
export const REAR = { cubbyWidth:3.46, pianoWidth:1.58, deskWidth:1.65 };
REAR.cubbyRight=ROOM.width/2;
REAR.cubbyCenter=REAR.cubbyRight-(REAR.cubbyWidth+.025)/2;
REAR.cubbyLeft=REAR.cubbyCenter-(REAR.cubbyWidth+.025)/2;
REAR.pianoCenter=REAR.cubbyLeft-REAR.pianoWidth/2;
REAR.pianoLeft=REAR.pianoCenter-REAR.pianoWidth/2;
REAR.deskCenter=REAR.pianoLeft-REAR.deskWidth/2;
REAR.deskLeft=REAR.deskCenter-REAR.deskWidth/2;
// Architectural relationships are user-corrected; dimensions remain estimated.
export const LAYOUT = {
  doubleDoor: { wall:'front', center:-1.95, width:2.05, recess:.22 },
  entryDoor: { wall:'right', center:-5.45, width:1.02 },
  sink: { wall:'rear', center:(REAR.deskLeft-ROOM.width/2)/2, width:REAR.deskLeft+ROOM.width/2-.30, recess:.72, projection:.72, surroundWidth:REAR.deskLeft+ROOM.width/2 },
  frontBoards: { left:-.645, whiteboardWidth:3.66, right:ROOM.width/2-.35, height:1.30, centerY:1.78 },
  teachingCabinetry: { wall:'right', start:-2.39, front:.1165, depth:.55, drawerTop:.995 },
  startCloset: { wall:'right', center:-2.85, width:.86 },
  endCloset: { wall:'right', center:ROOM.depth/2-.72-.86/2, width:.86 },
  windows: { left:-4.55, right:-1.45, bottom:3.05, top:5.1, columns:4, rows:4, opening:.44 },
  keyboard: { wall:'right', center:-2.65, inset:1.02, benchInset:.40 },
  spots: { columns:7, rows:4, columnSpacing:.8344, rowSpacing:1.043 }
};
let seed = 4312;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const geometry = new Map();
function cached(key, make) { if (!geometry.has(key)) geometry.set(key, make()); return geometry.get(key); }
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function texture(c, repeat = 1) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; return t; }
function noiseTexture(type) {
  const c = canvas(type === 'carpet' ? 1024 : 256), ctx = c.getContext('2d'), n = c.width;
  const img = ctx.createImageData(n,n);
  for (let y=0;y<n;y++) for (let x=0;x<n;x++) {
    let v, rgb;
    if(type==='carpet') {
      // Dense slate-blue woven carpet: quiet fiber variation, no high-contrast
      // checkerboard or repeating stripes that shimmer while the camera moves.
      const thread=Math.sin(x*Math.PI)*1.2+Math.cos(y*Math.PI)*1.2;
      const fleck=random();v=(random()-.5)*15+thread+(fleck>.985?10:fleck<.012?-10:0);
      rgb=[113+v,125+v,132+v];
    } else {
      v = 214+(random()-.5)*35 + (type==='fabric'?(x%3===0?-16:0)+(y%3===0?-8:0):0);
      rgb=[v,v,v];
    }
    const p=(y*n+x)*4;img.data[p]=rgb[0];img.data[p+1]=rgb[1];img.data[p+2]=rgb[2];img.data[p+3]=255;
  }
  ctx.putImageData(img,0,0); return texture(c);
}
function woodTexture(dark=false) {
  const c=canvas(512),ctx=c.getContext('2d');ctx.fillStyle=dark?'#89522e':'#d9b47a';ctx.fillRect(0,0,512,512);
  for(let i=0;i<1500;i++) { const x=random()*512;ctx.beginPath();ctx.moveTo(x,0);for(let y=0;y<=512;y+=16)ctx.lineTo(x+Math.sin(y*.011+x*.034)*2.5+Math.sin(y*.04+x)*.6,y);ctx.strokeStyle=i%5===0?'rgba(255,233,192,.13)':'rgba(70,37,10,'+(random()*.10)+')';ctx.lineWidth=random()*1.2+.2;ctx.stroke(); }
  return texture(c);
}
function drumTexture(variant=0) {
  const c=canvas(512),ctx=c.getContext('2d');
  if(variant===0){
    ctx.fillStyle='#a94d24';ctx.fillRect(0,0,512,512);
    const colors=['#dc873a','#4a2920','#edaa52','#7b3722'];
    for(let x=0;x<512;x+=32)for(let y=0;y<512;y+=64){
      ctx.fillStyle=colors[(x/32+y/64)%4];ctx.fillRect(x+3,y+3,26,58);
      ctx.strokeStyle='#3b281e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+3,y+2);ctx.lineTo(x+29,y+32);ctx.lineTo(x+3,y+62);ctx.stroke();
      ctx.strokeStyle='#e5ad6a';ctx.lineWidth=1;ctx.strokeRect(x+6,y+7,20,50);
    }
  }else{
    ctx.fillStyle='#242138';ctx.fillRect(0,0,512,512);
    for(let i=0;i<180;i++){const x=random()*512,y=random()*512;ctx.strokeStyle=['#d34d3c','#dca833','#478965','#617eb0','#b7688e'][i%5];ctx.lineWidth=3+random()*7;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-45,y+20,x+50,y+30,x+random()*30,y+75);ctx.stroke();}
  }
  for(let i=0;i<12000;i++){ctx.fillStyle=random()>.5?'#fff1':'#0001';ctx.fillRect(random()*512,random()*512,1,2);}
  return texture(c);
}
function textTexture(text, bg='#f3f0e3', fg='#222b27', w=512,h=96) {
  const c=canvas(w,h),ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;ctx.font=`600 ${Math.min(h*.47,w/(text.length*.6))}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2,w*.94);return texture(c);
}
export function buildRoom() {
  const root=new THREE.Group();root.name='Mr Drew’s Music Classroom';root.userData={units:'meters',dimensions:'Approximate, reconstructed from photographs',people:false,layout:LAYOUT,rearArrangement:REAR,revision:15};
  const mats={};
  const mat=(name,color,roughness=.75,metalness=0,extra={})=>mats[name]=new THREE.MeshStandardMaterial({name,color,roughness,metalness,...extra});
  const fabric=noiseTexture('fabric'), plaster=noiseTexture('plaster'), carpet=noiseTexture('carpet'), maple=woodTexture(), walnut=woodTexture(true);
  mat('Plaster',0xeee8d9,.92,0,{map:plaster,bumpMap:plaster,bumpScale:.004});
  mat('Acoustic fabric',0x8eaaa5,1,0,{map:fabric,bumpMap:fabric,bumpScale:.013});
  mat('Panel edge',0x6e827e,1);mat('Maple',0xffffff,.52,0,{map:maple,bumpMap:maple,bumpScale:.006});
  mat('Walnut',0xd6bda5,.43,0,{map:walnut,bumpMap:walnut,bumpScale:.007});
  mat('Rosewood bars',0x754c37,.36,0,{map:walnut});mat('Dark wood',0x675342,.6,0,{map:walnut});
  mat('Painted steel',0x222625,.44,.45);mat('Rubber',0x252725,.93);mat('Brushed aluminum',0xb6bdbd,.34,.78);
  mat('Chrome',0xe0e3df,.2,.92);mat('Key ivory',0xf2f0df,.32);mat('Key ebony',0x171a19,.31);
  mat('Cabinet interior',0xe4dfcf,.75);mat('Countertop',0x777a65,.7);mat('Whiteboard',0xf0f0e9,.32);
  mat('Ceiling',0xebece5,.93,0,{map:plaster,bumpMap:plaster,bumpScale:.007});mat('Grid',0xc2c5bc,.6,.25);
  mat('Door',0xffedcf,.47,0,{map:maple});mat('Door frame',0x333b40,.52);mat('Baseboard',0x323d44,.78);
  mat('Door glazing',0x576c74,.17,.32);mat('Sink basin',0xa1adb0,.29,.72);
  mat('Chair upholstery',0x28312f,.63,0,{bumpMap:fabric,bumpScale:.003});
  mat('Drum orange',0xffffff,.8,0,{map:drumTexture(0)});mat('Drum colorful',0xffffff,.82,0,{map:drumTexture(1)});
  mat('Drum skin',0xd7cfb6,.95,0,{map:plaster,bumpMap:plaster,bumpScale:.009});mat('Gold',0xb49953,.42,.64);
  mat('Mallet yarn',0x284d83,1,0,{map:fabric,bumpMap:fabric,bumpScale:.018});mat('Yellow steps',0xe8bd2a,.82);
  mat('Screen',0x111b21,.21,.14);mat('Ceiling light',0xf3f6f4,.35,0,{emissive:0xe5f0ff,emissiveIntensity:1.25});
  function mesh(g,m,x=0,y=0,z=0,p=root){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function box(w,h,d,m,x=0,y=0,z=0,p=root){const o=mesh(cached('box',()=>new THREE.BoxGeometry(1,1,1)),m,x,y,z,p);o.scale.set(w,h,d);return o;}
  function cyl(rt,rb,h,m,x=0,y=0,z=0,p=root,segments=20){return mesh(cached(`c${rt},${rb},${h},${segments}`,()=>new THREE.CylinderGeometry(rt,rb,h,segments)),m,x,y,z,p);}
  function sphere(r,m,x,y,z,p=root){const o=mesh(cached('sphere',()=>new THREE.SphereGeometry(1,12,8)),m,x,y,z,p);o.scale.setScalar(r);return o;}
  function rod(a,b,r,m,p=root){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),diff=to.clone().sub(from);const o=cyl(r,r,diff.length(),m,0,0,0,p,8);o.position.copy(from.add(to).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());return o;}
  function group(name,x=0,y=0,z=0,rot=0,p=root){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);g.rotation.y=rot;p.add(g);return g;}
  function label(text,w,h,x,y,z,p,bg,fg){const m=new THREE.MeshStandardMaterial({map:textTexture(text,bg,fg),roughness:.85});m.name=text;return mesh(new THREE.PlaneGeometry(w,h),m,x,y,z,p);}
  const shadowCanvas=canvas(128),sc=shadowCanvas.getContext('2d'),grad=sc.createRadialGradient(64,64,8,64,64,64);grad.addColorStop(0,'rgba(9,15,18,.55)');grad.addColorStop(.45,'rgba(9,15,18,.32)');grad.addColorStop(1,'rgba(9,15,18,0)');sc.fillStyle=grad;sc.fillRect(0,0,128,128);
  const shadowMat=new THREE.MeshBasicMaterial({map:texture(shadowCanvas),transparent:true,depthWrite:false,opacity:.55});shadowMat.name='Soft contact shadow';
  function shadow(x,z,w,d,p=root,y=.008){const o=mesh(cached('plane',()=>new THREE.PlaneGeometry(1,1)),shadowMat,x,y,z,p);o.rotation.x=-Math.PI/2;o.scale.set(w,d,1);o.castShadow=false;return o;}
  const floor=group('Carpet and floor');carpet.repeat.set(ROOM.width/2.4,ROOM.depth/2.4);
  const floorMat=mat('Slate blue woven carpet',0xe6e8e8,1,0,{map:carpet,bumpMap:carpet,bumpScale:.005});
  box(ROOM.width,.1,ROOM.depth,floorMat,0,-.05,0,floor);
  // Broad contact shading grounds perimeter furniture without sacrificing mobile performance.
  shadow(-ROOM.width/2+.5,0,2.4,16,floor);shadow(ROOM.width/2-.5,0,2.4,16,floor);shadow(0,6,15,2.2,floor);shadow(0,-6,15,2.2,floor);

  // The photo's beige resilient floor follows the teaching cabinets, then
  // widens around the sink. The inside corner stays clear of all 28 spots.
  const stripInner=ROOM.width/2-1.32,sinkEdge=-REAR.deskLeft,sinkFloorFront=ROOM.depth/2-LAYOUT.sink.projection-1;
  const floorOutline=[[stripInner,-4.46],[ROOM.width/2,-4.46],[ROOM.width/2,ROOM.depth/2],[sinkEdge,ROOM.depth/2],[sinkEdge,sinkFloorFront],[stripInner,sinkFloorFront]];
  const resilientShape=new THREE.Shape();floorOutline.forEach(([x,z],i)=>i?resilientShape.lineTo(x,-z):resilientShape.moveTo(x,-z));resilientShape.closePath();
  const resilient=mesh(new THREE.ShapeGeometry(resilientShape),mat('Beige resilient flooring',0xe7d6b5,.80,0,{map:plaster,bumpMap:plaster,bumpScale:.001}),0,.005,0,floor);resilient.rotation.x=-Math.PI/2;resilient.castShadow=false;
  floor.userData={resilientOutline:floorOutline};
  for(const [a,b] of [[floorOutline[0],floorOutline[5]],[floorOutline[5],floorOutline[4]],[floorOutline[4],floorOutline[3]]])rod([a[0],.009,a[1]],[b[0],.009,b[1]],.003,mats.Baseboard,floor);
  const spots=group('Colored floor spots');const spotColors=[0x95b54a,0xca4784,0x2699c1,0x45a75f,0xe1c640,0xd15b4e,0xe09c57];
  for(let c=0;c<LAYOUT.spots.columns;c++)for(let r=0;r<LAYOUT.spots.rows;r++){const m=cached('spotMat'+c,()=>new THREE.MeshStandardMaterial({color:spotColors[c],roughness:.88}));const o=cyl(.078,.078,.002,m,(c-(LAYOUT.spots.columns-1)/2)*LAYOUT.spots.columnSpacing,.003,(r-(LAYOUT.spots.rows-1)/2)*LAYOUT.spots.rowSpacing,spots,32);o.castShadow=false;}
  spots.userData={...LAYOUT.spots,count:28};
  const front=group('Front wall',0,0,-6.3),right=group('Teaching wall',ROOM.width/2,0,0,-Math.PI/2),rear=group('Piano and drum wall',0,0,6.3,Math.PI),left=group('Window and ukulele wall',-ROOM.width/2,0,0,Math.PI/2);
  function panel(x,y,w,h,p){box(w+.028,h+.028,.065,mats['Panel edge'],x,y,.075,p);box(w,h,.052,mats['Acoustic fabric'],x,y,.115,p);}
  function plainWall(p,w){box(w,5.3,.20,mats.Plaster,0,2.65,-.1,p);box(w,.115,.03,mats.Baseboard,0,.0575,.02,p);}
  function wallWithOpenings(p,w,openings){
    const cuts=[-w/2,w/2,...openings.flatMap(o=>[o.center-o.width/2,o.center+o.width/2])].sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){
      const l=cuts[i],r=cuts[i+1],x=(l+r)/2,hole=openings.find(o=>x>o.center-o.width/2&&x<o.center+o.width/2);
      if(hole){if(hole.top<ROOM.height)box(r-l,ROOM.height-hole.top,.2,mats.Plaster,x,(ROOM.height+hole.top)/2,-.1,p);}
      else{box(r-l,ROOM.height,.2,mats.Plaster,x,ROOM.height/2,-.1,p);box(r-l,.115,.03,mats.Baseboard,x,.0575,.02,p);}
    }
  }
  // The closet bay is recessed all the way to the ceiling, not framed by
  // applied pilasters. Broad wall faces remain on each side of the opening.
  wallWithOpenings(front,ROOM.width,[{...LAYOUT.doubleDoor,top:ROOM.height}]);
  box(LAYOUT.doubleDoor.width,ROOM.height-2.48,.20,mats.Plaster,LAYOUT.doubleDoor.center,(ROOM.height+2.48)/2,-LAYOUT.doubleDoor.recess-.10,front);
  for(const side of[-1,1])box(.04,ROOM.height,LAYOUT.doubleDoor.recess,mats.Plaster,LAYOUT.doubleDoor.center+side*(LAYOUT.doubleDoor.width/2+.02),ROOM.height/2,-LAYOUT.doubleDoor.recess/2,front);
  // Real openings receive the built-ins: their cases extend behind the wall,
  // while drawer and closet faces align with the existing dry-erase surface.
  const drawerEnd=LAYOUT.endCloset.center-LAYOUT.endCloset.width/2-.02;
  wallWithOpenings(right,ROOM.depth,[{...LAYOUT.entryDoor,top:2.48},
    {...LAYOUT.startCloset,top:2.52}, {...LAYOUT.endCloset,top:2.52},
    {center:(LAYOUT.teachingCabinetry.start+drawerEnd)/2,width:drawerEnd-LAYOUT.teachingCabinetry.start,top:LAYOUT.teachingCabinetry.drawerTop}]);
  plainWall(rear,ROOM.width);
  // Left wall has real openings: four columns by four rows, not window decals.
  const {left:wx0,right:wx1,bottom:wy0,top:wy1,columns:cols,rows,opening}=LAYOUT.windows,cw=(wx1-wx0)/cols,ch=(wy1-wy0)/rows;
  const windowLeft=wx0+(cw-opening)/2,windowRight=wx1-(cw-opening)/2;
  left.userData={windowLeft,windowRight,rackLeft:windowLeft,rackRight:windowRight,rackTop:2.83,windowBottom:wy0+(ch-opening)/2};
  box(12.6,wy0,.22,mats.Plaster,0,wy0/2,-.11,left);
  box(12.6,5.3-wy1,.22,mats.Plaster,0,(5.3+wy1)/2,-.11,left);
  box(wx0+6.3,wy1-wy0,.22,mats.Plaster,(-6.3+wx0)/2,(wy1+wy0)/2,-.11,left);
  box(6.3-wx1,wy1-wy0,.22,mats.Plaster,(6.3+wx1)/2,(wy1+wy0)/2,-.11,left);
  const sky=canvas(64,128),sctx=sky.getContext('2d'),sg=sctx.createLinearGradient(0,0,0,128);sg.addColorStop(0,'#7fbbdf');sg.addColorStop(.8,'#e5f2f4');sg.addColorStop(1,'#f1efdf');sctx.fillStyle=sg;sctx.fillRect(0,0,64,128);
  const skyMat=new THREE.MeshBasicMaterial({map:texture(sky)});skyMat.name='Sky beyond square windows';
  mats['Window sky']=skyMat;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++){
    const x=wx0+(col+.5)*cw,y=wy0+(row+.5)*ch;
    box((cw-opening)/2,ch,.22,mats.Plaster,x-cw/2+(cw-opening)/4,y,-.11,left);
    box((cw-opening)/2,ch,.22,mats.Plaster,x+cw/2-(cw-opening)/4,y,-.11,left);
    box(opening,(ch-opening)/2,.22,mats.Plaster,x,y-ch/2+(ch-opening)/4,-.11,left);
    box(opening,(ch-opening)/2,.22,mats.Plaster,x,y+ch/2-(ch-opening)/4,-.11,left);
    // Plain plaster opening: no sill, shelf, or trim projects into the room.
    box(.021,opening,.05,mats['Brushed aluminum'],x-opening/2+.012,y,-.13,left);box(.021,opening,.05,mats['Brushed aluminum'],x+opening/2-.012,y,-.13,left);
    box(opening,.021,.05,mats['Brushed aluminum'],x,y-opening/2+.012,-.13,left);box(opening,.021,.05,mats['Brushed aluminum'],x,y+opening/2-.012,-.13,left);
    const pane=mesh(new THREE.PlaneGeometry(opening-.035,opening-.035),skyMat,x,y,-.20,left);pane.castShadow=false;
  }
  box(12.6,.115,.035,mats.Baseboard,0,.0575,.02,left);
  // Leave visible plaster between the narrow panel and the neighboring panel.
  for(const x of[.65,2.3,4.35])panel(x,2.15,1.48,1.2,left);
  for(const x of[.4,2.3,4.35])panel(x,4.12,1.48,1.6,left);
  panel(-5.18,2.15,1.05,1.65,left);panel(-.77,2.05,1.10,1.65,left);
  // Exactly four panels span the teaching-board cabinetry and stop there.
  const teachingPanels=group('Four panels above teaching boards',0,0,0,0,right);
  teachingPanels.userData={wall:'right',count:4};
  const panelLeft=LAYOUT.startCloset.center-LAYOUT.startCloset.width/2+.19,panelRight=LAYOUT.endCloset.center+LAYOUT.endCloset.width/2-.23,panelGap=.40,panelWidth=(panelRight-panelLeft-3*panelGap)/4;
  for(let i=0;i<4;i++)panel(panelLeft+panelWidth/2+i*(panelWidth+panelGap),4.13,panelWidth,1.5,teachingPanels);
  panel(REAR.deskCenter,4.0,1.42,1.55,rear);
  panel(REAR.pianoCenter,4.0,1.40,1.55,rear);panel(REAR.cubbyCenter,4.0,2.25,1.55,rear);
  // Flat maple leaves sit inside real openings and dark jambs. The double
  // opening has one active leaf/lever; the single glazed entry faces across
  // the room from the RIGHT wall, not out from the front wall.
  function door(x,w,p,double=false){
    const g=group(double?'Double doors — front wall':'Single glazed entry — teaching wall',x,0,0,0,p);
    g.userData={wall:double?'front':'right',leaves:double?2:1};
    box(w,2.44,.025,mats['Door frame'],0,1.22,-.235,g);
    for(const sign of[-1,1])box(.075,2.48,.23,mats['Door frame'],sign*(w/2-.038),1.24,-.085,g);
    box(w,.075,.23,mats['Door frame'],0,2.4425,-.085,g);box(w,.011,.22,mats['Brushed aluminum'],0,.0055,-.085,g);
    const inner=w-.15,count=double?2:1,leafW=inner/count-.010;
    for(let i=0;i<count;i++){
      const cx=(i-(count-1)/2)*inner/count,leafZ=-.135;
      if(double)box(leafW,2.37,.054,mats.Door,cx,1.203,leafZ,g);
      else{
        const vl=cx+.15,vr=cx+.30,vb=1.14,vt=2.01,ll=cx-leafW/2,rr=cx+leafW/2;
        box(vl-ll,2.37,.054,mats.Door,(ll+vl)/2,1.203,leafZ,g);box(rr-vr,2.37,.054,mats.Door,(vr+rr)/2,1.203,leafZ,g);
        box(vr-vl,vb-.018,.054,mats.Door,(vl+vr)/2,(vb+.018)/2,leafZ,g);box(vr-vl,2.388-vt,.054,mats.Door,(vl+vr)/2,(vt+2.388)/2,leafZ,g);
        box(vr-vl,vt-vb,.01,mats['Door glazing'],(vl+vr)/2,(vt+vb)/2,leafZ,g);
        for(const vx of[vl,vr])box(.018,vt-vb+.03,.074,mats['Brushed aluminum'],vx,(vt+vb)/2,leafZ,g);
        for(const yy of[vb,vt])box(vr-vl+.03,.018,.074,mats['Brushed aluminum'],(vl+vr)/2,yy,leafZ,g);
        box(.23,.057,.057,mats['Brushed aluminum'],cx+.17,2.34,-.069,g);
        rod([cx+.16,2.34,-.035],[cx-.10,2.38,.004],.008,mats.Chrome,g);
      }
      const hingeX=cx+(double&&i===0?-1:1)*(leafW/2-.009);
      for(const yy of[.30,1.20,2.10])cyl(.008,.008,.085,mats.Chrome,hingeX,yy,-.096,g,10);
      if(!double||i===1){const hx=cx-leafW/2+.115;cyl(.028,.028,.022,mats.Chrome,hx,1.055,-.091,g).rotation.x=Math.PI/2;rod([hx,1.055,-.065],[hx+.115,1.055,-.065],.009,mats.Chrome,g);}
    }
    return g;
  }
  const frontCloset=door(LAYOUT.doubleDoor.center,LAYOUT.doubleDoor.width,front,true);frontCloset.position.z=-LAYOUT.doubleDoor.recess;frontCloset.userData.recessed=true;frontCloset.userData.leftWallSpace=LAYOUT.doubleDoor.center-LAYOUT.doubleDoor.width/2+ROOM.width/2;
  door(LAYOUT.entryDoor.center,LAYOUT.entryDoor.width,right);
  // Joined whiteboard and bulletin board extend nearly to the right corner.
  const boards=LAYOUT.frontBoards,boardWidth=boards.right-boards.left,split=boards.left+boards.whiteboardWidth;
  const frontBoards=group('Front whiteboard and bulletin board',0,0,0,0,front);
  frontBoards.userData={wall:'front',rightGap:ROOM.width/2-boards.right,bulletinOnRight:true};
  box(boardWidth,boards.height,.06,mats['Brushed aluminum'],(boards.left+boards.right)/2,boards.centerY,.1,frontBoards);
  box(boards.whiteboardWidth-.06,boards.height-.06,.028,mats.Whiteboard,boards.left+boards.whiteboardWidth/2,boards.centerY,.142,frontBoards);
  const cork=mat('Natural cork bulletin board',0xc7ad7e,.96,0,{map:plaster,bumpMap:plaster,bumpScale:.003});
  box(boards.right-split-.06,boards.height-.06,.028,cork,(split+boards.right)/2,boards.centerY,.142,frontBoards);
  box(.025,boards.height-.035,.04,mats['Brushed aluminum'],split,boards.centerY,.143,frontBoards);
  // Blank surfaces with the marker tray beneath only the dry-erase section.
  box(boards.whiteboardWidth,.03,.10,mats['Brushed aluminum'],boards.left+boards.whiteboardWidth/2,1.115,.19,frontBoards);
  const display=group('Mobile teaching display',.65,0,.82,0,front);display.userData={wall:'front'};
  box(2.2,1.27,.115,mats['Painted steel'],0,1.83,0,display);box(2.10,1.17,.01,mats.Screen,0,1.83,.064,display);
  box(.14,1.07,.1,mats['Painted steel'],0,.65,-.02,display);box(1.06,.07,.075,mats['Painted steel'],0,.19,0,display);
  for(let x of[-.47,.47]){box(.07,.06,.70,mats['Painted steel'],x,.15,0,display);for(let z of[-.27,.27]){const wheel=cyl(.057,.057,.055,mats.Rubber,x,.065,z,display);wheel.rotation.z=Math.PI/2;}}
  box(.65,.038,.35,mats['Painted steel'],0,.8,.14,display);cyl(.008,.008,.01,mats['Ceiling light'],.90,1.26,.069,display,8).rotation.x=Math.PI/2;
  shadow(0,.1,2.2,1.1,display);
  // A compact speaker below the screen, with a recessed grille.
  box(.40,.52,.28,mats['Painted steel'],.08,.32,.60,front);box(.34,.43,.01,mats.Rubber,.08,.33,.751,front);
  for(let yy of[.23,.44]){const g=cyl(yy===.23?.125:.06,yy===.23?.125:.06,.012,mats['Panel edge'],.08,yy,.76,front,28);g.rotation.x=Math.PI/2;}
  // Wall clock.
  const clock=cyl(.18,.18,.04,mats['Key ivory'],-4.53,3.05,.08,right,48);clock.rotation.x=Math.PI/2;
  const clockFace=group('Clock hands',-4.53,3.05,.115,0,right);rod([0,0,0],[-.065,.06,0],.008,mats['Painted steel'],clockFace);rod([0,0,0],[.025,.12,0],.005,mats['Painted steel'],clockFace);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;box(.015,.024,.007,mats['Painted steel'],Math.sin(a)*.145,Math.cos(a)*.145,0,clockFace);}
  // Recessed teaching-wall storage; no worktop above the drawers.
  function handle(x,y,z,p){rod([x-.055,y,z],[x+.055,y,z],.006,mats.Chrome,p);rod([x-.055,y,z-.025],[x-.055,y,z],.005,mats.Chrome,p);rod([x+.055,y,z-.025],[x+.055,y,z],.005,mats.Chrome,p);}
  const cabinetStart=LAYOUT.teachingCabinetry.start,cabinetEnd=drawerEnd;
  const cabinetWidth=cabinetEnd-cabinetStart,cabinetCenter=(cabinetStart+cabinetEnd)/2,moduleWidth=cabinetWidth/14,face=LAYOUT.teachingCabinetry.front;
  const drawers=group('Recessed teaching-wall drawers',0,0,0,0,right);
  drawers.userData={wall:'right',recessed:true,facePlane:face,hasCountertop:false};
  for(let i=0;i<14;i++){
    const x=cabinetStart+(i+.5)*moduleWidth;
    box(moduleWidth-.006,.92,LAYOUT.teachingCabinetry.depth,mats['Cabinet interior'],x,.515,face-.06-LAYOUT.teachingCabinetry.depth/2,drawers);
    for(let j=0;j<3;j++){box(moduleWidth-.030,.284,.026,mats.Maple,x,.213+j*.30,face-.013,drawers);handle(x,.235+j*.30,face+.035,drawers);}
  }
  box(cabinetWidth,.060,.026,mats['Dark wood'],cabinetCenter,.030,face-.04,drawers);
  // A narrow vertical maple rail meets the board; there is no horizontal ledge.
  box(cabinetWidth,.037,.026,mats.Maple,cabinetCenter,.9765,face-.013,drawers);
  const teachingBoard=group('Teaching dry-erase board',0,0,0,0,right);teachingBoard.userData={wall:'right',facePlane:face};
  box(cabinetWidth,1.45,.04,mats['Brushed aluminum'],cabinetCenter,1.72,.075,teachingBoard);box(cabinetWidth-.08,1.37,.025,mats.Whiteboard,cabinetCenter,1.72,.104,teachingBoard);
  box(cabinetWidth+.03,.038,.12,mats['Brushed aluminum'],cabinetCenter,1.0,.16,teachingBoard);
  for(let i=1;i<4;i++)box(.012,1.37,.007,mats['Brushed aluminum'],cabinetStart+cabinetWidth*i/4,1.72,.123,teachingBoard);
  for(const x of[LAYOUT.startCloset.center,LAYOUT.endCloset.center]){
    const closet=group('Full-height storage closet',x,0,0,0,right);closet.userData={wall:'right',separateFromSink:true,recessed:true,facePlane:face};
    box(.86,2.52,.63,mats['Cabinet interior'],0,1.26,face-.04-.315,closet);
    for(const side of[-1,1]){box(.412,2.45,.035,mats.Maple,side*.213,1.26,face-.0175,closet);rod([side*.07,1.16,face+.020],[side*.07,1.37,face+.020],.008,mats.Chrome,closet);}
  }
  // Sink built into a forward-projecting section of the REAR wall, immediately
  // beside the recessed desk. The closets end the perpendicular teaching wall.
  const sinkSurround=group('Projecting sink wall',LAYOUT.sink.center,0,LAYOUT.sink.projection,0,rear);
  sinkSurround.userData={wall:'rear',projection:LAYOUT.sink.projection,rightEdge:REAR.deskLeft};
  wallWithOpenings(sinkSurround,LAYOUT.sink.surroundWidth,[{center:0,width:LAYOUT.sink.width,top:2.68}]);
  for(const x of[-1,1].map(sign=>sign*(LAYOUT.sink.surroundWidth/2-.075)))box(.15,ROOM.height,LAYOUT.sink.projection,mats.Plaster,x,ROOM.height/2,-LAYOUT.sink.projection/2,sinkSurround);
  box(LAYOUT.sink.surroundWidth,.04,LAYOUT.sink.projection,mats.Plaster,0,ROOM.height-.02,-LAYOUT.sink.projection/2,sinkSurround);
  const sink=group('Built-in sink beside the desk',0,0,-LAYOUT.sink.recess,0,sinkSurround);
  sink.userData={wall:'rear',wrapsCorner:false};
  const sinkW=LAYOUT.sink.width,halfSink=sinkW/2,cabinetW=sinkW-.07;
  box(sinkW,2.68,.07,mats.Plaster,0,1.34,-.045,sink);
  for(const x of[-halfSink+.015,halfSink-.015])box(.03,2.68,LAYOUT.sink.recess,mats.Plaster,x,1.34,LAYOUT.sink.recess/2,sink);
  box(sinkW,.05,LAYOUT.sink.recess,mats.Plaster,0,2.655,LAYOUT.sink.recess/2,sink);
  // Open knee space under the left basin, drawers and doors to the right.
  const divider=.08,rightW=halfSink-.035-divider,rightCenter=divider+rightW/2,leftW=divider+halfSink-.035,leftCenter=-halfSink+.035+leftW/2;
  box(cabinetW,.75,.025,mats['Cabinet interior'],0,.445,.027,sink);
  for(const x of[-halfSink+.048,divider,halfSink-.048])box(.026,.75,.56,mats['Cabinet interior'],x,.445,.295,sink);
  box(leftW,.20,.035,mats.Maple,leftCenter,.72,.587,sink);
  box(rightW,.026,.56,mats['Cabinet interior'],rightCenter,.10,.295,sink);
  for(let i=0;i<2;i++){const x=divider+(i+.5)*rightW/2;box(rightW/2-.015,.55,.035,mats.Maple,x,.382,.587,sink);box(rightW/2-.015,.135,.035,mats.Maple,x,.748,.587,sink);handle(x,.75,.63,sink);handle(x,.57,.63,sink);}
  // The whole counter fits behind the alcove face, including its front lip.
  const sinkCounter=group('Recessed sink countertop',0,0,0,0,sink);sinkCounter.userData={wall:'rear',insideAlcove:true};
  // Countertop strips form an actual opening around a depressed metal basin.
  const sx=-sinkW*.21,sl=sx-.29,sr=sx+.29,sf=.56,sb=.19,counterLeft=-halfSink+.015,counterRight=halfSink-.015;
  box(sl-counterLeft,.045,.66,mats.Countertop,(counterLeft+sl)/2,.857,.34,sinkCounter);
  box(counterRight-sr,.045,.66,mats.Countertop,(sr+counterRight)/2,.857,.34,sinkCounter);
  box(sr-sl,.045,sb-.01,mats.Countertop,sx,.857,(sb+.01)/2,sinkCounter);
  box(sr-sl,.045,.67-sf,mats.Countertop,sx,.857,(sf+.67)/2,sinkCounter);
  for(const x of[sl,sr])box(.022,.018,sf-sb+.04,mats['Brushed aluminum'],x,.886,(sf+sb)/2,sink);
  for(const z of[sf,sb])box(sr-sl+.04,.018,.022,mats['Brushed aluminum'],sx,.886,z,sink);
  box(.50,.014,.29,mats['Sink basin'],sx,.72,.375,sink);
  for(const x of[sl+.016,sr-.016])box(.018,.15,sf-sb,mats['Sink basin'],x,.80,.375,sink);
  for(const z of[sb+.016,sf-.016])box(sr-sl,.15,.018,mats['Sink basin'],sx,.80,z,sink);
  cyl(.027,.027,.005,mats['Painted steel'],sx,.729,.375,sink,24);
  const faucet=new THREE.CatmullRomCurve3([new THREE.Vector3(sx,.89,.115),new THREE.Vector3(sx,1.12,.115),new THREE.Vector3(sx,1.19,.22),new THREE.Vector3(sx,1.12,.32)]);
  mesh(new THREE.TubeGeometry(faucet,20,.014,10,false),mats.Chrome,0,0,0,sink);
  for(const x of[sx-.12,sx+.12]){cyl(.022,.022,.037,mats.Chrome,x,.905,.115,sink);rod([x,.93,.115],[x+.055,.93,.115],.009,mats.Chrome,sink);}
  // Upper cabinet tops align; the right bank drops lower, as photographed.
  for(let bank=0;bank<2;bank++){
    const w=cabinetW/2,h=bank===0?.45:.78,cx=(bank-.5)*w,cy=2.63-h/2;
    box(w,h,.34,mats['Cabinet interior'],cx,cy,.18,sink);
    for(let i=0;i<2;i++){const x=cx+(i-.5)*w/2;box(w/2-.014,h-.026,.03,mats.Maple,x,cy,.367,sink);const hx=x+(i===0?1:-1)*(w/4-.055);rod([hx,cy-h/2+.07,.41],[hx,cy-h/2+.21,.41],.006,mats.Chrome,sink);}
  }
  box(.24,.34,.12,mats['Painted steel'],-halfSink+.17,1.46,.07,sink);
  box(.105,.18,.085,mats['Painted steel'],halfSink*.45,1.29,.055,sink);
  // Instrument builders keep their real silhouette and separate playable bars.
  function mallet(x,y,z,p,metal=false){rod([x,y,z],[x+.035,y+.37,z-.025],.006,mats.Maple,p);sphere(metal?.022:.030,metal?mats.Rubber:mats['Mallet yarn'],x+.035,y+.37,z-.025,p);}
  function stand(w,d,p){
    box(w,.033,d,mats.Maple,0,.73,0,p);
    for(const x of[-w*.37,w*.37]){
      for(const z of[-d*.34,d*.34]){box(.026,.61,.026,mats['Painted steel'],x,.405,z,p);box(.025,.08,.024,mats.Chrome,x,.1,z,p);const wheel=cyl(.034,.034,.028,mats.Rubber,x,.058,z,p,12);wheel.rotation.z=Math.PI/2;}
      box(.029,.032,d*.91,mats['Painted steel'],x,.15,0,p);
    }
    box(w*.77,.02,.023,mats['Painted steel'],0,.26,-d*.34,p);
  }
  function xylophone(x,z,p,metal=false,size=1,rot=0){
    const g=group(metal?'Orff metallophone':'Orff xylophone',x,0,z,rot,p);g.userData={wall:p===right?'right':'left',instrument:'orff'};g.scale.setScalar(size);stand(1.04,.53,g);
    box(.94,.16,.37,mats.Maple,0,.865,0,g);box(.91,.015,.335,mats['Dark wood'],0,.955,0,g);
    for(const x of[-.46,.46])box(.025,.20,.39,mats.Maple,x,.875,0,g);
    const count=13;
    for(let i=0;i<count;i++){
      const bx=-.416+i*.069,l=.39-i*.014;
      box(.060,.021,l,metal?mats['Brushed aluminum']:mats['Rosewood bars'],bx,.982,0,g);
      for(const zz of[-l*.28,l*.28])cyl(.0038,.0038,.008,mats.Rubber,bx,.998,zz,g,6);
    }
    label(metal?'ALTO METALLOPHONE':'ALTO XYLOPHONE',.39,.047,0,.865,.188,g);
    mallet(.42,.76,.22,g,metal);mallet(.49,.76,.22,g,metal);shadow(0,0,1.35,.95,g);
    return g;
  }
  // Xylophones run beneath the window-and-ukulele wall, never across the center.
  for(let i=0;i<8;i++)xylophone(-5.05+i*1.23,.90,left,false,.94);
  for(let i=1;i<5;i++)xylophone(-2.65+i*1.2,1.18,right,true,.92);
  xylophone(3.35,1.18,right,false,.96);
  // Bass Orff instruments sit on the floor with a larger resonator.
  function bass(x,z,p){const g=group('Bass xylophone',x,0,z,0,p);box(.96,.48,.50,mats.Maple,0,.27,0,g);box(.91,.014,.46,mats['Dark wood'],0,.52,0,g);for(let i=0;i<13;i++)box(.061,.029,.54-i*.021,mats['Rosewood bars'],-.42+i*.07,.548,0,g);label('BASS XYLOPHONE',.31,.062,0,.29,.254,g);shadow(0,0,1.45,.9,g);}
  bass(4.55,1.05,right);
  // Ukuleles: curved waists, real soundholes, bridge, fretboard, frets, four strings and tuning pegs.
  const ukeShape=new THREE.Shape();ukeShape.moveTo(0,-.15);ukeShape.bezierCurveTo(-.19,-.16,-.215,-.045,-.115,.035);ukeShape.bezierCurveTo(-.070,.085,-.165,.11,-.125,.205);ukeShape.bezierCurveTo(-.090,.267,.09,.267,.125,.205);ukeShape.bezierCurveTo(.165,.11,.070,.085,.115,.035);ukeShape.bezierCurveTo(.215,-.045,.19,-.16,0,-.15);
  const hole=new THREE.Path();hole.absellipse(0,.137,.041/.70,.041,0,Math.PI*2,true);ukeShape.holes.push(hole);
  const ukeGeo=new THREE.ExtrudeGeometry(ukeShape,{depth:.068,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.004,bevelThickness:.003,curveSegments:14});
  ukeGeo.scale(.70,1,1);
  const ukeMaterials=[mats.Walnut,mats.Maple,new THREE.MeshStandardMaterial({color:0x9d7660,map:walnut,roughness:.43}),new THREE.MeshStandardMaterial({color:0x614037,map:walnut,roughness:.5})];
  function ukulele(x,y,z,p,index){
    const g=group('Ukulele '+(index+1),x,y,z,0,p);g.scale.setScalar(.87);
    mesh(ukeGeo,ukeMaterials[index%4],0,0,0,g);box(.048,.31,.026,mats['Dark wood'],0,.365,.028,g);box(.043,.31,.01,mats['Key ebony'],0,.365,.058,g);
    box(.074,.115,.024,ukeMaterials[index%4],0,.57,.025,g);
    const ring=mesh(cached('uke-ring',()=>new THREE.TorusGeometry(.045,.0025,8,40)),mats.Gold,0,.137,.073,g);
    const back=cyl(.044,.044,.004,mats['Dark wood'],0,.137,.006,g,24);back.rotation.x=Math.PI/2;
    box(.105,.024,.012,mats['Dark wood'],0,-.045,.079,g);box(.062,.005,.013,mats['Key ivory'],0,-.034,.086,g);
    box(.045,.006,.013,mats['Key ivory'],0,.507,.062,g);
    for(let i=0;i<13;i++){const yy=.494-(1-Math.pow(2,-i/12))*.45;rod([-.022,yy,.067],[.022,yy,.067],.0008,mats.Chrome,g);if([3,5,7,10].includes(i))sphere(.0025,mats['Key ivory'],0,yy-.012,.070,g);}
    for(let i=0;i<4;i++)rod([-.014+i*.0093,-.034,.088],[-.014+i*.0093,.602,.066],.00055,mats['Key ivory'],g);
    for(let side of[-1,1])for(let yy of[.545,.59]){rod([side*.03,yy,.028],[side*.057,yy,.028],.006,mats.Chrome,g);const peg=sphere(.011,mats['Key ivory'],side*.060,yy,.028,g);peg.scale.y*=.7;}
    const mount=cyl(.034,.034,.03,mats['Painted steel'],0,.51,-.052,g,16);mount.rotation.x=Math.PI/2;rod([-.035,.49,-.04],[-.035,.49,.035],.006,mats.Rubber,g);rod([.035,.49,-.04],[.035,.49,.035],.006,mats.Rubber,g);
  }
  const rack=group('Ukulele racks directly below square windows',0,0,0,0,left);
  const rackWidth=windowRight-windowLeft,rackCenter=(windowRight+windowLeft)/2;
  rack.userData={left:windowLeft,right:windowRight,center:rackCenter,width:rackWidth};
  for(let y of[1.42,2.09,2.76])box(rackWidth,.105,.045,mats['Dark wood'],rackCenter,y,.065,rack);
  let ukeIndex=0;for(let row=0;row<3;row++)for(let col=0;col<7;col++)ukulele(windowLeft+.18+col*(rackWidth-.36)/6,1.00+row*.67,.135,rack,ukeIndex++);
  // Piano and bench, oriented inward from the rear wall.
  const piano=group('Upright piano',REAR.pianoCenter,0,.25,0,rear);
  piano.userData={wall:'rear',left:REAR.pianoLeft,right:REAR.cubbyLeft};
  box(1.52,1.2,.44,mats.Walnut,0,.66,0,piano);box(1.58,.055,.49,mats.Walnut,0,1.28,0,piano);
  box(1.40,.49,.024,mats.Maple,0,.98,.236,piano);box(1.42,.027,.04,mats.Walnut,0,.74,.27,piano);
  box(1.54,.105,.70,mats.Walnut,0,.72,.13,piano);box(1.39,.026,.36,mats['Key ebony'],0,.783,.33,piano);
  const pianoW=1.33,keyW=pianoW/52;
  for(let i=0;i<52;i++)box(keyW-.0012,.016,.31,mats['Key ivory'],-pianoW/2+(i+.5)*keyW,.804,.34,piano);
  for(let i=0;i<51;i++)if([0,1,3,4,5].includes(i%7))box(keyW*.58,.024,.18,mats['Key ebony'],-pianoW/2+(i+1)*keyW,.825,.273,piano);
  for(let x of[-.735,.735]){box(.07,.73,.095,mats.Walnut,x,.38,.42,piano);box(.09,.065,.47,mats.Walnut,x,.06,.26,piano);}
  for(let x of[-.08,0,.08]){const pedal=box(.035,.02,.12,mats.Gold,x,.08,.29,piano);pedal.rotation.x=-.1;}
  box(.55,.023,.055,mats.Walnut,0,.96,.28,piano);label('PIANO',.12,.023,0,.874,.252,piano,'#8f613d','#e6cc91');
  const bench=group('Piano bench',0,0,1.04,0,piano);box(.71,.05,.32,mats.Walnut,0,.48,0,bench);for(let x of[-.30,.30])for(let z of[-.11,.11])box(.034,.44,.034,mats.Walnut,x,.24,z,bench);shadow(0,0,1.1,.68,bench);shadow(0,.17,2.1,1.3,piano);
  // White cubbies and two neat tiers of tubano drums on the rear storage wall.
  const cubbies=group('Percussion storage',REAR.cubbyCenter,0,.025,0,rear),shelfW=REAR.cubbyWidth;
  cubbies.userData={wall:'rear',left:REAR.cubbyLeft,right:REAR.cubbyRight,flushWithSideWall:true};
  box(shelfW,1.32,.025,mats['Cabinet interior'],0,.71,.015,cubbies);
  for(let y of[.08,.50,.93,1.38])box(shelfW,.027,.48,mats['Cabinet interior'],0,y,.26,cubbies);
  for(let i=0;i<8;i++)box(.025,1.32,.48,mats['Cabinet interior'],-shelfW/2+i*shelfW/7,.73,.26,cubbies);
  for(let i=0;i<7;i++){const m=new THREE.MeshStandardMaterial({color:[0x788b73,0xc6a052,0x9b5a57,0x748b9e,0x9281a1,0xc99a68,0x6f8379][i],roughness:.9});box(.37,.23,.30,m,-1.48+i*.493,.23,.23,cubbies);label(['K','1','2','3','4','5','6'][i],.30,.29,-1.48+i*.493,1.15,.505,cubbies,'#f1eee2',['#7b7158','#c99245','#b0778e','#4d83a1','#778f6a','#aa6457','#777777'][i]);}
  function tubano(x,y,z,p,height=.78,r=.225,variant=0){
    const g=group('Tubano drum',x,y,z,0,p);cyl(r*.95,r*.91,height,mats[variant?'Drum colorful':'Drum orange'],0,height/2,0,g,32);
    for(let yy of[.025,height-.028]){cyl(r,r,.045,mats.Rubber,0,yy,0,g,32);cyl(r*.97,r*.97,.009,mats['Dark wood'],0,yy+.027,0,g,32);}
    cyl(r*.91,r*.91,.012,mats['Drum skin'],0,height+.002,0,g,32);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;box(.020,.048,.020,mats['Painted steel'],Math.cos(a)*r,height-.056,Math.sin(a)*r,g);}
    return g;
  }
  for(let row=0;row<2;row++)for(let i=0;i<7;i++)tubano(REAR.cubbyCenter-1.44+i*.48,1.41+row*.80,.28,rear,.77,.228,(i+row)%3===0?1:0);
  for(let i=0;i<3;i++)tubano(REAR.pianoCenter-.48+i*.48,1.32,.25,rear,.78,.226,i%2);
  const floorDrums=group('Two floor drums at piano-cubby junction',REAR.cubbyLeft,0,.99,0,rear);
  floorDrums.userData={wall:'rear',count:2,junction:REAR.cubbyLeft};
  tubano(-.22,0,0,floorDrums,.82,.21,1);tubano(.22,0,0,floorDrums,.82,.21,1);
  function djembe(x,z,h,p,v=0){const g=group('Hand drum',x,0,z,0,p);cyl(.11,.18,h*.48,mats[v?'Drum colorful':'Drum orange'],0,h*.24,0,g,24);cyl(.24,.10,h*.52,mats[v?'Drum colorful':'Drum orange'],0,h*.74,0,g,32);cyl(.245,.245,.032,mats.Rubber,0,h,0,g,32);cyl(.228,.228,.013,mats['Drum skin'],0,h+.018,0,g,32);for(let i=0;i<12;i++){let a=i/12*Math.PI*2;rod([Math.sin(a)*.236,h-.025,Math.cos(a)*.236],[Math.sin(a+.18)*.109,h*.47,Math.cos(a+.18)*.109],.003,mats['Dark wood'],g);}shadow(0,0,.75,.75,g);}
  // Front-wall lesson instruments will be placed after its structure is settled.
  // Desk sits flush against the piano, in the return made by the sink section.
  const desk=group('Teacher desk',REAR.deskCenter,0,.37,0,rear);desk.userData={wall:'rear',left:REAR.deskLeft,right:REAR.pianoLeft,inRecess:true};
  box(1.65,.05,.68,mats.Maple,0,.75,0,desk);box(.43,.68,.62,mats['Painted steel'],-.58,.35,0,desk);for(let i=0;i<3;i++){box(.4,.18,.012,mats['Door frame'],-.58,.2+i*.205,.317,desk);handle(-.58,.23+i*.205,.34,desk);}for(let zz of[-.27,.27])box(.035,.71,.035,mats['Painted steel'],.70,.37,zz,desk);shadow(0,0,2,.95,desk);
  function cushion(w,h,d,r,x,y,z,p){
    const s=new THREE.Shape(),l=-w/2,b=-h/2,rr=w/2,t=h/2;
    s.moveTo(l+r,b);s.lineTo(rr-r,b);s.quadraticCurveTo(rr,b,rr,b+r);s.lineTo(rr,t-r);s.quadraticCurveTo(rr,t,rr-r,t);s.lineTo(l+r,t);s.quadraticCurveTo(l,t,l,t-r);s.lineTo(l,b+r);s.quadraticCurveTo(l,b,l+r,b);
    const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.014,bevelSize:.009,bevelSegments:3,curveSegments:10,steps:1});g.translate(0,0,-d/2);return mesh(g,mats['Chair upholstery'],x,y,z,p);
  }
  const chair=group('Padded rolling desk chair',REAR.deskCenter+.15,0,1.15,Math.PI,rear);
  chair.userData={wall:'rear',facesDesk:true,casters:5};
  const seat=cushion(.51,.46,.075,.075,0,.52,0,chair);seat.rotation.x=-Math.PI/2;
  const back=cushion(.48,.66,.07,.085,0,.94,-.235,chair);back.rotation.x=-.10;
  cushion(.39,.15,.043,.035,0,.77,-.175,chair);cushion(.32,.16,.065,.055,0,1.325,-.28,chair);
  rod([0,.46,-.11],[0,.93,-.30],.026,mats['Painted steel'],chair);
  for(const x of[-.285,.285]){rod([x,.49,-.16],[x,.72,-.16],.018,mats['Painted steel'],chair);rod([x,.49,.12],[x,.72,.12],.018,mats['Painted steel'],chair);const arm=cushion(.073,.34,.04,.027,x,.74,-.02,chair);arm.rotation.x=-Math.PI/2;}
  cyl(.035,.043,.28,mats.Chrome,0,.29,0,chair);cyl(.060,.060,.075,mats['Painted steel'],0,.16,0,chair);
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5,tip=[Math.sin(a)*.30,.10,Math.cos(a)*.30];rod([0,.17,0],tip,.020,mats['Brushed aluminum'],chair);
    const caster=group('Twin caster',tip[0],0,tip[2],a,chair);box(.035,.075,.035,mats['Painted steel'],0,.091,0,caster);
    for(const x of[-.025,.025]){const wheel=cyl(.034,.034,.023,mats.Rubber,x,.041,0,caster,18);wheel.rotation.z=Math.PI/2;}
  }
  rod([.09,.43,0],[.27,.43,.07],.007,mats.Chrome,chair);sphere(.019,mats.Rubber,.27,.43,.07,chair);shadow(0,0,1,.95,chair);
  // The player sits on the wall side, looking across the room over the keys.
  // This replaces the first Orff instrument beside the former keyboard position.
  const keyboard=group('Digital piano',LAYOUT.keyboard.center,0,LAYOUT.keyboard.inset,Math.PI,right);
  keyboard.userData={wall:'right',playerFacesClass:true,onHardFloor:true};
  box(1.27,.105,.34,mats['Painted steel'],0,.82,0,keyboard);box(1.13,.014,.23,mats['Key ebony'],0,.882,.04,keyboard);
  const kw=1.09/36;for(let i=0;i<36;i++){box(kw-.0012,.009,.19,mats['Key ivory'],-.545+(i+.5)*kw,.893,.07,keyboard);if(i<35&&[0,1,3,4,5].includes(i%7))box(kw*.57,.017,.11,mats['Key ebony'],-.545+(i+1)*kw,.908,.025,keyboard);}
  for(let z of[-.10,.10]){rod([-.43,.1,z],[.37,.77,z],.019,mats['Painted steel'],keyboard);rod([.43,.1,z],[-.37,.77,z],.019,mats['Painted steel'],keyboard);}box(.80,.026,.026,mats['Painted steel'],0,.42,0,keyboard);
  const rest=box(.41,.23,.018,mats['Painted steel'],0,1.01,-.11,keyboard);rest.rotation.x=-.18;shadow(0,0,1.8,1.1,keyboard);
  const kbBench=group('Keyboard bench',LAYOUT.keyboard.center,0,LAYOUT.keyboard.benchInset,0,right);kbBench.userData={wall:'right',facesClass:true,onHardFloor:true};box(.58,.065,.3,mats['Painted steel'],0,.46,0,kbBench);for(let z of[-.10,.10]){rod([-.23,.05,z],[.23,.43,z],.015,mats['Painted steel'],kbBench);rod([.23,.05,z],[-.23,.43,z],.015,mats['Painted steel'],kbBench);}
  // Neatly nested stools near the front-left corner.
  for(let i=0;i<5;i++){const st=group('Nested stool',4.80,0,.47,0,left);cyl(.17,.17,.033,mats.Rubber,0,.42+i*.065,0,st,24);for(let a=0;a<4;a++){const t=a/4*Math.PI*2;rod([Math.sin(t)*.15,.035+i*.065,Math.cos(t)*.15],[Math.sin(t)*.12,.40+i*.065,Math.cos(t)*.12],.011,mats.Chrome,st);}}
  // Empty FlipForm riser used as a lesson-instrument staging surface.
  const closetLeft=LAYOUT.doubleDoor.center-LAYOUT.doubleDoor.width/2;
  const riser=group('FlipForm lesson riser',(-ROOM.width/2+closetLeft)/2,0,.68,0,front);
  riser.userData={wall:'front',leftOfCloset:true,empty:true,width:1.22,depth:1.20,steps:3};
  const riserGray=mat('FlipForm gray body',0x85898c,.72),yellowTread=mat('FlipForm yellow step tops',0xf5c82e,.64,0,{bumpMap:plaster,bumpScale:.001});
  for(let i=0;i<3;i++){
    // Gray structure rises away from the room; each yellow top is exposed.
    box(1.22,.20,1.20-i*.40,riserGray,0,.105+i*.20,-i*.20,riser);
    box(1.215,.018,.395,yellowTread,0,.209+i*.20,.40-i*.40,riser);
  }
  for(const x of[-.54,.54])for(const z of[-.52,.52])box(.12,.025,.10,mats.Rubber,x,.0125,z,riser);
  // Carry grips and restrained hinge details follow the molded gray panels.
  for(const x of[-.611,.611]){box(.004,.065,.12,mats.Rubber,x,.505,-.38,riser);box(.006,.025,.70,yellowTread,x,.345,-.20,riser);}
  for(const x of[-.23,.23])box(.105,.045,.006,mats['Panel edge'],x,.505,-.194,riser);
  shadow(0,0,1.55,1.5,riser);
  // Suspended ceiling with a visible tile grid and shallow luminous fixtures.
  const ceiling=group('Ceiling');box(ROOM.width,.08,12.6,mats.Ceiling,0,5.34,0,ceiling);
  for(let x=-ROOM.width/2;x<=ROOM.width/2+.001;x+=ROOM.width/20)box(.018,.016,12.6,mats.Grid,x,5.289,0,ceiling);
  for(let z=-6.3;z<=6.31;z+=.63)box(ROOM.width,.016,.018,mats.Grid,0,5.289,z,ceiling);
  for(let x of[-3.0,0,3.0])for(let z of[-3.6,0,3.6]){box(.62,.025,1.18,mats.Grid,x,5.26,z,ceiling);const light=box(.53,.014,1.09,mats['Ceiling light'],x,5.238,z,ceiling);light.castShadow=false;for(let i=0;i<4;i++)box(.53,.006,.007,mats['Key ivory'],x,5.226,z-.43+i*.29,ceiling);}
  const vent=group('Ceiling vent',2.1,5.267,-1.1,0,ceiling);box(.54,.021,.54,mats.Grid,0,0,0,vent);for(let i=0;i<9;i++)box(.46,.016,.012,mats['Panel edge'],0,-.018,-.20+i*.05,vent);
  // Merge static meshes by material inside each zone. This preserves real 3D
  // geometry while making thousands of bars, strings, keys and handles efficient.
  function batch(zone){
    zone.updateWorldMatrix(true,true);const inv=new THREE.Matrix4().copy(zone.matrixWorld).invert(),buckets=new Map();
    zone.traverse(o=>{if(o.isMesh){const key=o.material.uuid+'-'+o.castShadow+'-'+o.receiveShadow;let b=buckets.get(key);if(!b){b={material:o.material,cast:o.castShadow,receive:o.receiveShadow,geometries:[]};buckets.set(key,b);}const g=o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld));b.geometries.push(g.index?g.toNonIndexed():g);}});
    zone.clear();for(const b of buckets.values()){const merged=mergeGeometries(b.geometries,false);if(!merged)throw new Error('Could not combine room geometry');const o=new THREE.Mesh(merged,b.material);o.name=b.material.name||'Room detail';o.castShadow=b.cast;o.receiveShadow=b.receive;zone.add(o);b.geometries.forEach(g=>g.dispose());}
  }
  // Retain verified architectural anchors in the exported model after batching.
  root.updateMatrixWorld(true);root.userData.anchors=[];
  root.traverse(o=>{if(o.isGroup&&(o.userData.wall||o===rack)){
    const bounds=new THREE.Box3();o.traverse(part=>{if(part.isMesh&&!part.material.transparent){part.geometry.computeBoundingBox();bounds.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));}});
    root.userData.anchors.push({name:o.name,parent:o.parent.name,...o.userData,position:o.getWorldPosition(new THREE.Vector3()).toArray(),facing:new THREE.Vector3(0,0,1).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion())).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}});
  }});
  for(const zone of [...root.children])batch(zone);
  root.updateMatrixWorld(true);
  return {root,spots,ceiling,materials:mats,dimensions:ROOM};
}
