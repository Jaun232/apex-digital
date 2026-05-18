'use client';

import React, { useMemo, useRef } from 'react';
import { Stars } from '@react-three/drei';
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
        depthTest={false}
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
        position: [-120, 78, -285],
        rotation: [0.08, -0.46, 0.18],
        scale: [240, 138, 1],
        color: '#ff31d8',
        opacity: 0.055,
        feather: 0.4,
      },
      {
        position: [130, 56, -265],
        rotation: [-0.12, 0.34, -0.14],
        scale: [215, 122, 1],
        color: '#12e8ff',
        opacity: 0.05,
        feather: 0.42,
      },
      {
        position: [12, 30, -308],
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
            depthTest={false}
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

export default function CosmicSky() {
  return (
    <group>
      <CosmicGradient />
      <VolumetricNebula />
      <NebulaClouds />
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0.5}
        fade
        speed={1}
      />
      <Stars
        radius={210}
        depth={120}
        count={3200}
        factor={2.4}
        saturation={0.9}
        fade
        speed={0.45}
      />
    </group>
  );
}
