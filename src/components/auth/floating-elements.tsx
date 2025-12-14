import React from 'react';

import { Sparkle } from './sparkle';
import { OrbitalRing } from './orbital-ring';

export const FloatingElements: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Deep background gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-900/30 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-fuchsia-900/20 blur-[100px] rounded-full mix-blend-screen" />

        {/* Orbital Rings - Mimicking the poster's central dynamic */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 perspective-[1000px]">
             {/* Large outer ring */}
            <OrbitalRing size={600} tilt={75} rotation={15} color="border-rookie-purple/30" className="border-2" />
            {/* Cross ring */}
            <OrbitalRing size={500} tilt={-60} rotation={45} delay="-5s" reverse color="border-white/20" />
            {/* Smaller inner ring */}
            <OrbitalRing size={350} tilt={20} rotation={-30} color="border-rookie-blue/40" />
        </div>

        {/* Sparkles - Placed randomly to match the scatter in poster */}
        {/* Top Left Cluster */}
        <Sparkle className="top-[15%] left-[10%]" size={60} color="#a855f7" /> 
        <Sparkle className="top-[25%] left-[5%]" size={30} color="white" delay="0.5s" />
        <Sparkle className="top-[10%] left-[25%]" size={40} color="#67e8f9" delay="1s" />

        {/* Bottom Left Cluster */}
        <Sparkle className="bottom-[20%] left-[15%]" size={80} color="#f0abfc" delay="1.5s" />
        <Sparkle className="bottom-[10%] left-[8%]" size={25} color="white" />

        {/* Right Side */}
        <Sparkle className="top-[20%] right-[15%]" size={50} color="#facc15" delay="2s" />
        <Sparkle className="bottom-[30%] right-[10%]" size={40} color="#a855f7" delay="2.5s" />

        {/* Metallic/Chrome Spheres (CSS Only) */}
        <div className="absolute top-[30%] left-[8%] w-6 h-6 rounded-full bg-gradient-to-br from-white via-slate-400 to-slate-900 shadow-lg animate-float delay-700 opacity-80" />
        <div className="absolute bottom-[25%] left-[25%] w-4 h-4 rounded-full bg-gradient-to-b from-rookie-purple via-fuchsia-500 to-indigo-900 shadow-lg animate-float delay-100 opacity-60" />
    </div>
  );
};

