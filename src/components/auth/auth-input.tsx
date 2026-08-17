import React, { useId } from 'react';

import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, error, className = "", ...props }) => {
  // Associate the label with the input (WCAG 1.3.1 / 4.1.2)
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <div className={`w-full mb-4 ${className}`}>
      <label
        htmlFor={inputId}
        className="block text-rookie-pink text-xs font-outfit uppercase tracking-widest mb-1.5 ml-1"
      >
        {label}
      </label>
      <div className="relative group min-w-0">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rookie-purple group-focus-within:text-white transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          id={inputId}
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full min-w-0 bg-white/5 border border-white/10 rounded-xl py-3 
            ${Icon ? 'pl-10' : 'pl-4'} pr-4 
            text-foreground placeholder-foreground/60 font-outfit
            focus:outline-none focus:border-rookie-purple/60 focus:bg-white/10 focus:ring-2 focus:ring-ring
            transition-colors duration-200
          `}
        />
      </div>
      {error && (
        <p id={errorId} className="text-destructive text-xs mt-1 font-outfit ml-1">
          {error}
        </p>
      )}
    </div>
  );
};

