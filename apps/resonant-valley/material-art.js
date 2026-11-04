// Original opaque 32px material artwork. Palette indices keep the stair-stepped
// silhouettes and broad color clusters intact at the size of a single block.
const colors = {
  turf: [0x429747,0x50a648,0x60b447,0x6ebd46,0x81c64d,0x96ce58],
  earth: [0x76503b,0x86563c,0x936142,0xa16b48,0xab7853,0xaf8670,0x766c64],
  rock: [0x718297,0x7e91a4,0x879aab,0x91a2b2,0x9dacb7,0xa3b2ba,0x83919d],
  oak: [0x573b2d,0x69432e,0x7b4e32,0x895738,0x996940,0xa17148],
  oakBoards: [0xaa7848,0xbf8950,0xd09759,0xdba463,0xe4ae71,0xb5824b],
  brick: [0xa5544d,0xb95a4b,0xc56150,0xce6a53,0xd8795e,0xb88679],
  roof: [0x963e42,0xad4847,0xbc504c,0xc75c52,0xd16a5b],
  sand: [0xd2b47d,0xdfbf81,0xe9cc8e,0xf0d69a,0xf4dfad,0xddc7a0],
  chalk: [0xbfced8,0xccd9e1,0xd8e3e9,0xe2eaeb,0xeaf0ed,0xedf3ef,0xd5d6cd],
  slate: [0x394e69,0x455a77,0x506586,0x5a7191,0x667c9e,0x7385a1],
  clay: [0x8a788e,0x96839a,0xa08da3,0xad97a7,0xb6a2b1,0xb7a2ac,0x867982],
  birch: [0xc9c7bc,0xd9d8cd,0xe5e5d9,0xeeeee2,0xf3f2e7,0x827e78,0x665f5b],
  blueBoards: [0x365e97,0x396baa,0x3d77bf,0x4a83c7,0x5b92ce,0x37639e],
  plaster: [0xc96f93,0xd5799a,0xdf83a2,0xe78fab,0xf09db4,0xe4a0b2],
  path: [0x976a48,0xa4784e,0xb38254,0xbe8f60,0xc8996a,0xc5a17c,0x98816c],
  moss: [0x657d72,0x738780,0x81938c,0x8c9f93,0x9ba79c,0x63835e,0x799956,0x98ad70],
  walnut: [0x553831,0x684538,0x76503e,0x835b45,0x90664d,0x654237],
  snow: [0xcbdde8,0xd9e7ee,0xe6f0f2,0xeff5f2,0xf6f8ee],
  sandstone: [0xc89261,0xd7a571,0xe2b77d,0xeac18a,0xf1ce97,0xf1d39f],
  gravel: [0x667886,0x72848e,0x7f9099,0x8e9ca2,0xa4aaa7,0x9a9386,0x88877f],
  shale: [0x506786,0x5e7697,0x6983a5,0x7792b0,0x869db7,0x90a6bf],
  cottonwood: [0x6f665c,0x817565,0x948573,0xa1907c,0xae9b85,0xb5a793],
  cactus: [0x32754c,0x3b8750,0x449754,0x52a95d,0x65b465,0x90b679],
  heartwood: [0xb27d4a,0xc18b51,0xd19b60,0xdcab73,0xe6b983]
};

// Logical atlas indices. Glass, canopy cutouts and the buried case retain
// their separate artworks and alpha behavior.
const tiles = [
  'turf','earth','rock','oak',null,'oakBoards','brick',null,
  'roof','sand','chalk',null,'slate','clay','birch','blueBoards',
  'plaster','path','moss','walnut','snow',null,'sandstone','gravel',
  'shale','cottonwood',null,'cactus',null,null,'grassSide','heartwood'
];

