import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export const useAuthListener = () => {
  const setAuth = useAuthStore((state) => state.setAuth)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  useEffect(() => {
    // On mount: ask Supabase what the current session is
    // This forces Supabase to restore the session from localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('Restored session for:', session.user.email)
        setAuth(session.user, session)
      } else {
        console.log('No session to restore')
        clearAuth()
      }
    })

    // Listen for future auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, '- user:', session?.user?.email)
      if (session?.user) {
        setAuth(session.user, session)
      } else {
        clearAuth()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setAuth, clearAuth])
}
