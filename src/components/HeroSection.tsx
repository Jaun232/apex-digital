"use client";

import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Global scroll state to pass data between GSAP and R3F
const scrollData = { progress: 0 };

function MountainModel() {
  const { scene } = useGLTF('/moon_-_hansteen__billy_craters.glb');
  const meshRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Apply a white/snowy material to all meshes in the model
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: '#e8ecf0',
          roughness: 0.85,
          metalness: 0.05,
        });
      }
    });
  }, [scene]);

  return (
    <group ref={meshRef} position={[0, -8, -30]} scale={[12, 12, 12]} rotation={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function CameraRig() {
  useFrame((state) => {
    // Fly forward into the mountain
    const targetZ = THREE.MathUtils.lerp(50, 15, scrollData.progress);
    
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.1);
    
    // Subtle mouse parallax
    const targetX = (state.pointer.x * 2);
    const targetY = (state.pointer.y * 1) + 5;

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    
    // Look at the peak
    state.camera.lookAt(0, 5, -20);
  });
  return null;
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeOutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !fadeOutRef.current) return;

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

    timeline.to(scrollData, {
      progress: 1,
      ease: "none"
    }, 0);

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
    <div ref={containerRef} className="relative w-full h-screen bg-[#e8ecf0]">
      
      {/* --- 1. NAVIGATION (Montfort-matched positioning) --- */}
      {/* Montfort: nav is ~130px from top, links have wide letter-spacing,
          active link has a thin underline BELOW with ~8px gap,
          nav links are centered-left with generous spacing */}
      <nav className="fixed top-0 left-0 w-full z-50 pointer-events-auto"
           style={{ paddingTop: '42px', paddingBottom: '20px', paddingLeft: '48px', paddingRight: '48px' }}>
        <div className="flex justify-between items-start">
          
          {/* Left Navigation Links */}
          <div className="flex items-start" style={{ gap: '48px' }}>
            {['Home', 'Services', 'Portfolio', 'Contact'].map((link, index) => (
              <a 
                key={link} 
                href={`#${link.toLowerCase()}`}
                className="relative font-sans uppercase transition-colors duration-300 text-[#4a6b8c] hover:text-[#2a4a6c]"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.25em',
                  fontWeight: 400,
                }}
              >
                {link}
                {/* Active underline — Montfort style: thin line below with gap */}
                {index === 0 && (
                  <span 
                    className="absolute left-0 bg-[#4a6b8c]"
                    style={{ bottom: '-12px', width: '100%', height: '1px' }}
                  />
                )}
              </a>
            ))}
          </div>

          {/* Right Navigation (News, Badge, Menu, Dots) */}
          <div className="flex items-center" style={{ gap: '20px' }}>
            <span 
              className="font-sans uppercase text-[#7a9ab5] hover:text-[#4a6b8c] cursor-pointer transition-colors"
              style={{ fontSize: '11px', letterSpacing: '0.25em', fontWeight: 400 }}
            >
              News
            </span>
            {/* Filled badge circle with number */}
            <div 
              className="rounded-full flex items-center justify-center bg-[#4a6b8c] text-white font-sans"
              style={{ width: '22px', height: '22px', fontSize: '9px', fontWeight: 500 }}
            >
              18
            </div>
            <span 
              className="font-sans uppercase text-[#7a9ab5] hover:text-[#4a6b8c] cursor-pointer transition-colors"
              style={{ fontSize: '11px', letterSpacing: '0.25em', fontWeight: 400 }}
            >
              Menu
            </span>
            {/* Two dots */}
            <div className="flex" style={{ gap: '4px', marginLeft: '4px' }}>
              <div className="rounded-full bg-[#7a9ab5]" style={{ width: '4px', height: '4px' }}></div>
              <div className="rounded-full bg-[#7a9ab5]" style={{ width: '4px', height: '4px' }}></div>
            </div>
          </div>
        </div>
      </nav>

      {/* --- 2. R3F CANVAS (No fog, no clouds) --- */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <Canvas camera={{ position: [0, 5, 50], fov: 55 }}>
          {/* Clean, bright lighting */}
          <ambientLight intensity={0.8} color="#ffffff" />
          <directionalLight position={[30, 40, 20]} intensity={2.0} color="#fff8f0" />
          <directionalLight position={[-20, 10, 30]} intensity={0.5} color="#d0e0f0" />
          
          {/* GLB Mountain Model */}
          <Suspense fallback={null}>
            <MountainModel />
          </Suspense>
          
          <CameraRig />
        </Canvas>
      </div>

      {/* --- 3. LOGO & TEXT OVERLAY (Fades out on scroll) --- */}
      <div 
        ref={fadeOutRef}
        className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
      >
        {/* Center-left Logo Lockup — Montfort positions this at roughly 40-45% from top */}
        <div 
          className="absolute flex items-center"
          style={{ top: '45%', left: '48px', transform: 'translateY(-50%)', gap: '24px' }}
        >
          {/* Geometric 'A' mark */}
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4a6b8c" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
            <path d="M2 20h20L12 4z" />
            <circle cx="12" cy="14" r="1.5" fill="#4a6b8c" opacity="0.4" />
            <circle cx="12" cy="8" r="1" fill="#4a6b8c" />
            <circle cx="7" cy="17" r="1" fill="#4a6b8c" />
            <circle cx="17" cy="17" r="1" fill="#4a6b8c" />
          </svg>
          {/* Vertical Separator */}
          <div style={{ width: '1px', height: '44px', backgroundColor: '#a0b8cc' }}></div>
          {/* Brand Name */}
          <h1 
            className="font-extralight uppercase text-[#4a6b8c]"
            style={{ fontSize: '52px', letterSpacing: '0.45em' }}
          >
            Apex
          </h1>
        </div>

        {/* Bottom Left — "SCROLL DOWN TO DISCOVER" */}
        <p 
          className="absolute font-light uppercase text-[#7a9ab5]"
          style={{ bottom: '42px', left: '48px', fontSize: '10px', letterSpacing: '0.3em' }}
        >
          Scroll down to discover
        </p>

        {/* Bottom Right — Thin line indicator */}
        <div 
          className="absolute bg-[#a0b8cc]"
          style={{ bottom: '48px', right: '48px', width: '32px', height: '1px' }}
        ></div>
      </div>
    </div>
  );
}

// Preload the GLB model
useGLTF.preload('/moon_-_hansteen__billy_craters.glb');
