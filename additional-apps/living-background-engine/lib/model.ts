import { z } from 'zod';
import geometry from './geometry.json';
export const effects = ['rain','rain_impacts','window_drops','snow','fire','candle','smoke','steam','fog','clouds','flow','ocean','rays','glow','lights','embers','leaves','ripples','sway','aurora','caustics'] as const;
export const pointSchema=z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)]);
export const layerSchema=z.object({id:z.string().min(1).max(100),name:z.string().min(1).max(100),type:z.enum(effects),enabled:z.boolean().default(true),opacity:z.number().min(0).max(1).default(.5),speed:z.number().min(.1).max(4).default(1),direction:z.number().min(-180).max(180).default(0),scale:z.number().min(.1).max(3).default(1),lightMode:z.enum(['steady','twinkle','flash','chase']).default('twinkle'),lightPalette:z.enum(['warm','multicolor','custom']).default('warm'),twinkleDepth:z.number().min(0).max(1).default(.9),glowRadius:z.number().min(.5).max(3).default(1),flowDistance:z.number().min(8).max(180).default(64),turbulence:z.number().min(0).max(1).default(.35),density:z.number().min(.1).max(3).default(1),refraction:z.number().min(0).max(2).default(.85),trailLength:z.number().min(0).max(2).default(.7),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#dce7ed'),region:z.array(pointSchema).min(3).max(64),exclude:z.array(z.array(pointSchema).min(3).max(64)).max(16).default([]),path:z.array(pointSchema).min(2).max(64).optional(),points:z.array(pointSchema).max(100).optional(),seed:z.number().int().min(0).max(99999).default(42)});
export const sceneSchema=z.object({schema:z.literal('living-background/1'),name:z.string().min(1).max(100),description:z.string().max(500).default(''),background:z.string().max(12000000).refine(v=>/^\/scenes\/[a-z0-9-]+\.(webp|jpg|png)$/.test(v)||/^\/api\/assets\/[a-zA-Z0-9-]+$/.test(v)||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),'Use a staged asset, built-in image, or embedded image.'),duration:z.number().int().min(4).max(30),wind:z.number().min(-1).max(1),layers:z.array(layerSchema).max(40)}).superRefine((s,ctx)=>{if(new Set(s.layers.map(l=>l.id)).size!==s.layers.length)ctx.addIssue({code:'custom',message:'Layer IDs must be unique'});});
export type Scene=z.infer<typeof sceneSchema>; export type Layer=z.infer<typeof layerSchema>; export type Point=z.infer<typeof pointSchema>;
export const rect=(x:number,y:number,w:number,h:number):Point[]=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export function layer(type:Layer['type'],name:string,region:Point[]=rect(0,0,1,1),extra:Partial<Layer>={}):Layer{return layerSchema.parse({id:crypto.randomUUID(),name,type,region,...extra});}
const L=(id:string,type:Layer['type'],name:string,region:Point[],extra:Partial<Layer>={}):Layer=>layerSchema.parse({id,type,name,region,...extra});
export const recipes:Record<string,Scene>={
 rain:{schema:'living-background/1',name:'Rain at the window',description:'A quiet study. Rain falls beyond the glass. Water beads catch the light while a little steam curls from the coffee cup.',background:'/scenes/rain-window.webp',duration:12,wind:-.15,layers:[L('mist','fog','Woodland haze',rect(.15,.1,.7,.62),{opacity:.17,scale:.65}),L('rain','rain','Rain beyond the glass',rect(.15,.1,.7,.62),{opacity:.68,speed:1.35,scale:.85,density:1.15}),L('glass','window_drops','Water beads & running trails',rect(.15,.1,.7,.62),{opacity:.8,speed:.65,scale:.32,seed:84,density:1.2,refraction:.7,trailLength:.65})]},
 fire:{schema:'living-background/1',name:'Embers after midnight',description:'Individual flames curl up between the logs, with warm firelight and a few rising embers.',background:'/scenes/fireplace-ready.webp',duration:12,wind:.08,layers:[L('light','glow','Firelight on the stone',rect(.16,.2,.68,.8),{opacity:.2,color:'#ff9c40'}),L('flame','fire','Flames inside the hearth',rect(.35,.48,.3,.34),{opacity:.38,color:'#ff9635',scale:.65}),L('embers','embers','Rising embers',rect(.35,.48,.3,.34),{opacity:.6,scale:.5}),L('smoke','smoke','Hearth smoke',rect(.36,.35,.28,.4),{opacity:.07,scale:.55,color:'#93867c'})]},
 christmas:{schema:'living-background/1',name:'A little Christmas magic',description:'Snow outside, twinkling tree lights, and candle flames that flicker softly inside the lantern and on the shelf.',background:'/scenes/christmas-candle-ready.webp',duration:16,wind:-.2,layers:[L('snow','snow','Snow beyond the window',rect(.1,.15,.32,.5),{opacity:.68,scale:.6}),L('lights','lights','Tree lights',rect(.65,.15,.25,.7),{opacity:.75,color:'#ffe0a0',points:[[.77,.21],[.74,.31],[.81,.35],[.72,.41],[.79,.45],[.84,.53],[.7,.54],[.76,.6],[.85,.66],[.69,.69],[.78,.76],[.87,.79]]}),L('warm','glow','Warm room ambience',rect(.5,.15,.5,.85),{opacity:.08,color:'#ffbe6b'})]},
 stream:{schema:'living-background/1',name:'Where the forest breathes',description:'A visible downstream current carries the water texture around fixed mossy rocks.',background:'/scenes/stream.webp',duration:12,wind:.18,layers:[L('water','flow','Downstream water',[[.48,.36],[.62,.4],[.56,.53],[.68,.69],[.85,1],[.2,1],[.4,.64],[.43,.48]],{opacity:.94,scale:1,flowDistance:76,turbulence:.34,speed:1.15,path:[[.54,.4],[.48,.55],[.56,.73],[.46,1]],color:'#d9f0e4'}),L('mist','fog','Mist over the water',rect(.08,.32,.84,.5),{opacity:.13,scale:.7}),L('sun','rays','Light through the canopy',rect(.15,0,.8,.87),{opacity:.13,direction:25,color:'#ffe9b5'}),L('motes','embers','Floating sunlit motes',rect(0,.1,1,.8),{opacity:.23,speed:.25,scale:.18,color:'#f5e7b4'})]}
};
export const operationSchema=z.discriminatedUnion('op',[
 z.object({op:z.literal('set_scene'),name:z.string().optional(),description:z.string().optional(),background:z.string().optional(),duration:z.number().optional(),wind:z.number().optional()}),
 z.object({op:z.literal('add_layer'),layer:layerSchema}),
 z.object({op:z.literal('update_layer'),id:z.string(),changes:layerSchema.partial().omit({id:true})}),
 z.object({op:z.literal('remove_layer'),id:z.string()}),
 z.object({op:z.literal('reorder_layers'),ids:z.array(z.string())})
]);
export function applyOperations(scene:Scene,input:unknown):Scene {let draft=structuredClone(scene);const ops=z.array(operationSchema).min(1).max(100).parse(input);for(const op of ops){if(op.op==='set_scene'){const {op:_,...v}=op;draft={...draft,...v};}else if(op.op==='add_layer'){draft.layers.push(op.layer);}else if(op.op==='reorder_layers'){if(op.ids.length!==draft.layers.length||new Set(op.ids).size!==op.ids.length||op.ids.some(id=>!draft.layers.some(l=>l.id===id)))throw Error('Layer order must contain each layer ID exactly once');draft.layers=op.ids.map(id=>draft.layers.find(l=>l.id===id)!);}else{const i=draft.layers.findIndex(l=>l.id===op.id);if(i<0)throw Error('Unknown layer: '+op.id);if(op.op==='remove_layer')draft.layers.splice(i,1);else draft.layers[i]={...draft.layers[i],...op.changes};}}return sceneSchema.parse(draft);}
export const phase=(time:number,duration:number)=>((time%duration)+duration)%duration/duration;
export function seeded(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function bounds(points:Point[]){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
export function pathPoint(path:Point[],t:number):Point {const u=Math.max(0,Math.min(1,t))*(path.length-1),i=Math.min(path.length-2,Math.floor(u)),f=u-i;return [path[i][0]+(path[i+1][0]-path[i][0])*f,path[i][1]+(path[i+1][1]-path[i][1])*f];}

// Masks measured from the final artwork. Window frames and foreground objects stay protected.
for(const l of recipes.rain.layers) l.region=geometry['rain-window'].glassPolygon as Point[];
// Foreground coffee sits outside the window mask; steam starts at its inner rim.
recipes.rain.layers.push(L('coffee-steam','steam','Steam from the coffee',rect(.922,.605,.068,.139),{opacity:.85,speed:.85,scale:1.25,color:'#f5f0e9',seed:73,points:[[.956,.744]]}));
recipes.fire.layers[1].region=geometry.fireplace.flameRegion as Point[];
recipes.fire.layers[2].region=rect(...geometry.fireplace.fireboxRect as [number,number,number,number]);
recipes.fire.layers[3].region=rect(.39,.37,.28,.32);
const snow=recipes.christmas.layers[0];
recipes.christmas.layers=[...geometry.christmas.windowPanes.map((region,i)=>({...snow,id:'snow-'+i,name:'Snow · window pane '+(i+1),region:region as Point[],seed:42+i*13})),...recipes.christmas.layers.slice(1)];
const bulbs=recipes.christmas.layers.find(l=>l.type==='lights')!;
bulbs.region=geometry.christmas.treePolygon as Point[];bulbs.points=geometry.christmas.treeLights as Point[];bulbs.scale=1.1;bulbs.opacity=1;bulbs.glowRadius=1.3;bulbs.twinkleDepth=.95;bulbs.speed=.65;bulbs.name='Glowing & twinkling tree lights';
recipes.stream.layers[0].path=geometry.stream.flowPath as Point[];
recipes.stream.layers[0].region=[[.433,.304],[.471,.304],[.475,.33],[.591,.381],[.598,.465],[.55,.505],[.722,.598],[.795,.722],[.768,.887],[.838,1],[.138,1],[.192,.887],[.355,.722],[.432,.598],[.354,.515],[.472,.455],[.517,.399],[.434,.343]];

recipes.stream.layers[0].exclude=[
 [[.474,.391],[.548,.391],[.562,.425],[.52,.435],[.478,.417]],
 [[.354,.53],[.405,.517],[.431,.546],[.406,.574],[.355,.572]],
 [[.43,.534],[.473,.527],[.514,.55],[.527,.58],[.477,.589],[.436,.571]],
 [[.674,.597],[.73,.582],[.76,.612],[.731,.637],[.683,.626]],
 [[.781,.861],[.852,.861],[.934,.904],[1,.957],[1,1],[.787,1]]
];

// Candle positions follow the visible wax wicks in the clean background plate.
recipes.christmas.layers.push(L('lantern-flame','candle','Flickering lantern candle',rect(.215,.735,.074,.145),{opacity:1,scale:.95,speed:1,seed:31,points:[[.2485,.7991]]}));
recipes.christmas.layers.push(L('shelf-flame','candle','Small shelf candle',rect(.969,.205,.03,.067),{opacity:.95,scale:.46,speed:.85,seed:61,points:[[.98535,.23663]]}));
recipes.christmas.layers.push(L('votive-glow','glow','Flickering votive reflections',rect(.29,.80,.047,.096),{opacity:.13,color:'#ffb24e',seed:71}));

// New worlds: masks follow the final artwork, with distinct motion per setting.
const street:Point[]=[[.463,.479],[.505,.479],[.566,.55],[.671,.68],[.807,.83],[.98,1],[.073,1],[.232,.79],[.356,.65],[.43,.55]];
recipes.neon={schema:'living-background/1',name:'Neon after the rain',description:'Rain strikes the wet pavement in small splashes. The street and its neon reflections stay still.',background:'/scenes/neon.webp',duration:16,wind:.12,layers:[
 L('rain','rain','Rain through the alley',rect(0,0,1,1),{opacity:.76,scale:.65,speed:1.1,density:.85,seed:117}),
 L('ground-impacts','rain_impacts','Raindrops striking wet pavement',street,{opacity:.88,scale:1,density:1.3,speed:1,color:'#c1dfe6',seed:29}),
 L('alley-mist','fog','Distant alley mist',rect(.397,.32,.18,.2),{opacity:.12,scale:.65,speed:.4,color:'#91afc4'}),
 L('neon-pink','glow','Magenta neon spill',rect(.30,.18,.09,.24),{opacity:.08,color:'#ff4fc8'}),
 L('neon-blue','glow','Cyan neon spill',rect(.6,.27,.09,.25),{opacity:.07,color:'#38cfff',seed:83})
]};
recipes.beach={schema:'living-background/1',name:'The tide at first light',description:'Palm fronds sway gently above detailed turquoise swells, with a fixed shoreline and slowly drifting high clouds.',background:'/scenes/beach.webp',duration:20,wind:.1,layers:[
 L('tide','ocean','Gentle swells & sharp foam',[[0,.293],[.914,.293],[.929,.326],[.969,.367],[.978,.417],[1,.443],[1,.605],[.865,.661],[.722,.724],[.586,.76],[.429,.812],[.255,.831],[0,.829]],{opacity:1,scale:.9,speed:.9}),
 L('cloud-drift','flow','Slow high cloud drift',rect(.35,.015,.33,.16),{opacity:.9,flowDistance:18,turbulence:.04,speed:.15,direction:90,seed:73}),
 L('sun-shimmer','glow','Warm sun shimmer',rect(.21,.34,.17,.43),{opacity:.035,color:'#ffe9a8'})
]};
recipes.waterfall={schema:'living-background/1',name:'The emerald cascade',description:'A tall waterfall pours into a moving teal pool. Spray drifts above the rocks at its base.',background:'/scenes/waterfall.webp',duration:16,wind:.15,layers:[
 L('cascade','flow','Falling waterfall',[[.433,.113],[.563,.108],[.58,.137],[.588,.32],[.594,.54],[.628,.65],[.415,.65],[.425,.548],[.425,.3]],{opacity:1,flowDistance:132,turbulence:.3,speed:3.2,path:[[.506,.108],[.509,.25],[.513,.46],[.53,.65]],seed:61}),
 L('pool','flow','Current in the plunge pool',[[.135,.674],[.246,.658],[.41,.656],[.6,.656],[.805,.662],[.92,.683],[1,.683],[.989,.725],[.86,.798],[.787,.838],[.753,.894],[.721,1],[.286,1],[.286,.911],[.257,.859],[.218,.837],[.196,.787],[.17,.742]],{opacity:1,flowDistance:32,turbulence:.8,speed:.7,path:[[.51,.66],[.5,.79],[.55,1]],seed:82}),
 L('spray','fog','Soft waterfall spray',rect(.34,.49,.38,.175),{opacity:.21,scale:.7,speed:.9,color:'#e5f1ed',seed:36})
]};
recipes.autumn={schema:'living-background/1',name:'A cabin in October',description:'Copper leaves turn in the breeze, chimney smoke rises, and the windows glow in the last warm sunlight.',background:'/scenes/autumn.webp',duration:20,wind:.3,layers:[
 L('chimney','smoke','Smoke from the chimney',rect(.682,.015,.14,.192),{opacity:.52,scale:.6,speed:.6,color:'#c6c7bf',seed:18}),
 L('windows','glow','Warm cabin windows',rect(.565,.43,.32,.18),{opacity:.06,color:'#ffc477',seed:62}),
 L('leaves','leaves','Leaves turning in the breeze',rect(.06,.13,.89,.85),{opacity:.96,scale:1.12,speed:.65,density:1.2,direction:55,seed:213}),
 L('forest-haze','fog','Distant forest haze',rect(.25,.295,.29,.16),{opacity:.075,scale:.5,speed:.35,color:'#ddcbae',seed:37})
]};

// Fuel sources and foreground wood measured from the hearth photograph.
Object.assign(recipes.fire.layers[1],{
 name:'Flames rising between the logs',opacity:.95,scale:1.32,speed:1,
 region:rect(.405,.49,.267,.24),
 points:[[.453,.650],[.487,.662],[.524,.649],[.565,.646],[.585,.646],[.61,.656]],
 exclude:[
  [[.468,.604],[.529,.622],[.617,.643],[.615,.681],[.531,.656],[.466,.639]],
  [[.497,.614],[.574,.586],[.578,.629],[.534,.647]],
  [[.414,.648],[.467,.639],[.47,.681],[.414,.683]],
  [[.615,.647],[.654,.644],[.655,.679],[.614,.682]],
  rect(.433,.686,.215,.013),rect(.431,.679,.01,.053),rect(.567,.675,.009,.06)
 ]
});
Object.assign(recipes.fire.layers[2],{region:rect(.432,.505,.206,.215),opacity:.32,scale:.24,speed:.65});
recipes.fire.layers[3].opacity=.035;
// The crown is anchored; the trunk is explicitly excluded from the flex field.
recipes.beach.layers.push(L('palm-fronds','sway','Palm fronds in the sea breeze',
 [[.686,0],[1,0],[1,.245],[.934,.26],[.906,.339],[.861,.342],[.83,.286],[.777,.346],[.728,.345],[.703,.238],[.686,.135]],
 {opacity:1,scale:1.05,speed:.7,direction:0,seed:91,points:[[.925,.046]],
 exclude:[[[.906,0],[.936,0],[.955,.117],[.977,.234],[1,.351],[1,.46],[.967,.25],[.942,.127],[.918,.067]]]}));

// Four contrasting environments, each with motion placed against the final photograph.
recipes.desert={schema:'living-background/1',name:'Moon over the sandstone',description:'Cool moonlight over red stone. A low veil of dust drifts through the wash as distant clouds move slowly.',background:'/scenes/desert.webp',duration:24,wind:.2,layers:[
 L('distant-clouds','sway','Slow twilight clouds',[[.23,.22],[.79,.23],[.85,.39],[.81,.45],[.44,.45],[.36,.38],[.23,.33]],{opacity:1,scale:.8,speed:.35,direction:0,points:[[.24,.25]],seed:13}),
 L('wash-dust','fog','Dust drifting through the wash',[[.33,.53],[.74,.53],[.68,.61],[.61,.64],[.68,.69],[.78,.72],[.77,.76],[.56,.7],[.39,.66],[.37,.61]],{opacity:.27,scale:.55,speed:.45,color:'#b69c86',seed:102}),
 L('foreground-dust','fog','A breath of sand',rect(.16,.76,.65,.11),{opacity:.10,scale:.4,speed:.35,color:'#cfaa80',seed:214})
]};
const gardenPond:Point[]=[[.475,.515],[.576,.486],[.7,.482],[.81,.487],[.9,.5],[1,.53],[1,.93],[.84,.865],[.723,.81],[.605,.757],[.572,.691],[.548,.63],[.532,.571]];
recipes.garden={schema:'living-background/1',name:'Rain in the lantern garden',description:'Fine rain settles over a lantern-lit garden. Small drops touch the pond and wet stones, and a little cascade feeds the water.',background:'/scenes/garden.webp',duration:20,wind:.035,layers:[
 L('garden-falls','flow','Water over the garden rocks',[[.785,.302],[.803,.299],[.81,.378],[.836,.38],[.825,.48],[.766,.485],[.77,.453],[.779,.384]],{opacity:1,flowDistance:36,scale:.65,speed:1.5,turbulence:.14,path:[[.798,.305],[.794,.38],[.79,.477]],seed:53}),
 L('pond-drops','rain_impacts','Small drops on the pond',gardenPond,{opacity:.70,density:1,scale:.75,speed:.8,seed:62}),
 L('path-drops','rain_impacts','Rain on the stone path',[[.30,.47],[.347,.48],[.273,.57],[.31,.64],[.364,.73],[.499,.86],[.52,1],[.08,1],[.10,.82],[.17,.65],[.134,.61],[.24,.52]],{opacity:.6,density:.8,scale:.65,speed:1,seed:85}),
 L('garden-rain','rain','Fine garden rain',rect(0,0,1,1),{opacity:.55,density:.8,scale:.45,speed:.9,seed:173}),
 L('lantern-spill','glow','Warm lantern light',rect(.235,.245,.07,.09),{opacity:.065,color:'#ffbf6c',seed:39})
]};
recipes.reef={schema:'living-background/1',name:'Beneath the turquoise',description:'Moving sunlight traces the sandy seabed. Sea grass bends with a gentle current beneath the rippling surface.',background:'/scenes/reef.webp',duration:20,wind:.1,layers:[
 L('surface-water','ocean','Light through the moving surface',rect(0,0,1,.225),{opacity:1,scale:.38,speed:.65,seed:66}),
 L('sand-light','caustics','Moving light on the sand',[[.467,.49],[.56,.49],[.58,.57],[.662,.626],[.627,.713],[.714,.735],[.734,.81],[.81,.86],[.836,1],[.188,1],[.247,.9],[.36,.818],[.342,.75],[.395,.705],[.36,.652],[.42,.611]],{opacity:.36,scale:.95,speed:.6,seed:26}),
 L('sea-grass','sway','Sea grass in the current',[[.842,.287],[1,.284],[1,.997],[.89,.987],[.845,.9],[.826,.768],[.872,.684],[.855,.589],[.905,.529],[.845,.428]],{opacity:1,scale:.9,speed:.7,direction:5,points:[[.969,.97]],exclude:[[[.797,.45],[.867,.456],[.913,.56],[.899,.655],[.83,.624]]],seed:81}),
 L('underwater-rays','rays','Soft shifting sun shafts',rect(0,0,.38,.63),{opacity:.065,direction:-10,color:'#c8f5ed',seed:32})
]};
recipes.aurora={schema:'living-background/1',name:'Under the northern lights',description:'Emerald curtains with violet edges drift across a still starry sky above snowy peaks and a frozen lake.',background:'/scenes/aurora.webp',duration:24,wind:0,layers:[
 L('northern-lights','aurora','Drifting northern lights',rect(.025,.01,.95,.48),{opacity:.86,scale:1.2,speed:.5,color:'#6de8ae',seed:53}),
 L('cabin-warmth','glow','A warm cabin in the snow',rect(.065,.68,.095,.1),{opacity:.055,color:'#ffbd70',seed:83})
]};
