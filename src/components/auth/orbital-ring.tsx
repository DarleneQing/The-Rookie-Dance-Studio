import React from 'react';

interface OrbitalRingProps {
  size: number;
  rotation?: number;
  tilt?: number;
  color?: string;
  className?: string;
  delay?: string;
  reverse?: boolean;
}

export const OrbitalRing: React.FC<OrbitalRingProps> = ({
  size,
  rotation = 0,
  tilt = 60,
  color = "border-rookie-purple",
  className = "",
  delay = "0s",
  reverse = false
}) => {
  return (
    <div 
      className={`absolute rounded-full border-[1px] ${color} opacity-40 shadow-[0_0_15px_rgba(90,68,138,0.4)] ${reverse ? 'animate-spin-reverse-slow' : 'animate-spin-slow'} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: `rotateX(${tilt}deg) rotateZ(${rotation}deg)`,
        animationDelay: delay
      }}
    >
        {/* Decorative elements on the ring (the little metallic balls in the poster) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-rookie-cyan rounded-full shadow-[0_0_8px_cyan]" />
    </div>
  );
};

