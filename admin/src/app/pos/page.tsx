'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPosUser } from '@/lib/posApi';

export default function PosRoot() {
  const router = useRouter();
  useEffect(() => {
    const user = getPosUser();
    router.replace(user ? '/pos/dashboard' : '/pos/login');
  }, [router]);
  return null;
}
