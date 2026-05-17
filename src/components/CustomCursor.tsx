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
      {/* The trailing outer circle with 2 inner dots */}
      <div 
        ref={cursorRef} 
        className={`fixed top-0 left-0 w-12 h-12 border border-[#4a6b8c] rounded-full pointer-events-none z-[9999] transition-opacity duration-300 flex items-center justify-center ${isVisible ? 'opacity-60' : 'opacity-0'}`}
      >
        <div className="absolute w-1 h-1 bg-[#4a6b8c] rounded-full top-3 right-3"></div>
        <div className="absolute w-1 h-1 bg-[#4a6b8c] rounded-full bottom-3 left-3"></div>
      </div>
      
      {/* The precise inner dot */}
      <div 
        ref={dotRef} 
        className={`fixed top-0 left-0 w-1.5 h-1.5 bg-[#4a6b8c] rounded-full pointer-events-none z-[10000] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}
