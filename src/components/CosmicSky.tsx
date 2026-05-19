'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type NebulaCloud = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity: number;
  feather: number;
};

const TOP_COLOR = new THREE.Color('#0b031e');
const BOTTOM_COLOR = new THREE.Color('#020208');

const NEBULA_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEBULA_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFeather;
  varying vec2 vUv;

  void main() {
    vec2 centeredUv = vUv - 0.5;
    float distanceToCenter = length(centeredUv) * 2.0;

    float softMask = 1.0 - smoothstep(uFeather, 1.0, distanceToCenter);
    float grain = 0.82 + 0.18 * sin(vUv.x * 44.0) * cos(vUv.y * 38.0);
    float alpha = softMask * grain * uOpacity;

    if (alpha < 0.001) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

const VOLUMETRIC_VERTEX_SHADER = `
  varying vec3 vDirection;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vDirection = normalize(worldPosition.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const VOLUMETRIC_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec3 vDirection;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.17, 0.11, 0.13));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash(i + vec3(1.0, 1.0, 1.0));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec3(17.1, 9.2, 3.4);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float u = atan(dir.z, dir.x) / 6.28318530718 + 0.5;
    float v = dir.y * 0.5 + 0.5;
    vec2 uv = vec2(u, v);
    float t = uTime * 0.04;

    vec3 domainA = vec3(uv * 3.1 + vec2(t * 0.45, -t * 0.23) + uSeed, t * 0.7);
    vec3 domainB = vec3(uv * 5.6 - vec2(t * 0.28, t * 0.51) + uSeed * 0.7, -t * 0.4);
    float n1 = fbm(domainA);
    float n2 = fbm(domainB);

    float band = exp(-pow((v - 0.58) * 3.8, 2.0));
    float cloudA = smoothstep(0.49, 0.83, n1) * band;
    float cloudB = smoothstep(0.54, 0.89, n2) * (0.45 + band * 0.85);
    float cloud = clamp(cloudA + cloudB * 0.82, 0.0, 1.0);

    vec3 deepColor = mix(vec3(0.02, 0.06, 0.14), vec3(0.92, 0.18, 0.96), n2);
    vec3 electricColor = mix(vec3(0.06, 0.84, 1.0), vec3(1.0, 0.38, 0.86), n1);
    vec3 color = mix(deepColor, electricColor, cloud * 0.72);

    float horizonFade = smoothstep(0.32, 0.6, v);
    float alpha = cloud * uOpacity * horizonFade;

    if (alpha < 0.001) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

function CosmicGradient() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[520, 80, 80]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
        uniforms={{
          uTopColor: { value: TOP_COLOR },
          uBottomColor: { value: BOTTOM_COLOR },
          uTime: { value: 0 },
        }}
        vertexShader={`
          varying vec3 vWorldPosition;

          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uTopColor;
          uniform vec3 uBottomColor;
          uniform float uTime;
          varying vec3 vWorldPosition;

          void main() {
            vec3 direction = normalize(vWorldPosition);
            float gradient = direction.y * 0.5 + 0.5;
            float drift = sin((direction.x + direction.z) * 9.5 + uTime * 0.18) * 0.04;
            float mixValue = clamp(gradient + drift, 0.0, 1.0);
            vec3 color = mix(uBottomColor, uTopColor, smoothstep(0.03, 0.97, mixValue));

            float vignette = smoothstep(1.25, 0.35, length(direction.xz));
            color *= mix(0.72, 1.0, vignette);

            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function VolumetricNebula() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh scale={[-1, 1, 1]} rotation={[0.05, -0.16, 0]}>
      <sphereGeometry args={[500, 96, 96]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest
        side={THREE.BackSide}
        toneMapped={false}
        uniforms={{
          uTime: { value: 0 },
          uSeed: { value: 1.37 },
          uOpacity: { value: 0.26 },
        }}
        vertexShader={VOLUMETRIC_VERTEX_SHADER}
        fragmentShader={VOLUMETRIC_FRAGMENT_SHADER}
      />
    </mesh>
  );
}

function NebulaClouds() {
  const groupRef = useRef<THREE.Group>(null);

  const clouds = useMemo<NebulaCloud[]>(
    () => [
      {
        position: [-120, 78, -720],
        rotation: [0.08, -0.46, 0.18],
        scale: [240, 138, 1],
        color: '#ff31d8',
        opacity: 0.055,
        feather: 0.4,
      },
      {
        position: [130, 56, -690],
        rotation: [-0.12, 0.34, -0.14],
        scale: [215, 122, 1],
        color: '#12e8ff',
        opacity: 0.05,
        feather: 0.42,
      },
      {
        position: [12, 30, -760],
        rotation: [0.04, -0.21, 0.24],
        scale: [272, 152, 1],
        color: '#fc5dff',
        opacity: 0.042,
        feather: 0.44,
      },
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.035) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {clouds.map((cloud, index) => (
        <mesh
          key={index}
          position={cloud.position}
          rotation={cloud.rotation}
          scale={cloud.scale}
        >
          <planeGeometry args={[1, 1, 12, 12]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            depthTest
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
            uniforms={{
              uColor: { value: new THREE.Color(cloud.color) },
              uOpacity: { value: cloud.opacity },
              uFeather: { value: cloud.feather },
            }}
            vertexShader={NEBULA_VERTEX_SHADER}
            fragmentShader={NEBULA_FRAGMENT_SHADER}
          />
        </mesh>
      ))}
    </group>
  );
}

function PatchyStars() {
  const starSprite = useMemo(() => {
    const size = 64;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x + 0.5) / size * 2 - 1;
        const v = (y + 0.5) / size * 2 - 1;
        const d = Math.sqrt(u * u + v * v);
        const falloff = Math.max(0, 1 - d);
        const alpha = Math.pow(falloff, 2.3);
        const i = (y * size + x) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = Math.round(alpha * 255);
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, []);

  useEffect(() => {
    return () => {
      starSprite.dispose();
    };
  }, [starSprite]);

  const { patchPositions, patchColors, hazePositions, hazeColors } = useMemo(() => {
    const gaussian = () => {
      const u = Math.max(Math.random(), 1e-6);
      const v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    const clusterCount = 15;
    const clusters = Array.from(
      { length: clusterCount },
      () =>
        new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(1700),
          THREE.MathUtils.randFloat(-220, 560),
          THREE.MathUtils.randFloat(-1080, -620),
        ),
    );

    const patchCount = 3000;
    const hazeCount = 1200;
    const patchPositions = new Float32Array(patchCount * 3);
    const patchColors = new Float32Array(patchCount * 3);
    const hazePositions = new Float32Array(hazeCount * 3);
    const hazeColors = new Float32Array(hazeCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < patchCount; i++) {
      const cluster = clusters[Math.floor(Math.random() * clusters.length)];
      const spreadX = THREE.MathUtils.randFloat(85, 180);
      const spreadY = THREE.MathUtils.randFloat(45, 120);
      const spreadZ = THREE.MathUtils.randFloat(55, 150);

      const x = cluster.x + gaussian() * spreadX;
      const y = cluster.y + gaussian() * spreadY;
      const z = cluster.z + gaussian() * spreadZ;

      const index = i * 3;
      patchPositions[index] = x;
      patchPositions[index + 1] = y;
      patchPositions[index + 2] = z;

      const brightness = 0.62 + Math.pow(Math.random(), 5.5) * 0.34;
      const hue = Math.random() < 0.7
        ? THREE.MathUtils.randFloat(0.52, 0.6)
        : THREE.MathUtils.randFloat(0.06, 0.12);
      color.setHSL(hue, THREE.MathUtils.randFloat(0.01, 0.09), brightness);
      patchColors[index] = color.r;
      patchColors[index + 1] = color.g;
      patchColors[index + 2] = color.b;
    }

    for (let i = 0; i < hazeCount; i++) {
      const index = i * 3;
      hazePositions[index] = THREE.MathUtils.randFloatSpread(2300);
      hazePositions[index + 1] = THREE.MathUtils.randFloat(-460, 760);
      hazePositions[index + 2] = THREE.MathUtils.randFloat(-1320, -760);

      const hazeBrightness = 0.38 + Math.pow(Math.random(), 4.2) * 0.28;
      const hazeHue = Math.random() < 0.7
        ? THREE.MathUtils.randFloat(0.52, 0.6)
        : THREE.MathUtils.randFloat(0.07, 0.12);
      color.setHSL(hazeHue, THREE.MathUtils.randFloat(0.0, 0.06), hazeBrightness);
      hazeColors[index] = color.r;
      hazeColors[index + 1] = color.g;
      hazeColors[index + 2] = color.b;
    }

    return { patchPositions, patchColors, hazePositions, hazeColors };
  }, []);

  return (
    <group>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[patchPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[patchColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={1.35}
          sizeAttenuation
          map={starSprite}
          alphaTest={0.08}
          vertexColors
          transparent
          opacity={0.74}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </points>

      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[hazePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[hazeColors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.82}
          sizeAttenuation
          map={starSprite}
          alphaTest={0.08}
          vertexColors
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

function DeepSpaceLayer({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const pointerParallaxRef = useRef(new THREE.Vector2(0, 0));

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    pointerParallaxRef.current.x = THREE.MathUtils.lerp(
      pointerParallaxRef.current.x,
      -pointer.x * 2.6,
      0.075,
    );
    pointerParallaxRef.current.y = THREE.MathUtils.lerp(
      pointerParallaxRef.current.y,
      -pointer.y * 1.2,
      0.075,
    );

    groupRef.current.position.x = pointerParallaxRef.current.x;
    groupRef.current.position.y =
      pointerParallaxRef.current.y + Math.sin(clock.getElapsedTime() * 0.03) * 0.35;
  });

  return <group ref={groupRef}>{children}</group>;
}
export default function CosmicSky() {
  return (
    <group>
      <CosmicGradient />
      <VolumetricNebula />
      <NebulaClouds />
      <DeepSpaceLayer>
        <PatchyStars />
      </DeepSpaceLayer>
    </group>
  );
}
