import { z } from 'zod';

/** Matches the server's rule: at least 8 characters including a number. */
export const passwordRule = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .regex(/\d/, 'Include at least one number.');
