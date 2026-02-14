'use client'

import React, { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { AuthMode, FormErrors } from '@/types/auth';
import { login, signup, resetPassword } from '@/app/auth/actions';
import { Input } from './auth-input';
import { Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

const initialState = {
  message: undefined as string | undefined,
  error: undefined as string | undefined,
};

function SubmitButton({ mode, isLoading }: { mode: AuthMode; isLoading: boolean }) {
  const { pending } = useFormStatus();
  const isSubmitting = pending || isLoading;

  const getButtonText = () => {
    if (mode === AuthMode.LOGIN) return 'LOGIN';
    if (mode === AuthMode.REGISTER) return 'REGISTER';
    if (mode === AuthMode.FORGOT_PASSWORD) return 'SEND RESET LINK';
    return 'SUBMIT';
  };

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
          {getButtonText()}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </>
      )}
    </button>
  );
}

interface AuthFormProps {
  initialMode?: AuthMode;
  callbackUrl?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = AuthMode.LOGIN, callbackUrl }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    dob: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Wrapper for login to match useFormState signature
  const loginWithState = async (prevState: unknown, formData: FormData) => {
    return await login(formData);
  };

  const [loginState, loginAction] = useFormState(loginWithState, initialState);
  const [signupState, signupAction] = useFormState(signup, initialState);
  const [resetPasswordState, resetPasswordAction] = useFormState(resetPassword, initialState);

  const currentState = mode === AuthMode.LOGIN ? loginState : mode === AuthMode.REGISTER ? signupState : resetPasswordState;
  const currentAction = mode === AuthMode.LOGIN ? loginAction : mode === AuthMode.REGISTER ? signupAction : resetPasswordAction;

  useEffect(() => {
    if (currentState?.error) {
      toast.error(currentState.error);
      setIsLoading(false);
    }
    if (currentState?.message) {
      toast.success(currentState.message);
      setIsLoading(false);
    }
  }, [currentState]);

  const toggleMode = () => {
    setMode(prev => prev === AuthMode.LOGIN ? AuthMode.REGISTER : AuthMode.LOGIN);
    setErrors({});
    setFormData({ email: '', full_name: '', password: '', confirmPassword: '', dob: '' });
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = "Invalid email address"
    }
    
    if (mode === AuthMode.FORGOT_PASSWORD) {
      // Only email validation needed for forgot password
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }
    
    if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    if (mode === AuthMode.REGISTER) {
      if (!formData.full_name) newErrors.full_name = "Full name is required";
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
      if (!formData.dob) {
        newErrors.dob = "Date of birth is required";
      } else {
        const dobDate = new Date(formData.dob);
        if (Number.isNaN(dobDate.getTime())) {
          newErrors.dob = "Please enter a valid date";
        }
      }
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
    
    if (mode === AuthMode.FORGOT_PASSWORD) {
      // Only email needed for password reset
      currentAction(formDataToSubmit);
      return;
    }
    
    formDataToSubmit.append('password', formData.password);
    if (mode === AuthMode.REGISTER) {
      formDataToSubmit.append('full_name', formData.full_name);
      formDataToSubmit.append('dob', formData.dob);
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
                    {mode === AuthMode.LOGIN ? 'WELCOME BACK' : mode === AuthMode.REGISTER ? 'JOIN AS MEMBER' : 'RESET PASSWORD'}
                </h2>
                <p className="text-white/60 font-outfit font-light">
                    {mode === AuthMode.LOGIN ? 'Ready to dance?' : mode === AuthMode.REGISTER ? 'Start your journey with The Rookie Dance Studio' : 'Enter your email to receive a password reset link'}
                </p>
            </div>
            <form onSubmit={handleSubmit}>
                {callbackUrl && (
                  <input type="hidden" name="callbackUrl" value={callbackUrl} />
                )}
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

                {mode === AuthMode.REGISTER && (
                    <div className="w-full mb-4 min-w-0">
                        <label className="block text-rookie-pink text-xs font-outfit uppercase tracking-widest mb-1.5 ml-1">
                            Date of Birth
                        </label>
                        <div className="w-full min-w-0">
                            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                                <input
                                    name="dob"
                                    type="date"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    className="w-full min-w-0 border-0 bg-transparent p-0 text-white placeholder-white/30 font-outfit focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                            </div>
                        </div>
                        {errors.dob && <p className="text-red-400 text-xs mt-1 font-outfit ml-1">{errors.dob}</p>}
                    </div>
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

                {mode !== AuthMode.FORGOT_PASSWORD && (
                    <>
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
                        {mode === AuthMode.LOGIN && (
                            <div className="flex justify-end mt-2 mb-2">
                                <button 
                                    onClick={() => {
                                        setMode(AuthMode.FORGOT_PASSWORD);
                                        setErrors({});
                                    }}
                                    type="button"
                                    className="text-rookie-blue hover:text-white transition-colors font-outfit text-sm"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}
                    </>
                )}

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
                {mode === AuthMode.FORGOT_PASSWORD ? (
                    <p className="text-white/40 font-outfit text-sm">
                        Remember your password?
                        <button 
                            onClick={() => {
                                setMode(AuthMode.LOGIN);
                                setErrors({});
                            }}
                            type="button"
                            className="ml-2 text-rookie-blue hover:text-white transition-colors font-semibold border-b border-transparent hover:border-white"
                        >
                            Log In
                        </button>
                    </p>
                ) : (
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
                )}
            </div>
        </div>
    </div>
  );
};

