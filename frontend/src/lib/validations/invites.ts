import { z } from 'zod';

export const emailInviteSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
});

export type EmailInviteFormData = z.infer<typeof emailInviteSchema>;