function random(seed){
  return () => {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
}

// A periodic lattice. Its border samples are common to all four variants,
// so neighboring blocks can have different grain without outlining the tile.
function pigment(seed,cols,rows,variant){
  const fixed=random(seed),changed=random(seed+Math.imul(variant,20897));
  const values=new Float32Array(cols*rows);
  let total=0;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const a=fixed(),b=changed(),i=y*cols+x;
    total+=(values[i]=(x&&y?b:a)*2-1);
  }
  const mid=total/values.length;
  return (x,y) => {
    const u=x*cols/32,v=y*rows/32,ix=Math.floor(u),iy=Math.floor(v);
    const col=(ix%cols+cols)%cols,row=(iy%rows+rows)%rows;
    const nextCol=(col+1)%cols,right=nextCol+row*cols,down=((row+1)%rows)*cols;
    const fu=u-ix,fv=v-iy,a=values[col+row*cols],b=values[right];
    const c=values[col+down],d=values[nextCol+down];
    return (a+(b-a)*fu)*(1-fv)+(c+(d-c)*fu)*fv-mid;
  };
}
const tone = v => v<-.53?0:v<-.15?1:v<.19?2:v<.57?3:4;
const fit = (x,n) => Math.floor(x*n);
const sines=Array.from({length:32},(_,i)=>Math.sin(i*Math.PI/16));

// Sparse motifs have stepped contours, with compact regions of common color.
// '1', '2', ... index a local color map supplied by each pigment family.
function stamp(inks,x,y,rows,remap,flip=false){
  const w=rows[0].length;
  for(let j=0;j<rows.length;j++)for(let i=0;i<w;i++){
    const k=rows[j].charCodeAt(i)-48;
    if(k>0)inks[(((y+j)&31)*32)+((x+(flip?w-1-i:i))&31)]=remap[k-1];
  }
}
const turfMarks=[
  ['000010','000020','010220','002200'],['00200','00101','00020'],
  ['00010','01020','01220'],['00001','01020','00220']
];
const flakes=[
  ['0000220','0011222','0111110','1110000'],['001122','011110','110000'],
  ['00220','01122','11110'],['000022','001112','111110'],['0220','1122','0110']
];
const stones=[
  ['0220','2111','0110'],['00220','02112','11110','01100'],
  ['02220','21111','01110'],['020','211','010'],['00222','02111','11110']
];
const soilMarks=[['01100','11220','02220'],['0011','0112','0220'],['011','110'],['00220','01122','11100']];
const birchMarks=[['01122200','00011220'],['001110','112220'],['001111000','111122211'],['1122','0001']];
const barkEye=['001100','012210','122221','122221','012210','001100'];
const boardKnot=['000111000','011222110','122332221','011222110','000111000'];

// Overlapping angular stone planes and tighter rounded gravel grains use the
// same periodic cell centers. Color changes describe facets without outlines.
function stoneField(seed,variant,cols,rows){
  const shared=random(seed+56231),alternate=random(seed+variant*73491+1931),sites=[];
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const edge=x===0||y===0||x===cols-1||y===rows-1;
    const sample=()=>{const a=shared(),b=alternate();return edge?a:b;};
    sites.push([.22+.56*sample(),.22+.56*sample(),sample()-.5,sample()]);
  }
  return (x,y,ground,gravel)=>{
    const u=x*cols/32,v=y*rows/32,cx=Math.floor(u),cy=Math.floor(v);
    let nearest=10,second=10,choose,px,py;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const site=sites[((cy+dy+rows)%rows)*cols+(cx+dx+cols)%cols];
      const vx=u-(cx+dx+site[0]),vy=v-(cy+dy+site[1]),dist=vx*vx+vy*vy;
      if(dist<nearest){second=nearest;nearest=dist;choose=site;px=vx;py=vy;}
      else if(dist<second)second=dist;
    }
    if(gravel){
      const face=choose[2]-.82*(px+py)-nearest*.4;
      if(second-nearest<.095)return ground>.24?2:1;
      if(choose[3]>.88)return face>.07?5:6;
      return tone(face*.97+ground*.3);
    }
    return tone(choose[2]*.84-px*.21-py*.31+ground*.86);
  };
}

