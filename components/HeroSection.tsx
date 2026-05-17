"use client";

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Global scroll state to pass data between GSAP and R3F
const scrollData = { progress: 0 };

function AbstractGeometry() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Subtle ambient spinning
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
      groupRef.current.rotation.x += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        {/* Central Dark Shard */}
        <mesh>
          <icosahedronGeometry args={[2, 0]} />
          <meshStandardMaterial 
            color="#050505" 
            metalness={0.9} 
            roughness={0.1}
            wireframe={false}
          />
        </mesh>
        
        {/* Inner Neon Glow Wireframe */}
        <mesh scale={1.05}>
          <icosahedronGeometry args={[2, 0]} />
          <meshBasicMaterial 
            color="#4a00ff" 
            wireframe={true} 
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Floating Geometric Fragments */}
        {Array.from({ length: 15 }).map((_, i) => (
          <mesh 
            key={i}
            position={[
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8,
              (Math.random() - 0.5) * 8
            ]}
            rotation={[
              Math.random() * Math.PI,
              Math.random() * Math.PI,
              0
            ]}
            scale={Math.random() * 0.4 + 0.1}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial 
              color="#101015" 
              metalness={0.8} 
              roughness={0.2}
              emissive="#200088"
              emissiveIntensity={Math.random() * 0.5}
            />
          </mesh>
        ))}
      </Float>
    </group>
  );
}

function CameraRig() {
  useFrame((state) => {
    // We dive "through" the geometry. 
    // Start at z=8, end at z=-10
    const targetZ = THREE.MathUtils.lerp(8, -10, scrollData.progress);
    
    // Add subtle mouse parallax for extra immersion
    const targetX = (state.pointer.x * 2);
    const targetY = (state.pointer.y * 2);

    // Smoothly interpolate camera position
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.1);
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    
    // Always look at center
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !overlayRef.current) return;

    // Reset progress on mount to prevent stale state across HMR
    scrollData.progress = 0;

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=2500",
        scrub: 1,
        pin: true,
      }
    });

    // Animate the global scrollData proxy object
    timeline.to(scrollData, {
      progress: 1,
      ease: "none"
    }, 0);

    // Stagger fade-out for overlay text components
    const textElements = overlayRef.current.children;
    timeline.to(textElements, {
      opacity: 0,
      y: -50,
      stagger: 0.15,
      ease: "power2.inOut",
    }, 0);

    return () => {
      timeline.kill();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-[#030305]">
      {/* 1. Background R3F Canvas */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
          {/* Lighting */}
          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
          <pointLight position={[-5, -5, -5]} intensity={5} color="#4a00ff" />
          
          {/* Neon sparks */}
          <Sparkles count={100} scale={10} size={2} speed={0.4} color="#6b33ff" opacity={0.5} />
          
          {/* Procedural Scene */}
          <AbstractGeometry />
          <CameraRig />
          
          {/* Environment maps for reflections */}
          <Environment preset="city" />
        </Canvas>
      </div>

      {/* 2. HTML Overlay Layer */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center overflow-hidden"
      >
        <h1 className="text-white text-7xl md:text-9xl font-extralight tracking-[0.3em] uppercase mb-4 text-center">
          Apex
        </h1>
        <h2 className="text-white/80 text-xl md:text-2xl font-light tracking-[0.5em] uppercase mb-16 text-center">
          Digital
        </h2>
        
        <p className="text-gray-400 text-sm md:text-base font-light tracking-widest max-w-md text-center mb-12 px-4 leading-relaxed">
          Architects of the digital void.
        </p>

        {/* Interactive Call-to-Action */}
        <button 
          className="pointer-events-auto px-10 py-4 bg-transparent border border-white/20 text-white tracking-[0.2em] uppercase text-xs md:text-sm transition-all duration-500 hover:bg-white hover:text-[#030305] hover:border-white backdrop-blur-sm"
          onClick={() => {
            window.scrollTo({ top: window.innerHeight * 2, behavior: 'smooth' });
          }}
        >
          Enter the Core
        </button>
      </div>
    </div>
  );
}
