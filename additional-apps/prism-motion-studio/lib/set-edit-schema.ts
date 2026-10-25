import {z} from 'zod';
const coordinate=z.number().finite().min(-10000).max(10000);
const vector=z.tuple([coordinate,coordinate,coordinate]);
const positive=z.number().finite().min(.01).max(100);
export const pieceEditSchema=z.object({name:z.string().max(120).default(''),offset:vector.default([0,0,0]),rotation:vector.default([0,0,0]),scale:z.tuple([positive,positive,positive]).default([1,1,1]),tint:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ffffff'),visible:z.boolean().default(true)});
export const setEditsSchema=z.object({pieces:z.record(z.string().max(120),pieceEditSchema).default({}),duplicates:z.array(pieceEditSchema.extend({id:z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),sourceId:z.string().min(1).max(120)})).max(24).default([])}).superRefine((v,c)=>{if(Object.keys(v.pieces).length>120)c.addIssue({code:'custom',message:'Up to 120 set pieces can be modified',path:['pieces']});if(new Set(v.duplicates.map(d=>d.id)).size!==v.duplicates.length)c.addIssue({code:'custom',message:'Duplicate piece IDs must be unique',path:['duplicates']});});
export type PieceEdit=z.infer<typeof pieceEditSchema>;
export type SetEdits=z.infer<typeof setEditsSchema>;
export const defaultPieceEdit=():PieceEdit=>({name:'',offset:[0,0,0],rotation:[0,0,0],scale:[1,1,1],tint:'#ffffff',visible:true});
