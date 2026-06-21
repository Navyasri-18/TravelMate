import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Plus, Copy, Check, UserPlus, Send } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { emailInviteSchema, EmailInviteFormData } from '@/lib/validations/invites';
import { sendEmailInvites } from '@/api/invites';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface InviteCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName: string;
  inviteCode: string;
  mode?: 'create-flow' | 'add-members';  // default 'add-members'
}

export const InviteCrewModal = ({
  isOpen,
  onClose,
  tripName,
  inviteCode,
  mode = 'add-members',
}: InviteCrewModalProps) => {
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const user = useAuthStore((state) => state.user);
  const { data: profile } = useCurrentProfile();

  const inviteForm = useForm<EmailInviteFormData>({
    resolver: zodResolver(emailInviteSchema),
  });

  const sendMutation = useMutation({
    mutationFn: sendEmailInvites,
    onSuccess: () => {
      const count = pendingEmails.length;
      toast.success(`Invite${count === 1 ? '' : 's'} sent to ${count} ${count === 1 ? 'person' : 'people'}!`);
      setPendingEmails([]);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error?.message || 'Failed to send invites. Please try again.');
    },
  });

  // Reset form when modal state changes
  useEffect(() => {
    if (!isOpen) {
      setPendingEmails([]);
      inviteForm.reset();
      setIsCopied(false);
    }
  }, [isOpen]);

  const handleAddEmail = (values: EmailInviteFormData) => {
    const cleanEmail = values.email.toLowerCase().trim();

    if (pendingEmails.includes(cleanEmail)) {
      inviteForm.setError('email', { message: 'This email has already been added' });
      return;
    }

    setPendingEmails((prev) => [...prev, cleanEmail]);
    inviteForm.reset();
  };

  const handleRemoveEmail = (email: string) => {
    setPendingEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    toast.success('Invite link copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendInvites = () => {
    if (pendingEmails.length === 0) {
      onClose();
      return;
    }

    const inviterName = profile?.name?.trim() ||
                        user?.email?.split('@')[0] ||
                        'A friend';

    if (!inviteCode || !tripName) return;

    sendMutation.mutate({
      emails: pendingEmails,
      tripName,
      inviterName,
      inviteCode,
    });
  };

  const handleSkip = () => {
    setPendingEmails([]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] w-full max-w-md text-white overflow-hidden"
          >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 relative">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mx-auto">
                  Invite Your Crew
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-5 p-2 rounded-full hover:bg-white/5 text-white/70 hover:text-white transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 text-white space-y-8">
                {/* Section 1: Add Members */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white">Add Members</h4>
                    <p className="text-[10px] text-white/50">Email addresses</p>
                  </div>

                  <form onSubmit={inviteForm.handleSubmit(handleAddEmail)} className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#a98467] transition-colors" />
                        <input
                          {...inviteForm.register('email')}
                          type="email"
                          placeholder="colleague@example.com"
                          disabled={sendMutation.isPending}
                          className="w-full !bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 transition-all disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sendMutation.isPending}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                    {inviteForm.formState.errors.email && (
                      <p className="text-[10px] text-red-400 ml-2">{inviteForm.formState.errors.email.message}</p>
                    )}
                  </form>

                  {/* Members List */}
                  <div className="space-y-2 min-h-[100px] max-h-[150px] overflow-y-auto no-scrollbar">
                    {pendingEmails.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 opacity-40">
                        <UserPlus className="h-8 w-8 text-[#a98467]" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase tracking-widest">No members added yet.</p>
                          <p className="text-[10px] max-w-[200px]">Add team members by their email above to collaborate on this trip.</p>
                        </div>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {pendingEmails.map((email) => (
                          <motion.div
                            key={email}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#a98467]/20 flex items-center justify-center shrink-0">
                                <Mail className="h-3.5 w-3.5 text-[#a98467]" />
                              </div>
                              <span className="text-white text-sm truncate">{email}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(email)}
                              disabled={sendMutation.isPending}
                              className="text-white/40 hover:text-white/80 transition-colors p-1 shrink-0 disabled:opacity-50 cursor-pointer"
                              aria-label={`Remove ${email}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* Section 2: Invite Link */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white">Invite Link</h4>
                    <p className="text-[10px] text-white/50">Anyone with this link can join the itinerary planning.</p>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <input
                        readOnly
                        value={inviteCode ? `${window.location.origin}/join/${inviteCode}` : 'Loading...'}
                        className="w-full !bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white/50 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="bg-[#a98467] hover:bg-[#8c6f55] text-white px-6 rounded-2xl font-bold text-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 flex items-center justify-between gap-4">
                  {mode === 'create-flow' ? (
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={sendMutation.isPending}
                      className="text-white/60 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Skip for Now
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={handleSendInvites}
                    disabled={sendMutation.isPending}
                    className="bg-[#a98467] hover:bg-[#8c6f55] text-white px-8 py-3 rounded-full font-bold text-sm shadow-xl shadow-[#7f5539]/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    {sendMutation.isPending ? (
                      <>Sending...</>
                    ) : pendingEmails.length === 0 ? (
                      mode === 'create-flow' ? 'Finish Setup' : 'Done'
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Send {pendingEmails.length} {pendingEmails.length === 1 ? 'Invite' : 'Invites'}
                      </>
                    )}
                  </button>
                </div>
              </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
