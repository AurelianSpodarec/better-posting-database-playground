import { createContext, useContext } from "react";
import { AuthUser } from '@supabase/supabase-js';

export type TUserContextType = {
  user: AuthUser;
};

export const UserContext = createContext<TUserContextType | null>(null);

export function useUser(): TUserContextType {
  let context = useContext(UserContext);
  if (context === null) {
    throw new Error('useUser must be used within a ProviderUser');
  }
  return context;
}
