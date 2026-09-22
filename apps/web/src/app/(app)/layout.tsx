'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppStore } from '../../lib/store';
import { Lock } from 'lucide-react';

export default function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, initSession } = useAppStore();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      await initSession();
      if (!isMounted) return;

      const storeUser = useAppStore.getState().currentUser;
      const token = typeof window !== 'undefined' ? localStorage.getItem('lifelink_token') : null;
      // Only treat token as valid if it's a real JWT (not a stale demo-token-*)
      const hasValidToken = token && !token.startsWith('demo-token-');

      if (!storeUser || !hasValidToken) {
        // Clear stale artifacts and redirect
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lifelink_token');
          localStorage.removeItem('lifelink_persona_phone');
        }
        router.replace('/login');
      } else {
        setIsAuthorized(true);
      }

    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [initSession, router, pathname]);

  if (!isAuthorized || !currentUser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-7 h-7 rounded-full border-2 border-neutral-700 border-t-neutral-300 animate-spin"></div>
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
          <Lock className="w-3.5 h-3.5 text-neutral-500" />
          <span>Verifying session authorization...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
