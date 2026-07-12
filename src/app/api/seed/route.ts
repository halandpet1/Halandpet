import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPin } from '@/lib/auth';
import { ensureDevelopmentSeed } from '@/lib/dev-auth';

function generateSeedPin() {
  const digits = '0123456789';
  return Array.from({ length: 6 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
}

function isSeedRequestAuthorized(request: Request) {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const configuredToken = process.env.SEED_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }

  const token = request.headers.get('x-seed-token')?.trim();
  return token === configuredToken;
}

export async function POST(request: Request) {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ ok: false, message: 'Seed is unavailable during build' }, { status: 500 });
  }

  if (!isSeedRequestAuthorized(request)) {
    return NextResponse.json({ ok: false, message: 'Seed access denied' }, { status: 403 });
  }

  if (!db) {
    const seed = await ensureDevelopmentSeed();
    return NextResponse.json({ ok: true, message: 'Development seed initialized', user: seed });
  }

  const existingOwner = await db.user.findFirst({ where: { role: 'OWNER' } });
  if (existingOwner) {
    return NextResponse.json({ ok: true, message: 'Seed already initialized' });
  }

  const seedPin = generateSeedPin();
  const owner = await db.user.create({
    data: {
      username: 'owner',
      pinHash: await hashPin(seedPin),
      fullName: 'Owner HaLand',
      role: 'OWNER',
      mustChangePin: true,
    },
  });

  const seedUsers = [
    {
      username: 'admin',
      pinHash: await hashPin(seedPin),
      fullName: 'Admin HaLand',
      role: 'ADMIN',
      mustChangePin: true,
    },
    {
      username: 'doctor',
      pinHash: await hashPin(seedPin),
      fullName: 'Dr. HaLand',
      role: 'DOCTOR',
      mustChangePin: true,
    },
    {
      username: 'cashier',
      pinHash: await hashPin(seedPin),
      fullName: 'Kasir HaLand',
      role: 'CASHIER',
      mustChangePin: true,
    },
    {
      username: 'staff',
      pinHash: await hashPin(seedPin),
      fullName: 'Staff HaLand',
      role: 'STAFF',
      mustChangePin: true,
    },
  ];

  await db.user.createMany({
    data: seedUsers.map((user) => ({
      username: user.username,
      pinHash: user.pinHash,
      fullName: user.fullName,
      role: user.role as 'ADMIN' | 'DOCTOR' | 'CASHIER' | 'STAFF',
      mustChangePin: user.mustChangePin,
    })),
    skipDuplicates: true,
  });
  await db.clinicSetting.create({
    data: {
      clinicName: 'HaLand PetCare',
      address: 'Jakarta',
      phone: '081234567890',
      taxRate: 10,
      currency: 'IDR',
      isOpen: true,
    },
  });

  const customerUser = await db.user.create({
    data: {
      username: 'customer',
      pinHash: await hashPin(seedPin),
      fullName: 'Walk-In Customer',
      role: 'CUSTOMER',
      mustChangePin: false,
    },
  });

  await db.customer.create({
    data: {
      name: 'Walk-In Customer',
      phone: '081111111111',
      email: 'customer@example.com',
      address: 'Bandung, Indonesia',
      notes: 'Default walk-in customer',
      isWalkIn: true,
      userId: customerUser.id,
      createdBy: owner.id,
    },
  });

  return NextResponse.json({
    ok: true,
    seedPin,
    users: [
      {
        id: owner.id,
        username: owner.username,
        fullName: owner.fullName,
        role: owner.role,
        mustChangePin: true,
      },
      ...seedUsers.map((user) => ({ username: user.username, fullName: user.fullName, role: user.role, mustChangePin: true })),
    ],
  });
}
