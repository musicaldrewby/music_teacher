import {clone,validateProject} from './core.js';
import {graphic,escapeHTML} from './content.js';
import {playerRuntime,playerStyles} from './player-bundle.js';
let preparedURL=null;

export function serializeData(value){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}

export async function prepareStandalone(source,embedRemote=downloadMedia){
 const project=clone(source);
 const errors=validateProject(project);
 if(errors.length)throw new Error(errors[0].message);
 // Only content actually used by this game leaves the creator's workspace.
 delete project.assets;delete project.id;delete project.updatedAt;
 const cache=new Map();
 async function embed(src){
  if(!src)return '';
  if(/^data:/i.test(src))return src;
  if(!/^https?:\/\//i.test(src))throw new Error('Replace unsupported media with an uploaded file before exporting.');
  if(!cache.has(src))cache.set(src,embedRemote(src));
  const result=await cache.get(src);
  if(!/^data:(image|audio|video)\//i.test(result))throw new Error('A linked media file could not be embedded. Upload that file, then export again.');
  return result;
 }
 for(const slide of project.slides){
  if(slide.centerType==='graphic'&&slide.graphic){slide.centerType='image';slide.centerContent='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(graphic(slide.graphic));}
  if(slide.centerType!=='text')slide.centerContent=await embed(slide.centerContent);
  delete slide.graphic;
  for(const c of slide.corners){
   if(!c.image&&c.graphic)c.image='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(graphic(c.graphic));
   c.image=await embed(c.image);delete c.graphic;
  }
 }
 for(const key of Object.keys(project.audio))project.audio[key]=Array.isArray(project.audio[key])?await Promise.all(project.audio[key].map(embed)):await embed(project.audio[key])||null;
 return project;
}
async function downloadMedia(url){
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(30000),credentials:'omit'});
  if(!response.ok)throw new Error('Download failed');
  const blob=await response.blob();
  if(!/^(image|audio|video)\//.test(blob.type)||blob.size>40*1024*1024)throw new Error('Unsupported media');
  return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
 }catch{throw new Error('A linked media file could not be included. Upload the original picture, audio, or video file instead, then export again.');}
}
export function standaloneHTML(project){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHTML(project.name)}</title><meta name="description" content="An offline Four Corners game"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><style>${playerStyles}</style></head><body><div id="app"></div><div id="toast" role="status" aria-live="polite"></div><noscript>Enable JavaScript in your browser to play this game.</noscript><script type="application/json" id="game-data">${serializeData(project)}</script><script>${playerRuntime}\nmountPlayer(JSON.parse(document.getElementById('game-data').textContent));</script></body></html>`;
}
export async function exportStandalone(source){
 const project=await prepareStandalone(source);
 const blob=new Blob([standaloneHTML(project)],{type:'text/html;charset=utf-8'});
 if(preparedURL)URL.revokeObjectURL(preparedURL);
 const url=preparedURL=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=(project.name.replace(/[^a-z0-9 _-]/gi,'').trim()||'four-corners')+'.html';
 a.className='btn primary';a.textContent='Save standalone game';
 const existing=document.getElementById('prepared-game-download');existing?.remove();a.id='prepared-game-download';
 const target=document.querySelector('[data-action=export-standalone]');
 target?.insertAdjacentElement('afterend',a);
 a.focus();return {url,filename:a.download};
}
