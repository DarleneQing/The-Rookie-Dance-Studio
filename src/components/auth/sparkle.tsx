import React from 'react';

interface SparkleProps {
  className?: string;
  color?: string;
  size?: number;
  delay?: string;
}

export const Sparkle: React.FC<SparkleProps> = ({ 
  className = "", 
  color = "white", 
  size = 24,
  delay = "0s"
}) => {
  return (
    <div 
      className={`absolute ${className} animate-pulse-fast`}
      style={{ 
        width: size, 
        height: size,
        animationDelay: delay
      }}
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
        {/* The 4-pointed star shape similar to the poster */}
        <path 
          d="M50 0C50 0 60 40 100 50C60 50 50 100 50 100C50 100 40 60 0 50C40 50 50 0 50 0Z" 
          fill={color}
          className="opacity-90"
        />
        {/* Inner glow/highlight */}
        <path 
          d="M50 20C50 20 55 45 80 50C55 50 50 80 50 80C50 80 45 55 20 50C45 50 50 20 50 20Z" 
          fill="white"
          fillOpacity="0.5"
        />
      </svg>
    </div>
  );
};

