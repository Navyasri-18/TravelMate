import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Crown, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransferOwnership } from '@/hooks/useTransferOwnership';
import { ConfirmTransferOwnershipModal } from './ConfirmTransferOwnershipModal';
import { Avatar } from '@/components/ui/Avatar';
import type { TripMember } from '@/types/chat';

interface ViewMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  members: TripMember[];
  adminId: string;
  currentUserId: string;
}

const formatJoinedDate = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export function ViewMembersModal({
  isOpen,
  onClose,
  tripId,
  tripName,
  members,
  adminId,
  currentUserId,
}: ViewMembersModalProps) {
  const isCurrentUserAdmin = adminId === currentUserId;
  
  // Confirmation modal state — which member is being promoted
  const [pendingTransferMember, setPendingTransferMember] = useState<TripMember | null>(null);
  
  const transferMutation = useTransferOwnership({ tripId });
  
  // Sort: admin first, then others by joined_at (oldest first)
  const sortedMembers = [...members].sort((a, b) => {
    if (a.user_id === adminId) return -1;
    if (b.user_id === adminId) return 1;
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });
  
  const handleConfirmTransfer = async () => {
    if (!pendingTransferMember || !pendingTransferMember.profile) return;
    
    try {
      await transferMutation.mutateAsync({
        newAdminId: pendingTransferMember.user_id,
        newAdminName: pendingTransferMember.profile.name,
      });
      setPendingTransferMember(null);
    } catch {
      // Toast handled by mutation onError. Keep the confirm modal open for retry.
    }
  };
  
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-black/70 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#a98467]/15 border border-[#a98467]/30 flex items-center justify-center">
                    <Users className="h-5 w-5 text-[#a98467]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Members
                    </h2>
                    <p className="text-[11px] text-white/40">
                      {members.length} in {tripName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Member list */}
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {sortedMembers.map((member) => {
                  const isAdmin = member.user_id === adminId;
                  const isSelf = member.user_id === currentUserId;
                  const canPromote = isCurrentUserAdmin && !isAdmin;
                  const displayName = member.profile?.name || 'Unknown user';
                  
                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Avatar */}
                      <Avatar
                        name={member.profile?.name}
                        avatarUrl={member.profile?.avatar_url || null}
                        size="md"
                        isCurrentUser={isAdmin}
                      />
                      
                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white truncate">
                            {displayName}
                            {isSelf && (
                              <span className="ml-1.5 text-[10px] text-white/40 font-normal">
                                (you)
                              </span>
                            )}
                          </span>
                          {isAdmin && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#a98467]/20 border border-[#a98467]/40 text-[10px] font-bold uppercase tracking-wider text-[#a98467]">
                              <Crown className="h-2.5 w-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          Joined {formatJoinedDate(member.joined_at)}
                        </p>
                      </div>
                      
                      {/* Make Admin button — visible only to current admin, for non-admin members */}
                      {canPromote && (
                        <button
                          type="button"
                          onClick={() => setPendingTransferMember(member)}
                          disabled={transferMutation.isPending}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-[#a98467]/20 border border-white/10 hover:border-[#a98467]/40 text-[11px] font-bold uppercase tracking-wider text-white/70 hover:text-[#a98467] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserCog className="h-3 w-3" />
                          Make Admin
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Footer note (admin-only) */}
              {isCurrentUserAdmin && (
                <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] shrink-0">
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    As admin, you can transfer ownership to any member. You'll become a regular member after the transfer.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Confirmation modal */}
      <ConfirmTransferOwnershipModal
        isOpen={!!pendingTransferMember}
        onClose={() => {
          if (!transferMutation.isPending) setPendingTransferMember(null);
        }}
        onConfirm={handleConfirmTransfer}
        memberName={pendingTransferMember?.profile?.name || 'this member'}
        isTransferring={transferMutation.isPending}
      />
    </>
  );
}
