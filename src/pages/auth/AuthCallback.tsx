import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Truck } from 'lucide-react'

/**
 * AuthCallback — handles the OAuth redirect from Google / Facebook.
 * After Supabase exchanges the code for a session, we check the user's
 * status in the `users` table before allowing navigation to the dashboard.
 * Unapproved or pending users are immediately signed out.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Verifying your account...')

  useEffect(() => {
    const handle = async () => {
      // Supabase has already exchanged the code for a session by the time
      // this component mounts (it handles the URL hash/query automatically).
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session?.user) {
        setMessage('Authentication failed. Redirecting...')
        setTimeout(() => navigate('/login'), 2000)
        return
      }

      // Check MFA requirement
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
        // Requires MFA, redirect back to login and let login handle the challenge
        navigate('/login', { state: { requireMfa: true } })
        return
      }

      const userId = session.user.id

      // Check if the user exists in our users table and is approved
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('status, role, name')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        await supabase.auth.signOut()
        navigate('/login', { state: { error: 'Failed to verify account. Please try again.' } })
        return
      }

      // No profile row means the trigger failed somehow, this is an error
      if (!profile) {
        console.error('Failed to find user profile after OAuth signup')

        await supabase.auth.signOut()
        navigate('/login', {
          state: {
            error: 'Your account is pending admin approval. You will be notified once approved.',
          },
        })
        return
      }

      // Existing user — enforce status check
      if (profile.status === 'pending') {
        await supabase.auth.signOut()
        navigate('/login', {
          state: { error: 'Your account is pending admin approval.' },
        })
        return
      }

      if (profile.status === 'inactive') {
        await supabase.auth.signOut()
        navigate('/login', {
          state: { error: 'Your account has been deactivated. Contact an administrator.' },
        })
        return
      }

      // All good — approved user
      navigate('/dashboard')
    }

    handle()
  }, [navigate])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center space-y-4 animate-pulse">
        <Truck className="h-12 w-12 text-blue-600" />
        <p className="text-lg font-medium text-slate-500">{message}</p>
      </div>
    </div>
  )
}
