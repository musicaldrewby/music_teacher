// Public reads of an allowlisted catalog; private migration copies only known,
// hash-verified bundled bytes. Object keys are immutable across app releases.
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function authorized(request,secret){
 if(typeof secret!=='string'||secret.length<32)return false;
 const supplied=request.headers.get('Authorization')||'';
 const a=await digest(new TextEncoder().encode(supplied)),b=await digest(new TextEncoder().encode('Bearer '+secret));
 let different=0;for(let i=0;i<a.length;i++)different|=a.charCodeAt(i)^b.charCodeAt(i);return different===0;
}
export function createAssetStorage(manifest){
 const entries=manifest.files;
 async function check(bytes,e){if(bytes.byteLength!==e.bytes||await digest(bytes)!==e.sha256)throw Error('Asset integrity check failed');return bytes}
 async function seedBytes(request,env,e){
  const url=new URL(e.seed,request.url),response=await env.ASSETS.fetch(new Request(url));
  if(!response.ok||!response.body)throw Error('Bundled migration source unavailable');
  return check(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),e);
 }
 async function save(env,e,bytes){if(!env.BUCKET)throw Error('Asset storage unavailable');await env.BUCKET.put(e.key,bytes,{httpMetadata:{contentType:e.type},customMetadata:{sha256:e.sha256}})}
 async function migrate(request,env){
  if(!await authorized(request,env.FELT_ASSET_ADMIN_TOKEN))return json({error:'Unauthorized'},401);
  if(request.method!=='POST')return json({error:'Use POST'},405);
  let body;try{body=await request.json()}catch{return json({error:'Invalid request'},400)}
  if(!['seed','verify'].includes(body.action)||!Array.isArray(body.paths)||!body.paths.length||body.paths.length>4||body.paths.some(p=>typeof p!=='string'||!Object.hasOwn(entries,p)))return json({error:'Choose up to four known assets'},400);
  if(!env.BUCKET)return json({error:'Asset storage unavailable'},503);
  const results=[];
  try{
   for(const path of body.paths){const e=entries[path];let object=await env.BUCKET.get(e.key);
    if(!object&&body.action==='seed'){await save(env,e,await seedBytes(request,env,e));object=await env.BUCKET.get(e.key)}
    if(!object)throw Error('Stored asset missing');
    await check(await object.arrayBuffer(),e);results.push({path,sha256:e.sha256,bytes:e.bytes});
   }
   return json({files:results});
  }catch(error){console.error('Asset migration:',error.message);return json({error:'Asset storage verification failed; bundled fallback retained'},503)}
 }
 return async function assetStorage(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname==='/api/asset-storage')return migrate(request,env);
  const e=Object.hasOwn(entries,url.pathname)?entries[url.pathname]:null;if(!e)return null;
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const headers=new Headers({'Content-Type':e.type,'Content-Length':String(e.bytes),'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400','ETag':'"'+e.sha256+'"','X-Content-Type-Options':'nosniff'});
  if(request.headers.get('If-None-Match')===headers.get('ETag')){headers.delete('Content-Length');return new Response(null,{status:304,headers})}
  try{
   const object=request.method==='HEAD'?await env.BUCKET?.head(e.key):await env.BUCKET?.get(e.key);
   if(object){if(object.size!==e.bytes||object.customMetadata?.sha256!==e.sha256)throw Error('Stored asset metadata mismatch');return new Response(request.method==='HEAD'?null:object.body,{headers})}
   const bytes=await seedBytes(request,env,e);
   ctx.waitUntil(save(env,e,bytes).catch(error=>console.error('Asset cache:',error.message)));
   return new Response(request.method==='HEAD'?null:bytes,{headers});
  }catch(error){console.error('Asset delivery:',error.message);return new Response('This story asset could not load. Please retry.',{status:503,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}})}
 };
}
