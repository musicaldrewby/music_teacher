import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readSceneRecord,writeSceneRecord} from '../lib/scene-storage';
function storage(){
 const sql=new DatabaseSync(':memory:');
 sql.exec('CREATE TABLE scenes(id TEXT PRIMARY KEY,owner TEXT,name TEXT,data TEXT,revision INTEGER,updated TEXT)');
 let beforeRun:(()=>void)|undefined;
 const db={prepare(query:string){
  return {bind(...params:any[]){
   return {
    async first(){return sql.prepare(query).get(...params)||null;},
    async run(){const hook=beforeRun;beforeRun=undefined;hook?.();const r=sql.prepare(query).run(...params);return {meta:{changes:Number(r.changes)}};}
   };
  }};
 }} as unknown as D1Database;
 const files=new Map<string,string>();
 const bucket={async put(k:string,v:string){files.set(k,v);},async get(k:string){const v=files.get(k);return v===undefined?null:{text:async()=>v};},async delete(k:string){files.delete(k);}} as unknown as R2Bucket;
 return {db,bucket,files,sql,hook(fn:()=>void){beforeRun=fn;}};
}

const large=JSON.stringify({name:'An imported scene',data:'A'.repeat(3_000_000),unicode:'🎄🚂音楽'});
test('Scenes over the D1 row limit save in owner-scoped file storage and reopen byte-for-byte',async()=>{const s=storage(),saved=await writeSceneRecord(s.db,s.bucket,'owner-a',{name:'Imported',data:large});assert.equal(saved.revision,1);assert.equal(s.files.size,1);const row=s.sql.prepare('SELECT data FROM scenes').get()!;assert.ok(String(row.data).length<200);const open=await readSceneRecord(s.db,s.bucket,'owner-a',saved.id);assert.equal(open.data,large);await assert.rejects(readSceneRecord(s.db,s.bucket,'owner-b',saved.id),/not found/);});
test('Updating large and legacy scenes preserves revision checks and cleans obsolete files',async()=>{const s=storage(),first=await writeSceneRecord(s.db,s.bucket,'a',{name:'First',data:'{"name":"old"}'});assert.equal(s.files.size,0);const second=await writeSceneRecord(s.db,s.bucket,'a',{id:first.id,expectedRevision:1,name:'Second',data:large});assert.equal(second.revision,2);assert.equal(s.files.size,1);await assert.rejects(writeSceneRecord(s.db,s.bucket,'a',{id:first.id,expectedRevision:1,name:'Stale',data:large}),/changed elsewhere/);assert.equal(s.files.size,1);await writeSceneRecord(s.db,s.bucket,'a',{id:first.id,expectedRevision:2,name:'Small',data:'{"name":"small"}'});assert.equal(s.files.size,0);assert.equal((await readSceneRecord(s.db,s.bucket,'a',first.id)).data,'{"name":"small"}');});
test('A concurrent winning update cannot be overwritten and the losing uploaded file is removed',async()=>{const s=storage(),first=await writeSceneRecord(s.db,s.bucket,'a',{name:'First',data:'{"name":"first"}'});s.hook(()=>s.sql.prepare('UPDATE scenes SET data=?,revision=2 WHERE id=?').run('{"name":"winner"}',first.id));await assert.rejects(writeSceneRecord(s.db,s.bucket,'a',{id:first.id,expectedRevision:1,name:'Loser',data:large}),/changed elsewhere/);assert.equal(s.files.size,0);assert.equal((await readSceneRecord(s.db,s.bucket,'a',first.id)).data,'{"name":"winner"}');});
test('Oversized and missing-storage failures retain the prior saved scene',async()=>{const s=storage(),first=await writeSceneRecord(s.db,s.bucket,'a',{name:'Keep',data:'{"keep":true}'});await assert.rejects(writeSceneRecord(s.db,undefined,'a',{id:first.id,expectedRevision:1,name:'Large',data:large}),/storage is not ready/);await assert.rejects(writeSceneRecord(s.db,s.bucket,'a',{name:'Too big',data:'🎄'.repeat(2_000_001)}),/exceeds 8 MB/);assert.equal((await readSceneRecord(s.db,s.bucket,'a',first.id)).data,'{"keep":true}');});
