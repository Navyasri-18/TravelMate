import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Send, MessageCircle, AlertCircle, Loader2, Settings, UserPlus, LogOut, Paperclip, X, Image as ImageIcon, Trash2, Pencil, Reply as ReplyIcon, Receipt as ReceiptIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTripChat } from '@/hooks/useTripChat';
import { useSendMessage } from '@/hooks/useSendMessage';
import { InviteCrewModal } from '@/components/modals/InviteCrewModal';
import { useLeaveTrip } from '@/hooks/useLeaveTrip';
import { ConfirmLeaveTripModal } from '@/components/modals/ConfirmLeaveTripModal';
import { useUploadImage } from '@/hooks/useUploadImage';
import { MessageActionsMenu, useCopyAction } from '@/components/chat/MessageActionsMenu';
import { useLongPress } from '@/hooks/useLongPress';
import { useDeleteMessage } from '@/hooks/useDeleteMessage';
import { useEditMessage } from '@/hooks/useEditMessage';
import { EditMessageInput } from '@/components/chat/EditMessageInput';
import { ReplyPreviewBanner } from '@/components/chat/ReplyPreviewBanner';
import { EmbeddedReplyPreview } from '@/components/chat/EmbeddedReplyPreview';
import { ViewMembersModal } from '@/components/modals/ViewMembersModal';
import { Avatar } from '@/components/ui/Avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/chat';

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
         ' ' +
         date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name: string | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function TripDetails() {
  const { id } = useParams<{ id: string }>();
  const {
    trip,
    members,
    messages,
    currentUserId,
    isLoading,
    isError,
  } = useTripChat(id);
  
  const sendMutation = useSendMessage({
    tripId: id || '',
    senderId: currentUserId || '',
  });

  const currentUserProfile = members.find((m) => m.user_id === currentUserId)?.profile
    ? {
        name: members.find((m) => m.user_id === currentUserId)!.profile!.name,
        avatar_url: members.find((m) => m.user_id === currentUserId)!.profile!.avatar_url,
      }
    : null;
  
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  
  const isCurrentUserAdmin = trip?.admin_id === currentUserId;
  const leaveMutation = useLeaveTrip({ tripName: trip?.name || 'this trip' });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Message actions menu state
  const [activeMenu, setActiveMenu] = useState<{
    messageId: string;
    position: { x: number; y: number };
  } | null>(null);

  // Soft-delete undo state
  // Messages in this set are hidden locally but NOT yet written to the backend.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  // Map of messageId -> setTimeout handle so we can cancel on Undo
  const deleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const deleteMutation = useDeleteMessage({ tripId: id || '' });

  // Edit state — only one message can be in edit mode at a time
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const editMutation = useEditMessage({ tripId: id || '' });

  const handleStartEdit = useCallback((messageId: string) => {
    setEditingMessageId(messageId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const handleSaveEdit = useCallback(async (messageId: string, newContent: string) => {
    try {
      await editMutation.mutateAsync({ messageId, newContent });
      setEditingMessageId(null);
    } catch {
      // Error already surfaced as a toast by useEditMessage.onError.
      // Keep editor open so the user can retry or cancel.
    }
  }, [editMutation]);

  // Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  // Scroll container ref — used to scroll-to-original
  const messageListRef = useRef<HTMLDivElement>(null);
  // Map of messageId → DOM element so we can scrollIntoView on demand
  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  // Briefly highlighted message after scroll-to-original
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const handleStartReply = useCallback((messageId: string) => {
    setReplyingToId(messageId);
    // Focus the input so the user can start typing immediately
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingToId(null);
  }, []);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = messageRefsMap.current.get(messageId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    setTimeout(() => setHighlightedMessageId(null), 1500);
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    // 1. Hide locally immediately (undo window)
    setPendingDeleteIds((prev) => {
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });

    // 2. Start 5-second timer; backend call fires only when it expires
    const timer = setTimeout(() => {
      deleteMutation.mutate(messageId);
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
      deleteTimersRef.current.delete(messageId);
    }, 5000);

    deleteTimersRef.current.set(messageId, timer);

    // 3. Show undo toast
    toast('Message deleted', {
      description: 'Undo within 5 seconds',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const t = deleteTimersRef.current.get(messageId);
          if (t) {
            clearTimeout(t);
            deleteTimersRef.current.delete(messageId);
          }
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(messageId);
            return next;
          });
          toast.success('Message restored');
        },
      },
    });
  }, [deleteMutation]);

  // Cleanup any outstanding undo timers if the component unmounts mid-window
  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      deleteTimersRef.current.forEach((timer) => clearTimeout(timer));
      deleteTimersRef.current.clear();
    };
  }, []);

  const uploadMutation = useUploadImage({
    tripId: id || '',
    userId: currentUserId || '',
  });

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    
    // Cleanup: revoke the object URL when the component unmounts or file changes
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Client-side pre-validation (matches backend constraints)
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are supported');
      e.target.value = ''; // Reset input so they can pick again
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      e.target.value = '';
      return;
    }
    
    setSelectedFile(file);
    e.target.value = ''; // Reset so same file can be picked again later
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleAttachClick = () => {
    if (uploadMutation.isPending || sendMutation.isPending) return;
    fileInputRef.current?.click();
  };
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Outside click listener for settings dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);
  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = messageText.trim();
    const hasText = trimmed.length > 0;
    const hasImage = !!selectedFile;
    
    if (!hasText && !hasImage) return;
    if (sendMutation.isPending || uploadMutation.isPending) return;
    if (!currentUserId || !id) return;
    
    // Snapshot text/file/reply before clearing inputs
    const textToSend = trimmed;
    const fileToSend = selectedFile;
    const replyTo = replyingToId; // capture before clearing
    
    // Clear inputs IMMEDIATELY for snappy UX
    setMessageText('');
    setSelectedFile(null);
    setReplyingToId(null); // clear reply banner on send
    inputRef.current?.focus();
    
    try {
      let attachmentUrl: string | null = null;
      
      // If there's an image, upload it first
      if (fileToSend) {
        const result = await uploadMutation.mutateAsync(fileToSend);
        attachmentUrl = result.publicUrl;
      }
      
      // Send the message — optimistic update happens inside useSendMessage.onMutate
      await sendMutation.mutateAsync({
        content: textToSend,
        attachmentUrl,
        senderProfile: currentUserProfile,
        replyToMessageId: replyTo,
      });
    } catch (err) {
      // The optimistic update was already rolled back by useSendMessage.onError
      // Restore the inputs so the user can retry
      setMessageText(textToSend);
      setSelectedFile(fileToSend);
      setReplyingToId(replyTo);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <AppLayout isFullScreen={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-10 w-10 text-[#a98467] animate-spin" />
          <p className="text-amber-100/60 text-sm tracking-wider">Loading your trip...</p>
        </div>
      </AppLayout>
    );
  }
  
  // Error state
  if (isError || !trip) {
    return (
      <AppLayout isFullScreen={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-6">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <h2 className="text-xl font-bold text-white">Couldn't load this trip</h2>
          <p className="text-white/60 text-sm max-w-md">
            The trip may have been deleted, or you may not have access. Try heading back to the dashboard.
          </p>
          <Link
            to="/dashboard"
            className="mt-2 px-6 py-2.5 rounded-full bg-[#a98467] hover:bg-[#8c6f55] text-white text-xs font-bold uppercase tracking-widest transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout isFullScreen={true}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full h-screen flex flex-col text-[#f5f5f5] relative z-10 overflow-hidden bg-black/10 backdrop-blur-sm"
      >
        {/* Header */}
        <header className="pl-8 pr-8 py-4 border-b border-white/5 flex items-center justify-between bg-black/10 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-100 hover:text-white transition-all cursor-pointer group active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
            <div>
              <h1 className="text-base font-black tracking-tight text-[#f5f5f5] flex items-center gap-1.5">
                {trip.name}
                <span className="w-1.5 h-1.5 rounded-full bg-[#a98467] animate-pulse" />
              </h1>
              <span className="text-[10px] text-[#f5f5f5]/55 font-extrabold tracking-wider flex items-center gap-1 mt-0.5">
                <Users className="h-3.5 w-3.5 text-[#a98467]" />
                {members.length} {members.length === 1 ? 'Member' : 'Members'}
              </span>
            </div>
          </div>

          {/* Header Controls (View Members + Settings) */}
          <div className="flex items-center gap-2">
            {/* Expenses button */}
            <Link
              to={`/trip/${id}/expenses`}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-100 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label="Expenses"
            >
              <ReceiptIcon className="h-4 w-4" />
            </Link>

            {/* View Members button */}
            <button
              onClick={() => setIsMembersModalOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-100 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              aria-label="View Members"
            >
              <Users className="h-4 w-4" />
            </button>

            {/* Settings Menu Container */}
            <div className="relative flex" ref={settingsRef}>
              <button
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-100 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center"
                aria-label="Trip Settings"
              >
                <Settings 
                  className={cn(
                    "h-4 w-4 transition-transform duration-300 ease-out", 
                    isSettingsOpen && "rotate-45"
                  )} 
                />
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                    className="absolute right-0 top-full mt-2 w-56 origin-top-right bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[20px] shadow-2xl p-2 z-30"
                  >
                    <button
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsInviteModalOpen(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[#f5f5f5] hover:text-white transition-colors cursor-pointer text-left font-bold text-xs uppercase tracking-wider"
                    >
                      <UserPlus className="h-4 w-4 text-[#a98467]" />
                      Add Members
                    </button>

                    {/* Divider */}
                    <div className="h-px bg-white/5 mx-2" />

                    {/* Leave Trip menu item */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isCurrentUserAdmin) {
                          // Don't even open the confirm — show inline explanation
                          toast.error('Transfer ownership before leaving this trip.');
                          setIsSettingsOpen(false);
                          return;
                        }
                        setIsSettingsOpen(false);
                        setIsLeaveConfirmOpen(true);
                      }}
                      className={cn(
                        "w-full px-4 py-3 flex items-center gap-3 text-left text-sm transition-colors cursor-pointer rounded-xl",
                        isCurrentUserAdmin
                          ? "text-white/30 cursor-not-allowed hover:bg-transparent"
                          : "text-white hover:bg-white/5"
                      )}
                      aria-disabled={isCurrentUserAdmin}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                        isCurrentUserAdmin
                          ? "bg-white/5 border-white/10"
                          : "bg-red-500/10 border-red-500/20"
                      )}>
                        <LogOut className={cn(
                          "h-4 w-4",
                          isCurrentUserAdmin ? "text-white/30" : "text-red-400"
                        )} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">Leave Trip</span>
                        <span className="text-[10px] text-white/40">
                          {isCurrentUserAdmin
                            ? 'Transfer ownership first'
                            : "You won't see new messages"}
                        </span>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
        
        {/* Message list */}
        <div ref={messageListRef} className="flex-1 overflow-y-auto overflow-x-hidden px-8 md:pl-36 md:pr-8 pt-6 pb-6 chat-scrollbar bg-transparent">
        {/* Filter out messages that are in the 5-second local undo window */}
        {(() => {
          const visibleMessages = messages.filter((m) => !pendingDeleteIds.has(m.id));
          return visibleMessages.length === 0 ? (
            <EmptyChatState tripName={trip.name} />
          ) : (
            <AnimatePresence initial={false}>
              {visibleMessages.map((msg, index) => {
                const isCurrentUser = msg.sender_id === currentUserId;
                const prevMsg = index > 0 ? visibleMessages[index - 1] : null;
                const isSameSenderAsPrev = prevMsg?.sender_id === msg.sender_id;

                // Look up parent from the FULL messages array (not filtered)
                // so replies still reference parents that are currently being edited
                const parentMessage = msg.reply_to_message_id
                  ? messages.find((m) => m.id === msg.reply_to_message_id) ?? null
                  : null;

                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isCurrentUser={isCurrentUser}
                    isSameSenderAsPrev={isSameSenderAsPrev}
                    isFirst={index === 0}
                    onImageClick={(url) => setLightboxUrl(url)}
                    onOpenMenu={(position) =>
                      setActiveMenu({ messageId: msg.id, position })
                    }
                    isMenuOpen={activeMenu?.messageId === msg.id}
                    isEditing={editingMessageId === msg.id}
                    isEditPending={editMutation.isPending && editingMessageId === msg.id}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    parentMessage={parentMessage}
                    onScrollToMessage={handleScrollToMessage}
                    isHighlighted={highlightedMessageId === msg.id}
                    registerMessageRef={(msgId, el) => {
                      if (el) {
                        messageRefsMap.current.set(msgId, el);
                      } else {
                        messageRefsMap.current.delete(msgId);
                      }
                    }}
                  />
                );
              })}
            </AnimatePresence>
          );
        })()}
          <div ref={chatEndRef} />
        </div>
        
        {/* Input */}
        <form onSubmit={handleSend} className="px-8 py-4 border-t border-white/5 bg-black/10 backdrop-blur-md shrink-0">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Reply preview banner — shown above both the image preview and input row */}
          <ReplyPreviewBanner
            message={replyingToId ? messages.find((m) => m.id === replyingToId) ?? null : null}
            isCurrentUser={
              !!replyingToId &&
              messages.find((m) => m.id === replyingToId)?.sender_id === currentUserId
            }
            onCancel={handleCancelReply}
          />

          {/* Image preview row (shown only when an image is selected) */}
          <AnimatePresence>
            {selectedFile && previewUrl && (
              <motion.div
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-[70%] mx-auto mb-3 overflow-hidden"
              >
                <div className="relative inline-block rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                  <img
                    src={previewUrl}
                    alt="Attachment preview"
                    className="max-h-32 max-w-[200px] object-cover block"
                  />
                  {uploadMutation.isPending && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={uploadMutation.isPending || sendMutation.isPending}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Input row */}
          <div className={cn(
            "relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] w-full max-w-[70%] mx-auto",
            "focus-within:border-[#a98467]/50 focus-within:shadow-[0_0_25px_rgba(169,132,103,0.25)] focus-within:bg-[#a98467]/5"
          )}>
            {/* Attachment button */}
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={uploadMutation.isPending || sendMutation.isPending}
              className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
              aria-label="Attach image"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            
            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."}
              disabled={sendMutation.isPending || uploadMutation.isPending}
              maxLength={2000}
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm placeholder:text-white/30 mx-2 text-[#f5f5f5] disabled:opacity-50"
            />
            
            {/* Send button */}
            <button
              type="submit"
              disabled={(!messageText.trim() && !selectedFile) || sendMutation.isPending || uploadMutation.isPending}
              className={cn(
                "p-2.5 rounded-full transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer",
                (messageText.trim() || selectedFile) && !sendMutation.isPending && !uploadMutation.isPending
                  ? "bg-[#a98467] hover:bg-[#8c6f55] text-white shadow-[#7f5539]/20 hover:brightness-110"
                  : "bg-white/5 border border-white/10 text-[#f5f5f5]/30 cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              {sendMutation.isPending || uploadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </form>

        {/* Invite Crew Modal */}
        <InviteCrewModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          tripName={trip.name}
          inviteCode={trip.invite_code}
          mode="add-members"
        />

        {/* Confirm Leave Trip Modal */}
        <ConfirmLeaveTripModal
          isOpen={isLeaveConfirmOpen}
          onClose={() => {
            if (!leaveMutation.isPending) setIsLeaveConfirmOpen(false);
          }}
          onConfirm={() => {
            if (!id) return;
            leaveMutation.mutate(id);
          }}
          tripName={trip?.name || 'this trip'}
          isLeaving={leaveMutation.isPending}
        />

        {/* Lightbox Overlay */}
        {lightboxUrl && (
          <ImageLightbox
            url={lightboxUrl}
            onClose={() => setLightboxUrl(null)}
          />
        )}

        <ViewMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => setIsMembersModalOpen(false)}
          tripId={id || ''}
          tripName={trip.name}
          members={members}
          adminId={trip.admin_id}
          currentUserId={currentUserId || ''}
        />

        {/* Message context menu – rendered in a fixed layer above everything */}
        <MessageActionsMenuPortal
          activeMenu={activeMenu}
          messages={messages}
          currentUserId={currentUserId ?? null}
          onClose={() => setActiveMenu(null)}
          onDelete={handleDeleteMessage}
          onEdit={handleStartEdit}
          onReply={handleStartReply}
        />
      </motion.div>
    </AppLayout>
  );
}

// ============================================================
// Empty chat state component
// ============================================================
function EmptyChatState({ tripName }: { tripName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-3"
    >
      <div className="w-16 h-16 rounded-full bg-[#a98467]/10 border border-[#a98467]/20 flex items-center justify-center">
        <MessageCircle className="h-7 w-7 text-[#a98467]" />
      </div>
      <h3 className="text-lg font-bold text-white">Start the conversation</h3>
      <p className="text-sm text-white/50 max-w-sm">
        Be the first to send a message in {tripName}. Plans, ideas, expenses — anything trip-related.
      </p>
    </motion.div>
  );
}

// ============================================================
// Message bubble component
// ============================================================
interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  isSameSenderAsPrev: boolean;
  isFirst: boolean;
  onImageClick: (url: string) => void;
  onOpenMenu: (position: { x: number; y: number }) => void;
  isMenuOpen: boolean;
  isEditing: boolean;
  isEditPending: boolean;
  onSaveEdit: (messageId: string, newContent: string) => void;
  onCancelEdit: () => void;
  parentMessage?: ChatMessage | null;
  onScrollToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
  registerMessageRef?: (messageId: string, el: HTMLDivElement | null) => void;
}

function MessageBubble({
  message,
  isCurrentUser,
  isSameSenderAsPrev,
  isFirst,
  onImageClick,
  onOpenMenu,
  isMenuOpen,
  isEditing,
  isEditPending,
  onSaveEdit,
  onCancelEdit,
  parentMessage,
  onScrollToMessage,
  isHighlighted,
  registerMessageRef,
}: MessageBubbleProps) {
  const senderName = message.profiles?.name || 'Unknown user';
  const time = formatTime(message.created_at);
  const isDeleted = !!message.deleted_at;
  const isTempMessage = message.id.startsWith('temp-');

  const openMenuAt = useCallback((clientX: number, clientY: number) => {
    // Don't open the menu while editing or while the message is still being sent
    if (isEditing || isTempMessage) return;
    onOpenMenu({ x: clientX, y: clientY });
  }, [isEditing, isTempMessage, onOpenMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  }, [openMenuAt]);

  const longPress = useLongPress({
    onLongPress: (e) => {
      const touch = e.changedTouches[0];
      openMenuAt(touch.clientX, touch.clientY);
    },
  });

  return (
    <motion.div
      ref={(el) => registerMessageRef?.(message.id, el)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onContextMenu={handleContextMenu}
      {...longPress}
      className={cn(
        "flex items-start gap-3 w-auto max-w-[80%] sm:max-w-[70%] md:max-w-[60%] group/msg relative select-none md:select-auto",
        isSameSenderAsPrev ? "mt-2 pb-0.5" : isFirst ? "pb-3" : "mt-5 pb-3",
        isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {!isSameSenderAsPrev ? (
          <Avatar
            name={message.profiles?.name}
            avatarUrl={message.profiles?.avatar_url || null}
            size="sm"
            isCurrentUser={isCurrentUser}
          />
        ) : (
          <div className="w-8 h-8" />
        )}
      </div>
      
      {/* Bubble */}
      <div className={cn("flex flex-col min-w-0 max-w-full", isCurrentUser ? "items-end" : "items-start")}>
        {!isSameSenderAsPrev && (
          <div className={cn("text-[10px] uppercase tracking-widest font-bold mb-1 px-1", isCurrentUser ? "text-[#a98467]" : "text-white/50")}>
            {isCurrentUser ? 'You' : senderName}
            <span className="text-white/30 ml-2 normal-case tracking-normal font-normal">
              {time}
              {message.edited_at && !message.deleted_at && (
                <span className="ml-1.5 italic">(edited)</span>
              )}
            </span>
          </div>
        )}
        
        {/* Bubble content: edit input → tombstone → normal */}
        {isEditing ? (
          <div className="flex flex-col gap-2 w-full">
            {/* Keep the image visible above the editor if this message has one */}
            {message.attachment_url && (
              <div className={cn(
                "rounded-2xl overflow-hidden min-w-[260px] max-w-full w-fit",
                isCurrentUser
                  ? "bg-[#a98467]/90"
                  : "bg-white/5 border border-white/10"
              )}>
                <MessageImage
                  src={message.attachment_url}
                  onClick={() => onImageClick(message.attachment_url!)}
                />
              </div>
            )}
            <EditMessageInput
              initialContent={message.content}
              isCurrentUser={isCurrentUser}
              onSave={(newContent) => onSaveEdit(message.id, newContent)}
              onCancel={onCancelEdit}
              isPending={isEditPending}
            />
          </div>
        ) : (
          <div
            className={cn(
              "rounded-2xl overflow-hidden break-words transition-all duration-300",
              isMenuOpen && "ring-2 ring-white/20",
              isHighlighted && "ring-2 ring-[#a98467] scale-[1.02] shadow-[0_0_15px_rgba(169,132,103,0.4)]",
              isDeleted
                ? "bg-white/[0.03] border border-white/5 w-fit max-w-full"
                : message.attachment_url
                ? "min-w-[260px] max-w-full w-fit"
                : message.reply_to_message_id
                ? "min-w-[220px] max-w-full w-fit"
                : "w-fit max-w-full",
              !isDeleted && (
                isCurrentUser
                  ? "bg-[#a98467]/90 text-white rounded-tr-sm"
                  : "bg-white/5 border border-white/10 text-[#f5f5f5] rounded-tl-sm"
              )
            )}
          >
            {isDeleted ? (
              <div className="px-4 py-2.5 text-sm flex items-center gap-2 text-white/35 italic">
                <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span>This message was deleted</span>
              </div>
            ) : (
              <>
                {/* Reply context quote */}
                {message.reply_to_message_id && (
                  <EmbeddedReplyPreview
                    parentMessage={parentMessage ?? null}
                    isCurrentUser={isCurrentUser}
                    onClick={() => {
                      if (parentMessage && onScrollToMessage) {
                        onScrollToMessage(parentMessage.id);
                      }
                    }}
                  />
                )}

                {message.attachment_url && (
                  <MessageImage
                    src={message.attachment_url}
                    onClick={() => onImageClick(message.attachment_url!)}
                  />
                )}

                {message.content && message.content.trim().length > 0 && (
                  <div className={cn(
                    "px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed break-words",
                    message.attachment_url && "pt-3 pb-3"
                  )}>
                    {message.content}
                  </div>
                )}

                {/* (edited) for grouped messages that have no timestamp header */}
                {message.edited_at && isSameSenderAsPrev && (
                  <div className="px-4 pb-2 -mt-1">
                    <span className="text-[10px] text-white/30 italic">edited</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Helper image rendering component
// ============================================================
function MessageImage({ src, onClick }: { src: string; onClick: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <div className="w-full aspect-[4/3] flex flex-col items-center justify-center bg-black/30 text-white/50 text-xs gap-2">
        <ImageIcon className="h-6 w-6" />
        <span>Image unavailable</span>
      </div>
    );
  }
  
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative block w-full cursor-zoom-in group"
    >
      {!isLoaded && (
        <div className="w-full aspect-[4/3] bg-white/5 animate-pulse" />
      )}
      <img
        src={src}
        alt="Shared image"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "w-full h-auto max-h-[360px] object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
        )}
      />
    </button>
  );
}

// ============================================================
// Image full screen Lightbox overlay component
// ============================================================
function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm cursor-zoom-out"
      >
        <motion.img
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          src={url}
          alt="Full size"
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-default"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================
// Message actions menu portal
// Reads the active message from the list and builds the action set.
// ============================================================
interface MessageActionsMenuPortalProps {
  activeMenu: { messageId: string; position: { x: number; y: number } } | null;
  messages: ChatMessage[];
  currentUserId: string | null;
  onClose: () => void;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onReply: (messageId: string) => void;
}

function MessageActionsMenuPortal({
  activeMenu,
  messages,
  currentUserId,
  onClose,
  onDelete,
  onEdit,
  onReply,
}: MessageActionsMenuPortalProps) {
  const activeMessage = activeMenu
    ? messages.find((m) => m.id === activeMenu.messageId)
    : null;

  const isDeleted = !!activeMessage?.deleted_at;
  const hasText = !!(activeMessage?.content && activeMessage.content.trim().length > 0);
  const isOwnMessage = !!activeMessage && activeMessage.sender_id === currentUserId;

  // Copy — disabled for image-only messages or tombstones
  const copyAction = useCopyAction({
    text: !isDeleted && hasText ? (activeMessage?.content ?? null) : null,
  });

  const actions: import('@/components/chat/MessageActionsMenu').MessageAction[] = [];

  // Reply — any non-deleted message
  if (!isDeleted && activeMessage) {
    actions.push({
      id: 'reply',
      label: 'Reply',
      icon: <ReplyIcon className="h-3.5 w-3.5" />,
      onClick: () => onReply(activeMessage.id),
    });
  }

  // Copy action
  actions.push(copyAction);

  // Edit — own message, has text, not deleted
  if (isOwnMessage && hasText && !isDeleted && activeMessage) {
    actions.push({
      id: 'edit',
      label: 'Edit',
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: () => onEdit(activeMessage.id),
    });
  }

  // Delete — only for the sender, and only if not already deleted
  if (isOwnMessage && !isDeleted && activeMessage) {
    actions.push({
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-3.5 w-3.5" />,
      danger: true,
      onClick: () => onDelete(activeMessage.id),
    });
  }

  return (
    <MessageActionsMenu
      position={activeMenu?.position ?? null}
      actions={actions}
      onClose={onClose}
    />
  );
}
