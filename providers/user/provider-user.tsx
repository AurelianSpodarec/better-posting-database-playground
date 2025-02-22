'use client';

import { ReactNode } from 'react';
import { UserContext } from './useUser';

export function ProviderUser({ children, user }: { children: ReactNode; user: any }) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}
