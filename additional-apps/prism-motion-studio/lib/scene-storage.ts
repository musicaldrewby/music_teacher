/** Small scenes stay in D1; scenes with embedded files use an owner-scoped R2 JSON object. */
export class StoreError extends Error {constructor(message:string,public status=400){super(message)}}
type Row={id:string;data:string;revision:number;updated:string};
export async function readSceneRecord(db:D1Database,bucket:R2Bucket|undefined,owner:string,id:string):Promise<Row>{
 for(let attempt=0;attempt<3;attempt++){
  const row=await db.prepare('SELECT id,data,revision,updated FROM scenes WHERE owner=? AND id=?').bind(owner,id).first<Row>();if(!row)throw new StoreError('Scene not found.',404);
  const stored=JSON.parse(row.data);if(!stored.$prismBlob)return row;
  if(!bucket)throw new StoreError('Scene file storage is unavailable. Please try again.',503);
  if(typeof stored.$prismBlob!=='string'||!stored.$prismBlob.startsWith(`scene-data/${encodeURIComponent(owner)}/${id}/`))throw new StoreError('Invalid scene file reference.',500);
  const object=await bucket.get(stored.$prismBlob);if(object)return {...row,data:await object.text()};
  // Another save can replace the file between the metadata read and the object read.
 }
 throw new StoreError('This scene changed while opening. Please reopen it.',409);
}
export async function writeSceneRecord(db:D1Database,bucket:R2Bucket|undefined,owner:string,input:{id?:string;expectedRevision?:number;name:string;data:string}){
 const size=new TextEncoder().encode(input.data).byteLength;if(size>8_000_000)throw new StoreError('Scene exceeds 8 MB. Use smaller imported models, audio, images or fonts.');
 const updated=new Date().toISOString(),id=input.id||crypto.randomUUID();let prior:Row|null=null;
 if(input.id){if(!Number.isInteger(input.expectedRevision))throw new StoreError('expectedRevision is required when updating a saved scene.');prior=await db.prepare('SELECT id,data,revision,updated FROM scenes WHERE owner=? AND id=?').bind(owner,id).first<Row>();if(!prior||prior.revision!==input.expectedRevision)throw new StoreError('This scene changed elsewhere. Reload it, or save a copy to preserve your edits.',409);}
 let file:string|undefined,stored=input.data;
 if(size>1_500_000){if(!bucket)throw new StoreError('File storage is not ready. Download the scene JSON and try saving again shortly.',503);file=`scene-data/${encodeURIComponent(owner)}/${id}/${crypto.randomUUID()}.json`;await bucket.put(file,input.data,{httpMetadata:{contentType:'application/json'}});stored=JSON.stringify({$prismBlob:file});}
 let committed=false;
 try{
  if(input.id){const result=await db.prepare('UPDATE scenes SET name=?,data=?,revision=revision+1,updated=? WHERE owner=? AND id=? AND revision=?').bind(input.name,stored,updated,owner,id,input.expectedRevision).run();if(!result.meta.changes)throw new StoreError('This scene changed elsewhere. Reload it, or save a copy to preserve your edits.',409);}
  else await db.prepare('INSERT INTO scenes (id,owner,name,data,revision,updated) VALUES (?,?,?,?,1,?)').bind(id,owner,input.name,stored,updated).run();committed=true;
 }finally{if(!committed&&file)await bucket!.delete(file).catch(()=>{});}
 const old=prior?JSON.parse(prior.data).$prismBlob:undefined;if(old&&bucket)await bucket.delete(old).catch(()=>{});
 return {id,revision:input.id?input.expectedRevision!+1:1,updated};
}
