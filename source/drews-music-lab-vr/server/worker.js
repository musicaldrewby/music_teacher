import {validateSong} from '../dist/recorder.js';
const LIMIT=524288;
const adjectives=['Moonlight','Sunny','Silver','Velvet','Golden','Blue','Starry','Gentle','Midnight','Coral','Emerald','Crystal','Autumn','Ocean','Amber','Dancing'];
const nouns=['Groove','Marimba','Bells','Rhythm','Waltz','Echo','Melody','Orbit','Breeze','Ripple','Parade','Spark','Journey','Garden','Sunrise','Harmony'];
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const db=env=>{if(!env.DB)throw fail('The listening room is temporarily unavailable.',503);return env.DB;};
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const GITHUB_ORIGIN='https://musicaldrewby.github.io';
const githubRequest=r=>r.headers.get('origin')===GITHUB_ORIGIN;
const owner=(r,e)=>!githubRequest(r)&&!!e.GALLERY_OWNER_EMAIL&&!!r.headers.get('oai-authenticated-user-id')&&r.headers.get('oai-authenticated-user-email')?.toLowerCase()===e.GALLERY_OWNER_EMAIL.toLowerCase();
function githubCors(r,response){if(!githubRequest(r))return response;const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',GITHUB_ORIGIN);headers.set('Vary','Origin');return new Response(response.body,{status:response.status,headers});}
export function publicSong(data,title){const song=validateSong({...data,title});if(!song.events.length&&!song.drumPattern?.some(r=>r.some(Boolean))&&!song.bassPattern?.steps.some(Boolean))throw fail('Record some music before sharing.');return song;}
async function body(r){if(!r.headers.get('content-type')?.startsWith('application/json'))throw fail('Music Lab songs only.',415);if(Number(r.headers.get('content-length'))>LIMIT)throw fail('This song is too large to share.',413);const reader=r.body?.getReader();if(!reader)throw fail('Choose a song.');let size=0,chunks=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();throw fail('This song is too large to share.',413);}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let p=0;for(const c of chunks){bytes.set(c,p);p+=c.length;}try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw fail('Choose a valid Music Lab song.');}}
async function identity(r,e){if(!e.GALLERY_RATE_SECRET)throw fail('The listening room is temporarily unavailable.',503);const ip=r.headers.get('cf-connecting-ip')||'anonymous',device=(r.headers.get('x-gallery-device')||'anonymous').slice(0,64);return digest(e.GALLERY_RATE_SECRET+':'+ip+':'+device);}
async function quota(DB,key,limit,seconds){const now=Math.floor(Date.now()/1000),bucket=Math.floor(now/seconds),id=key+':'+bucket;const row=await DB.prepare('INSERT INTO gallery_rate (key,hits,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 WHERE hits < ? RETURNING hits').bind(id,now+seconds*2,limit).first();if(!row)throw fail('Please wait a little before trying again.',429);}
export async function api(r,e){
 const u=new URL(r.url),DB=db(e),admin=owner(r,e),path=u.pathname;
 if(r.method!=='GET'&&!githubRequest(r)){if(r.headers.get('origin')&&r.headers.get('origin')!==u.origin)throw fail('Please submit from the Music Lab.',403);if(r.headers.get('sec-fetch-site')==='cross-site')throw fail('Please submit from the Music Lab.',403);}
 if(path==='/api/gallery/session'&&r.method==='GET')return json({owner:admin});
 if(path==='/api/gallery/lookup'&&r.method==='POST'){
  const {ids}=await body(r);if(!Array.isArray(ids)||ids.length>80||ids.some(id=>typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)))throw fail('Choose valid shared songs.');
  if(!ids.length)return json({songs:[]});
  const rows=await DB.prepare(`SELECT id,title,created,bpm,bars,notes FROM gallery_songs WHERE hidden=0 AND id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all();return json({songs:rows.results});
 }
 if(path==='/api/gallery'&&r.method==='GET'){
  const size=u.searchParams.get('size')==='6'?6:12,random=u.searchParams.get('sort')==='random',all=admin&&u.searchParams.get('manage')==='1',where=all?'':'WHERE hidden=0';
  const count=await DB.prepare(`SELECT COUNT(*) AS total FROM gallery_songs ${where}`).first(),total=Number(count.total);
  const requested=Math.max(0,parseInt(u.searchParams.get('offset'))||0),offset=Math.min(Math.floor(requested/size)*size,Math.max(0,Math.ceil(total/size)-1)*size);
  const rows=await DB.prepare(`SELECT id,title,created,bpm,bars,notes${all?',reports,hidden':''} FROM gallery_songs ${where} ORDER BY ${random?'RANDOM()':'created DESC,id DESC'} LIMIT ? OFFSET ?`).bind(size,offset).all();return json({songs:rows.results,more:offset+size<total,total,offset});
 }
 if(path==='/api/gallery'&&r.method==='POST'){
  const input=await body(r),id=input.id,token=input.deleteToken;if(!/^[a-f0-9-]{36}$/.test(id||'')||!/^[a-f0-9]{64}$/.test(token||''))throw fail('Please try sharing again.');const hash=await digest(token),existing=await DB.prepare('SELECT id,title,delete_hash FROM gallery_songs WHERE id=?').bind(id).first();if(existing){if(existing.delete_hash!==hash)throw fail('Please try sharing again.',409);return json({id:existing.id,title:existing.title});}
  const rand=crypto.getRandomValues(new Uint32Array(2)),title=adjectives[rand[0]%adjectives.length]+' '+nouns[rand[1]%nouns.length]+' · '+id.slice(0,4).toUpperCase();let song;try{song=publicSong(input.song,title);}catch(err){throw fail(err.message?.startsWith('Record')?err.message:'Choose a valid Music Lab song.');}
  const who=await identity(r,e);await quota(DB,'share-minute:'+who,1,60);await quota(DB,'share-hour:'+who,10,3600);
  await DB.prepare('INSERT INTO gallery_songs (id,title,data,created,bpm,bars,notes,hidden,reports,delete_hash) VALUES (?,?,?,?,?,?,?,0,0,?)').bind(id,title,JSON.stringify(song),Date.now(),song.bpm,song.bars,song.events.length,hash).run();await DB.prepare('DELETE FROM gallery_rate WHERE key IN (SELECT key FROM gallery_rate WHERE expires < ? LIMIT 100)').bind(Math.floor(Date.now()/1000)).run();return json({id,title},201);
 }
 const match=path.match(/^\/api\/gallery\/([a-f0-9-]{36})(\/report)?$/);if(!match)throw fail('Not found.',404);const id=match[1];
 if(r.method==='GET'&&!match[2]){const row=await DB.prepare('SELECT data FROM gallery_songs WHERE id=? AND hidden=0').bind(id).first();if(!row)throw fail('This song is no longer available.',404);return json({song:JSON.parse(row.data)});}
 if(r.method==='POST'&&match[2]){const who=await identity(r,e);await quota(DB,'report:'+who,10,3600);await DB.batch([DB.prepare('INSERT OR IGNORE INTO gallery_reports (song,reporter) SELECT id,? FROM gallery_songs WHERE id=?').bind(who,id),DB.prepare('UPDATE gallery_songs SET reports=(SELECT COUNT(*) FROM gallery_reports WHERE song=?) WHERE id=?').bind(id,id)]);return json({reported:true});}
 if(r.method==='DELETE'&&!match[2]){const data=await body(r);const tokenHash=await digest(String(data.deleteToken||''));const result=await DB.prepare('UPDATE gallery_songs SET hidden=1 WHERE id=? AND (?=1 OR delete_hash=?)').bind(id,admin?1:0,tokenHash).run();if(!result.meta.changes)throw fail('Only the publisher or room owner can remove this song.',403);return json({removed:true});}
 throw fail('Not found.',404);
}
export default {async fetch(r,e){try{const path=new URL(r.url).pathname;if(path.startsWith('/api/gallery')){if(r.method==='OPTIONS'){if(!githubRequest(r))return new Response('Forbidden',{status:403});return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':GITHUB_ORIGIN,'Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Gallery-Device','Access-Control-Max-Age':'3600','Vary':'Origin'}});}return githubCors(r,await api(r,e));}if(path.startsWith('/server/')||path.startsWith('/.openai/'))return new Response('Not found',{status:404});return await e.ASSETS.fetch(r);}catch(err){if(!err.status)console.error('Gallery request failed',err.name);return githubCors(r,json({error:err.status?err.message:'The listening room is temporarily unavailable. Your saved songs are safe.'},err.status||503));}}};
