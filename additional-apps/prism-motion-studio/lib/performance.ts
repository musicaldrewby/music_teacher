/** Pure, time-sampled motion: no mutable animation state, random numbers, or frame delta. */
export type PerformanceVector = [number, number, number];
export type PerformanceTransform = {
  position: PerformanceVector;
  rotation: PerformanceVector;
  scale: PerformanceVector;
  opacity: number;
  blur?: number; curtain?: number; echo?: number; pull?: number;
};
export type ReactionTransform = PerformanceTransform & { emissive?: number };

export const entranceEffects = ['drop-bounce', 'hinge', 'spin-in', 'elastic', 'spiral', 'domino-stand-up', 'typewriter-carriage', 'rubber-band-arrival', 'curtain-reveal', 'conveyor-belt', 'turn-the-page', 'bubble-up', 'focus-reveal', 'falling-leaf', 'zipper-reveal', 'flip-board-arrival', 'spring-launch'] as const;
export const exitEffects = ['hinge-out', 'spin-away', 'sink', 'burst', 'sweep-away', 'domino-fall', 'vacuum-pull', 'fold-shut', 'deflate', 'windblown', 'down-the-drain', 'stage-trapdoor', 'receding-echo', 'roll-away', 'paper-plane', 'crumple', 'light-speed-retreat'] as const;
export const holdEffects = ['rock', 'breathe', 'shimmer', 'traveling-emphasis', 'jelly-wobble', 'pendulum-letters', 'breathing', 'marching-letters', 'suspended-sign', 'shiver', 'playful-peek', 'figure-eight', 'accordion', 'orbiting-tilt', 'tick-tock'] as const;
export const reactionKinds = ['hop', 'wobble', 'squash', 'spin', 'glow'] as const;

export const performancePresets = [
  { id: 'metal', name: 'Heavy metal', entrance: 'drop-bounce', exit: 'hinge-out', holdMotion: 'still', unit: 'word', amount: .85 },
  { id: 'toy', name: 'Wind-up toys', entrance: 'elastic', exit: 'burst', holdMotion: 'rock', unit: 'letter', amount: 1 },
  { id: 'magic', name: 'Spiral magic', entrance: 'spiral', exit: 'spin-away', holdMotion: 'shimmer', unit: 'letter', amount: 1 },
  { id: 'mechanical', name: 'Clockwork marquee', entrance: 'hinge', exit: 'hinge-out', holdMotion: 'still', unit: 'word', amount: .7 },
  { id: 'christmas', name: 'Christmas sparkle', entrance: 'spin-in', exit: 'sweep-away', holdMotion: 'shimmer', unit: 'letter', amount: .8 },
  { id: 'halloween', name: 'Haunted lettering', entrance: 'spiral', exit: 'sink', holdMotion: 'breathe', unit: 'letter', amount: .85 },
] as const;

const TAU = Math.PI * 2;
const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const strength = (n: number) => Number.isFinite(n) ? clamp(n, 0, 3) : 0;
const smooth = (p: number) => p * p * (3 - 2 * p);
const smoother = (p: number) => p * p * p * (p * (p * 6 - 15) + 10);
const fade = (p: number) => smooth(clamp(p));
const envelope = (p: number) => Math.sin(Math.PI * p) ** 2;
const rest = (): PerformanceTransform => ({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: 1 });

function finish(pose: PerformanceTransform): PerformanceTransform {
  pose.scale = pose.scale.map(n => Math.max(.001, n)) as PerformanceVector;
  pose.opacity = clamp(pose.opacity);
  return pose;
}

/** A gravity-like fall with successively lower rebounds and exact contact at p=1. */
function bounceOut(p: number) {
  const n = 7.5625, d = 2.75;
  if (p < 1 / d) return n * p * p;
  if (p < 2 / d) { p -= 1.5 / d; return n * p * p + .75; }
  if (p < 2.5 / d) { p -= 2.25 / d; return n * p * p + .9375; }
  p -= 2.625 / d;
  return n * p * p + .984375;
}

/** Rotate around an imaginary hinge near the top corner, rather than the center. */
function hinge(pose: PerformanceTransform, angle: number, side: number) {
  const x = side * .65, y = 1.1;
  pose.rotation[2] = angle;
  pose.position[0] = x - (Math.cos(angle) * x - Math.sin(angle) * y);
  pose.position[1] = y - (Math.sin(angle) * x + Math.cos(angle) * y);
}

/**
 * progress is local to an entrance or exit. Rotations are radians.
 * Amount zero leaves geometry at rest but retains the transition's visibility fade.
 * Unknown names return rest so callers can retain their existing motion samplers.
 */
