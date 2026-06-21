import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Check, X as XIcon, Loader2, Mail, Calendar, User as UserIcon, Camera, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCurrentProfile } from '@/hooks/useCurrentProfile';
import { useUpdateProfileName } from '@/hooks/useUpdateProfileName';
import { useUpdateProfileAvatar } from '@/hooks/useUpdateProfileAvatar';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const formatJoinedDate = (iso: string): string => {
  const date = new Date(iso);
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
};

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useCurrentProfile();
  const user = useAuthStore((s) => s.user);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const updateMutation = useUpdateProfileName({ userId: user?.id || '' });
  const avatarMutation = useUpdateProfileAvatar({ userId: user?.id || '' });
  
  // When entering edit mode, seed the draft and focus the input
  useEffect(() => {
    if (isEditingName) {
      setNameDraft(profile?.name || '');
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 50);
    }
  }, [isEditingName, profile?.name]);
  
  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 text-[#a98467] animate-spin" />
        </div>
      </AppLayout>
    );
  }
  
  if (isError || !profile) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <h2 className="text-xl font-bold text-white">Couldn't load your profile</h2>
          <p className="text-white/60 text-sm mt-2 max-w-md">
            Try refreshing the page. If the problem persists, sign out and back in.
          </p>
        </div>
      </AppLayout>
    );
  }
  
  const trimmedDraft = nameDraft.trim();
  const hasChanged = trimmedDraft !== (profile.name || '').trim();
  const canSave = trimmedDraft.length > 0 && trimmedDraft.length <= 60 && hasChanged && !updateMutation.isPending;
  
  const handleSaveName = async () => {
    if (!canSave) return;
    try {
      await updateMutation.mutateAsync(trimmedDraft);
      setIsEditingName(false);
    } catch {
      // Toast handled in mutation. Keep editor open.
    }
  };
  
  const handleCancelEdit = () => {
    setIsEditingName(false);
    setNameDraft('');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };
  
  const handleAvatarClick = () => {
    if (avatarMutation.isPending) return;
    fileInputRef.current?.click();
  };
  
  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Client-side validation (matches backend)
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are supported');
      e.target.value = '';
      return;
    }
    
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Avatar must be under 1 MB');
      e.target.value = '';
      return;
    }
    
    // Create optimistic preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    
    e.target.value = '';
    
    try {
      await avatarMutation.mutateAsync({ file });
    } catch {
      // Mutation handles toast
    } finally {
      // Clear preview — either the new url is in profile data now, or we reverted
      setAvatarPreview(null);
      URL.revokeObjectURL(objectUrl);
    }
  };
  
  const handleRemoveAvatar = async () => {
    if (avatarMutation.isPending) return;
    try {
      await avatarMutation.mutateAsync({ remove: true });
    } catch {
      // Mutation handles toast
    }
  };
  
  return (
    <AppLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-2xl mx-auto px-6 py-12"
      >
        {/* Page header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-white">Your Profile</h1>
          <p className="text-sm text-white/40 mt-1">Manage your account information</p>
        </div>
        
        {/* Avatar block */}
        <div className="flex items-center gap-6 mb-12">
          <div className="relative group/avatar shrink-0">
            {/* Use the optimistic preview if uploading, otherwise the saved avatar */}
            <Avatar
              name={profile.name}
              avatarUrl={avatarPreview || profile.avatar_url || null}
              size="xl"
              isCurrentUser
            />
            
            {/* Hover/tap overlay for changing */}
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={avatarMutation.isPending}
              className={cn(
                "absolute inset-0 rounded-full flex items-center justify-center transition-all cursor-pointer",
                "bg-black/0 group-hover/avatar:bg-black/50",
                "opacity-0 group-hover/avatar:opacity-100",
                avatarMutation.isPending && "bg-black/60 opacity-100",
                "disabled:cursor-wait"
              )}
              aria-label="Change avatar"
            >
              {avatarMutation.isPending ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </button>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">
              {profile.name || 'Unnamed'}
            </h2>
            <p className="text-xs text-white/40 mt-1 truncate">{profile.email}</p>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={avatarMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-[#a98467]/20 border border-white/10 hover:border-[#a98467]/40 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-[#a98467] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="h-3 w-3" />
                {profile.avatar_url ? 'Change' : 'Upload'}
              </button>
              
              {profile.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={avatarMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-red-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Info fields */}
        <div className="space-y-4">
          {/* Name field */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/40">
                <UserIcon className="h-3 w-3" />
                Display Name
              </div>
              {!isEditingName && (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-[#a98467]/20 border border-white/10 hover:border-[#a98467]/40 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-[#a98467] transition-all cursor-pointer"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
            
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={updateMutation.isPending}
                  maxLength={60}
                  placeholder="Your name"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base text-white placeholder:text-white/30 outline-none focus:border-[#a98467]/50 focus:bg-[#a98467]/5 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={updateMutation.isPending}
                  className="p-2.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  aria-label="Cancel"
                >
                  <XIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={!canSave}
                  className={cn(
                    "p-2.5 rounded-full transition-all cursor-pointer flex items-center justify-center",
                    canSave
                      ? "bg-[#a98467] hover:bg-[#8c6f55] text-white"
                      : "bg-white/10 text-white/30 cursor-not-allowed"
                  )}
                  aria-label="Save"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              </div>
            ) : (
              <p className="text-base text-white">{profile.name || 'Unnamed'}</p>
            )}
          </div>
          
          {/* Email field (read-only) */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/40 mb-3">
              <Mail className="h-3 w-3" />
              Email
            </div>
            <p className="text-base text-white">{profile.email}</p>
            <p className="text-[10px] text-white/30 mt-2 italic">
              Email changes coming soon
            </p>
          </div>
          
          {/* Joined date (read-only) */}
          {profile.created_at && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/40 mb-3">
                <Calendar className="h-3 w-3" />
                Joined
              </div>
              <p className="text-base text-white">{formatJoinedDate(profile.created_at)}</p>
            </div>
          )}
        </div>
      </motion.div>
    </AppLayout>
  );
}
