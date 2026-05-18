"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import CosmicSky from './CosmicSky';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Global scroll state to pass data between GSAP and R3F
const scrollData = { progress: 0 };
const HDR_ENV_FILE = process.env.NEXT_PUBLIC_HDR_ENV_FILE ?? '/env/envmap-min.exr';
const ROCKET_POINT: [number, number, number] = [0.2, -2, 3.3];
const MODEL_FILE = '/rocket.glb';

function GroundPlane() {
  const moonGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(240, 240, 280, 280);
    const position = geometry.attributes.position as THREE.BufferAttribute;

    const randomAt = (seed: number) => {
      const value = Math.sin(seed * 12.9898) * 43758.5453123;
      return value - Math.floor(value);
    };

    const craters = Array.from({ length: 52 }, (_, i) => ({
      x: (randomAt(i * 1.7 + 0.3) * 2 - 1) * 108,
      y: (randomAt(i * 2.1 + 4.8) * 2 - 1) * 108,
      radius: THREE.MathUtils.lerp(2.2, 15.5, randomAt(i * 3.9 + 11.7)),
      depth: THREE.MathUtils.lerp(0.08, 0.7, randomAt(i * 5.2 + 1.1)),
      rim: THREE.MathUtils.lerp(0.05, 0.38, randomAt(i * 4.4 + 8.5)),
    }));

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);

      // Low-frequency terrain variation for a lunar regolith feel.
      let height =
        Math.sin(x * 0.05) * Math.cos(y * 0.053) * 0.11 +
        Math.sin((x + y) * 0.12) * 0.035 +
        Math.cos((x - y) * 0.095) * 0.028;

      for (const crater of craters) {
        const dx = x - crater.x;
        const dy = y - crater.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const t = d / crater.radius;

        if (t < 1.45) {
          const bowl = -Math.exp(-(t * t) * 2.75) * crater.depth;
          const rim = Math.exp(-Math.pow((t - 1.04) * 4.1, 2)) * crater.rim;
          height += bowl + rim;
        }
      }

      position.setZ(i, height);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} geometry={moonGeometry}>
      <meshStandardMaterial
        color="#6e7285"
        roughness={0.96}
        metalness={0.04}
        emissive="#151b29"
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}



function CameraRig() {
  useFrame((state) => {
    // Straight low-angle framing: camera starts just above the terrain.
    const targetX = state.pointer.x * 0.4;
    const targetY = THREE.MathUtils.lerp(-1.35, 1.9, scrollData.progress) + state.pointer.y * 0.28;
    const targetZ = THREE.MathUtils.lerp(4.6, -50, scrollData.progress);

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.05);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.1);

    // Lock opening gaze near the rocket, then transition to travel framing.
    const lookX =
      THREE.MathUtils.lerp(ROCKET_POINT[0], 0, scrollData.progress) + state.pointer.x * 0.1;
    const lookY = THREE.MathUtils.lerp(-1.45, 0, scrollData.progress) + state.pointer.y * 0.08;
    const lookZ = THREE.MathUtils.lerp(ROCKET_POINT[2], -70, scrollData.progress);
    state.camera.lookAt(lookX, lookY, lookZ);
  });
  return null;
}

function RocketModel() {
  const { scene } = useGLTF(MODEL_FILE);
  const rocket = useMemo(() => scene.clone(true), [scene]);
  const { scaleFactor, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(rocket);
    const size = new THREE.Vector3();
    box.getSize(size);

    const targetHeight = 4.2;
    const scaleFactor = size.y > 0 ? targetHeight / size.y : 1;
    const yOffset = -box.min.y * scaleFactor;
    return { scaleFactor, yOffset };
  }, [rocket]);

  useEffect(() => {
    rocket.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
  }, [rocket]);

  return (
    <group position={[ROCKET_POINT[0], ROCKET_POINT[1], ROCKET_POINT[2]]} rotation={[0, -0.16, 0]}>
      <primitive object={rocket} scale={scaleFactor} position={[0, yOffset, 0]} />
    </group>
  );
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeOutRef = useRef<HTMLDivElement>(null);
  const { active: assetsLoading, progress: loadProgress } = useProgress();
  const [showLoader, setShowLoader] = useState(true);
  const [readyHandled, setReadyHandled] = useState(false);

  useEffect(() => {
    if (readyHandled) return;
    if (!assetsLoading && loadProgress >= 100) {
      const timer = window.setTimeout(() => {
        setShowLoader(false);
        setReadyHandled(true);
      }, 260);
      return () => window.clearTimeout(timer);
    }
  }, [assetsLoading, loadProgress, readyHandled]);

  useEffect(() => {
    if (!containerRef.current || !fadeOutRef.current) return;

    // Reset progress on mount to prevent stale state across HMR
    scrollData.progress = 0;

    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // standard easeOutExpo
      smoothWheel: true,
    });

    // Synchronize Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Synchronize the GSAP ticker with Lenis so they render on the exact same frame
    const gsapTicker = (time: number) => {
      lenis.raf(time * 1000); // convert seconds to milliseconds
    };
    gsap.ticker.add(gsapTicker);
    gsap.ticker.lagSmoothing(0);

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
      gsap.ticker.remove(gsapTicker);
      lenis.destroy();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-[#030305]">
      
      {/* --- 1. GLOBAL NAVIGATION WRAPPER --- */}
      <nav className="fixed top-0 left-0 w-full z-50 px-12 py-8 flex justify-end items-start mix-blend-difference pointer-events-auto">
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
        <Canvas camera={{ position: [0, -1.35, 4.6], fov: 60 }}>
          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
          
          {/* Procedural Scene */}
          <GroundPlane />
          <RocketModel />
          <CameraRig />
          
          {/* Cosmic Background */}
          <CosmicSky />
          
          {/* Environment map for reflections; override with NEXT_PUBLIC_HDR_ENV_FILE if needed */}
          <Environment files={HDR_ENV_FILE} />
        </Canvas>
      </div>
      {/* ----------------------- */}

      {showLoader && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#04060f]/72 backdrop-blur-[2px] pointer-events-none">
          <div className="flex flex-col items-center gap-5">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border border-[#71d8ff]/35" />
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#6fd5ff] border-r-[#9d7eff] animate-spin" />
              <div className="absolute inset-[34%] rounded-full bg-[#8d67ff]/55 animate-pulse" />
            </div>
            <p className="text-[0.62rem] tracking-[0.28em] uppercase text-[#d8e7ff]/85">
              Initializing Scene {Math.round(loadProgress)}%
            </p>
          </div>
        </div>
      )}

      {/* --- 3. MIDDLE LEFT LOGO & BOTTOM LEFT TEXT (Fades out on scroll) --- */}
      <div 
        ref={fadeOutRef}
        className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
      >
        {/* Middle Left Logo & Menu */}
        <div className="absolute top-1/2 left-12 -translate-y-1/2 flex items-center gap-8">
          <div className="flex flex-col gap-6">
            {/* Left Menu positioned above APEX */}
            <div className="flex gap-6">
              {['Home', 'Services', 'Portfolio', 'Contact'].map((link, index) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  className={`tracking-[0.2em] text-[0.65rem] font-sans uppercase transition-colors duration-300 ${index === 0 ? 'text-white border-b border-[#4a00ff]' : 'text-zinc-500 hover:text-white'}`}
                >
                  {link}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-8">
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
          </div>
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

useGLTF.preload(MODEL_FILE);
