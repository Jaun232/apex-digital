"use client";

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Sparkles, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Global scroll state to pass data between GSAP and R3F
const scrollData = { progress: 0 };

function GroundPlane() {
  return (
    <group>
      {/* A large plane for forthcoming displacement mapping */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[200, 200, 128, 128]} />
        <meshStandardMaterial
          color="#0a0a0f"
          metalness={0.8}
          roughness={0.4}
          wireframe={true}
          emissive="#1a1a2e"
        />
      </mesh>
      
      {/* Grid helper for scale/perspective */}
      <gridHelper args={[200, 200, '#4a00ff', '#101020']} position={[0, -1.99, 0]} />
    </group>
  );
}

function Monolith({ position, scale }: { position: [number, number, number], scale: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={scale} />
      <meshStandardMaterial
        color="#050508"
        metalness={1}
        roughness={0.1}
        emissive="#4a00ff"
        emissiveIntensity={0.2}
      />
      {/* Neon Edge Highlight */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(...scale)]} />
        <lineBasicMaterial color="#6b33ff" linewidth={1} />
      </lineSegments>
    </mesh>
  );
}

function MonolithField() {
  const monoliths = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 40; i++) {
      items.push({
        position: [
          (Math.random() - 0.5) * 40, // X: spread across 40 units
          (Math.random() * 5) - 1,    // Y: varying heights
          -Math.random() * 100,       // Z: spread deep into the scene
        ] as [number, number, number],
        scale: [
          Math.random() * 2 + 0.5,    // Width
          Math.random() * 10 + 5,     // Height (tall monoliths)
          Math.random() * 2 + 0.5,    // Depth
        ] as [number, number, number],
      });
    }
    return items;
  }, []);

  return (
    <group>
      {monoliths.map((m, i) => (
        <Monolith key={i} position={m.position} scale={m.scale} />
      ))}
    </group>
  );
}

function BugattiModel() {
  const { scene } = useGLTF('/bugatti.glb');
  
  return (
    <primitive
      object={scene}
      position={[0, -1.5, -30]}
      scale={1.5}
      rotation={[0, Math.PI / 2, 0]}
    />
  );
}

function CameraRig() {
  useFrame((state) => {
    // We fly "forward" over the ground grid. 
    // Start at z=10, end at z=-50
    const targetZ = THREE.MathUtils.lerp(10, -50, scrollData.progress);
    
    // Smoothly interpolate camera position
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.1);
    
    // Add subtle mouse parallax
    const targetX = (state.pointer.x * 2);
    const targetY = (state.pointer.y * 1) + 2; // Keep camera above ground

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    
    // Look slightly downward towards the horizon
    state.camera.lookAt(0, 0, targetZ - 20);
  });
  return null;
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeOutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !fadeOutRef.current) return;

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
    const textElements = fadeOutRef.current.children;
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
      
      {/* --- 1. GLOBAL NAVIGATION WRAPPER --- */}
      <nav className="fixed top-0 left-0 w-full z-50 px-12 py-10 flex justify-between items-start mix-blend-difference pointer-events-auto">
        
        {/* Top Left Navigation Links */}
        <div className="flex gap-10">
          {['Home', 'Services', 'Portfolio', 'Contact'].map((link, index) => (
            <a 
              key={link} 
              href={`#${link.toLowerCase()}`}
              className={`tracking-[0.2em] text-[0.65rem] font-sans uppercase transition-colors duration-300 pb-2 ${index === 0 ? 'text-white border-b border-[#4a00ff]' : 'text-zinc-500 hover:text-white'}`}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Top Right Navigation Links (News, Menu) */}
        <div className="flex items-center gap-6">
          <span className="tracking-[0.2em] text-[0.65rem] font-sans uppercase text-zinc-500 hover:text-white cursor-pointer transition-colors">
            News
          </span>
          <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center border border-zinc-500 text-[0.55rem] text-zinc-400">
            18
          </div>
          <span className="tracking-[0.2em] text-[0.65rem] font-sans uppercase text-zinc-500 hover:text-white cursor-pointer transition-colors">
            Menu
          </span>
          <div className="flex gap-1 ml-2">
            <div className="w-1 h-1 rounded-full bg-zinc-500"></div>
            <div className="w-1 h-1 rounded-full bg-zinc-500"></div>
          </div>
        </div>
      </nav>
      {/* ------------------------------------ */}

      {/* --- 2. R3F CANVAS --- */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <Canvas camera={{ position: [0, 2, 10], fov: 60 }}>
          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
          
          {/* Neon sparks over the ground */}
          <Sparkles count={300} scale={100} size={2} speed={0.4} color="#6b33ff" opacity={0.3} position={[0, 5, -20]} />
          
          {/* Procedural Scene */}
          <GroundPlane />
          <MonolithField />
          <BugattiModel />
          <CameraRig />
          
          {/* Environment maps for reflections */}
          <Environment preset="city" />
        </Canvas>
      </div>
      {/* ----------------------- */}

      {/* --- 3. MIDDLE LEFT LOGO & BOTTOM LEFT TEXT (Fades out on scroll) --- */}
      <div 
        ref={fadeOutRef}
        className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
      >
        {/* Middle Left Logo */}
        <div className="absolute top-1/2 left-12 -translate-y-1/2 flex items-center gap-8">
          {/* Geometric 'A' mark (scaled up and detailed) */}
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
            <path d="M2 20h20L12 4z" />
            <circle cx="12" cy="14" r="1.5" fill="white" opacity="0.5" />
            <circle cx="12" cy="8" r="1" fill="white" />
            <circle cx="7" cy="17" r="1" fill="white" />
            <circle cx="17" cy="17" r="1" fill="white" />
          </svg>
          {/* Vertical Separator */}
          <div className="w-[1px] h-12 bg-zinc-600"></div>
          {/* Brand Name */}
          <h1 className="text-white text-5xl md:text-6xl font-extralight tracking-[0.4em] uppercase">
            Apex
          </h1>
        </div>

        {/* Bottom Left Text */}
        <p className="absolute bottom-12 left-12 text-zinc-500 text-[0.65rem] font-light tracking-[0.3em] uppercase">
          Scroll down to discover
        </p>

        {/* Bottom Right Line Indicator */}
        <div className="absolute bottom-12 right-12 w-8 h-[1px] bg-zinc-500"></div>
      </div>
      {/* ----------------------- */}
    </div>
  );
}
