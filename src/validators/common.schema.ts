import { z } from 'zod';

const commonPinPattern = /^(?!.*(.)\1{2})(?!012345|123456|234567|345678|456789|567890|654321|543210|432109|321098|210987|109876|987654|876543|765432|654321|543210|432109|321098|210987)(?!123456|111111|000000)\d{6}$/;

function shouldEnforceStrongPins() {
  return process.env.NODE_ENV === 'production';
}

export const pinSchema = z
  .string()
  .trim()
  .min(6, 'PIN minimal 6 digit')
  .max(6, 'PIN maksimal 6 digit')
  .regex(/^\d+$/, 'PIN hanya boleh angka')
  .refine((value) => {
    if (!shouldEnforceStrongPins()) {
      return true;
    }

    return commonPinPattern.test(value);
  }, 'PIN terlalu umum atau tidak aman');

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username minimal 3 karakter')
  .max(50, 'Username maksimal 50 karakter')
  .regex(/^[A-Za-z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore');
