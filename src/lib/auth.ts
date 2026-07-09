import { compare, hash } from 'bcryptjs';

export async function hashPin(pin: string) {
  return hash(pin, 10);
}

export async function verifyPin(pin: string, pinHash: string) {
  return compare(pin, pinHash);
}
