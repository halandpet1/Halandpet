import { hashPin, verifyPin } from '@/lib/auth';

export type DevelopmentAuthUser = {
  id: string;
  username: string;
  role: 'OWNER' | 'ADMIN' | 'DOCTOR' | 'CASHIER' | 'STAFF' | 'CUSTOMER';
  fullName: string;
  pinHash: string;
  mustChangePin: boolean;
};

const DEV_SEED = {
  owner: {
    id: 'dev-owner',
    username: 'owner',
    fullName: 'Owner HaLand',
    role: 'OWNER' as const,
    pinHash: '',
    mustChangePin: true,
  },
  customer: {
    id: 'dev-customer',
    username: 'customer',
    fullName: 'Walk-In Customer',
    role: 'CUSTOMER' as const,
    pinHash: '',
    mustChangePin: false,
  },
};

let seeded = false;

function isDevelopmentEnvironment() {
  return process.env.NODE_ENV !== 'production';
}

async function hydratePinHashes() {
  if (!seeded) {
    DEV_SEED.owner.pinHash = await hashPin('123456');
    DEV_SEED.customer.pinHash = await hashPin('123456');
    seeded = true;
  }
}

export async function ensureDevelopmentSeed() {
  if (!isDevelopmentEnvironment()) {
    return null;
  }

  await hydratePinHashes();
  return DEV_SEED.owner;
}

export async function getDevelopmentAuthUser(username: string) {
  if (!isDevelopmentEnvironment()) {
    return null;
  }

  await hydratePinHashes();

  if (username === DEV_SEED.owner.username) {
    return DEV_SEED.owner;
  }

  if (username === DEV_SEED.customer.username) {
    return DEV_SEED.customer;
  }

  return null;
}

export async function verifyDevelopmentPin(username: string, pin: string) {
  const user = await getDevelopmentAuthUser(username);
  if (!user) {
    return false;
  }

  return verifyPin(pin, user.pinHash);
}

export function resetDevelopmentSeedForTests() {
  seeded = false;
  DEV_SEED.owner.pinHash = '';
  DEV_SEED.customer.pinHash = '';
}
