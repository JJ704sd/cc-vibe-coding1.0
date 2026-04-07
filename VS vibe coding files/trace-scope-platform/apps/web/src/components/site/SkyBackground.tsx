import { useRef, useMemo } from 'react';
import * as THREE from 'three';

interface SkyBackgroundProps {
  nightFactor: number; // 0 = day, 1 = night
  time?: number;
}

export function SkyBackground({ nightFactor, time = 0 }: SkyBackgroundProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const skyUniforms = useMemo(() => ({
    uSunElev: { value: 0.5 },
    uNightFactor: { value: nightFactor },
    uTime: { value: time },
    uSunDir: { value: new THREE.Vector3(0.3, 0.5, 0.5) },
    uMobile: { value: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 1.0 : 0.0 }
  }), []);

  const skyMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uSunElev;
      uniform float uNightFactor;
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform float uMobile;
      varying vec3 vWorldPosition;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float hash3(vec3 p) {
        return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        int iterations = (uMobile > 0.5) ? 2 : 5;
        for (int i = 0; i < 5; i++) {
          if (i >= iterations) break;
          v += a * noise(p);
          p = p * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      float milkyWay(vec3 dir) {
        vec3 mwAxis = normalize(vec3(0.3, 0.85, 0.43));
        float distFromBand = abs(dot(dir, mwAxis));
        float core = exp(-distFromBand * distFromBand * 25.0) * 1.0;
        float diffuse = exp(-distFromBand * distFromBand * 6.0) * 0.35;
        vec2 mwUV = dir.xz / (0.3 + abs(dir.y) * 0.7);
        float mwNoise = fbm(mwUV * 4.0 + 17.0);
        float mwNoise2 = fbm(mwUV * 8.0 + 43.0);
        float mwDetail = mwNoise * 0.6 + mwNoise2 * 0.4;
        return (core + diffuse) * (0.5 + mwDetail * 0.8);
      }

      float stars(vec3 dir, out vec3 starCol) {
        float totalBrightness = 0.0;
        starCol = vec3(0.0);
        float mwDensity = milkyWay(dir);

        // Layer 1: Dense faint (skip on mobile)
        if (uMobile < 0.5) {
          float scale = 200.0;
          vec3 p = dir * scale;
          vec3 cell = floor(p);
          vec3 f = fract(p);
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellId = cell + neighbor;
                float h = hash3(cellId);
                float threshold = 0.88 - mwDensity * 0.3;
                if (h > threshold) {
                  vec3 starPos = neighbor + vec3(
                    hash3(cellId + 1.0), hash3(cellId + 2.0), hash3(cellId + 3.0)
                  );
                  float d = length(f - starPos);
                  float size = 0.015 + hash3(cellId + 4.0) * 0.025;
                  float glow = exp(-d * d / (size * size * 1.5));
                  float twinkle = 0.85 + 0.15 * sin(uTime * 0.3 + h * 200.0);
                  float b = glow * twinkle * (0.15 + hash3(cellId + 6.0) * 0.2);
                  totalBrightness += b;
                  starCol += b * vec3(0.75, 0.8, 1.0);
                }
              }
            }
          }
        }

        // Layer 2: Medium visible stars
        {
          float scale = 70.0;
          vec3 p = dir * scale;
          vec3 cell = floor(p);
          vec3 f = fract(p);
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellId = cell + neighbor;
                float h = hash3(cellId);
                float threshold = 0.85 - mwDensity * 0.15;
                if (h > threshold) {
                  vec3 starPos = neighbor + vec3(
                    hash3(cellId + 11.0), hash3(cellId + 12.0), hash3(cellId + 13.0)
                  );
                  float d = length(f - starPos);
                  float size = 0.025 + hash3(cellId + 14.0) * 0.045;
                  float glow = exp(-d * d / (size * size * 2.0));
                  float twinkle = 0.65 + 0.35 * sin(uTime * (0.4 + hash3(cellId + 15.0) * 1.5) + h * 80.0);
                  float b = glow * twinkle * (0.35 + hash3(cellId + 16.0) * 0.45);
                  totalBrightness += b;
                  float temp = hash3(cellId + 17.0);
                  vec3 col = temp < 0.3 ? vec3(0.7, 0.75, 1.0)
                           : temp < 0.7 ? vec3(1.0, 0.98, 0.95)
                           : vec3(1.0, 0.88, 0.7);
                  starCol += b * col;
                }
              }
            }
          }
        }

        // Layer 3: Bright prominent stars
        {
          float scale = 30.0;
          vec3 p = dir * scale;
          vec3 cell = floor(p);
          vec3 f = fract(p);
          for (int x = -1; x <= 1; x++) {
            for (int y = -1; y <= 1; y++) {
              for (int z = -1; z <= 1; z++) {
                vec3 neighbor = vec3(float(x), float(y), float(z));
                vec3 cellId = cell + neighbor;
                float h = hash3(cellId);
                if (h > 0.93) {
                  vec3 starPos = neighbor + vec3(
                    hash3(cellId + 21.0), hash3(cellId + 22.0), hash3(cellId + 23.0)
                  );
                  float d = length(f - starPos);
                  float mag = hash3(cellId + 27.0);
                  float baseBright = 0.5 + pow(mag, 3.0) * 2.0;
                  float size = 0.04 + hash3(cellId + 24.0) * 0.08;
                  float core = exp(-d * d / (size * size * 1.5));
                  float halo = exp(-d * d / (size * size * 8.0)) * 0.3;
                  float glow = core + halo;
                  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + hash3(cellId + 25.0) * 2.5) + h * 60.0);
                  float b = glow * twinkle * baseBright;
                  totalBrightness += b;
                  float temp = hash3(cellId + 26.0);
                  vec3 col = temp < 0.15 ? vec3(0.6, 0.7, 1.0)
                           : temp < 0.25 ? vec3(1.0, 0.65, 0.4)
                           : temp < 0.6  ? vec3(1.0, 1.0, 0.98)
                           : vec3(1.0, 0.92, 0.75);
                  starCol += b * col;
                }
              }
            }
          }
        }

        return min(totalBrightness, 2.5);
      }

      void main() {
        vec3 dir = normalize(vWorldPosition);
        float y = dir.y;

        vec3 dayZenith = vec3(0.22, 0.45, 0.85);
        vec3 dayHorizon = vec3(0.6, 0.75, 0.92);
        vec3 dayNadir = vec3(0.55, 0.7, 0.88);

        float sunsetFactor = smoothstep(0.0, 0.3, uSunElev) * (1.0 - smoothstep(0.3, 0.6, uSunElev));
        vec3 sunsetHorizon = vec3(0.95, 0.55, 0.3);
        vec3 sunsetZenith = vec3(0.45, 0.35, 0.65);

        vec3 dayColorUp = mix(dayHorizon, dayZenith, smoothstep(0.0, 0.6, y));
        vec3 dayColorDown = mix(dayHorizon, dayNadir, smoothstep(0.0, -0.5, y));
        vec3 daySky = y >= 0.0 ? dayColorUp : dayColorDown;
        daySky = mix(daySky, mix(sunsetHorizon, sunsetZenith, smoothstep(-0.1, 0.5, y)), sunsetFactor * 0.7);

        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        vec3 sunGlow = vec3(1.0, 0.9, 0.7) * pow(sunDot, 64.0) * 1.5 * (1.0 - uNightFactor);
        vec3 sunHalo = vec3(1.0, 0.8, 0.5) * pow(sunDot, 8.0) * 0.3 * (1.0 - uNightFactor);

        vec3 nightZenith = vec3(0.01, 0.01, 0.04);
        vec3 nightHorizon = vec3(0.03, 0.03, 0.08);
        vec3 nightSky = mix(nightHorizon, nightZenith, smoothstep(-0.1, 0.5, y));

        vec3 starColor;
        float starBrightness = stars(dir, starColor) * uNightFactor;
        nightSky += starColor * uNightFactor * 1.2;

        float mwGlow = milkyWay(dir) * uNightFactor;
        vec3 mwColor = mix(vec3(0.12, 0.1, 0.18), vec3(0.15, 0.13, 0.2), noise(dir.xz * 3.0));
        nightSky += mwColor * mwGlow * 0.4;

        vec3 sky = mix(daySky, nightSky, uNightFactor);
        sky += sunGlow + sunHalo;

        float cloudFactor = (1.0 - uNightFactor);
        if (cloudFactor > 0.01 && y > -0.15) {
          vec2 cloudUV = dir.xz / (0.4 + abs(y) * 0.6);
          cloudUV *= 1.8;
          cloudUV += uTime * vec2(0.008, 0.003);
          float cloudNoise = fbm(cloudUV);
          float cloudNoise2 = fbm(cloudUV * 1.5 + vec2(50.0, 30.0));
          float cloud = smoothstep(0.35, 0.65, cloudNoise);
          cloud *= smoothstep(0.3, 0.6, cloudNoise2);
          float horizonFade = smoothstep(-0.15, 0.1, y) * smoothstep(0.8, 0.3, abs(y));
          vec3 cloudColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.85, 0.7), sunsetFactor * 0.5);
          cloudColor *= 0.85 + 0.15 * cloudNoise2;
          float cloudAlpha = cloud * horizonFade * cloudFactor * 0.55;
          sky = mix(sky, cloudColor, cloudAlpha);
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  }), [skyUniforms]);

  return (
    <mesh ref={meshRef} material={skyMaterial} renderOrder={-2}>
      <sphereGeometry args={[8000, 32, 32]} />
    </mesh>
  );
}
