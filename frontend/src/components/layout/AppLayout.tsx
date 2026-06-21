import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Home, Bell, DollarSign, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isExpanded: boolean;
  isActive: boolean;
}

const NavItem = ({ icon: Icon, label, href, isExpanded, isActive, profile }: NavItemProps & { profile?: any }) => (
  <Link to={href} className="block group">
    <div className={cn(
      "flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden",
      isActive 
        ? "bg-[#7f5539]/50 text-white shadow-xl shadow-[#7f5539]/30" 
        : "text-white/60 hover:text-white hover:bg-white/10 active:scale-95"
    )}>
      {isActive && (
        <motion.div
          layoutId="nav-active"
          className="absolute inset-0 bg-white/10 z-0"
        />
      )}
      {label === 'Profile' ? (
        <Avatar
          name={profile?.name}
          avatarUrl={profile?.avatar_url || null}
          size="sm"
          isCurrentUser
          className="h-6 w-6 shrink-0"
        />
      ) : (
        <Icon className="h-6 w-6 shrink-0" />
      )}
      <AnimatePresence>
        {isExpanded && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="font-semibold whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  </Link>
);

interface AppLayoutProps {
  children: React.ReactNode;
  isFullScreen?: boolean;
}

export const AppLayout = ({ children, isFullScreen = false }: AppLayoutProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { data: profile } = useCurrentProfile();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const navItems = [
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Home, label: 'Home', href: '/dashboard' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: DollarSign, label: 'Expense Summary', href: '/expenses' },
  ];

  return (
    <div className="relative min-h-screen w-full font-sans antialiased overflow-x-hidden no-scrollbar">
      {/* Aesthetic Background */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://i.pinimg.com/1200x/09/de/1b/09de1b2bfd860b48b0792ef7cbdb1550.jpg" 
          alt="Desert Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[0px]" />
      </div>

      {/* Sidebar Navbar */}
      <nav 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="fixed left-6 top-1/2 -translate-y-1/2 z-50 flex items-center"
      >
        <motion.div
          animate={{ width: isExpanded ? 240 : 72 }}
          className={cn(
            "bg-white/10 backdrop-blur-[15px] border border-white/20 shadow-2xl rounded-[32px] p-3 flex flex-col gap-2 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          )}
        >
          {navItems.map((item) => (
            <NavItem 
              key={item.label}
              {...item}
              isExpanded={isExpanded}
              isActive={location.pathname === item.href}
              profile={profile}
            />
          ))}

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="block w-full group outline-none"
          >
            <div className={cn(
              "flex items-center gap-4 px-3 py-3 rounded-2xl transition-all duration-300 relative overflow-hidden",
              "text-white/60 hover:text-white hover:bg-red-500/10 active:scale-95"
            )}>
              <LogOut className="h-6 w-6 shrink-0" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-semibold whitespace-nowrap overflow-hidden"
                  >
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </button>
        </motion.div>
      </nav>

      {/* Main Content */}
      <main className={cn(
        "relative z-10 w-full min-h-screen",
        isFullScreen ? "p-0 overflow-hidden" : "flex items-center justify-center p-6"
      )}>
        {children}
      </main>
    </div>
  );
};
