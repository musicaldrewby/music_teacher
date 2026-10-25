import {z} from 'zod';
export const AUDIO_HZ=20;
export const AUDIO_BANDS=16;
export const AUDIO_STRIDE=21; // level, bass, mids, treble, beat, then spectrum
export const audioAnalysisSchema=z.object({
 version:z.literal(1),duration:z.number().positive().max(600),hz:z.literal(AUDIO_HZ),
 source:z.string().regex(/^[0-9a-f]{8}$/),
 frames:z.array(z.number().int().min(0).max(255)).max(12001*AUDIO_STRIDE),
 beats:z.array(z.number().min(0).max(600)).max(2500),
 bpm:z.number().min(0).max(250)
}).superRefine((a,ctx)=>{
 if(a.frames.length!==(Math.ceil(a.duration*AUDIO_HZ)+1)*AUDIO_STRIDE)ctx.addIssue({code:'custom',message:'Audio analysis frame count does not match its duration'});
 if(a.beats.some((t,i)=>t>=a.duration||(i>0&&t<=a.beats[i-1])))ctx.addIssue({code:'custom',message:'Beat times must increase within the audio source'});
});
export const audioBands=['level','bass','mids','treble','beat'] as const;
export const audioReactionSchema=z.object({enabled:z.boolean().default(false),kind:z.enum(['bounce','pulse','sway']).default('bounce'),band:z.enum(audioBands).default('bass'),strength:z.number().min(0).max(3).default(1)});
export const visualizerSchema=z.object({layout:z.enum(['bars','ring']).default('bars'),count:z.number().int().min(8).max(64).default(32),width:z.number().min(1).max(20).default(8),height:z.number().min(.1).max(10).default(3),radius:z.number().min(.5).max(10).default(3)});
export const audioReactivitySchema=z.object({enabled:z.boolean().default(false),cueId:z.string().max(80).default(''),strength:z.number().min(0).max(3).default(1),smoothness:z.number().min(0).max(1).default(.45),lights:z.object({enabled:z.boolean().default(false),band:z.enum(audioBands).default('bass'),strength:z.number().min(0).max(2).default(.7)}).default({})});
export type AudioAnalysis=z.infer<typeof audioAnalysisSchema>;
export type AudioBand=typeof audioBands[number];
export type AudioSignals={level:number;bass:number;mids:number;treble:number;beat:number;spectrum:number[]};
export function audioFingerprint(data:string){let h=2166136261;for(let i=0;i<data.length;i++)h=Math.imul(h^data.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
