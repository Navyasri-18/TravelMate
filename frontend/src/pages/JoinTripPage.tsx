import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useJoinTrip } from '@/hooks/useJoinTrip';

const PENDING_INVITE_KEY = 'travelmate-pending-invite';

export default function JoinTripPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasProcessedRef = useRef(false);

  const joinMutation = useJoinTrip({
    onSuccess: (tripId) => {
      localStorage.removeItem(PENDING_INVITE_KEY);
      navigate(`/trip/${tripId}/chat`, { replace: true });
    },
  });

  useEffect(() => {
    // Guard against double-execution from React StrictMode
    if (hasProcessedRef.current) return;
    
    if (!code) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (!isAuthenticated) {
      // Save the code and send the user to signup
      localStorage.setItem(PENDING_INVITE_KEY, code);
      navigate('/signup', { replace: true });
      return;
    }

    // User is authenticated — process the invite immediately
    hasProcessedRef.current = true;
    joinMutation.mutate(code);
  }, [code, isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6">
      <div className="fixed inset-0 z-0">
        <img
          src="https://i.pinimg.com/1200x/09/de/1b/09de1b2bfd860b48b0792ef7cbdb1550.jpg"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[40px] p-12 max-w-md w-full text-center text-white"
      >
        {joinMutation.isError ? (
          <>
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Couldn't join trip</h1>
            <p className="text-white/60 text-sm mb-6">
              The invite code may be invalid, expired, or you may already be a member.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-[#a98467] hover:bg-[#8c6f55] text-white px-8 py-3 rounded-full font-bold text-sm uppercase tracking-widest transition-all hover:scale-105"
            >
              Go to Dashboard
            </button>
          </>
        ) : (
          <>
            <Loader2 className="h-12 w-12 text-[#a98467] mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Joining your trip...</h1>
            <p className="text-white/60 text-sm">Hang tight while we set things up.</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