export function samplePerformance(kind: string, progress: number, index: number, amount: number, bounce = 1): PerformanceTransform {
  const pose = rest();
  const entering = (entranceEffects as readonly string[]).includes(kind);
  const exiting = (exitEffects as readonly string[]).includes(kind);
  if (!entering && !exiting) return pose;
  const p = Number.isFinite(progress) ? clamp(progress) : 0;
  const a = strength(amount);
  const i = Number.isFinite(index) ? Math.trunc(index) % 1000000 : 0;
  const side = Math.abs(i % 2) === 0 ? 1 : -1;
  const angle = i * 2.399963229728653 + 1.1;
  const remaining = 1 - p;
  if ((entering && p === 1) || (exiting && p === 0)) return pose;
  pose.opacity = entering ? fade(p / .18) : 1 - fade((p - .35) / .65);
  if (a === 0) return pose;

  const b = Number.isFinite(bounce) ? clamp(bounce,0,2) : 1;
  switch (kind) {
    case 'falling-leaf':
      pose.position=[Math.sin(p*TAU*1.5+i*.7)*2*a*remaining**2,5*a*remaining**2,Math.sin(p*Math.PI)*a*remaining];
      pose.rotation=[.4*a*remaining,side*.6*a*remaining,Math.sin(p*TAU*1.5+i)*.85*a*remaining];break;
    case 'zipper-reveal':
      pose.position[1]=side*1.4*a*remaining**3;pose.rotation[2]=side*.7*a*remaining**2;pose.scale=[Math.max(.001,1-remaining**2),1+.25*a*envelope(p),1];break;
    case 'flip-board-arrival':
      pose.rotation[0]=-Math.PI*3*a*remaining**2;pose.position[2]=-2*a*remaining**2;break;
    case 'spring-launch': {
      const spring=Math.sin(p*TAU*2.5)*remaining**2*a*b;
      pose.position[1]=-5*a*remaining**3+.9*spring;
      pose.scale=[1-.12*spring,1+.35*spring,1-.08*spring];break;
    }
    case 'roll-away':
      pose.position[0]=8*a*p**2;pose.position[1]=-.15*a*Math.sin(p*Math.PI)**2;pose.rotation[2]=-TAU*a*p**2;break;
    case 'paper-plane':
      pose.position=[6*a*p**2,3*a*p**2,-8*a*p**2];pose.rotation=[.7*a*p,-1.2*a*p,side*.4*a*Math.sin(p*Math.PI)];pose.scale=[1,Math.max(.001,1-.85*p),1];break;
    case 'crumple': {
      const shrink=Math.max(.001,1-p**1.2),wrinkle=Math.sin(p*TAU*4)*envelope(p)*a;
      pose.scale=[shrink*(1+.25*wrinkle),Math.max(.001,shrink*(1-.3*wrinkle)),shrink];pose.rotation=[.8*a*p,1.3*a*p,side*.8*wrinkle];pose.position[1]=-.9*a*p**2;break;
    }
    case 'light-speed-retreat':
      pose.position[2]=-40*a*p**3;pose.scale=[Math.max(.001,1-.8*p**2),Math.max(.001,1-.8*p**2),1+6*a*envelope(p)];break;
    case 'domino-stand-up': {
      const angle = -Math.PI/2 * a * remaining**2 + Math.sin(p*TAU*2)*remaining**2*.18*a*b;
      pose.rotation[0]=angle;break;
    }
    case 'typewriter-carriage': {
      const strike=Math.sin(Math.PI*clamp(p/.25));
      pose.position=[-.28*a*remaining**4,-.12*a*strike,-1.2*a*remaining**5];
      pose.rotation[0]=-.22*a*strike;pose.scale=[1+.06*a*strike,1-.15*a*strike,1];
      pose.opacity=p<.025?0:1;break;
    }
    case 'rubber-band-arrival': {
      const spring=remaining**3*Math.cos(p*TAU*2)*b;
      pose.position[0]=-6*a*remaining**3+1.2*a*Math.sin(p*TAU*2)*remaining**2*b;
      pose.scale=[1+.8*a*remaining**2+.22*a*spring,1/(1+.5*a*remaining**2),1];
      break;
    }
    case 'curtain-reveal':
      pose.curtain=p;pose.opacity=fade(p/.35);break;
    case 'conveyor-belt': {
      pose.position[0]=-7*a*remaining**3;
      const contact=Math.sin(Math.PI*clamp((p-.62)/.38));
      pose.position[1]=.18*a*b*contact;pose.rotation[2]=-.06*a*b*contact;break;
    }
    case 'turn-the-page':
      pose.rotation[1]=-Math.PI*a*remaining**2;pose.position[2]=.35*a*Math.sin(Math.PI*p);break;
    case 'bubble-up': {
      pose.position=[Math.sin(p*TAU*1.4+i*.8)*.45*a*remaining**2,-5*a*remaining**2+.35*a*b*Math.sin(p*TAU*2)*remaining**2,0];
      pose.rotation[2]=Math.sin(p*TAU*1.7+i)*.25*a*remaining**2;break;
    }
    case 'focus-reveal':
      pose.position[2]=-4*a*remaining**2;pose.blur=.12*a*remaining**2;break;
    case 'domino-fall':pose.rotation[0]=Math.PI/2*a*smooth(p);pose.position[2]=.12*a*p;break;
    case 'vacuum-pull':
      pose.pull=p**2;pose.scale=[1+.8*a*envelope(p),Math.max(.001,1-.98*smooth(p)),Math.max(.001,1-.98*smooth(p))];pose.rotation[2]=side*.25*a*envelope(p);break;
    case 'fold-shut':pose.rotation[1]=Math.PI/2*smooth(p);pose.scale=[1,1,Math.max(.001,1-.85*p)];break;
    case 'deflate': {
      const size=Math.max(.001,1-p**1.7);pose.scale=[size*(1+.35*a*envelope(p)),Math.max(.001,size*(1-.75*p)),size];
      pose.position[1]=-.55*a*p;pose.rotation[2]=.15*a*Math.sin(p*TAU*3)*envelope(p);break;
    }
    case 'windblown':
      pose.position=[7*a*p**2,(2*p+Math.sin(p*TAU+i)*p*.6)*a,-2*a*p**2];pose.rotation=[.7*a*p,1.4*a*p,side*3*a*p**1.5];break;
    case 'down-the-drain': {
      const radius=2*a*Math.sin(Math.PI*p);pose.position=[Math.cos(p*TAU*2+i*.25)*radius,Math.sin(p*TAU*2+i*.25)*radius,0];
      pose.pull=smooth(p);pose.rotation[2]=-TAU*a*p**1.5;const size=Math.max(.001,1-p**1.4);pose.scale=[size,size,size];break;
    }
    case 'stage-trapdoor':
      pose.rotation[0]=Math.PI*.7*a*smooth(clamp(p/.55));pose.position[1]=-6*a*clamp((p-.2)/.8)**2;pose.position[2]=.4*a*Math.sin(Math.PI*p);break;
    case 'receding-echo':
      pose.position[2]=-12*a*p**1.6;pose.rotation[1]=.1*a*Math.sin(Math.PI*p);pose.echo=p;break;
    case 'drop-bounce': {
      pose.position[1] = 6 * a * (1 - bounceOut(p));
      // Compression follows actual contacts, not the peaks of each rebound.
      const impact = Math.max(
        Math.exp(-(((p - 1 / 2.75) / .026) ** 2)),
        .58 * Math.exp(-(((p - 2 / 2.75) / .023) ** 2)),
        .28 * Math.exp(-(((p - 2.5 / 2.75) / .019) ** 2)),
      ) * envelope(p);
      pose.scale = [1 + .14 * a * impact, 1 - .25 * a * impact, 1 + .08 * a * impact];
      pose.rotation[2] = side * .07 * a * Math.sin(p * TAU * 2) * envelope(p) * remaining;
      break;
    }
    case 'hinge': {
      const swing = side * 1.55 * a * remaining ** 2 * Math.cos(p * Math.PI * 3);
      hinge(pose, swing, side);
      pose.position[2] = -.4 * a * remaining ** 2;
      break;
    }
    case 'spin-in': {
      const arrival = 1 - remaining ** 3;
      const spring = Math.exp(-3 * p) * Math.sin(p * TAU * 2) * envelope(p);
      const size = 1 + a * (-.8 * (1 - arrival) + .28 * spring);
      pose.position = [side * .6 * a * remaining ** 2, .3 * a * envelope(p), -6 * a * remaining ** 2];
      pose.rotation = [.16 * a * remaining, TAU * a * (1 - smoother(p)), side * .22 * a * remaining];
      pose.scale = [size, size, size];
      break;
    }
    case 'elastic': {
      const spring = Math.exp(-4.5 * p) * Math.cos(p * TAU * 2) * remaining ** 2;
      const stretch = 1 + .45 * a * spring;
      pose.position[0] = -side * 4.2 * a * spring;
      pose.rotation[2] = side * .16 * a * Math.sin(p * TAU * 2) * remaining ** 2;
      pose.scale = [stretch, 1 / Math.sqrt(Math.max(.001, stretch)), 1 / Math.sqrt(Math.max(.001, stretch))];
      break;
    }
    case 'spiral': {
      const radius = 5 * a * remaining ** 1.7;
      const orbit = angle + p * TAU * 1.35;
      pose.position = [Math.cos(orbit) * radius, Math.sin(orbit) * radius * .7, -4 * a * remaining];
      pose.rotation = [.3 * a * remaining * Math.sin(orbit), TAU * a * remaining, side * a * Math.PI * remaining];
      const size = 1 - .8 * a * remaining ** 2;
      pose.scale = [size, size, size];
      break;
    }
    case 'hinge-out': {
      hinge(pose, side * Math.PI * .85 * a * p ** 2, side);
      pose.position[2] = -.8 * a * p ** 2;
      break;
    }
    case 'spin-away': {
      pose.position = [side * 1.5 * a * p ** 2, 1.2 * a * Math.sin(Math.PI * p), -8 * a * p ** 2];
      pose.rotation = [.35 * a * p ** 2, -TAU * a * smooth(p), side * .9 * a * p ** 2];
      const size = 1 - .9 * a * p ** 2;
      pose.scale = [size, size, size];
      break;
    }
    case 'sink': {
      pose.position[1] = -6 * a * p ** 2;
      pose.rotation = [.4 * a * smooth(p), 0, side * .12 * a * smooth(p)];
      pose.scale = [1 + .12 * a * p ** 2, 1 - .5 * a * p ** 2, 1];
      break;
    }
    case 'burst': {
      const flight = p ** 1.2;
      pose.position = [Math.cos(angle) * 8 * a * flight, Math.sin(angle) * 5 * a * flight, Math.sin(angle * 1.7) * 4 * a * flight];
      pose.rotation = [Math.sin(angle) * Math.PI * a * flight, Math.cos(angle) * Math.PI * a * flight, side * TAU * a * flight];
      const size = 1 - .65 * a * p ** 2;
      pose.scale = [size, size, size];
      break;
    }
    case 'sweep-away': {
      pose.position = [side * 8 * a * p ** 2, .8 * a * Math.sin(Math.PI * p), -2 * a * p ** 2];
      pose.rotation = [0, side * .4 * a * smooth(p), -side * .6 * a * p ** 2];
      break;
    }
  }
  return finish(pose);
}

