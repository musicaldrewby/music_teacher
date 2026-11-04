import * as THREE from './vendor/three.module.min.js';

export function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    uniforms: {
      time: {value: 0}, shade: {value: 1},
      fogColor: {value: new THREE.Color('#b6dce6')}, fogNear: {value: 28}, fogFar: {value: 46},
      shallowTint: {value: new THREE.Color('#48bdb4')},
      channelTint: {value: new THREE.Color('#286eaa')},
      deepTint: {value: new THREE.Color('#204d84')}
    },
    vertexShader: `
      attribute vec2 blockLight;
      attribute float waterDepth;
      varying vec2 caveLight;
      varying vec3 worldPoint;
      varying float bedDepth;
      varying float viewDistanceZ;
      varying float surfaceUp;
      void main() {
        caveLight = blockLight;
        bedDepth = waterDepth;
        surfaceUp = abs(normal.y);
        worldPoint = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 viewPoint = modelViewMatrix * vec4(position, 1.0);
        viewDistanceZ = -viewPoint.z;
        gl_Position = projectionMatrix * viewPoint;
      }`,
    fragmentShader: `
      uniform float time, shade, fogNear, fogFar;
      uniform vec3 fogColor, shallowTint, channelTint, deepTint;
      varying vec2 caveLight;
      varying vec3 worldPoint;
      varying float bedDepth, viewDistanceZ, surfaceUp;
      void main() {
        float channel = smoothstep(0.42, 2.20, bedDepth);
        float deep = smoothstep(2.5, 10.0, bedDepth);
        vec3 tint = mix(mix(shallowTint, channelTint, channel), deepTint, deep);
        vec3 sight = normalize(cameraPosition - worldPoint);
        float grazing = pow(1.0 - abs(sight.y), 3.0);
        float swell = sin(worldPoint.x * 1.7 + worldPoint.z * 2.5 + time * 0.58);
        float crest = sin(worldPoint.x * 2.1 + worldPoint.z * 3.7 + swell * 0.6 + time * 0.72);
        float glint = smoothstep(0.90, 0.995, crest) * (0.65 + 0.35 * swell);
        tint = mix(tint, fogColor, 0.025 + 0.13 * grazing);
        tint += vec3(0.027, 0.047, 0.055) * glint;
        float alpha = mix(0.33, 0.79, channel) + 0.10 * deep + 0.07 * grazing;
        if (surfaceUp < 0.5) {
          float cascade = sin(worldPoint.y * 5.1 + time * 4.7 + sin(dot(worldPoint.xz, vec2(3.0, 2.1))));
          tint = mix(tint, shallowTint, 0.38) + vec3(0.08, 0.15, 0.15) * smoothstep(0.30, 0.95, cascade);
          alpha = 0.67;
        }
        float skyLight = clamp(caveLight.x, 0.0, 1.0);
        vec3 lit = tint * shade * (0.002 + skyLight * skyLight)
                 + vec3(0.95, 0.42, 0.10) * caveLight.y * caveLight.y;
        float fog = smoothstep(fogNear, fogFar, viewDistanceZ);
        vec3 fogTint = mix(vec3(0.0003, 0.0005, 0.001), fogColor, skyLight);
        gl_FragColor = vec4(mix(lit, fogTint, fog), mix(alpha, 1.0, fog));
        #include <colorspace_fragment>
      }`
  });
}
