import React from 'react';

import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, error, className = "", ...props }) => {
  return (
    <div className={`w-full mb-4 ${className}`}>
      <label className="block text-rookie-pink text-xs font-outfit uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative group min-w-0">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rookie-purple group-focus-within:text-white transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          {...props}
          className={`
            w-full min-w-0 bg-white/5 border border-white/10 rounded-xl py-3 
            ${Icon ? 'pl-10' : 'pl-4'} pr-4 
            text-white placeholder-white/30 font-outfit
            focus:outline-none focus:border-rookie-purple/60 focus:bg-white/10 focus:ring-1 focus:ring-rookie-purple/50
            transition-all duration-300
          `}
        />
      </div>
      {error && <p className="text-red-400 text-xs mt-1 font-outfit ml-1">{error}</p>}
    </div>
  );
};


