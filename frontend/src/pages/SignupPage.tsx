import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { User, Mail, Lock, CheckCircle, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { signupSchema, SignupFormData } from '@/lib/validations/auth';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (values: SignupFormData) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            name: values.fullName,
          }
        }
      });

      if (error) {
        console.error('Signup error details:', error);
        toast.error(error.message);
        return;
      }

      if (data.user && data.session) {
        setAuth(data.user, data.session);
        toast.success('Account created! Welcome to TravelMate.');
        
        // Check for a pending invite code saved before signup
        const pendingInvite = localStorage.getItem('travelmate-pending-invite');
        if (pendingInvite) {
          // Redirect through the join page so the invite is processed
          navigate(`/join/${pendingInvite}`);
        } else {
          navigate('/dashboard');
        }
      } else if (data.user && !data.session) {
        // Email confirmation is required — keep the pending invite for after they confirm
        toast.success('Check your email to confirm your account.');
        navigate('/login');
      } else {
        toast.error('Signup failed unexpectedly');
      }
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      toast.error(error?.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6">
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Background image — same as AppLayout but no sidebar */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://i.pinimg.com/1200x/09/de/1b/09de1b2bfd860b48b0792ef7cbdb1550.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Dark Glassmorphic Card */}
          <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] p-8 text-white min-h-[580px] flex flex-col justify-between">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to TravelMate</h1>
              <p className="text-gray-400 text-xs">Create your adventure profile.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      {...register('fullName')}
                      placeholder="Full Name"
                      className={cn(
                        "w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner",
                        errors.fullName && "border-red-500/50"
                      )}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-[10px] text-red-400 mt-1 ml-2">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="Email Address"
                      className={cn(
                        "w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner",
                        errors.email && "border-red-500/50"
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] text-red-400 mt-1 ml-2">{errors.email.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input
                        {...register('password')}
                        type="password"
                        placeholder="Password"
                        className={cn(
                          "w-full !bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-3 text-xs text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner",
                          errors.password && "border-red-500/50"
                        )}
                      />
                    </div>
                    {errors.password && (
                      <p className="text-[10px] text-red-400 mt-1 ml-2 leading-tight">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="relative group">
                      <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                      <input
                        {...register('confirmPassword')}
                        type="password"
                        placeholder="Confirm Password"
                        className={cn(
                          "w-full !bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-3 text-xs text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner",
                          errors.confirmPassword && "border-red-500/50"
                        )}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[10px] text-red-400 mt-1 ml-2 leading-tight">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#7f5539]/50 hover:bg-[#7f5539]/70 text-white font-semibold py-4 rounded-2xl shadow-xl shadow-[#7f5539]/20 transition-all hover:scale-[1.05] active:scale-[0.98] mt-2 uppercase tracking-widest disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'SIGN UP'}
              </button>
            </form>

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] text-gray-500 uppercase tracking-tighter shrink-0">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-3 transition-all">
                <Globe className="h-5 w-5" />
                <span className="text-sm font-medium">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-3 transition-all">
                <span className="text-lg"></span>
                <span className="text-sm font-medium">Apple</span>
              </button>
            </div>

            <p className="text-center text-gray-500 text-sm mt-8">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">Log In</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
