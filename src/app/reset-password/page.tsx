'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { FloatingElementsLazy } from '@/components/auth/floating-elements-lazy';
import { Lock, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
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
      
      // Redirect to login after successful password update
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main id="main-content" className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-background" />

      {/* Floating decorative elements */}
      <FloatingElementsLazy />

      {/* Content */}
      <div className="w-full max-w-md relative z-10 px-4">
        <div className="relative bg-card border border-border/60 rounded-3xl p-8 shadow-2xl overflow-hidden">
          <div className="mb-8 text-center">
            <h2 className="font-syne font-bold text-2xl text-foreground mb-2">
              RESET PASSWORD
            </h2>
            <p className="text-foreground/60 font-outfit font-light">
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
                  <Lock className="h-4 w-4 text-foreground/40" />
                  <input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-white placeholder-foreground/60 font-outfit focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1 font-outfit ml-1">{errors.password}</p>}
            </div>

            {/* Confirm Password Input */}
            <div className="w-full mb-4 min-w-0">
              <label className="block text-rookie-pink text-xs font-outfit uppercase tracking-widest mb-1.5 ml-1">
                Confirm Password
              </label>
              <div className="w-full min-w-0">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-foreground/40" />
                  <input
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-white placeholder-foreground/60 font-outfit focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
                  />
                </div>
              </div>
              {errors.confirmPassword && <p className="text-destructive text-xs mt-1 font-outfit ml-1">{errors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-syne font-bold tracking-wide transition-colors duration-300 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  RESET PASSWORD
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => router.push('/login')}
              type="button"
              className="text-foreground/40 hover:text-white transition-colors font-outfit text-sm"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
