import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, Globe } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { loginSchema, LoginFormData } from '@/lib/validations/auth';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormData) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) {
        console.error('Login error details:', error);
        toast.error(error.message);
        return;
      }

      if (data.user && data.session) {
        // Update Zustand store with REAL Supabase data
        setAuth(data.user, data.session);
        toast.success('Welcome back!');
        
        const pendingInvite = localStorage.getItem('travelmate-pending-invite');
        if (pendingInvite) {
          navigate(`/join/${pendingInvite}`);
        } else {
          navigate('/dashboard');
        }
      } else {
        toast.error('Login failed — no session returned');
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      toast.error(error?.message || 'Invalid login credentials');
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
              <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome Back, TravelMate</h1>
              <p className="text-gray-400 text-xs">Log in to access your adventure profiles.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="Email Address"
                    className="w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner"
                  />
                </div>

                <div className="space-y-1">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      className="w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-12 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <Link to="/forgot-password" className="text-[10px] text-gray-400 hover:text-primary hover:underline transition-colors">
                      Forgot Password?
                    </Link>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#7f5539]/50 hover:bg-[#7f5539]/70 text-white font-semibold py-4 rounded-2xl shadow-xl shadow-[#7f5539]/20 transition-all hover:scale-[1.05] active:scale-[0.98] mt-2 uppercase tracking-widest disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : 'Log In'}
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
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline">Sign Up</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
