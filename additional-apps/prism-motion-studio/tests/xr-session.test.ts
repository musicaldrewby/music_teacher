import assert from 'node:assert/strict';
import {test} from 'node:test';
import {XRStudio} from '../lib/xr-studio';

// Exercise the real session entry method with a fake device, without claiming headset rendering.
function harness(){
 const events:string[]=[],session=new EventTarget() as EventTarget&{end:()=>Promise<void>};
 session.end=async()=>{events.push('end');session.dispatchEvent(new Event('end'));};
 const xr=Object.create(XRStudio.prototype) as any;
 Object.assign(xr,{disposed:false,session:undefined,sound:{unlock:async()=>{events.push('audio');}},engine:{renderer:{xr:{setSession:async()=>{events.push('attach');}},setAnimationLoop:()=>events.push('loop')}},report:()=>events.push('report'),finish:()=>events.push('finish'),visibility:()=>{},frame:()=>{}});
 return {xr,session,events};
}
async function withDevice(requestSession:(...args:any[])=>any,fn:()=>Promise<void>){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{xr:{requestSession}}});
 try{await fn();}finally{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete (globalThis as any).navigator;}
}
test('VR requests the session within the click before audio awaits, then starts the XR loop',async()=>{
 const {xr,session,events}=harness();
 await withDevice((mode,options)=>{assert.equal(mode,'immersive-vr');assert.deepEqual(options.requiredFeatures,['local-floor']);events.push('request');return Promise.resolve(session);},async()=>{await xr.enter();});
 assert.deepEqual(events,['request','audio','attach','loop','report']);assert.equal(xr.session,session);
});
test('A declined session can be retried and never starts rendering',async()=>{
 const {xr,events}=harness();await withDevice(()=>Promise.reject(Error('permission declined')),async()=>{await assert.rejects(xr.enter(),/permission/);});
 assert.equal(xr.session,undefined);assert.deepEqual(events,['audio']);
});
test('Renderer startup failure closes the session without applying an incomplete VR draft',async()=>{
 const {xr,session,events}=harness();xr.engine.renderer.xr.setSession=async()=>{throw Error('context failed');};
 await withDevice(()=>Promise.resolve(session),async()=>{await assert.rejects(xr.enter(),/context failed/);});
 assert.equal(xr.session,undefined);assert.deepEqual(events,['audio','end']);
});
test('Closing the VR panel while permission is pending ends the returned session without attaching it',async()=>{
 const {xr,session,events}=harness();let resolve!:(value:unknown)=>void;
 await withDevice(()=>new Promise(r=>{resolve=r;}),async()=>{const entered=xr.enter();xr.disposed=true;resolve(session);await entered;});
 assert.deepEqual(events,['audio','end']);assert.equal(xr.session,undefined);
});
