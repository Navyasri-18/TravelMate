import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';

const DestinationCards = () => {
  const [index, setIndex] = useState(0);
  const images = [
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e", // Mountains
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb", // Yosemite
    "https://images.unsplash.com/photo-1472396961693-142e6e269027", // Forest
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05", // Foggy Forest
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e", // Woods
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470", // Lake
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-[300px] flex items-center justify-center relative py-12" style={{ perspective: "1500px" }}>
      {/* Background Blur Effect */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl rounded-[100px] scale-90 blur-3xl opacity-20" />
      
      <div className="relative w-full h-full flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
        {images.map((img, i) => {
          const total = images.length;
          // Calculate circular position
          const pos = (i - (index % total) + total) % total;
          
          let x = 0;
          let rotateY = 0;
          let scale = 1;
          let z = 0;
          let opacity = 0;
          let blur = "blur(0px)";

          if (pos === 0) { // Center
            x = 0; rotateY = 0; scale = 1.1; z = 150; opacity = 1;
          } else if (pos === 1 || pos === total - 1) { // Sides
            x = pos === 1 ? 320 : -320;
            rotateY = pos === 1 ? -25 : 25;
            scale = 0.85;
            z = -100;
            opacity = 0.7;
            blur = "blur(1px)";
          } else if (pos === 2 || pos === total - 2) { // Far sides
            x = pos === 2 ? 580 : -580;
            rotateY = pos === 2 ? -45 : 45;
            scale = 0.7;
            z = -300;
            opacity = 0.3;
            blur = "blur(4px)";
          }

          return (
            <motion.div
              key={i}
              className="absolute w-72 h-44 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              initial={false}
              animate={{
                x,
                rotateY,
                scale,
                z,
                opacity,
                filter: blur
              }}
              transition={{
                duration: 1.2,
                ease: [0.32, 0.72, 0, 1]
              }}
            >
              <img
                src={`${img}?auto=format&fit=crop&w=600&q=80`}
                alt="destination"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

interface FirstTimeHomeProps {
  onCreateTrip: () => void;
  onJoinTrip: () => void;
}

export const FirstTimeHome = ({ onCreateTrip, onJoinTrip }: FirstTimeHomeProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-5xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="w-full"
      >
        <DestinationCards />
      </motion.div>
      
      <div className="mt-12 text-center space-y-6">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]"
        >
          No trips yet? <br />
          <span className="text-[#a98467]">Plan your next journey without chaos.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-medium"
        >
          Your canvas is empty. Start crafting an unforgettable itinerary or join an existing adventure.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6"
        >
          <button 
            onClick={onCreateTrip}
            className="bg-[#a98467] hover:bg-[#8c6f55] text-white px-7 py-3 rounded-full font-bold text-sm shadow-2xl shadow-[#7f5539]/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5 group relative overflow-hidden"
          >
            <span className="relative z-10">Create Trip</span>
            <Plus className="h-4 w-4 relative z-10 transition-transform group-hover:rotate-90" />
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
          </button>
          
          <button 
            onClick={onJoinTrip}
            className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white px-7 py-3 rounded-full font-bold text-sm shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2.5"
          >
            Join Trip
            <UserPlus className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};
