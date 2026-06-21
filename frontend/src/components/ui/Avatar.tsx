import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string | null | undefined;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** If true, uses the warm brown gradient (for current user). Default uses cool teal gradient. */
  isCurrentUser?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-2xl',
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export function Avatar({ name, avatarUrl, size = 'md', className, isCurrentUser = false }: AvatarProps) {
  const [imageErrored, setImageErrored] = useState(false);
  
  // Reset error state when avatarUrl changes (e.g., after a new upload)
  useEffect(() => {
    setImageErrored(false);
  }, [avatarUrl]);
  
  const showImage = !!avatarUrl && !imageErrored;
  
  const gradientClasses = isCurrentUser
    ? 'bg-gradient-to-tr from-[#7f5539] to-[#a98467] border-white/20'
    : 'bg-gradient-to-tr from-[#3d5a80] to-[#5e8a73] border-white/10';
  
  return (
    <div
      className={cn(
        'rounded-full font-bold flex items-center justify-center shadow-md border text-white shrink-0 overflow-hidden',
        SIZE_CLASSES[size],
        !showImage && gradientClasses,
        showImage && 'bg-black/30 border-white/10',
        className
      )}
      aria-label={name || 'User'}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt={name || 'User'}
          className="w-full h-full object-cover"
          onError={() => setImageErrored(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
