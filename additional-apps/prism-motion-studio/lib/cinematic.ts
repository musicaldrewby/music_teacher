import {MAX_SCENE_DURATION} from './timeline-limits';
import {z} from 'zod';

export const setIds=['aquarium','none','neon-stage','haunted-theater','christmas-pavilion','snow-globe','miniature-town','toy-factory'] as const;
export const setSchema=z.object({winter:z.boolean().default(false),id:z.enum(setIds).default('none'),accent:z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#00ccff'),scale:z.number().min(.5).max(2).default(1),rotation:z.number().min(-180).max(180).default(0),offsetZ:z.number().min(-20).max(2).default(0),decorations:z.boolean().default(true),glow:z.number().min(0).max(3).default(1),snowfall:z.number().min(0).max(1).default(.7),glass:z.boolean().default(true)});
export const detailPatterns=['brushed','scratched','hammered','enamel','fingerprints','woven'] as const;
export const surfaceDetailSchema=z.object({enabled:z.boolean().default(false),target:z.enum(['all','face','sides','bevel','back']).default('all'),pattern:z.enum(detailPatterns).default('brushed'),scale:z.number().min(.25).max(12).default(2),rotation:z.number().min(-180).max(180).default(0),strength:z.number().min(0).max(1).default(.35),roughness:z.number().min(.02).max(1).default(.3),metalness:z.number().min(0).max(1).default(.8),clearcoat:z.number().min(0).max(1).default(.6),coatRoughness:z.number().min(.02).max(1).default(.15)});
export const focusKeySchema=z.object({time:z.number().min(0).max(MAX_SCENE_DURATION),distance:z.number().min(.1).max(500),easing:z.enum(['linear','smooth','ease-in','ease-out']).default('smooth')});
export const lensSchema=z.object({enabled:z.boolean().default(false),mode:z.enum(['target','manual']).default('target'),targetId:z.string().max(80).default(''),distance:z.number().min(.1).max(500).default(13),aperture:z.number().min(.01).max(1).default(.3),maxBlur:z.number().min(.002).max(.035).default(.018),keys:z.array(focusKeySchema).max(100).default([])});
export type SurfaceDetail=z.infer<typeof surfaceDetailSchema>;
export type Lens=z.infer<typeof lensSchema>;
export type SetSettings=z.infer<typeof setSchema>;

export const finishPresets=[
 {id:'sapphire-gold',name:'Sapphire & gold',description:'Blue enamel face, gold bevel and dark metal sides.',face:'electric-blue',sides:'gunmetal',bevel:'champagne',details:surfaceDetailSchema.parse({enabled:true,target:'face',pattern:'enamel',scale:3,strength:.2,roughness:.2,metalness:.25,clearcoat:1,coatRoughness:.09})},
 {id:'brushed-titanium',name:'Brushed titanium',description:'Fine directional grain in a cool silver finish.',face:'chrome',sides:'gunmetal',bevel:'chrome',details:surfaceDetailSchema.parse({enabled:true,pattern:'brushed',scale:3,strength:.45,roughness:.34,metalness:1,clearcoat:.2})},
 {id:'worn-gold',name:'Worn gold',description:'Fine scratches and uneven highlights on antique gold.',face:'champagne',sides:'copper',bevel:'champagne',details:surfaceDetailSchema.parse({enabled:true,pattern:'scratched',scale:2,strength:.35,roughness:.3,metalness:.95,clearcoat:.3})},
 {id:'hammered-copper',name:'Hammered copper',description:'Shallow rounded dents catch light across the surface.',face:'copper',sides:'bronze',bevel:'champagne',details:surfaceDetailSchema.parse({enabled:true,pattern:'hammered',scale:2.5,strength:.5,roughness:.32,metalness:.9,clearcoat:.3})},
 {id:'handled-glass',name:'Handled glass',description:'Subtle fingerprint ridges and smudged highlights.',face:'glass',sides:'glass',bevel:'glass',details:surfaceDetailSchema.parse({enabled:true,pattern:'fingerprints',scale:1.3,strength:.16,roughness:.11,metalness:.05,clearcoat:1,coatRoughness:.08})},
 {id:'emerald-weave',name:'Emerald weave',description:'A fine woven surface with a contrasting gold bevel.',face:'emerald-metal',sides:'gunmetal',bevel:'champagne',details:surfaceDetailSchema.parse({enabled:true,target:'face',pattern:'woven',scale:3,strength:.35,roughness:.7,metalness:.05,clearcoat:.05})}
];
