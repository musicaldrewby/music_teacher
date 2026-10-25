export const materialCategories=['Essentials','Metal','Ceramic','Natural','Color','Glass','Effects','All'] as const;
export type MaterialCategory=typeof materialCategories[number];
export type MaterialPreset={id:string;name:string;color:string;metalness:number;roughness:number;texture:string;category:MaterialCategory;featured?:boolean;grain?:'wood'|'marble'|'stone'|'fabric'|'brushed'|'enamel';clearcoat?:number;coatRoughness?:number;transmission?:number;ior?:number;iridescence?:number};
const legacyMaterials = [
 ['electric-blue','Electric blue','#0055ff',.4,.2,'plastic'],['laser-cyan','Laser cyan','#00d9ff',.4,.2,'plastic'],['ruby-red','Ruby red','#ef0034',.55,.2,'plastic'],['deep-violet','Royal violet','#7800ee',.4,.22,'plastic'],['emerald-metal','Emerald metal','#00b46a',.8,.25,'metal'],['acid-green','Acid green','#96ef00',.15,.25,'plastic'],
 ['champagne','Champagne gold','#e9bf62',.92,.2,'metal'],['chrome','Mirror chrome','#dce5ec',1,.12,'metal'],['copper','Brushed copper','#c27b4f',.9,.33,'metal'],['rose','Rose gold','#dcae9f',.85,.24,'metal'],['gunmetal','Gunmetal','#59626f',.9,.3,'metal'],['foil','Holographic foil','#8ce4d7',.85,.18,'iridescent'],
 ['pearl','Pearl','#f6e5dc',.35,.25,'iridescent'],['glass','Ocean glass','#8ad7ed',.12,.12,'glass'],['ice','Frosted ice','#c6e7fa',.15,.35,'glass'],['ruby','Ruby candy','#ec3660',.45,.18,'plastic'],['jade','Jade ceramic','#4aac8d',.2,.25,'plastic'],['lavender','Lavender enamel','#aaa1ed',.15,.2,'plastic'],
 ['orange','Tangerine plastic','#ff8049',.1,.3,'plastic'],['lemon','Lemon gloss','#f0de5b',.1,.24,'plastic'],['blue','Cobalt lacquer','#3967db',.4,.2,'plastic'],['pink','Bubblegum','#ef83b8',.1,.36,'plastic'],['clay','Terracotta','#c36b4e',0,.85,'matte'],['chalk','Chalk white','#f4f0e6',0,.95,'matte'],
 ['rubber','Soft charcoal','#242931',0,.95,'matte'],['wood','Walnut grain','#a87540',0,.65,'wood'],['marble','Ivory marble','#e5e2d8',.1,.3,'marble'],['granite','Granite','#a1a6b2',.1,.85,'stone'],['mint-neon','Mint neon','#5bffca',.1,.25,'neon'],['pink-neon','Hot pink neon','#ff59c2',.1,.25,'neon'],['stripes','Candy stripes','#ff6d8d',.1,.35,'stripes'],['checker','Checkerboard','#eee9dc',.1,.5,'checker'],['denim','Blue textile','#38648d',0,1,'fabric'],['bronze','Antique bronze','#92703e',.8,.55,'stone']
].map(([id,name,color,metalness,roughness,texture])=>({id:id as string,name:name as string,color:color as string,metalness:metalness as number,roughness:roughness as number,texture:texture as string}));

const category=(texture:string):MaterialCategory=>texture==='metal'?'Metal':texture==='glass'?'Glass':['wood','marble','stone','fabric','matte'].includes(texture)?'Natural':['neon','iridescent','checker','stripes'].includes(texture)?'Effects':'Color';
const featured=new Set(['champagne','copper','wood','marble','rubber','blue']);
export const materials:MaterialPreset[]=legacyMaterials.map(p=>({...p,category:category(p.texture),featured:featured.has(p.id),
 // Dielectrics stay non-metallic; coats provide their polish.
 metalness:(['plastic','glass','marble','stone'].includes(p.texture)&&p.id!=='bronze'||p.id==='pearl')?0:p.metalness,
 grain:(['wood','marble','stone','fabric'].includes(p.texture)?p.texture:p.id==='copper'?'brushed':undefined) as MaterialPreset['grain'],
 clearcoat:p.texture==='plastic'?.85:p.texture==='wood'?.18:p.texture==='marble'?.35:p.texture==='iridescent'?.7:0,
 coatRoughness:p.texture==='wood'?.32:.16,
 ...(p.texture==='glass'?{transmission:.94,ior:1.5}:{}),
 ...(p.texture==='iridescent'?{iridescence:p.id==='pearl'?.3:1}:{}),
}));
materials.push(
 {id:'porcelain',name:'Glazed porcelain',color:'#eeeae1',metalness:0,roughness:.24,texture:'ceramic',category:'Ceramic',featured:true,grain:'enamel',clearcoat:.8,coatRoughness:.14},
 {id:'stoneware',name:'Satin stoneware',color:'#c9b8a1',metalness:0,roughness:.65,texture:'ceramic',category:'Ceramic',grain:'enamel',clearcoat:.08},
 {id:'satin-aluminum',name:'Satin aluminum',color:'#c4cbd1',metalness:1,roughness:.38,texture:'metal',category:'Metal',featured:true,grain:'brushed'},
 {id:'brass',name:'Brushed brass',color:'#c8a768',metalness:1,roughness:.32,texture:'metal',category:'Metal',featured:true,grain:'brushed'},
 {id:'oak',name:'Natural oak',color:'#ba9162',metalness:0,roughness:.68,texture:'wood',category:'Natural',grain:'wood',clearcoat:.08},
 {id:'limestone',name:'Limestone',color:'#d5c9af',metalness:0,roughness:.85,texture:'stone',category:'Natural',grain:'stone'},
 {id:'concrete',name:'Cast concrete',color:'#96958d',metalness:0,roughness:.92,texture:'stone',category:'Natural',featured:true,grain:'stone'},
 {id:'linen',name:'Woven linen',color:'#c3b59d',metalness:0,roughness:.95,texture:'fabric',category:'Natural',featured:true,grain:'fabric'},
 {id:'clear-glass',name:'Clear glass',color:'#f3f7fa',metalness:0,roughness:.06,texture:'glass',category:'Glass',featured:true,transmission:1,ior:1.5},
 {id:'smoked-glass',name:'Smoked glass',color:'#777e83',metalness:0,roughness:.15,texture:'glass',category:'Glass',transmission:.9,ior:1.5},
);
// Existing IDs remain available in older scenes and agent calls.
for(const id of ['jade','lavender']){const p=materials.find(p=>p.id===id)!;p.category='Ceramic';p.grain='enamel';}
