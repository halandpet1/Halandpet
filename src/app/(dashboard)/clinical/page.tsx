import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/session';
import { ClinicalPageClient } from './clinical-page-client';

export default async function ClinicalPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect('/login');
  }

  return <ClinicalPageClient />;
}