/** Hold motions fade in and out, leaving a stable pose at both reading boundaries. */
export function sampleHold(kind: string, elapsed: number, holdDuration: number, amount: number, index = 0, count = 1, stagger = .04): PerformanceTransform {
  const pose = rest();
  if (!Number.isFinite(elapsed) || !Number.isFinite(holdDuration) || holdDuration <= 0 || elapsed <= 0 || elapsed >= holdDuration) return pose;
  const a = strength(amount), e = envelope(elapsed / holdDuration), t = elapsed;
  if (a === 0) return pose;
  const phase=t*3-index*stagger*17.5,cycle=elapsed/holdDuration;
  switch (kind) {
    case 'figure-eight':
      pose.position=[.25*a*e*Math.sin(phase),.13*a*e*Math.sin(phase*2),.08*a*e*Math.cos(phase)];break;
    case 'accordion': {const stretch=.15*a*e*Math.sin(phase);pose.scale=[1+stretch,1-.35*stretch,1];pose.position[0]=.09*a*e*Math.sin(phase+index);break;}
    case 'orbiting-tilt':
      pose.rotation=[.13*a*e*Math.sin(phase*.6),.18*a*e*Math.cos(phase*.6),.06*a*e*Math.sin(phase*.6)];break;
    case 'tick-tock':
      pose.rotation[2]=.16*a*e*Math.tanh(Math.sin(t*4-index*stagger*17.5)*6);pose.position[1]=.03*a*e*Math.abs(Math.sin(t*4));break;
    case 'traveling-emphasis': {
      const arrival=count>1?index/(count-1):.5;
      const emphasis=Math.exp(-(((cycle-arrival*.75-.125)/.14)**2))*e*a;
      pose.scale=[1+.18*emphasis,1+.26*emphasis,1+.12*emphasis];pose.position[2]=.16*emphasis;break;
    }
    case 'jelly-wobble': {
      const ripple=Math.sin(phase*2)*Math.exp(-(((cycle-.45)/.23)**2))*e*a;
      pose.scale=[1+.15*ripple,1-.15*ripple,1];pose.rotation[2]=.08*ripple;break;
    }
    case 'pendulum-letters':pose.rotation[2]=.3*a*e*Math.sin(phase);break;
    case 'breathing': {const breath=.022*a*e*Math.sin(t*1.6);pose.scale=[1+breath,1+breath,1+breath];break;}
    case 'marching-letters': {
      const step=Math.sin(t*6+index*Math.PI);pose.position[1]=.22*a*e*Math.max(0,step);pose.rotation[2]=.13*a*e*step;break;
    }
    case 'suspended-sign':pose.rotation[2]=.12*a*e*Math.sin(t*1.5);pose.rotation[1]=.04*a*e*Math.sin(t*1.1);break;
    case 'shiver': {const burst=Math.sin(t*2.2)**8*a*e;pose.position[0]=.055*burst*Math.sin(t*57+index);pose.rotation[2]=.045*burst*Math.sin(t*49+index);break;}
    case 'playful-peek': {
      const center=.25+.5*((index*.61803398875)%1),peek=Math.exp(-(((cycle-center)/.09)**2))*e*a;
      pose.position[2]=.55*peek;pose.rotation[1]=-.24*peek;pose.rotation[2]=.1*peek;break;
    }
    case 'rock':
      pose.rotation = [.025 * a * e * Math.sin(t * 1.3), .08 * a * e * Math.sin(t * 1.1), .12 * a * e * Math.sin(t * 1.8)];
      pose.position[1] = .06 * a * e * Math.sin(t * 1.8) ** 2;
      break;
    case 'breathe': {
      const breath = a * e * Math.sin(t * 1.9);
      pose.scale = [1 + .035 * breath, 1 + .05 * breath, 1 + .035 * breath];
      pose.position[1] = .035 * breath;
      break;
    }
    case 'shimmer': {
      const shimmer = a * e * Math.sin(t * 7);
      const size = 1 + .012 * shimmer;
      pose.scale = [size, size, size];
      pose.rotation[1] = .035 * a * e * Math.sin(t * 2.2);
      pose.opacity = 1 - .1 * a * e * (.5 + .5 * Math.sin(t * 7));
      break;
    }
  }
  return finish(pose);
}

