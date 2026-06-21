'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MobileNav } from './MobileNav';

export default function MobileNavShell() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide mobile student nav bar inside admin panel routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <MobileNav
      currentPath={pathname || '/'}
      onNavigate={handleNavigate}
      userName="Alex Student"
    />
  );
}
