import { useMutation } from '@tanstack/react-query';
import { uploadChatImage } from '@/api/chat';
import { toast } from 'sonner';

interface UseUploadImageInput {
  tripId: string;
  userId: string;
}

export const useUploadImage = ({ tripId, userId }: UseUploadImageInput) => {
  return useMutation({
    mutationFn: (file: File) =>
      uploadChatImage({ file, tripId, userId }),
    onError: (error: Error) => {
      const msg = error?.message || 'Failed to upload image';
      toast.error(msg);
    },
  });
};
