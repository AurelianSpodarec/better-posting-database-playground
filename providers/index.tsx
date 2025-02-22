'use client'

import { ProviderUser } from "./user/provider-user"

function AppProvider({ children, user }: { children: React.ReactNode, user:any }) {
  return (
    <ProviderUser user={user}>
        {children}
    </ProviderUser>
  )
}

export default AppProvider
