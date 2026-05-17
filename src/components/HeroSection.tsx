"use client";

import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Sparkles, useTexture, Clouds, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Global scroll state to pass data between GSAP and R3F
const scrollData = { progress: 0 };

function GroundPlane() {
  const mountainTex = useTexture('/mountain.png');

  return (
    <group>
      {/* Massive 2.5D Image Plane for Photorealistic Parallax */}
      <mesh position={[0, 15, -100]}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial 
          map={mountainTex}
          blending={THREE.MultiplyBlending}
          transparent={true}
          fog={true}
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

function CameraRig() {
  useFrame((state) => {
    // We fly "forward" into the mountain valley. 
    // Start at z=40, end at z=10
    const targetZ = THREE.MathUtils.lerp(40, 10, scrollData.progress);
    
    // Smoothly interpolate camera position
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.1);
    
    // Add subtle mouse parallax
    const targetX = (state.pointer.x * 2);
    const targetY = (state.pointer.y * 1) + 2;

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    
    // Look UP towards the massive peaks
    state.camera.lookAt(0, 15, -20);
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
    <div ref={containerRef} className="relative w-full h-screen bg-[#f0f4f8]">
      
      {/* --- 1. GLOBAL NAVIGATION WRAPPER --- */}
      <nav className="fixed top-0 left-0 w-full z-50 px-12 py-10 flex justify-between items-start pointer-events-auto">
        
        {/* Top Left Navigation Links */}
        <div className="flex gap-10">
          {['Home', 'Services', 'Portfolio', 'Contact'].map((link, index) => (
            <a 
              key={link} 
              href={`#${link.toLowerCase()}`}
              className={`tracking-[0.2em] text-[0.65rem] font-sans uppercase transition-colors duration-300 pb-2 ${index === 0 ? 'text-[#4a6b8c] border-b border-[#4a6b8c]' : 'text-zinc-600 hover:text-[#4a6b8c]'}`}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Top Right Navigation Links (News, Menu) */}
        <div className="flex items-center gap-6">
          <span className="tracking-[0.2em] text-[0.65rem] font-sans uppercase text-zinc-600 hover:text-[#4a6b8c] cursor-pointer transition-colors">
            News
          </span>
          <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center border border-zinc-600 text-[0.55rem] text-zinc-600">
            18
          </div>
          <span className="tracking-[0.2em] text-[0.65rem] font-sans uppercase text-zinc-600 hover:text-[#4a6b8c] cursor-pointer transition-colors">
            Menu
          </span>
          <div className="flex gap-1 ml-2">
            <div className="w-1 h-1 rounded-full bg-zinc-600"></div>
            <div className="w-1 h-1 rounded-full bg-zinc-600"></div>
          </div>
        </div>
      </nav>
      {/* ------------------------------------ */}

      {/* --- 2. R3F CANVAS --- */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <Canvas camera={{ position: [0, 5, 40], fov: 60 }}>
          {/* Dense White Atmospheric Fog */}
          <fog attach="fog" args={['#f0f4f8', 20, 100]} />

          <ambientLight intensity={0.6} color="#ffffff" />
          {/* Warm directional light for sunlight */}
          <directionalLight position={[20, 30, 10]} intensity={2.5} color="#fff4e6" />
          
          {/* Blowing Snow Particles */}
          <Sparkles count={300} scale={100} size={4} speed={0.2} color="#ffffff" opacity={0.8} position={[0, 10, -10]} />
          
          {/* Volumetric Clouds */}
          <Clouds material={THREE.MeshBasicMaterial}>
            <Cloud segments={40} bounds={[100, 10, 100]} volume={15} color="#f0f4f8" position={[0, -2, -10]} opacity={0.8} speed={0.1} />
            <Cloud segments={20} bounds={[50, 5, 50]} volume={10} color="#ffffff" position={[0, 5, 0]} opacity={0.5} speed={0.2} />
          </Clouds>
          
          {/* Procedural Scene */}
          <GroundPlane />
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
          {/* Geometric 'A' mark (dark charcoal) */}
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#4a6b8c" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-90">
            <path d="M2 20h20L12 4z" />
            <circle cx="12" cy="14" r="1.5" fill="#4a6b8c" opacity="0.5" />
            <circle cx="12" cy="8" r="1" fill="#4a6b8c" />
            <circle cx="7" cy="17" r="1" fill="#4a6b8c" />
            <circle cx="17" cy="17" r="1" fill="#4a6b8c" />
          </svg>
          {/* Vertical Separator */}
          <div className="w-[1px] h-12 bg-zinc-400"></div>
          {/* Brand Name */}
          <h1 className="text-[#4a6b8c] text-5xl md:text-6xl font-extralight tracking-[0.4em] uppercase">
            Apex
          </h1>
        </div>

        {/* Bottom Left Text */}
        <p className="absolute bottom-12 left-12 text-zinc-600 text-[0.65rem] font-light tracking-[0.3em] uppercase">
          Scroll down to discover
        </p>

        {/* Bottom Right Line Indicator */}
        <div className="absolute bottom-12 right-12 w-8 h-[1px] bg-zinc-400"></div>
      </div>
      {/* ----------------------- */}
    </div>
  );
}
