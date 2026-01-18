import { z } from 'zod';

export const accountStepSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const personalInfoSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  dateOfBirth: z.string().refine((dob) => {
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / 31536000000);
    return age >= 18;
  }, 'Must be 18 years or older'),
  address: z.object({
    line1: z.string().min(1, 'Street address is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().length(2, 'Use 2-letter state code'),
    zip: z.string().regex(/^\d{5}$/, 'ZIP must be 5 digits'),
  }),
});

export const employmentSchema = z.object({
  employmentType: z.enum(['w2', '1099'], {
    required_error: 'Please select employment type',
  }),
});

export const licenseSchema = z.object({
  number: z.string().min(5, 'Invalid license number'),
  state: z.string().length(2, 'Use 2-letter state code'),
  expiration: z.string().refine((date) => new Date(date) > new Date(), 'License must not be expired'),
  frontUrl: z.string().url('Front photo is required'),
  backUrl: z.string().url('Back photo is required'),
});

export const vehicleSchema = z
  .object({
    type: z.enum(['sedan', 'wheelchair_van', 'stretcher']),
    make: z.string().min(1, 'Make is required'),
    model: z.string().min(1, 'Model is required'),
    year: z.number().min(1990).max(new Date().getFullYear() + 1),
    licensePlate: z.string().min(1, 'License plate is required'),
    color: z.string().optional(),
  })
  .optional();

export const reviewSchema = z.object({
  experienceNotes: z.string().max(1000).optional(),
  referralSource: z.enum(['job_board', 'friend', 'social_media', 'other']).optional(),
  eulaAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the Terms of Service' }),
  }),
});