function paintTile(name,variant){
  const inks=new Uint8Array(1024),index=tiles.indexOf(name),seed=(index+4)*69313;
  const r=random(seed+variant*127937),base=pigment(seed,4,4,variant),fine=pigment(seed+759,8,8,variant);
  const shelves=pigment(seed+211,3,10,variant),vertical=pigment(seed+47,10,3,variant);
  const at=(x,y)=>y*32+x;
  const baseTone=(x,y)=>base(x,y)*.74+fine(x,y)*.31;
  const layer=(fn)=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++)inks[at(x,y)]=fn(x,y);};
  const dots=(patterns,count,remap)=>{
    for(let i=0;i<count;i++){
      const mark=patterns[fit(r(),patterns.length)],x=fit(r(),32),y=fit(r(),32);
      stamp(inks,x,y,mark,typeof remap==='function'?remap(i):remap,r()<.5);
    }
  };
  switch(name){
    case 'turf':
      layer((x,y)=>tone(baseTone(x,y)*.97));
      dots(turfMarks,16,i=>i%3?[1,3]:[3,4]);
      break;
    case 'earth':case 'clay':case 'path':
      layer((x,y)=>tone(baseTone(x,y)*.96));
      dots(soilMarks,name==='path'?16:14,i=>i%3?[3,2]:[4,3]);
      dots(stones,name==='clay'?3:5,i=>i%3?[2,4]:[6,5]);
      break;
    case 'rock':case 'chalk':case 'moss':{
      const facets=stoneField(seed,variant,4,5);
      layer((x,y)=>facets(x,y,baseTone(x,y),false));
      dots(flakes,9,i=>i%3?[2,3]:[1,2]);
      dots(flakes,3,[3,4]);
      if(name==='moss'){
        const cover=pigment(71232,4,4,variant);
        for(let y=0;y<32;y++)for(let x=0;x<32;x++){
          const a=cover(x,y)+fine(x,y)*.35;
          if(a>-.11)inks[at(x,y)]=a>.72?7:a>.18?6:5;
        }
      }
      break;
    }
    case 'slate':case 'shale':case 'sandstone':{
      // Discontinuous shelves rather than dark fracture outlines.
      const levels=[1,2,2,3,3,2,2,1,1,2,2,0,1,2,3,3,3,2,2,1,0,2,2,3,2,2,1,1,2,3,3,2];
      layer((x,y)=>{
        const dip=.8*sines[(x+5)&31]+.44*sines[(2*x+12)&31]+1.2*base(x,y);
        const lamina=levels[(y+Math.round(dip)+variant*2)&31]-2;
        return tone(lamina*.27+base(x,y)*.50+shelves(x,y)*.42);
      });
      dots(flakes,6,i=>i%3?[2,3]:[3,4]);break;
    }
    case 'sand':case 'snow':
      layer((x,y)=>{
        const dip=1.65*sines[x]+.68*sines[(2*x+11)&31]+1.5*base(x,y);
        const row=(y+Math.round(dip)+variant*3)&31;
        const wake=(row===5||row===17||row===26)&&shelves(x,y)>-.14;
        const rip=wake ? .34 : 0;
        return tone(.49*base(x,y)+.31*fine(x,y)+.22*shelves(x,y)+rip);
      });
      dots([['00011','01110'],['00111','11000'],['011','110']],name==='sand'?8:4,i=>[i%4?3:1]);
      break;
    case 'gravel':{
      const pebbles=stoneField(seed,variant,7,7);
      layer((x,y)=>pebbles(x,y,baseTone(x,y),true));
      dots(stones,9,i=>i%3?[2,3]:[3,4]);
      break;
    }
    case 'plaster':
      layer((x,y)=>tone(baseTone(x,y)*.92));dots(flakes,5,[2,3]);break;
    case 'oak':case 'cottonwood':case 'birch':case 'cactus':{
      const birch=name==='birch',cactus=name==='cactus';
      if(birch){
        layer((x,y)=>tone(vertical(x,y)*.62+baseTone(x,y)*.43));
        dots(birchMarks,7,i=>i%3===1?[5,6]:[0,5]);
      }else{
        const ribs=cactus?[1,7,14,20,27]:name==='oak'?[1,5,12,17,20,27]:[2,7,10,17,24,28];
        for(let y=0;y<32;y++){
          const edges=ribs.map((start,i)=>start+Math.round(sines[(y+9*i)&31]*.72+
            sines[(2*y+11*i)&31]*.54+base(start,y)*1.54)).sort((a,b)=>a-b);
          let next=0,strip=edges.length-1;
          for(let x=0;x<32;x++){
            while(next<edges.length&&edges[next]<=x)strip=next++;
            const band=(x-edges[strip]+32)&31,flank=band===0?-.56:band===1?-.22:band===3 ? .22 : .04;
            const seam=(strip%3-1)*.09+flank*(1+.53*shelves(x,y));
            inks[at(x,y)]=tone(vertical(x,y)*.69+baseTone(x,y)*.44+seam);
          }
        }
        if(cactus)dots([['10','01'],['01','10']],6,[5]);
        else if(variant===2)stamp(inks,8+fit(r(),13),5+fit(r(),12),barkEye,[1,3]);
      }
      break;
    }
    case 'oakBoards':case 'blueBoards':case 'walnut':{
      const boardGrain=pigment(seed+991,3,12,variant),seams=[6,22,11,28];
      layer((x,y)=>{
        const row=y>>3,edge=y&7;
        if(edge===7)return 0;
        const joint=(seams[row]+variant*8)&31;
        if(x===joint)return 5;
        const weave=sines[(x+row*7)&31]*.94;
        return tone(boardGrain(x,y+weave)*.70+base(x,y)*.25+(row%3-1)*.10+(edge===0 ? .11 : 0));
      });
      if(variant%2===0){
        const row=[0,0,1,2][variant],x=(seams[row]+variant*8+7)&31;
        stamp(inks,x,row*8+1,boardKnot,[2,1,2],variant===2);
      }
      break;
    }
    case 'brick':case 'roof':
      layer((x,y)=>{
        const row=y>>3;
        if(name==='brick'){
          const joint=(x+(row&1)*8)&15;
          if((y&7)===7||joint===0)return 5;
          return tone(baseTone(x,y)*1.07+((row+(x>>4)+variant)%3-1)*.14+(joint===1 ? .12 : 0));
        }
        const trough=(x+row*4)&7,lip=(y&7);
        return tone(baseTone(x,y)*.66+sines[(trough*4)&31]*.46+(lip===7?-.48:0));
      });break;
    case 'heartwood':{
      const cx=[13,18,12,16][variant],cy=[16,13,18,17][variant];
      const rings=[2.3,5.7,8.9,13.1,17.0,21.5];
      layer((x,y)=>{
        const dx=Math.abs(x-cx),dy=Math.abs(y-cy);
        const radius=Math.max(dx,dy)*.46+Math.hypot(dx,dy*.92)*.54+base(x,y)*1.3;
        let band=0;
        for(const edge of rings){const gap=radius-edge;if(gap>-.8&&gap<.35){band=-.55;break;}if(gap>=.35&&gap<1.4){band=.35;break;}}
        return tone(band+baseTone(x,y)*.56+(radius<1.7?-.43:0));
      });break;
    }
  }
  return inks;
}

