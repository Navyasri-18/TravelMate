import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo = ({ className, size = 'md' }: LogoProps) => {
  const sizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 40,
  };

  return (
    <div className={cn('flex items-center gap-2 font-bold tracking-tight text-primary', className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
        <MapPin size={iconSizes[size]} fill="currentColor" className="text-primary-foreground" />
      </div>
      <span className={cn(sizes[size], 'bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent')}>
        TravelMate
      </span>
    </div>
  );
};
