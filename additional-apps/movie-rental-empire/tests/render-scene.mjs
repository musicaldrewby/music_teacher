import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const {createCanvas,ImageData}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const {PNG}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs');
globalThis.Image=class{};globalThis.matchMedia=()=>({matches:true});
const {StoreScene}=await import('../dist/scene.mjs');const E=await import('../dist/engine.mjs');
const canvas=createCanvas(1280,800);canvas.clientWidth=1280;canvas.clientHeight=800;canvas.addEventListener=()=>{};canvas.style={};
const scene=new StoreScene(canvas,()=>{});
// Decode without modifying the original image; native QA decoder rejects its metadata.
const png=PNG.sync.read(fs.readFileSync(new URL('../dist/assets/movie-atlas.png',import.meta.url)));const atlas=createCanvas(png.width,png.height);atlas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(png.data),png.width,png.height),0,0);atlas.complete=true;atlas.naturalWidth=png.width;scene.art=atlas;
const bg=PNG.sync.read(fs.readFileSync(new URL('../dist/assets/store-pixel.png',import.meta.url)));const backdrop=createCanvas(bg.width,bg.height);backdrop.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bg.data),bg.width,bg.height),0,0);backdrop.complete=true;backdrop.naturalWidth=bg.width;scene.backdrop=backdrop;
const s=E.fresh(22);E.openDay(s);for(let i=0;i<5;i++)E.spawnCustomer(s);s.customers[1].stage='help';
for(let n=0;n<80;n++)scene.draw(s,n*100);
if(process.argv.includes('--expanded')){s.day=10;s.expansion.milestones=['picks','snackcounter','screening','annex'];s.expansion.sets=['heroes','midnight','oddities'];s.expansion.keepsakes=['Photo','Review','Headshot'];s.expansion.guest={type:'actor',day:10,resolved:false,accepted:false,progress:0,rare:null};}
scene.draw(s,8100);
fs.writeFileSync('/workspace/scratch/725cd83e69fe/store-cinema-qa.png',canvas.toBuffer('image/png'));
console.log('Scene rendered successfully at 1280×800.');
