'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'teacher' | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch role from Firestore
        const { getUserRole } = await import('@/lib/auth');
        const userRole = await getUserRole(firebaseUser.uid);
        setRole(userRole);
      } else {
        setRole(null);
      }
      
      setLoading(false);
      
      // Auto redirect rules
      if (!firebaseUser && (pathname.startsWith('/dashboard') || pathname.startsWith('/upload'))) {
        router.push('/login');
      } else if (user && (pathname === '/login' || pathname === '/')) {
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  return { user, role, loading };
}
