import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, Fingerprint, Loader2 } from 'lucide-react'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { useSocialLoginStore } from '@/store/useSocialLoginStore'
import { useBiometricStore } from '@/store/useBiometricStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null)
  const location = useLocation()
  const [error, setError] = useState<string | null>(
    (location.state as any)?.error ?? null
  )
  // Read force-logout reason written by App.tsx before clearing auth state
  const [logoutReason] = useState<string | null>(() => {
    const reason = sessionStorage.getItem('logout_reason')
    if (reason) sessionStorage.removeItem('logout_reason')
    return reason
  })
  const [name, setName] = useState('')
  const [role, setRole] = useState('user')
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()
  const { appName, appIcon } = useAppInfoStore()
  const { socialLoginEnabled, fetch: fetchSocialLogin } = useSocialLoginStore()
  const {
    biometricEnabled,
    isSupported,
    hasCredential,
    checkSupport,
    fetch: fetchBiometric,
    register,
    authenticate,
    cacheSession,
  } = useBiometricStore()

  // Biometric-specific state
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [pendingRefreshToken, setPendingRefreshToken] = useState<string | null>(null)

  useEffect(() => {
    fetchSocialLogin()
    checkSupport()
    fetchBiometric()
  }, [])

  const [showMfa, setShowMfa] = useState((location.state as any)?.requireMfa ?? false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')

  useEffect(() => {
    if (showMfa && !mfaFactorId) {
      supabase.auth.mfa.listFactors().then(({ data }) => {
        if (data && data.totp.length > 0) {
          setMfaFactorId(data.totp[0].id)
        }
      })
    }
  }, [showMfa, mfaFactorId])

  /** Checks account status. Calls onSuccess() instead of navigating if provided. */
  const checkProfileAndNavigate = async (userId: string, onSuccess?: () => void) => {
    const { data: profile } = await supabase.from('users').select('status').eq('id', userId).maybeSingle()
    if (!profile) {
      await supabase.auth.signOut()
      setError('Account setup incomplete. Please contact an administrator.')
      return false
    }
    if (profile.status === 'pending') {
      await supabase.auth.signOut()
      setError('Your account is pending admin approval.')
      return false
    }
    if (profile && profile.status === 'inactive') {
      await supabase.auth.signOut()
      setError('Your account has been deactivated.')
      return false
    }
    if (onSuccess) {
      onSuccess()
    } else {
      navigate('/dashboard')
    }
    return true
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode
      })
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await checkProfileAndNavigate(user.id)
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code.')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    setOauthLoading(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
    // On success the browser redirects — no need to do anything further
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || 'System User',
              role: role,
              status: 'pending'
            }
          }
        })
        if (error) throw error
        if (data.user) {
          // The database trigger 'handle_new_user' will automatically create the public.users row with status 'pending'
          await supabase.auth.signOut()
          setError('Registration successful. Your account is pending admin approval.')
          setIsSignUp(false)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        if (data.user) {
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
            const { data: factors } = await supabase.auth.mfa.listFactors()
            if (factors && factors.totp.length > 0) {
              setMfaFactorId(factors.totp[0].id)
              setShowMfa(true)
              setLoading(false)
              return
            }
          }
          // After profile check succeeds, decide whether to offer biometric registration
          await checkProfileAndNavigate(data.user.id, async () => {
            if (biometricEnabled && isSupported && !hasCredential) {
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.refresh_token) {
                setPendingRefreshToken(session.refresh_token)
                setShowBiometricPrompt(true)
                return
              }
            }
            navigate('/dashboard')
          })
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.')
    } finally {
      setLoading(false)
    }
  }

  /** Called when the user taps "Sign in with Biometric" on the login screen. */
  const handleBiometricLogin = async () => {
    setBiometricLoading(true)
    setError(null)
    try {
      const result = await authenticate()
      if (!result) {
        // User cancelled the biometric dialog
        return
      }

      // ── Strategy ──────────────────────────────────────────────────────────────
      // Supabase rotates refresh tokens on every auto-refresh.  If the app was
      // reopened after a period of inactivity, Supabase will have already
      // consumed (and rotated) the token we cached at last login — so using the
      // cached token directly causes a 400.
      //
      // Fix: check if the Supabase JS client already holds a live session in its
      // own storage.  If it does, the WebAuthn challenge already proved the user
      // is who they say they are — just use that session directly and re-sync our
      // cache.  Only fall back to the cached refresh token when there is no
      // existing session.
      // ─────────────────────────────────────────────────────────────────────────

      const { data: { session: existingSession } } = await supabase.auth.getSession()

      let finalSession = existingSession

      if (!finalSession) {
        // No live session — try restoring via the cached biometric refresh token
        if (!result.refreshToken) {
          setError('Biometric session has expired. Please sign in with your password to renew.')
          if (result.email) setEmail(result.email)
          return
        }

        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: result.refreshToken,
        })

        if (error || !data.session) {
          // Clear the stale token so subsequent attempts don't keep hitting 400.
          // The next password login will re-cache a fresh one.
          localStorage.removeItem('app-biometric-session')
          setError('Your biometric session has expired. Please sign in with your password.')
          if (result.email) setEmail(result.email)
          return
        }

        finalSession = data.session
      }

      // Keep our biometric cache in sync with whichever token we just used
      cacheSession(finalSession.refresh_token)

      await checkProfileAndNavigate(finalSession.user.id)
    } catch (err: any) {
      setError(err.message || 'Biometric authentication failed. Please use your password.')
    } finally {
      setBiometricLoading(false)
    }
  }

  /** Called when the user accepts the "Enable Biometric Login?" prompt after password login. */
  const handleRegisterBiometric = async () => {
    if (!pendingRefreshToken) {
      navigate('/dashboard')
      return
    }
    setBiometricLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/dashboard'); return }

      const { data: profileData } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .maybeSingle()

      await register(
        user.id,
        profileData?.name || user.email || 'User',
        user.email || '',
        pendingRefreshToken,
      )
    } catch (err: any) {
      // NotAllowedError means user cancelled — still go to dashboard
      if (err.name !== 'NotAllowedError') {
        console.error('Biometric registration error:', err)
      }
    } finally {
      setBiometricLoading(false)
      navigate('/dashboard')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md p-4">
        <div className="flex items-center justify-center mb-8 gap-2">
          {appIcon ? (
            <img src={appIcon} alt="App Logo" className="w-12 h-12 object-contain" />
          ) : (
            <div className="p-2 bg-primary rounded-lg text-primary-foreground">
              <Truck size={32} />
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{appName}</h1>
        </div>

        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold tracking-tight text-center">
              {showBiometricPrompt
                ? 'Enable Biometric Login?'
                : showMfa
                ? 'Two-Factor Authentication'
                : isSignUp
                ? 'Create An Account'
                : 'Welcome back'}
            </CardTitle>
            <CardDescription className="text-center">
              {showBiometricPrompt
                ? 'Use your fingerprint or Face ID to sign in instantly next time'
                : showMfa
                ? 'Enter the code from your authenticator app'
                : isSignUp
                ? 'Register for a new account'
                : 'Enter your email to sign in to your account'}
            </CardDescription>
          </CardHeader>

          {/* ── Biometric Registration Prompt (shown after successful password login) ── */}
          {showBiometricPrompt ? (
            <CardContent className="space-y-6 pt-2 pb-6">
              {/* Animated fingerprint icon */}
              <div className="flex flex-col items-center gap-5 py-4">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-28 h-28 rounded-full bg-blue-400/20 animate-ping" />
                  <span className="absolute w-20 h-20 rounded-full bg-blue-400/10 animate-ping [animation-delay:200ms]" />
                  <div className="relative w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 flex items-center justify-center z-10">
                    <Fingerprint size={40} className="text-blue-500" />
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Sign in instantly with your device's sensor
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Works with fingerprint, Face ID, and Windows Hello. You can always fall back to your password.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  id="biometric-register-confirm"
                  type="button"
                  onClick={handleRegisterBiometric}
                  disabled={biometricLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {biometricLoading
                    ? <Loader2 size={18} className="animate-spin" />
                    : <Fingerprint size={18} />}
                  {biometricLoading ? 'Setting up...' : 'Enable Biometric Login'}
                </button>
                <button
                  id="biometric-register-skip"
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  disabled={biometricLoading}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                >
                  Not Now
                </button>
              </div>
              <p className="text-xs text-center text-slate-400">
                You can enable this later in <span className="font-medium">Settings → Security &amp; Auth</span>
              </p>
            </CardContent>
          ) : (
            /* ── Normal Login / MFA Form ── */
            <form onSubmit={showMfa ? handleMfaVerify : handleAuth}>
              <CardContent className="space-y-4">
              {/* Force-logout / deactivation notice */}
                {logoutReason && (
                  <div className="p-3 text-sm rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>{logoutReason}</span>
                  </div>
                )}
                {error && (
                  <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                    {error}
                  </div>
                )}
                
                {showMfa ? (
                  <div className="space-y-2">
                    <Label htmlFor="mfaCode">Authentication Code</Label>
                    <Input
                      id="mfaCode"
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      required
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="text-center tracking-widest font-mono text-lg"
                    />
                  </div>
                ) : (
                  <>
                    {isSignUp && (
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          required={isSignUp}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {!isSignUp && (
                          <Link
                            to="/forgot-password"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Forgot password?
                          </Link>
                        )}
                      </div>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {isSignUp && (
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <select
                          id="role"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {showMfa
                    ? (loading ? 'Verifying...' : 'Verify Code')
                    : loading
                    ? (isSignUp ? 'Signing up...' : 'Signing in...')
                    : (isSignUp ? 'Sign up' : 'Sign in')}
                </Button>

                {/* ── Biometric Login Button (shown when this device has a registered credential) ── */}
                {!showMfa && !isSignUp && biometricEnabled && isSupported && hasCredential && (
                  <button
                    id="biometric-login-btn"
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={biometricLoading}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-95 disabled:opacity-60"
                  >
                    {biometricLoading
                      ? <Loader2 size={18} className="animate-spin" />
                      : <Fingerprint size={18} />}
                    {biometricLoading ? 'Verifying...' : 'Sign in with Biometric'}
                  </button>
                )}

                {!showMfa && !isSignUp && socialLoginEnabled && (
                  <>
                    <div className="relative w-full flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-400 shrink-0">or continue with</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      {/* Google */}
                      <button
                        type="button"
                        disabled={!!oauthLoading}
                        onClick={() => handleOAuthSignIn('google')}
                        className="flex items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                      >
                        {oauthLoading === 'google' ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        )}
                        Google
                      </button>

                      {/* Facebook */}
                      <button
                        type="button"
                        disabled={!!oauthLoading}
                        onClick={() => handleOAuthSignIn('facebook')}
                        className="flex items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                      >
                        {oauthLoading === 'facebook' ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#1877F2" aria-hidden="true">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        )}
                        Facebook
                      </button>
                    </div>
                    <p className="text-xs text-center text-slate-400">
                      Social login requires an approved account. New OAuth sign-ins will be submitted for admin review.
                    </p>
                  </>
                )}

                {!showMfa && (
                  <div className="text-sm text-center text-slate-500">
                    {isSignUp ? 'Already have an account? ' : 'Need an admin account? '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp)
                        setError(null)
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      {isSignUp ? 'Sign in' : 'Sign up'}
                    </button>
                  </div>
                )}
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
