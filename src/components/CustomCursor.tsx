"use client";

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!cursorRef.current || !dotRef.current) return;

    // Center the cursor elements
    gsap.set(cursorRef.current, { xPercent: -50, yPercent: -50 });
    gsap.set(dotRef.current, { xPercent: -50, yPercent: -50 });

    // Create quickTo functions for high performance mapping
    const xToCursor = gsap.quickTo(cursorRef.current, "x", { duration: 0.6, ease: "power3.out" });
    const yToCursor = gsap.quickTo(cursorRef.current, "y", { duration: 0.6, ease: "power3.out" });
    
    const xToDot = gsap.quickTo(dotRef.current, "x", { duration: 0.1, ease: "power3.out" });
    const yToDot = gsap.quickTo(dotRef.current, "y", { duration: 0.1, ease: "power3.out" });

    const moveCursor = (e: MouseEvent) => {
      if (!isVisible) setIsVisible(true);
      xToCursor(e.clientX);
      yToCursor(e.clientY);
      xToDot(e.clientX);
      yToDot(e.clientY);
    };

    window.addEventListener('mousemove', moveCursor);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
    };
  }, [isVisible]);

  return (
    <>
      {/* The trailing outer circle */}
      <div 
        ref={cursorRef} 
        className={`fixed top-0 left-0 w-8 h-8 border border-zinc-400 rounded-full pointer-events-none z-[9999] mix-blend-difference transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* The precise inner dot */}
      <div 
        ref={dotRef} 
        className={`fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[10000] mix-blend-difference transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}
