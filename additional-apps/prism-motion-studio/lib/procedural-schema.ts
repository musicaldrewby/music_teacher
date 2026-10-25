import {MAX_SCENE_DURATION} from './timeline-limits';
import {z} from 'zod';

const color=z.string().regex(/^#[0-9a-fA-F]{6}$/),seed=z.number().int().min(0).max(999999);
export const textureKinds=['wood','marble','granite','brick','concrete','asphalt','metal','rust','frost','lava','woven','tiles','hexagon','circuit'] as const;
export const proceduralMaterialSchema=z.object({
 enabled:z.boolean().default(false),pattern:z.enum(textureKinds).default('marble'),seed:seed.default(42),
 colorA:color.default('#103dc0'),colorB:color.default('#10deff'),colorC:color.default('#061328'),
 scale:z.number().min(.05).max(20).default(1),rotation:z.number().min(-180).max(180).default(0),
 contrast:z.number().min(0).max(2).default(1),relief:z.number().min(0).max(2).default(.5),
 roughness:z.number().min(.02).max(1).default(.48),metalness:z.number().min(0).max(1).default(.15),
 glow:z.number().min(0).max(5).default(0),weathering:z.number().min(0).max(1).default(.25),
 projection:z.enum(['box','uv']).default('box'),target:z.enum(['all','face','sides','bevel','back']).default('all'),materialName:z.string().max(160).default('')
});
export const generatorKinds=['terrain','dunes','island','cave','city','building','tree','forest','vine','water','waterfall','sky','clouds','fog','aurora','stars','rain','snow','lightning','crystals','spiral','fractal','tunnel'] as const;
export const generatorSchema=z.object({
 kind:z.enum(generatorKinds).default('terrain'),seed:seed.default(42),
 width:z.number().min(.2).max(160).default(20),height:z.number().min(.1).max(80).default(5),depth:z.number().min(.2).max(160).default(20),
 count:z.number().int().min(1).max(120).default(24),detail:z.number().int().min(1).max(5).default(3),
 variation:z.number().min(0).max(1).default(.55),twist:z.number().min(-10).max(10).default(2),
 colorA:color.default('#087b65'),colorB:color.default('#17d9d0'),colorC:color.default('#132343'),
 animated:z.boolean().default(true),cycles:z.number().int().min(1).max(12).default(1),amplitude:z.number().min(0).max(3).default(.3),
 frozenPhase:z.number().min(0).max(1).default(0),growth:z.enum(['none','grow','assemble','explode','breathe']).default('none'),
 growthStart:z.number().min(0).max(MAX_SCENE_DURATION).default(0),growthDuration:z.number().min(.1).max(MAX_SCENE_DURATION).default(4),
 growthLoop:z.boolean().default(false)
});
export const placementSchema=z.object({
 enabled:z.boolean().default(false),mode:z.enum(['grid','ring','spiral','scatter','path']).default('ring'),
 count:z.number().int().min(2).max(120).default(12),seed:seed.default(42),
 spacing:z.number().min(.05).max(30).default(2),radius:z.number().min(.1).max(80).default(6),height:z.number().min(-40).max(40).default(0),
 columns:z.number().int().min(1).max(20).default(5),turns:z.number().min(.1).max(10).default(2),
 jitter:z.number().min(0).max(1).default(.2),sizeVariation:z.number().min(0).max(.9).default(.2),
 rotate:z.boolean().default(true),minimumDistance:z.number().min(0).max(20).default(0),pathId:z.string().max(80).default('')
});
export const proceduralMotionSchema=z.object({
 enabled:z.boolean().default(false),kind:z.enum(['float','orbit','figure-eight','helix','spring','wave','spin']).default('float'),
 cycles:z.number().int().min(1).max(12).default(1),amplitude:z.number().min(0).max(40).default(1),
 phase:z.number().min(-360).max(360).default(0),axis:z.enum(['x','y','z']).default('y')
});
export type ProceduralMaterial=z.infer<typeof proceduralMaterialSchema>;
export type Generator=z.infer<typeof generatorSchema>;
export type Placement=z.infer<typeof placementSchema>;
export type ProceduralMotion=z.infer<typeof proceduralMotionSchema>;
