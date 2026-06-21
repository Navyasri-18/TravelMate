import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, Plane, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createTrip } from '@/api/trips';
import { createTripSchema, CreateTripFormData } from '@/lib/validations/trip';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useJoinTrip } from '@/hooks/useJoinTrip';
import type { Trip } from '@/types/trip';

const SUPPORTED_CURRENCIES = [
  { code: 'INR', label: '₹ INR — Indian Rupee' },
  { code: 'USD', label: '$ USD — US Dollar' },
  { code: 'EUR', label: '€ EUR — Euro' },
  { code: 'GBP', label: '£ GBP — British Pound' },
  { code: 'JPY', label: '¥ JPY — Japanese Yen' },
  { code: 'AUD', label: 'A$ AUD — Australian Dollar' },
  { code: 'CAD', label: 'C$ CAD — Canadian Dollar' },
  { code: 'SGD', label: 'S$ SGD — Singapore Dollar' },
  { code: 'AED', label: 'د.إ AED — UAE Dirham' },
] as const;

type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]['code'];

const joinTripSchema = z.object({
  inviteCode: z
    .string()
    .min(1, 'Invite code is required')
    .min(4, 'Invite code seems too short')
    .max(20, 'Invite code is too long'),
});

type JoinTripFormData = z.infer<typeof joinTripSchema>;

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: Trip) => void;
  defaultTab?: TabType;
}

type TabType = 'create' | 'join';