function rgba(inks,palette){
  const data=new Uint8ClampedArray(4096);
  for(let i=0;i<1024;i++){
    const rgb=palette[inks[i]],j=i*4;
    data[j]=rgb>>16;data[j+1]=rgb>>8&255;data[j+2]=rgb&255;data[j+3]=255;
  }
  return data;
}

export function materialPixels(tile,variant=0){
  const name=tiles[tile];
  if(!name)return null;
  variant=variant&3;
  if(name!=='grassSide')return rgba(paintTile(name,variant),colors[name]);
  const soil=paintTile('earth',variant),grass=paintTile('turf',variant);
  const edge=pigment(84044,8,2,variant), fringe=[0,2,3,1,2,0,1,2,0,2,1,0,2,1,2,1];
  const data=rgba(soil,colors.earth);
  for(let x=0;x<32;x++){
    const foot=6+Math.round(edge(x,3)*2.3)+fringe[((x>>1)+variant*4)&15];
    for(let y=0;y<=foot;y++){
      const idx=y===foot?0:y===foot-1?1:grass[y*32+x];
      const rgb=colors.turf[idx],j=(y*32+x)*4;
      data[j]=rgb>>16;data[j+1]=rgb>>8&255;data[j+2]=rgb&255;
    }
  }
  return data;
}
