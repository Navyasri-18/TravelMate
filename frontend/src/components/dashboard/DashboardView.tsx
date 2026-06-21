import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Plus, UserPlus, Calendar, ArrowRight, Users } from 'lucide-react';
import { cn, formatTripDateRange } from '@/lib/utils';
import type { TripCardData } from '@/types/trip';

const TRIP_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1000&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1000&auto=format&fit=crop',
];

const getTripImage = (tripId: string): string => {
  // Hash the trip ID to a stable index
  let hash = 0;
  for (let i = 0; i < tripId.length; i++) {
    hash = (hash << 5) - hash + tripId.charCodeAt(i);
    hash |= 0;
  }
  return TRIP_FALLBACK_IMAGES[Math.abs(hash) % TRIP_FALLBACK_IMAGES.length];
};

interface TripCardProps {
  trip: TripCardData;
  variant: 'large' | 'small';
}

const TripCard = ({ trip, variant }: TripCardProps) => {
  const isLarge = variant === 'large';

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, translateY: -5 }}
      className="group cursor-pointer"
    >
      <div className={cn(
        "relative overflow-hidden rounded-[32px] shadow-lg border border-white/10",
        isLarge ? "h-[220px] md:h-[250px]" : "h-[160px]"
      )}>
        {/* Background Image */}
        <img 
          src={getTripImage(trip.id)} 
          alt={trip.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
          <div className="flex justify-between items-start">
            {isLarge && (
              <span className={cn(
                "px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase border backdrop-blur-md",
                "bg-blue-500/20 border-blue-500/50 text-blue-400"
              )}>
                {new Date(trip.start_date) > new Date() ? 'UPCOMING' : 'IN PROGRESS'}
              </span>
            )}
            <div />
          </div>

          <div>
            <h3 className={cn("font-bold tracking-tight mb-1", isLarge ? "text-xl" : "text-lg")}>
              {trip.name}
            </h3>
            <div className="flex items-center gap-3 text-white/70 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {formatTripDateRange(trip.start_date, trip.end_date)}
              </span>
              {isLarge && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {trip.memberCount} {trip.memberCount === 1 ? 'Member' : 'Members'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface DashboardViewProps {
  activeTrips: TripCardData[];
  archivedTrips: any[];
  onCreateTrip: () => void;
  onJoinTrip: () => void;
}

export const DashboardView = ({ activeTrips, archivedTrips, onCreateTrip, onJoinTrip }: DashboardViewProps) => {
  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-10 space-y-12 pb-32">
      
      {/* Top Search Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex justify-center"
      >
        <div className="relative w-full max-w-lg group">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute left-5 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
          >
            <Search className="h-4 w-4 text-white/70 group-focus-within:text-white transition-colors" />
          </motion.div>
          <input 
            type="text" 
            placeholder="Search destinations, dates..."
            className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full py-3.5 pl-12 pr-8 text-white placeholder:text-white/80 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-xl transition-all hover:scale-[1.02] text-sm"
          />
        </div>
      </motion.div>

      {/* Active Escapes Section */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Active Escapes
        </h2>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {activeTrips.map((trip) => (
            <Link key={trip.id} to={`/trip/${trip.id}/chat`}>
              <TripCard trip={trip} variant="large" />
            </Link>
          ))}
        </motion.div>
      </section>

      {/* Archive Section */}
      {archivedTrips.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-white">
            The Archive
          </h2>
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
          >
            {archivedTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} variant="small" />
            ))}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="h-[160px] rounded-[32px] bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center gap-3 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all cursor-pointer group"
            >
              <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-center px-4">View All Past Trips</span>
            </motion.div>
          </motion.div>
        </section>
      )}

      {/* Sticky Bottom Action Buttons */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4">
        <button 
          onClick={onCreateTrip}
          className="bg-[#a98467] hover:bg-[#8c6f55] text-white px-7 py-3 rounded-full font-bold text-sm shadow-2xl shadow-[#7f5539]/40 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 group"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
          Create Trip
        </button>
        <button 
          onClick={onJoinTrip}
          className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white px-7 py-3 rounded-full font-bold text-sm shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5"
        >
          <UserPlus className="h-4 w-4" />
          Join Trip
        </button>
      </div>
    </div>
  );
};
