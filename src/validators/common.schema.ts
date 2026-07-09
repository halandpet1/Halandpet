import { z } from 'zod';

export const pinSchema = z.string().length(6, 'PIN harus 6 digit').regex(/^\d+$/, 'PIN hanya boleh angka');

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username minimal 3 karakter')
  .max(50, 'Username maksimal 50 karakter')
  .regex(/^[A-Za-z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore');