/**
 * Add positions/rotations and multiply axis scales when layering a reaction.
 * Spin is always one complete turn; amount controls its lift and tilt. Its final
 * yaw is intentionally 2π (unwrapped), equivalent to the rest rotation matrix.
 */
export function sampleReaction(kind: string, elapsed: number, duration: number, amount: number): ReactionTransform {
  const pose: ReactionTransform = { ...rest(), emissive: 0 };
  if (!Number.isFinite(elapsed) || !Number.isFinite(duration) || duration <= 0 || elapsed < 0 || elapsed > duration) return pose;
  const p = elapsed / duration, a = strength(amount), e = envelope(p);
  if (a === 0 || p === 0 || (p === 1 && kind !== 'spin')) return pose;
  if (p === 1) { pose.rotation[1] = TAU; return pose; }
  switch (kind) {
    case 'hop': {
      let squash = 0, stretch = 0;
      if (p < .22) {
        const anticipation = Math.sin(Math.PI * p / .22);
        squash = .2 * a * anticipation;
        pose.position[1] = -.12 * a * anticipation;
      } else if (p < .78) {
        const arc = Math.sin(Math.PI * (p - .22) / .56);
        pose.position[1] = 1.8 * a * arc;
        stretch = .16 * a * arc;
      } else {
        const landing = Math.sin(Math.PI * (p - .78) / .22);
        squash = .24 * a * landing;
        pose.position[1] = -.12 * a * landing;
      }
      const sy = Math.max(.001, 1 - squash + stretch);
      pose.scale = [1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)];
      pose.rotation[2] = .06 * a * e * Math.sin(TAU * p);
      break;
    }
    case 'wobble': {
      const wobble = a * e * Math.exp(-1.5 * p);
      pose.rotation = [.1 * wobble * Math.sin(TAU * 2 * p), .08 * wobble * Math.sin(TAU * 2.5 * p), .45 * wobble * Math.sin(TAU * 3 * p)];
      pose.position[0] = .12 * wobble * Math.sin(TAU * 3 * p);
      break;
    }
    case 'squash': {
      const sy = 1 - .28 * a * e;
      pose.scale = [1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)];
      pose.position[1] = -.12 * a * e;
      break;
    }
    case 'spin':
      pose.rotation = [0, TAU * smoother(p), .15 * a * e * Math.sin(TAU * p)];
      pose.position[1] = .35 * a * e;
      break;
    case 'glow': {
      pose.emissive = 2.5 * a * e;
      const size = 1 + .025 * a * e;
      pose.scale = [size, size, size];
      break;
    }
  }
  return finish(pose) as ReactionTransform;
}
