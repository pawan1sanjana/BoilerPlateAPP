import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { useSecurityPolicyStore } from '@/store/useSecurityPolicyStore'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { appName, appIcon } = useAppInfoStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const navigate = useNavigate()

  // Supabase sends the user back with a recovery token in the URL fragment.
  // The onAuthStateChange listener picks it up and fires a PASSWORD_RECOVERY event,
  // which establishes a temporary session so we can call updateUser.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if there's already an active session from the token in the URL
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const minLen = useSecurityPolicyStore.getState().policy.minPasswordLength
    if (password.length < minLen) {
      setError(`Password must be at least ${minLen} characters long.`)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md p-4">
          <div className="flex items-center justify-center mb-8 gap-2">
            {appIcon ? (
              <img src={appIcon} alt={`${appName} Logo`} className="w-10 h-10 object-contain" />
            ) : (
              <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                <Truck size={32} />
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{appName}</h1>
          </div>
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6 space-y-4">
              <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                Invalid or expired password reset link. Please request a new one.
              </div>
              <Link
                to="/forgot-password"
                className="block text-center text-sm text-blue-600 hover:underline"
              >
                Request a new reset link
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md p-4">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {appIcon ? (
            <img src={appIcon} alt={`${appName} Logo`} className="w-10 h-10 object-contain" />
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
              Set New Password
            </CardTitle>
            <CardDescription className="text-center">
              {success ? 'Your password has been updated!' : 'Enter and confirm your new password below'}
            </CardDescription>
          </CardHeader>

          {!success ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                    {error}
                  </div>
                )}

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={`Minimum ${useSecurityPolicyStore.getState().policy.minPasswordLength} characters`}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter your new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password strength hints */}
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 pl-1">
                  <li className={password.length >= useSecurityPolicyStore.getState().policy.minPasswordLength ? 'text-green-600 dark:text-green-400' : ''}>
                    {password.length >= useSecurityPolicyStore.getState().policy.minPasswordLength ? '✓' : '•'} At least {useSecurityPolicyStore.getState().policy.minPasswordLength} characters
                  </li>
                  <li className={confirmPassword && password === confirmPassword ? 'text-green-600 dark:text-green-400' : ''}>
                    {confirmPassword && password === confirmPassword ? '✓' : '•'} Passwords match
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-3 p-4 text-sm rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                <CheckCircle2 size={32} className="shrink-0" />
                <p className="text-center font-medium">Password updated successfully!</p>
                <p className="text-center text-xs">You will be redirected to the sign-in page in a moment...</p>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Go to Sign In
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
