import { z } from 'zod';

export const createTripSchema = z
  .object({
    name: z.string().min(1, 'Trip name is required').max(100, 'Trip name too long'),
    destination: z.string().min(1, 'Destination is required').max(100),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type CreateTripFormData = z.infer<typeof createTripSchema>;