export const CreateTripModal = ({ isOpen, onClose, onTripCreated, defaultTab = 'create' }: CreateTripModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createForm = useForm<CreateTripFormData>({
    resolver: zodResolver(createTripSchema),
  });

  const joinForm = useForm<JoinTripFormData>({
    resolver: zodResolver(joinTripSchema),
  });

  const mutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (newTrip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success(`Trip "${newTrip.name}" created!`);
      onTripCreated(newTrip);
    },
    onError: (error: Error & { code?: string; message?: string }) => {
      const message = error?.message || '';
      if (message.includes('row-level security') || error?.code === '42501') {
        toast.error('Permission denied. Please make sure you are logged in.');
      } else if (message.includes('Not authenticated')) {
        toast.error('Your session has expired. Please log in again.');
      } else if (message.includes('duplicate key') || message.includes('unique constraint')) {
        toast.error('A trip with this invite code already exists. Please try again.');
      } else if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
        toast.error('Connection error. Please check your internet and try again.');
      } else {
        toast.error(message || 'Failed to create trip. Please try again.');
      }
    },
  });

  const joinMutation = useJoinTrip({
    onSuccess: (tripId) => {
      joinForm.reset();
      handleClose();
      navigate(`/trip/${tripId}/chat`);
    },
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  useEffect(() => {
    if (activeTab === 'create') {
      joinForm.reset();
    } else {
      createForm.reset();
    }
  }, [activeTab]);

  const onCreateSubmit = (values: CreateTripFormData) => {
    if (!user?.id) {
      toast.error('You must be logged in to create a trip');
      return;
    }
    mutation.mutate({
      name: values.name.trim(),
      destination: values.destination.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      currency: currency,
    });
  };

  const onJoinSubmit = (values: JoinTripFormData) => {
    joinMutation.mutate(values.inviteCode);
  };

  const handleClose = () => {
    if (mutation.isPending || joinMutation.isPending) return;
    createForm.reset();
    joinForm.reset();
    setCurrency('INR');
    setActiveTab(defaultTab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[12px] transition-all"
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-[450px] bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto relative text-white"
            >
              {/* Header Tabs */}
              <div className="flex border-b border-white/10 relative">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors relative",
                    activeTab === 'create' 
                      ? "text-white border-b-2 border-[#a98467]" 
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  Create New Trip
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className={cn(
                    "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors relative",
                    activeTab === 'join' 
                      ? "text-white border-b-2 border-[#a98467]" 
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  Join Existing Trip
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'create' ? (
                  <motion.div
                    key="createForm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-8 text-white"
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold tracking-tight mb-2">Begin Your Adventure</h2>
                      <p className="text-gray-400 text-xs">Define the core details of your upcoming journey.</p>
                    </div>

                    <form className="space-y-5" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
                      <div className="group space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5 ml-1 transition-colors group-focus-within:text-[#a98467]">
                          Trip Name
                        </label>
                        <div className="relative">
                          <Plane className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#a98467] transition-colors" />
                          <input
                            {...createForm.register('name')}
                            type="text"
                            placeholder="e.g., Himalayan Trek"
                            className={cn(
                              'w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner transition-all',
                              createForm.formState.errors.name && 'border-red-500/50'
                            )}
                          />
                        </div>
                        {createForm.formState.errors.name && (
                          <p className="text-[10px] text-red-400 ml-2">{createForm.formState.errors.name.message}</p>
                        )}
                      </div>

                      <div className="group space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5 ml-1 transition-colors group-focus-within:text-[#a98467]">
                          Destination
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#a98467] transition-colors" />
                          <input
                            {...createForm.register('destination')}
                            type="text"
                            placeholder="e.g., Himachal Pradesh"
                            className={cn(
                              'w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner transition-all',
                              createForm.formState.errors.destination && 'border-red-500/50'
                            )}
                          />
                        </div>
                        {createForm.formState.errors.destination && (
                          <p className="text-[10px] text-red-400 ml-2">{createForm.formState.errors.destination.message}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="group space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5 ml-1 transition-colors group-focus-within:text-[#a98467]">
                            Start Date
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#a98467] transition-colors" />
                            <input
                              {...createForm.register('startDate')}
                              type="date"
                              className={cn(
                                'w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner transition-all text-xs',
                                createForm.formState.errors.startDate && 'border-red-500/50'
                              )}
                            />
                          </div>
                          {createForm.formState.errors.startDate && (
                            <p className="text-[10px] text-red-400 ml-2">{createForm.formState.errors.startDate.message}</p>
                          )}
                        </div>
                        <div className="group space-y-1">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5 ml-1 transition-colors group-focus-within:text-[#a98467]">
                            End Date
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#a98467] transition-colors" />
                            <input
                              {...createForm.register('endDate')}
                              type="date"
                              className={cn(
                                'w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner transition-all text-xs',
                                createForm.formState.errors.endDate && 'border-red-500/50'
                              )}
                            />
                          </div>
                          {createForm.formState.errors.endDate && (
                            <p className="text-[10px] text-red-400 ml-2">{createForm.formState.errors.endDate.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Currency Picker */}
                      <div className="group space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5 ml-1 transition-colors group-focus-within:text-[#a98467]">
                          Currency
                        </label>
                        <div className="relative">
                          <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white outline-none focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner transition-all appearance-none cursor-pointer pr-10"
                          >
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <option key={c.code} value={c.code} className="bg-[#1a1a1a]">
                                {c.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                        </div>
                        <p className="text-[10px] text-white/30 mt-1.5 ml-1">
                          All expenses in this trip will use this currency. Cannot be changed later.
                        </p>
                      </div>

                      <div className="pt-6 flex justify-center">
                        <Button
                          type="submit"
                          disabled={mutation.isPending}
                          className="bg-[#a98467] hover:bg-[#8c6f55] text-white px-12 py-6 rounded-full font-bold text-sm shadow-xl shadow-[#7f5539]/20 transition-all hover:scale-[1.05] active:scale-[0.98] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {mutation.isPending ? 'Creating...' : 'Create Trip'}
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="joinForm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-8 text-white"
                  >
                    <div className="text-center mb-10">
                      <h2 className="text-2xl font-bold tracking-tight mb-2">Join a Journey</h2>
                      <p className="text-gray-400 text-xs">Enter the code shared by your trip organizer to sync up.</p>
                    </div>

                    <form className="space-y-8" onSubmit={joinForm.handleSubmit(onJoinSubmit)}>
                      <div className="group space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1.5 ml-1 transition-colors group-focus-within:text-[#a98467]">
                          Invite Code
                        </label>
                        <div className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#a98467] transition-colors" />
                          <input
                            {...joinForm.register('inviteCode')}
                            type="text"
                            placeholder="e.g., S9ZTEK"
                            className={cn(
                              "w-full !bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 shadow-inner transition-all uppercase tracking-widest",
                              joinForm.formState.errors.inviteCode && "border-red-500/50"
                            )}
                          />
                        </div>
                        {joinForm.formState.errors.inviteCode && (
                          <p className="text-[10px] text-red-400 ml-2">{joinForm.formState.errors.inviteCode.message}</p>
                        )}
                      </div>

                      <div className="pt-2 flex flex-col items-center space-y-6">
                        <Button
                          type="submit"
                          disabled={joinMutation.isPending}
                          className="bg-[#a98467] hover:bg-[#8c6f55] text-white px-12 py-6 rounded-full font-bold text-sm shadow-xl shadow-[#7f5539]/20 transition-all hover:scale-[1.05] active:scale-[0.98] uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                        >
                          {joinMutation.isPending ? 'Joining...' : 'Join Trip'}
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
