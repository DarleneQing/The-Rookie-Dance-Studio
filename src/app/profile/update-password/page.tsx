'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { FloatingElements } from '@/components/auth/floating-elements';
import { Lock, ArrowRight } from 'lucide-react';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};
    
    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      toast.success('Password updated successfully!');
      
      // Redirect to profile after successful password update
      setTimeout(() => {
        router.push('/profile');
      }, 1000);
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-black" />

      {/* Floating decorative elements */}
      <FloatingElements />

      {/* Content */}
      <div className="w-full max-w-md relative z-10 px-4">
        {/* Glow behind form */}
        <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
        
        <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-8 shadow-2xl overflow-hidden">
          {/* Glossy highlight effect on top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
          
          <div className="mb-8 text-center">
            <h2 className="font-syne font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-2">
              UPDATE PASSWORD
            </h2>
            <p className="text-white/60 font-outfit font-light">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* New Password Input */}
            <div className="w-full mb-4 min-w-0">
              <label className="block text-rookie-pink text-xs font-outfit uppercase tracking-widest mb-1.5 ml-1">
                New Password
              </label>
              <div className="w-full min-w-0">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-white/40" />
                  <input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-white placeholder-white/30 font-outfit focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1 font-outfit ml-1">{errors.password}</p>}
            </div>

            {/* Confirm Password Input */}
            <div className="w-full mb-4 min-w-0">
              <label className="block text-rookie-pink text-xs font-outfit uppercase tracking-widest mb-1.5 ml-1">
                Confirm Password
              </label>
              <div className="w-full min-w-0">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-white/40" />
                  <input
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-white placeholder-white/30 font-outfit focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1 font-outfit ml-1">{errors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 h-12 bg-gradient-to-r from-rookie-purple to-indigo-600 hover:from-rookie-pink hover:to-rookie-purple rounded-xl font-syne font-bold text-white tracking-wide shadow-lg shadow-rookie-purple/30 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  UPDATE PASSWORD
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => router.push('/login')}
              type="button"
              className="text-white/40 hover:text-white transition-colors font-outfit text-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
