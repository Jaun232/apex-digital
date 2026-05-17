"use client";

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroSection from '../components/HeroSection';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Home() {
  const servicesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!servicesRef.current) return;

    // 2. TIMED TRANSITION HOOK (GSAP & TAILWIND)
    const elements = servicesRef.current.querySelectorAll('.service-item');
    
    const ctx = gsap.context(() => {
      gsap.fromTo(elements, 
        { 
          y: 20, 
          opacity: 0 
        },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: "power2.out",
          duration: 1,
          scrollTrigger: {
            trigger: servicesRef.current,
            start: "top 85%", // Trigger when section hits 85% of viewport
            toggleActions: "play none none reverse"
          }
        }
      );
    }, servicesRef); // Scoped to servicesRef

    return () => {
      ctx.revert(); // Clean up animations safely
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#030305] text-white overflow-hidden">
      {/* 1. DOM FLOW & SCROLL RUNWAY */}
      {/* 
        HeroSection remains anchored at the absolute top of the viewport.
        Its internal GSAP ScrollTrigger pins the container for a 2500px runway.
      */}
      <HeroSection />

      {/* 
        Immediately following the pinned 2500px hero container runway, 
        append a new semantic section layer.
      */}
      <section 
        id="services-grid"
        ref={servicesRef}
        className="w-full relative z-20 py-32 px-8 bg-gradient-to-b from-[#030305] via-[#050508] to-[#020204]"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 border-t border-white/10 pt-24">
          
          {/* 3. CONTENT INITIALIZATION */}
          
          {/* Service Item 01 */}
          <div className="service-item flex flex-col gap-6">
            <h3 className="tracking-[0.3em] font-sans text-zinc-400 text-sm uppercase">
              01 // EMERGENCE PLATFORMS
            </h3>
            <p className="text-white/50 font-light leading-relaxed text-sm">
              Web Architecture &amp; Next.js SaaS setups. We forge scalable, lightning-fast digital environments designed for massive parallel engagement.
            </p>
          </div>

          {/* Service Item 02 */}
          <div className="service-item flex flex-col gap-6">
            <h3 className="tracking-[0.3em] font-sans text-zinc-400 text-sm uppercase">
              02 // SYNAPSE ENGINE
            </h3>
            <p className="text-white/50 font-light leading-relaxed text-sm">
              Automated Data Systems &amp; Tool Optimization. Bridging operational gaps with intelligent systems that learn and adapt in real-time.
            </p>
          </div>

          {/* Service Item 03 */}
          <div className="service-item flex flex-col gap-6">
            <h3 className="tracking-[0.3em] font-sans text-zinc-400 text-sm uppercase">
              03 // EXPERIENTIAL LABS
            </h3>
            <p className="text-white/50 font-light leading-relaxed text-sm">
              Interactive Interfaces &amp; Premium Frontends. Pushing the boundaries of web GL and dynamic motion to create unforgettable experiences.
            </p>
          </div>

        </div>
      </section>
    </main>
  );
}
