import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  isLoading
}: EmptyStateProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-primary/60" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      <p className="text-white/60 max-w-xs mx-auto mb-8 text-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        <Button 
          onClick={onAction} 
          disabled={isLoading}
          className="bg-[#a98467] hover:bg-[#8c6f55] text-white px-8 py-2 rounded-full font-bold shadow-xl shadow-[#7f5539]/20"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};
