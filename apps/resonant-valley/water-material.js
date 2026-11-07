import * as THREE from './vendor/three.module.min.js';

export function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    uniforms: {
      time: {value: 0}, shade: {value: 1},
      fogColor: {value: new THREE.Color('#b6dce6')}, fogNear: {value: 28}, fogFar: {value: 46},
      shallowTint: {value: new THREE.Color('#54d5ba')},
      channelTint: {value: new THREE.Color('#237fae')},
      deepTint: {value: new THREE.Color('#194d87')}
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
        // World-anchored eighth-block pixels drift in two crossing currents.
        // No displacement or reflection render pass: swimming and shore ledges
        // use the exact same water surface as before.
        vec2 pixel = floor(worldPoint.xz * 8.0) / 8.0;
        float swell = sin(dot(pixel, vec2(1.3, 2.1)) + time * 0.7);
        float ripple = sin(dot(pixel, vec2(4.5, -2.2)) - time * 1.25 + swell * 1.2);
        float crossRipple = sin(dot(pixel, vec2(2.0, 5.1)) + time * 0.92);
        float lines = smoothstep(0.72, 0.94, ripple);
        float sparkle = smoothstep(0.88, 0.99, ripple) * smoothstep(0.68, 0.98, crossRipple);
        float caustic = smoothstep(0.35, 0.65, abs(ripple * crossRipple)) * (1.0 - deep);
        tint = mix(tint, fogColor, 0.055 + 0.23 * grazing);
        tint += vec3(0.04, 0.12, 0.12) * lines + vec3(0.19, 0.26, 0.24) * sparkle;
        tint += vec3(0.025, 0.065, 0.043) * caustic;
        // Broken foam ribbons appear over shallow shoreline shelves.
        float foam = (1.0 - smoothstep(0.65, 1.7, bedDepth))
                   * smoothstep(0.38, 0.82, sin(dot(pixel, vec2(3.2, 1.7)) - time * 0.85 + swell));
        tint = mix(tint, vec3(0.55, 0.86, 0.78), foam * 0.48);
        float alpha = mix(0.35, 0.77, channel) + 0.10 * deep + 0.08 * grazing + foam * 0.12;
        if (surfaceUp < 0.5) {
          vec2 flow = floor(vec2(worldPoint.x + worldPoint.z, worldPoint.y) * 8.0) / 8.0;
          float cascade = sin(flow.y * 6.3 + time * 5.4 + sin(flow.x * 3.0));
          tint = mix(tint, shallowTint, 0.46) + vec3(0.15, 0.23, 0.22) * smoothstep(0.30, 0.95, cascade);
          alpha = 0.68;
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
