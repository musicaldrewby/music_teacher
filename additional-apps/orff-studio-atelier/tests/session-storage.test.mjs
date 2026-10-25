import test from 'node:test';
import assert from 'node:assert/strict';
import {writeProject,storageMessage} from '../dist/session-storage.js';
import {newProject,validateProject} from '../dist/catalog.js';
const key='project';
const json=title=>JSON.stringify({...newProject(),projectId:"storage-fixture",title});
function memory(values={},fail=()=>{}){
 const map=new Map(Object.entries(values));return {map,getItem:k=>map.get(k)??null,setItem(k,v){fail(k,v);map.set(k,v)}};
}
test('a failed backup cannot prevent the latest composition from saving',()=>{
 const s=memory({[key]:json('Before'),[key+'-backup']:json('Recovery')},k=>{if(k.endsWith('-backup'))throw new DOMException('Quota','QuotaExceededError')});
 writeProject(s,key,json('Latest'),validateProject);assert.equal(s.getItem(key),json('Latest'));assert.equal(s.getItem(key+'-backup'),json('Recovery'));
});
test('primary failure preserves both saved copies and reports the error',()=>{
 const s=memory({[key]:json('Before'),[key+'-backup']:json('Recovery')},()=>{throw new DOMException('Blocked','SecurityError')});
 assert.throws(()=>writeProject(s,key,json('Latest'),validateProject),{name:'SecurityError'});assert.equal(s.getItem(key),json('Before'));assert.equal(s.getItem(key+'-backup'),json('Recovery'));
});
test('successful saves keep the previous valid project, without rotating identical saves',()=>{
 const s=memory({[key]:json('Before')});writeProject(s,key,json('Latest'),validateProject);assert.equal(s.getItem(key+'-backup'),json('Before'));
 writeProject(s,key,json('Latest'),validateProject);assert.equal(s.getItem(key+'-backup'),json('Before'));
});
test('a malformed or invalid primary does not replace a valid recovery copy',()=>{
 for(const bad of ['broken JSON','{}']){const s=memory({[key]:bad,[key+'-backup']:json('Recovery')});writeProject(s,key,json('Latest'),validateProject);assert.equal(s.getItem(key+'-backup'),json('Recovery'));assert.equal(s.getItem(key),json('Latest'));}
});
test('a failed read does not prevent a working primary write',()=>{
 const s=memory();s.getItem=()=>{throw Error('Read failed')};writeProject(s,key,json('Latest'),validateProject);assert.equal(s.map.get(key),json('Latest'));
});
test('storage messages distinguish quota, blocked storage and other failures',()=>{
 assert.match(storageMessage({name:'QuotaExceededError'}),/full/);assert.match(storageMessage({name:'SecurityError'}),/blocking/);assert.doesNotMatch(storageMessage(Error('unknown')),/full/);
});
