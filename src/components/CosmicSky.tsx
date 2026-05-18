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

    // Round cloud silhouette with soft feathered edge.
    float softMask = 1.0 - smoothstep(uFeather, 1.0, distanceToCenter);
    float grain = 0.85 + 0.15 * sin(vUv.x * 48.0) * cos(vUv.y * 36.0);
    float alpha = softMask * grain * uOpacity;

    if (alpha < 0.001) discard;
    gl_FragColor = vec4(uColor, alpha);
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
      <sphereGeometry args={[450, 64, 64]} />
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
            float drift = sin((direction.x + direction.z) * 10.0 + uTime * 0.2) * 0.035;
            float mixValue = clamp(gradient + drift, 0.0, 1.0);
            vec3 color = mix(uBottomColor, uTopColor, smoothstep(0.05, 0.95, mixValue));

            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function NebulaClouds() {
  const groupRef = useRef<THREE.Group>(null);

  const clouds = useMemo<NebulaCloud[]>(
    () => [
      {
        position: [-28, 20, -72],
        rotation: [0.2, -0.45, 0.25],
        scale: [64, 34, 1],
        color: '#ff1fd1',
        opacity: 0.09,
        feather: 0.48,
      },
      {
        position: [24, 14, -68],
        rotation: [-0.15, 0.4, -0.2],
        scale: [58, 30, 1],
        color: '#12e8ff',
        opacity: 0.08,
        feather: 0.45,
      },
      {
        position: [-6, 6, -58],
        rotation: [0.05, -0.25, 0.3],
        scale: [70, 42, 1],
        color: '#ff57f1',
        opacity: 0.06,
        feather: 0.5,
      },
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.06) * 0.08;
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
    </group>
  );
}
