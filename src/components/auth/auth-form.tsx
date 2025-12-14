'use client'

import React, { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { AuthMode, FormErrors } from '@/types/auth';
import { login, signup } from '@/app/auth/actions';
import { Input } from './auth-input';
import { Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

const initialState = {
  message: '',
  error: '',
};

function SubmitButton({ mode, isLoading }: { mode: AuthMode; isLoading: boolean }) {
  const { pending } = useFormStatus();
  const isSubmitting = pending || isLoading;

  return (
    <button 
      type="submit"
      disabled={isSubmitting}
      className="w-full mt-4 h-12 bg-gradient-to-r from-rookie-purple to-indigo-600 hover:from-rookie-pink hover:to-rookie-purple rounded-xl font-syne font-bold text-white tracking-wide shadow-lg shadow-rookie-purple/30 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 group"
    >
      {isSubmitting ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {mode === AuthMode.LOGIN ? 'LOGIN' : 'REGISTER'}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  );
}

interface AuthFormProps {
  initialMode?: AuthMode;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = AuthMode.LOGIN }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Wrapper for login to match useFormState signature
  const loginWithState = async (prevState: unknown, formData: FormData) => {
    return await login(formData);
  };

  const [loginState, loginAction] = useFormState(loginWithState, initialState);
  const [signupState, signupAction] = useFormState(signup, initialState);

  const currentState = mode === AuthMode.LOGIN ? loginState : signupState;
  const currentAction = mode === AuthMode.LOGIN ? loginAction : signupAction;

  useEffect(() => {
    if (currentState?.error) {
      toast.error(currentState.error);
      setIsLoading(false);
    }
  }, [currentState]);

  const toggleMode = () => {
    setMode(prev => prev === AuthMode.LOGIN ? AuthMode.REGISTER : AuthMode.LOGIN);
    setErrors({});
    setFormData({ email: '', full_name: '', password: '', confirmPassword: '' });
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email.includes('@')) newErrors.email = "Invalid email address";
    if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    if (mode === AuthMode.REGISTER) {
      if (!formData.full_name) newErrors.full_name = "Full name is required";
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    
    const formDataToSubmit = new FormData();
    formDataToSubmit.append('email', formData.email);
    formDataToSubmit.append('password', formData.password);
    if (mode === AuthMode.REGISTER) {
      formDataToSubmit.append('full_name', formData.full_name);
    }

    currentAction(formDataToSubmit);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="w-full max-w-md relative z-10">
        {/* Glow behind form */}
        <div className="absolute -inset-4 bg-gradient-to-r from-rookie-purple to-rookie-blue opacity-20 blur-2xl rounded-[30px]" />
        
        <div className="relative bg-black/40 backdrop-blur-2xl border border-white/20 rounded-[30px] p-8 shadow-2xl overflow-hidden">
            {/* Glossy highlight effect on top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
            
            <div className="mb-8 text-center">
                <h2 className="font-syne font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rookie-pink to-rookie-purple mb-2">
                    {mode === AuthMode.LOGIN ? 'WELCOME BACK' : 'JOIN AS MEMBER'}
                </h2>
                <p className="text-white/60 font-outfit font-light">
                    {mode === AuthMode.LOGIN ? 'Ready to dance?' : 'Start your journey with The Rookie Dance Studio'}
                </p>
            </div>
            <form onSubmit={handleSubmit}>
                {mode === AuthMode.REGISTER && (
                    <Input 
                        label="Full Name" 
                        name="full_name"
                        placeholder="John Doe" 
                        icon={UserIcon}
                        value={formData.full_name}
                        onChange={handleChange}
                        error={errors.full_name}
                    />
                )}
                
                <Input 
                    label="Email" 
                    name="email"
                    type="email"
                    placeholder="you@example.com" 
                    icon={Mail}
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                />

                <Input 
                    label="Password" 
                    name="password"
                    type="password"
                    placeholder="••••••••" 
                    icon={Lock}
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                />

                {mode === AuthMode.REGISTER && (
                    <Input 
                        label="Confirm Password" 
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••" 
                        icon={Lock}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        error={errors.confirmPassword}
                    />
                )}

                <SubmitButton mode={mode} isLoading={isLoading} />
            </form>

            <div className="mt-6 text-center">
                <p className="text-white/40 font-outfit text-sm">
                    {mode === AuthMode.LOGIN ? "Don't have an account?" : "Already have an account?"}
                    <button 
                        onClick={toggleMode}
                        type="button"
                        className="ml-2 text-rookie-blue hover:text-white transition-colors font-semibold border-b border-transparent hover:border-white"
                    >
                        {mode === AuthMode.LOGIN ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
            </div>
        </div>
    </div>
  );
};

