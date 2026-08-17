import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, Fingerprint, Loader2 } from 'lucide-react'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { useSocialLoginStore } from '@/store/useSocialLoginStore'
import { useBiometricStore } from '@/store/useBiometricStore'
import { useSecurityPolicyStore } from '@/store/useSecurityPolicyStore'



export default function Login({ mode = 'estate' }: { mode?: 'admin' | 'estate' }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { estateCodeParam } = useParams<{ estateCodeParam?: string }>()

  // ── Admin login fields ──
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('user')

  // ── Estate login fields ──
  const [estateCode, setEstateCode] = useState(estateCodeParam || '')
  const [estateUsername, setEstateUsername] = useState('')
  const [estatePassword, setEstatePassword] = useState('')

  // ── Shared state ──
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | 'github' | null>(null)
  const [error, setError] = useState<string | null>((location.state as any)?.error ?? null)
  const [logoutReason] = useState<string | null>(() => {
    const reason = sessionStorage.getItem('logout_reason')
    if (reason) sessionStorage.removeItem('logout_reason')
    return reason
  })

  // ── MFA ──
  const [showMfa, setShowMfa] = useState((location.state as any)?.requireMfa ?? false)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaFactorId, setMfaFactorId] = useState('')

  // ── Biometric ──
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  const { appName, appIcon } = useAppInfoStore()
  const { isProviderActive, fetch: fetchSocialLogin } = useSocialLoginStore()
  const {
    biometricEnabled,
    isSupported,
    hasCredential,
    checkSupport,
    fetch: fetchBiometric,
    register,
    authenticate,
  } = useBiometricStore()

  useEffect(() => {
    fetchSocialLogin()
    checkSupport()
    fetchBiometric()
  }, [])

  useEffect(() => {
    if (showMfa && !mfaFactorId) {
      supabase.auth.mfa.listFactors().then(({ data }) => {
        if (data && data.totp.length > 0) setMfaFactorId(data.totp[0].id)
      })
    }
  }, [showMfa, mfaFactorId])

  // ── Lockout helpers (admin mode only) ──
  const checkLockout = () => {
    const policy = useSecurityPolicyStore.getState().policy
    const key = `auth_failures_${email.toLowerCase()}`
    const failuresStr = localStorage.getItem(key)
    if (!failuresStr) return false
    const failures: number[] = JSON.parse(failuresStr)
    const recentFailures = failures.filter(t => Date.now() - t < policy.lockoutDurationMinutes * 60000)
    localStorage.setItem(key, JSON.stringify(recentFailures))
    return recentFailures.length >= policy.maxLoginAttempts
  }

  const recordFailure = (key: string) => {
    const failuresStr = localStorage.getItem(key)
    const failures: number[] = failuresStr ? JSON.parse(failuresStr) : []
    failures.push(Date.now())
    localStorage.setItem(key, JSON.stringify(failures))
  }

  const clearFailures = (key: string) => localStorage.removeItem(key)

  // ── After login: check profile, then navigate ──
  const checkProfileAndNavigate = async (userId: string, onSuccess?: () => void) => {
    const { data: profile, error } = await supabase.from('users').select('status').eq('id', userId).maybeSingle()
    if (error) {
      console.error('Login checkProfileAndNavigate error:', error);
    }
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
    if (profile.status === 'inactive') {
      await supabase.auth.signOut()
      setError('Your account has been deactivated.')
      return false
    }
    if (onSuccess) onSuccess()
    else navigate('/dashboard')
    return true
  }

  // ── MFA verify ──
  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode })
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await checkProfileAndNavigate(user.id)
    } catch (err: any) {
      setError(err.message || 'Invalid code.')
    } finally {
      setLoading(false)
    }
  }

  // ── OAuth ──
  const handleOAuthSignIn = async (provider: 'google' | 'facebook' | 'github') => {
    setOauthLoading(provider)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } })
    if (error) { setError(error.message); setOauthLoading(null) }
  }

  // ══════════════════════════════════════════════════════
  // ADMIN LOGIN HANDLER
  // ══════════════════════════════════════════════════════
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    const lockoutKey = `auth_failures_${email.toLowerCase()}`
    if (checkLockout()) {
      const policy = useSecurityPolicyStore.getState().policy
      setError(`Account locked. Try again in ${policy.lockoutDurationMinutes} minutes.`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (isSignUp) {
        const minLen = useSecurityPolicyStore.getState().policy.minPasswordLength
        if (password.length < minLen) { setError(`Password must be at least ${minLen} characters.`); setLoading(false); return }
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name: name || 'System User', role, status: 'pending' } } })
        if (error) throw error
        if (data.user) { await supabase.auth.signOut(); setError('Registration successful. Pending admin approval.'); setIsSignUp(false) }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { recordFailure(lockoutKey); throw error }
        clearFailures(lockoutKey)
        if (data.user) {
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
          if (aalData?.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
            const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors()
            if (!mfaError && factors?.totp && factors.totp.length > 0) { setMfaFactorId(factors.totp[0].id); setShowMfa(true); setLoading(false); return }
          }
          await checkProfileAndNavigate(data.user.id, async () => {
            if (biometricEnabled && isSupported && !hasCredential) { setShowBiometricPrompt(true); return }
            navigate('/dashboard')
          })
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  // ══════════════════════════════════════════════════════
  // ESTATE LOGIN HANDLER
  // Estate Code + Username + Password
  // Supabase email = {username}@{estateCode.toLowerCase()}.local
  // ══════════════════════════════════════════════════════
  const handleEstateLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!estateCode.trim()) { setError('Please enter your Estate Code.'); return }
    if (!estateUsername.trim()) { setError('Please enter your Username.'); return }
    if (!estatePassword.trim()) { setError('Please enter your Password.'); return }

    setLoading(true)
    setError(null)

    try {
      // 1. Construct synthetic email from username + estate code
      const syntheticEmail = `${estateUsername.trim().toLowerCase()}@${estateCode.toLowerCase().trim()}.local`

      // 3. Sign in with Supabase using synthetic email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: estatePassword,
      })
      if (error) {
        // Give a friendly message rather than "Invalid login credentials"
        setError('Incorrect username or password. Please try again.')
        setLoading(false)
        return
      }

      if (data.user) {
        // 4. Verify this user actually belongs to this estate
        const { data: profile } = await supabase
          .from('users')
          .select('status, estate_id, role, estates(status)')
          .eq('id', data.user.id)
          .maybeSingle()

        if (!profile) {
          await supabase.auth.signOut()
          setError('Account not found. Please contact your estate administrator.')
          return
        }
        if (profile.status === 'pending') {
          await supabase.auth.signOut()
          setError('Your account is pending approval.')
          return
        }
        if (profile.status === 'inactive') {
          await supabase.auth.signOut()
          setError('Your account has been deactivated.')
          return
        }
        
        // Also check if the estate itself is inactive
        if (profile.estates && (profile.estates as any).status === 'inactive') {
          await supabase.auth.signOut()
          setError('Your estate account has been deactivated. Please contact support.')
          return
        }

        // 5. Success! Navigate to dashboard
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Biometric ──
  const handleBiometricLogin = async () => {
    setBiometricLoading(true)
    setError(null)
    try {
      const success = await authenticate()
      if (!success) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session) await checkProfileAndNavigate(session.user.id)
      else setError('Session could not be established. Please sign in with your password.')
    } catch (err: any) {
      setError(err.message || 'Biometric authentication failed.')
    } finally {
      setBiometricLoading(false)
    }
  }

  const handleRegisterBiometric = async () => {
    setBiometricLoading(true)
    try {
      const success = await register()
      if (!success) console.warn('Biometric registration cancelled')
    } catch (err: any) {
      console.error('Biometric registration error:', err)
    } finally {
      setBiometricLoading(false)
      navigate('/dashboard')
    }
  }

  // ── Shared error / logout notice ──
  const NoticeBlock = () => (
    <>
      {logoutReason && (
        <div className="p-3 text-sm rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{logoutReason}</span>
        </div>
      )}
      {error && (
        <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">{error}</div>
      )}
    </>
  )

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md p-4">
        {/* ── App Logo & Name ── */}
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
              {showBiometricPrompt ? 'Enable Biometric Login?'
                : showMfa ? 'Two-Factor Authentication'
                : mode === 'estate' ? 'Estate Sign In'
                : isSignUp ? 'Create Admin Account'
                : 'Admin Sign In'}
            </CardTitle>
            <CardDescription className="text-center">
              {showBiometricPrompt ? 'Use your fingerprint or Face ID to sign in instantly next time'
                : showMfa ? 'Enter the code from your authenticator app'
                : mode === 'estate' ? 'Enter your Estate Code, Username and Password'
                : isSignUp ? 'Register a new administrator account'
                : 'Sign in with your admin email and password'}
            </CardDescription>
          </CardHeader>

          {/* ── Biometric Prompt ── */}
          {showBiometricPrompt ? (
            <CardContent className="space-y-6 pt-2 pb-6">
              <div className="flex flex-col items-center gap-5 py-4">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-28 h-28 rounded-full bg-blue-400/20 animate-ping" />
                  <span className="absolute w-20 h-20 rounded-full bg-blue-400/10 animate-ping [animation-delay:200ms]" />
                  <div className="relative w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 flex items-center justify-center z-10">
                    <Fingerprint size={40} className="text-blue-500" />
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sign in instantly with your device's sensor</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Works with fingerprint, Face ID, and Windows Hello.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button id="biometric-register-confirm" type="button" onClick={handleRegisterBiometric} disabled={biometricLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50">
                  {biometricLoading ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
                  {biometricLoading ? 'Setting up...' : 'Enable Biometric Login'}
                </button>
                <button id="biometric-register-skip" type="button" onClick={() => navigate('/dashboard')} disabled={biometricLoading}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
                  Not Now
                </button>
              </div>
              <p className="text-xs text-center text-slate-400">You can enable this later in <span className="font-medium">Settings → Security & Auth</span></p>
            </CardContent>

          ) : mode === 'estate' && !showMfa ? (
            /* ══════════════════════════════════════════ */
            /* ESTATE LOGIN FORM */
            /* ══════════════════════════════════════════ */
            <form onSubmit={handleEstateLogin}>
              <CardContent className="space-y-4">
                <NoticeBlock />

                {/* Estate Code */}
                {!estateCodeParam && (
                  <div className="space-y-2">
                    <Label htmlFor="estateCode">Estate Code</Label>
                    <Input
                      id="estateCode"
                      type="text"
                      placeholder="e.g. BOGAWANT"
                      required
                      value={estateCode}
                      onChange={e => setEstateCode(e.target.value.toUpperCase())}
                      className="font-mono tracking-widest uppercase text-center text-lg font-bold"
                      maxLength={12}
                      autoComplete="off"
                    />
                  </div>
                )}

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="estateUsername">Username</Label>
                  <Input
                    id="estateUsername"
                    type="text"
                    placeholder="e.g. john_silva"
                    required
                    value={estateUsername}
                    onChange={e => setEstateUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                    autoComplete="username"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="estatePassword">Password</Label>
                  <Input
                    id="estatePassword"
                    type="password"
                    required
                    value={estatePassword}
                    onChange={e => setEstatePassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 p-3 text-xs text-slate-500 dark:text-slate-400">
                  <p>Your Estate Code and Username are provided by your estate administrator.</p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 size={16} className="animate-spin mr-2" />Signing in...</> : 'Sign in to Estate'}
                </Button>

                {/* Biometric for estate users too */}
                {biometricEnabled && isSupported && (
                  <button id="biometric-login-btn" type="button" onClick={handleBiometricLogin} disabled={biometricLoading}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-95 disabled:opacity-60">
                    {biometricLoading ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
                    {biometricLoading ? 'Verifying...' : 'Sign in with Biometric'}
                  </button>
                )}
              </CardFooter>
            </form>

          ) : (
            /* ══════════════════════════════════════════ */
            /* ADMIN LOGIN / MFA FORM */
            /* ══════════════════════════════════════════ */
            <form onSubmit={showMfa ? handleMfaVerify : handleAdminAuth}>
              <CardContent className="space-y-4">
                <NoticeBlock />

                {showMfa ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mfaCode">Authentication Code</Label>
                      <Input id="mfaCode" type="text" maxLength={6} placeholder="000000" required value={mfaCode}
                        onChange={e => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                        className="text-center tracking-widest font-mono text-lg" />
                    </div>
                    <div className="rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-950/20 p-3.5 space-y-2">
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Where to find your code</p>
                      <ol className="space-y-1.5">
                        {['Open Google Authenticator, Authy, or your TOTP app.', 'Find the 6-digit code for this app.', 'Type it above before it expires (every 30 s).'].map((text, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{text}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ) : (
                  <>
                    {isSignUp && (
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" type="text" placeholder="John Doe" required={isSignUp} value={name} onChange={e => setName(e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="admin@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        {!isSignUp && <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>}
                      </div>
                      <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    {isSignUp && (
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <select id="role" value={role} onChange={e => setRole(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
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
                  {showMfa ? (loading ? 'Verifying...' : 'Verify Code')
                    : loading ? (isSignUp ? 'Signing up...' : 'Signing in...')
                    : (isSignUp ? 'Sign up' : 'Sign in')}
                </Button>

                {!showMfa && !isSignUp && biometricEnabled && isSupported && (
                  <button id="biometric-login-btn" type="button" onClick={handleBiometricLogin} disabled={biometricLoading}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all active:scale-95 disabled:opacity-60">
                    {biometricLoading ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
                    {biometricLoading ? 'Verifying...' : 'Sign in with Biometric'}
                  </button>
                )}

                {!showMfa && !isSignUp && (isProviderActive('google') || isProviderActive('facebook') || isProviderActive('github')) && (
                  <>
                    <div className="relative w-full flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                      <span className="text-xs text-slate-400 shrink-0">or continue with</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="flex flex-col gap-2.5 w-full">
                      {isProviderActive('google') && (
                        <button id="social-login-google" type="button" disabled={!!oauthLoading} onClick={() => handleOAuthSignIn('google')}
                          className="group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none overflow-hidden">
                          <span className="absolute inset-0 bg-gradient-to-r from-[#4285F4]/5 via-[#34A853]/5 to-[#EA4335]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                            {oauthLoading === 'google' ? <svg className="animate-spin w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                              : <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
                          </span>
                          <span className="flex-1 text-left">{oauthLoading === 'google' ? 'Redirecting...' : 'Continue with Google'}</span>
                        </button>
                      )}
                      {isProviderActive('facebook') && (
                        <button id="social-login-facebook" type="button" disabled={!!oauthLoading} onClick={() => handleOAuthSignIn('facebook')}
                          className="group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-[#1877F2]/30 dark:hover:border-[#1877F2]/40 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none overflow-hidden">
                          <span className="absolute inset-0 bg-[#1877F2]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <span className="w-5 h-5 shrink-0"><svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></span>
                          <span className="flex-1 text-left">{oauthLoading === 'facebook' ? 'Redirecting...' : 'Continue with Facebook'}</span>
                        </button>
                      )}
                      {isProviderActive('github') && (
                        <button id="social-login-github" type="button" disabled={!!oauthLoading} onClick={() => handleOAuthSignIn('github')}
                          className="group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none overflow-hidden">
                          <span className="absolute inset-0 bg-slate-900/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <span className="w-5 h-5 shrink-0"><svg viewBox="0 0 24 24" className="w-5 h-5 fill-slate-800 dark:fill-slate-200"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg></span>
                          <span className="flex-1 text-left">{oauthLoading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-center text-slate-400">Social login requires an approved account.</p>
                  </>
                )}

                {!showMfa && (
                  <div className="text-sm text-center text-slate-500">
                    {isSignUp ? 'Already have an account? ' : 'Need an admin account? '}
                    <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(null) }} className="text-blue-600 hover:underline">
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
