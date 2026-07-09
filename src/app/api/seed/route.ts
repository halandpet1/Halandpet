import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPin } from '@/lib/auth';

export async function POST() {
  if (!db || process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ ok: false, message: 'Seed is unavailable during build' }, { status: 500 });
  }

  const existingOwner = await db.user.findFirst({ where: { role: 'OWNER' } });
  if (existingOwner) {
    return NextResponse.json({ ok: true, message: 'Seed already initialized' });
  }

  const owner = await db.user.create({
    data: {
      username: 'owner',
      pinHash: await hashPin('123456'),
      fullName: 'Owner HaLand',
      role: 'OWNER',
      mustChangePin: true,
    },
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

  await db.customer.create({
    data: {
      name: 'Walk-In Customer',
      phone: '081111111111',
      notes: 'Default walk-in customer',
      isWalkIn: true,
      createdBy: owner.id,
    },
  });

  return NextResponse.json({ ok: true, owner });
}
