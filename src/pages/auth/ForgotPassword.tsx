import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, ArrowLeft, MailCheck } from 'lucide-react'
import { useAppInfoStore } from '@/store/useAppInfoStore'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const { appName, appIcon } = useAppInfoStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      // Supabase only sends the email if the address is confirmed.
      // We show a generic success message either way to avoid exposing
      // whether a particular email is registered.
      setSent(true)
      setMessage(
        'If that email address belongs to a confirmed account, you will receive a password reset link shortly. Please check your inbox (and spam folder).'
      )
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
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
              Forgot Password
            </CardTitle>
            <CardDescription className="text-center">
              {sent
                ? 'Check your email for the reset link'
                : 'Enter your email address and we\'ll send you a reset link'}
            </CardDescription>
          </CardHeader>

          {!sent ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  A reset link will only be sent if your email address has been verified on this account.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-6">
              {message && (
                <div className="flex flex-col items-center gap-3 p-4 text-sm rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                  <MailCheck size={32} className="shrink-0" />
                  <p className="text-center">{message}</p>
                </div>
              )}
              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
