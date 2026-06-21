import { supabase } from '@/lib/supabase/client';

interface UpdateProfileInput {
  userId: string;
  name: string;
}

export const updateProfileName = async (input: UpdateProfileInput): Promise<void> => {
  const trimmed = input.name.trim();
  
  if (!trimmed) {
    throw new Error('Name cannot be empty');
  }
  
  if (trimmed.length > 60) {
    throw new Error('Name is too long (max 60 characters)');
  }
  
  const { error } = await supabase
    .from('profiles')
    .update({ name: trimmed })
    .eq('id', input.userId);
  
  if (error) {
    console.error('Failed to update profile name:', error);
    throw error;
  }
};

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 1 * 1024 * 1024; // 1MB

interface UploadAvatarInput {
  file: File;
  userId: string;
}

interface UploadAvatarResult {
  publicUrl: string;
  path: string;
}

export const uploadProfileAvatar = async (
  input: UploadAvatarInput
): Promise<UploadAvatarResult> => {
  const { file, userId } = input;
  
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WebP images are allowed');
  }
  
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error('Avatar must be under 1 MB');
  }
  
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileId = crypto.randomUUID();
  const filePath = `${userId}/${fileId}.${extension}`;
  
  const { error: uploadError } = await supabase.storage
    .from('profile-avatars')
    .upload(filePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  
  if (uploadError) {
    console.error('Avatar upload failed:', uploadError);
    throw new Error(uploadError.message || 'Failed to upload avatar');
  }
  
  const { data } = supabase.storage
    .from('profile-avatars')
    .getPublicUrl(filePath);
  
  if (!data?.publicUrl) {
    throw new Error('Upload succeeded but URL could not be generated');
  }
  
  return {
    publicUrl: data.publicUrl,
    path: filePath,
  };
};

interface UpdateAvatarUrlInput {
  userId: string;
  avatarUrl: string | null;
}

export const updateProfileAvatarUrl = async (input: UpdateAvatarUrlInput): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: input.avatarUrl })
    .eq('id', input.userId);
  
  if (error) {
    console.error('Failed to update avatar URL:', error);
    throw error;
  }
};
