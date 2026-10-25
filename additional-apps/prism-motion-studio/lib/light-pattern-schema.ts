import {z} from 'zod';

export const lightPatternSchema=z.object({
 kind:z.enum(['none','blinds','leaves','window','lattice','arched-window','rain','ripples','stars','palms','branches','honeycomb','confetti']).default('none'),
 size:z.number().finite().min(.5).max(3).default(1),
 rotation:z.number().finite().min(-180).max(180).default(0),
 softness:z.number().finite().min(0).max(1).default(.2),
 strength:z.number().finite().min(0).max(1).default(1),
 seed:z.number().int().min(0).max(10000).default(17),
});
export type LightPattern=z.infer<typeof lightPatternSchema>;
export const lightPatternPresets=[
 {id:'none',name:'No pattern',description:'An uninterrupted cone of light.'},
 {id:'blinds',name:'Blinds',description:'Stripes of sunlight through window blinds.'},
 {id:'leaves',name:'Tree leaves',description:'Dappled light through branches and leaves.'},
 {id:'window',name:'Window panes',description:'Light divided by a window frame.'},
 {id:'lattice',name:'Lattice',description:'Crossing diagonal shadows from a garden trellis.'},
 {id:'arched-window',name:'Arched windows',description:'Tall arches divided by slender window bars.'},
 {id:'rain',name:'Rain on glass',description:'Droplets and trails of rain across a bright beam.'},
 {id:'ripples',name:'Water ripples',description:'Overlapping rings of light, like ripples on water.'},
 {id:'stars',name:'Stars',description:'A scattered field of bright five-pointed stars.'},
 {id:'palms',name:'Palm fronds',description:'Long tropical leaves silhouetted against sunlight.'},
 {id:'branches',name:'Bare branches',description:'Forking branches for a winter or moonlit look.'},
 {id:'honeycomb',name:'Honeycomb',description:'A repeating hexagonal grid of light and shadow.'},
 {id:'confetti',name:'Confetti',description:'Scattered bright shapes for a party or stage.'},
] as const;

export function patternUsesSeed(kind:LightPattern['kind']){
 return ['leaves','rain','ripples','stars','palms','branches','confetti'].includes(kind);
}
