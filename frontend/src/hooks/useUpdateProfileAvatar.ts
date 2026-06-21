import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadProfileAvatar, updateProfileAvatarUrl } from '@/api/profile';
import { toast } from 'sonner';

interface UseUpdateProfileAvatarInput {
  userId: string;
}

interface UploadVariables {
  file: File;
}

interface RemoveVariables {
  remove: true;
}

type Variables = UploadVariables | RemoveVariables;

export const useUpdateProfileAvatar = ({ userId }: UseUpdateProfileAvatarInput) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (variables: Variables) => {
      if ('remove' in variables && variables.remove) {
        // Clear the avatar
        await updateProfileAvatarUrl({ userId, avatarUrl: null });
        return null;
      }
      
      const uploadVars = variables as UploadVariables;
      // Step 1: upload to storage
      const result = await uploadProfileAvatar({ file: uploadVars.file, userId });
      // Step 2: update profile row
      await updateProfileAvatarUrl({ userId, avatarUrl: result.publicUrl });
      return result.publicUrl;
    },
    
    onSuccess: (newUrl) => {
      // Invalidate everywhere the avatar may appear
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['current-profile'] });
      queryClient.invalidateQueries({ queryKey: ['trip-members'] });
      // Messages contain joined profile data so name/avatar updates need a refresh
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      
      toast.success(newUrl ? 'Avatar updated' : 'Avatar removed');
    },
    
    onError: (error: Error) => {
      const msg = error?.message || 'Failed to update avatar';
      toast.error(msg);
    },
  });
};
