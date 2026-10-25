import { env } from 'cloudflare:workers';
import { sceneSchema, demoScene } from './scene';
import {StoreError,readSceneRecord,writeSceneRecord} from './scene-storage';
export {StoreError} from './scene-storage';
export function identity(req:Request){const user=req.headers.get('oai-authenticated-user-id');if(!user)throw new StoreError('Sign in to open your private studio.',401);return user;}
export async function listScenes(owner:string){const r=await env.DB!.prepare('SELECT id,name,revision,updated FROM scenes WHERE owner=? ORDER BY updated DESC LIMIT 100').bind(owner).all();return r.results;}
export async function getScene(owner:string,id:string){const row=await readSceneRecord(env.DB!,env.BUCKET,owner,id);return {id:row.id,scene:sceneSchema.parse(JSON.parse(row.data)),revision:row.revision,updated:row.updated};}
export async function saveScene(owner:string,input:{id?:string;expectedRevision?:number;scene?:unknown;template?:string}){const parsed=sceneSchema.safeParse(input.scene||demoScene(input.template));if(!parsed.success)throw new StoreError(parsed.error.issues.map(e=>e.path.join('.')+': '+e.message).join('; '));return writeSceneRecord(env.DB!,env.BUCKET,owner,{id:input.id,expectedRevision:input.expectedRevision,name:parsed.data.name,data:JSON.stringify(parsed.data)});}
