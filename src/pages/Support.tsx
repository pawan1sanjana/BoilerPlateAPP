import { useState, useEffect } from 'react'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'react-hot-toast'
import { 
  Mail, MessageCircle, Phone, HelpCircle, Send, CheckCircle2, 
  AlertCircle, Loader2, Key, Palette, ShieldCheck, Inbox, 
  ChevronDown, User, Lock, Laptop, Info, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

interface FaqItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
  id: string
}

function FaqItem({ question, answer, isOpen, onClick, id }: FaqItemProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 mb-3">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-800 dark:text-slate-100 hover:text-primary transition-colors focus:outline-none"
        aria-expanded={isOpen}
        aria-controls={id}
        id={`btn-${id}`}
      >
        <span className="text-sm md:text-base pr-4">{question}</span>
        <ChevronDown 
          size={18} 
          className={`text-slate-500 shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} 
        />
      </button>
      {isOpen && (
        <div 
          id={id} 
          className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/50 pt-3 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          {answer}
        </div>
      )}
    </div>
  )
}

export default function Support() {
  const appName = useAppInfoStore(s => s.appName)
  const profile = useAuthStore(s => s.profile)
  const isAdmin = profile?.role === 'admin'

  const [activeTab, setActiveTab] = useState<'contact' | 'guide' | 'faq'>('contact')
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  // Support ticket form state
  const [ticketName, setTicketName] = useState('')
  const [ticketEmail, setTicketEmail] = useState('')
  const [ticketCategory, setTicketCategory] = useState('technical')
  const [ticketPriority, setTicketPriority] = useState('medium')
  const [ticketMessage, setTicketMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [ticketId, setTicketId] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Auto-populate user details from auth store
  useEffect(() => {
    if (profile) {
      setTicketName(profile.name || '')
      setTicketEmail(profile.email || '')
    }
  }, [profile])

  const handleStartChat = () => {
    toast.error('Live Chat is currently offline. Please use the Support Ticket form below.')
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    
    if (!ticketName.trim()) {
      errors.name = 'Full name is required'
    }
    if (!ticketEmail.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ticketEmail)) {
      errors.email = 'Invalid email address format'
    }
    if (!ticketMessage.trim()) {
      errors.message = 'Message content is required'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error('Please resolve validation errors in the form.')
      return
    }

    setFormErrors({})
    setIsSubmitting(true)

    // Simulate API request
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const generatedId = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      setTicketId(generatedId)
      setSubmitSuccess(true)
      toast.success('Ticket submitted successfully!')
    } catch {
      toast.error('Failed to submit ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setTicketMessage('')
    setSubmitSuccess(false)
    setTicketId('')
    if (profile) {
      setTicketName(profile.name || '')
      setTicketEmail(profile.email || '')
    } else {
      setTicketName('')
      setTicketEmail('')
    }
    setTicketCategory('technical')
    setTicketPriority('medium')
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          Support Center
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-base">
          Need assistance with {appName}? Explore configuration guides, search the FAQs, or send a direct ticket to our operations team.
        </p>
      </div>

      {/* Modern Theme-Aware Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl max-w-lg w-full shadow-inner">
          <button
            onClick={() => setActiveTab('contact')}
            className={`w-1/3 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'contact'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-md border border-slate-200/50 dark:border-slate-800'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            id="tab-contact"
          >
            <Mail size={16} />
            Contact &amp; Ticket
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`w-1/3 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'guide'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-md border border-slate-200/50 dark:border-slate-800'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            id="tab-guide"
          >
            <BookOpen size={16} />
            Settings Guide
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`w-1/3 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              activeTab === 'faq'
                ? 'bg-white dark:bg-slate-900 text-primary shadow-md border border-slate-200/50 dark:border-slate-800'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            id="tab-faq"
          >
            <HelpCircle size={16} />
            FAQs
          </button>
        </div>
      </div>

      {/* Tab Panel Content */}
      <div className="space-y-6">
        {activeTab === 'contact' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Quick Contact Cards */}
            <div className="grid md:grid-cols-3 gap-5">
              <div className="group bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-500/30 dark:hover:border-blue-500/20">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-full flex items-center justify-center mb-4 transition-colors group-hover:bg-blue-100 dark:group-hover:bg-blue-950/60">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Email Support</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  Send us an email and we will get back to you within 24 hours.
                </p>
                <a href="mailto:support@example.com" className="mt-auto text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold text-sm tracking-wide">
                  support@example.com
                </a>
              </div>

              <div className="group bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-green-500/30 dark:hover:border-green-500/20">
                <div className="w-12 h-12 bg-green-50 dark:bg-green-950/30 text-green-600 rounded-full flex items-center justify-center mb-4 transition-colors group-hover:bg-green-100 dark:group-hover:bg-green-950/60">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Live Chat</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  Chat with our support operators in real-time. Available 9am-5pm EST.
                </p>
                <button 
                  onClick={handleStartChat}
                  className="mt-auto text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-bold text-sm tracking-wide focus:outline-none"
                  id="btn-live-chat"
                >
                  Start Chat
                </button>
              </div>

              <div className="group bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-purple-500/30 dark:hover:border-purple-500/20">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/30 text-purple-600 rounded-full flex items-center justify-center mb-4 transition-colors group-hover:bg-purple-100 dark:group-hover:bg-purple-950/60">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Phone Support</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                  Call our technical line directly for highly urgent production blockages.
                </p>
                <a href="tel:+1234567890" className="mt-auto text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-bold text-sm tracking-wide">
                  +1 (234) 567-890
                </a>
              </div>
            </div>

            {/* Support Ticket Submission Section */}
            <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden rounded-2xl">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800/60 p-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Inbox size={20} className="text-primary" />
                  Submit a Support Ticket
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Submit a query directly to our support desk. We usually reply within a few business hours.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                {!submitSuccess ? (
                  <form onSubmit={handleSubmitTicket} className="space-y-4" id="support-ticket-form">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ticket-name" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Full Name
                        </label>
                        <Input
                          id="ticket-name"
                          type="text"
                          value={ticketName}
                          onChange={(e) => setTicketName(e.target.value)}
                          placeholder="Your name"
                          aria-invalid={!!formErrors.name}
                        />
                        {formErrors.name && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {formErrors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="ticket-email" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Email Address
                        </label>
                        <Input
                          id="ticket-email"
                          type="email"
                          value={ticketEmail}
                          onChange={(e) => setTicketEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          aria-invalid={!!formErrors.email}
                        />
                        {formErrors.email && (
                          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle size={12} />
                            {formErrors.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ticket-category" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Category
                        </label>
                        <select
                          id="ticket-category"
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value)}
                          className="flex h-8 w-full rounded-lg border border-input bg-transparent dark:bg-slate-900 px-2.5 py-1 text-sm outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 text-slate-800 dark:text-slate-100"
                        >
                          <option value="technical">Technical Support</option>
                          <option value="settings">Settings &amp; Config Help</option>
                          <option value="billing">Billing & Access</option>
                          <option value="feature">Feature Request</option>
                          <option value="other">Other Inquiry</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="ticket-priority" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                          Priority
                        </label>
                        <select
                          id="ticket-priority"
                          value={ticketPriority}
                          onChange={(e) => setTicketPriority(e.target.value)}
                          className="flex h-8 w-full rounded-lg border border-input bg-transparent dark:bg-slate-900 px-2.5 py-1 text-sm outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 text-slate-800 dark:text-slate-100"
                        >
                          <option value="low">Low (General Query)</option>
                          <option value="medium">Medium (Requires Review)</option>
                          <option value="high">High (Major Problem)</option>
                          <option value="urgent">Urgent (Operation Blocked)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="ticket-message" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Message Details
                      </label>
                      <Textarea
                        id="ticket-message"
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        placeholder="Please detail your request or describe the issue you are experiencing..."
                        className="min-h-[120px]"
                        aria-invalid={!!formErrors.message}
                      />
                      {formErrors.message && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {formErrors.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto h-9 gap-2 px-6"
                        id="btn-submit-ticket"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Ticket
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8 px-4 space-y-4 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-10 h-10 animate-bounce" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Ticket Submitted!</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                      Thank you. Your request was successfully submitted. An operations engineer will review your ticket shortly.
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 max-w-sm mx-auto shadow-sm">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
                        Your Ticket reference ID
                      </p>
                      <p className="text-lg font-mono font-bold text-slate-950 dark:text-slate-50 tracking-wider">
                        {ticketId}
                      </p>
                    </div>
                    <div className="pt-4">
                      <Button onClick={resetForm} variant="outline" size="sm" id="btn-submit-new-ticket">
                        Submit Another Ticket
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl p-5 flex gap-4">
              <Info size={24} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                <span className="font-bold">Settings Hub Guide: </span>
                This guide provides quick references on how to configure user and system-level operations within the application settings pages. Click on the headings below to check detailed setup steps.
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Profile Card */}
              <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-2xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <User size={18} className="text-blue-500" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-xs text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed">
                  <p>
                    Manage your personal account profile, contact credentials, and custom user photo.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 font-medium pl-1">
                    <li>Go to the <span className="font-bold">Settings</span> dashboard.</li>
                    <li>Ensure you are in the <span className="font-bold">Profile Information</span> tab.</li>
                    <li>Upload your user avatar using the camera preview icon.</li>
                    <li>Update your full name or mobile contact number.</li>
                    <li>Click <span className="font-bold text-primary">Save Profile</span> to apply changes.</li>
                  </ol>
                </CardContent>
              </Card>

              {/* Theme & Prefs Card */}
              <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-2xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Palette size={18} className="text-green-500" />
                    Theme & Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-xs text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed">
                  <p>
                    Customize user interface colors, currencies, and dark mode toggles to tailor your platform experience.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 font-medium pl-1">
                    <li>Navigate to the <span className="font-bold">Preferences</span> section in Settings.</li>
                    <li>Toggle theme modes between <span className="font-bold">Light</span>, <span className="font-bold">Dark</span>, or <span className="font-bold">System Default</span>.</li>
                    <li>Select an accent color (Blue, Green, Purple, Rose, Orange).</li>
                    <li>To choose a localized currency system, switch to the <span className="font-bold">Currency Options</span> tab and pick your default currency.</li>
                  </ol>
                </CardContent>
              </Card>

              {/* MFA Card */}
              <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-2xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Lock size={18} className="text-purple-500" />
                    Two-Factor Authentication (MFA)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-xs text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed">
                  <p>
                    Secure your account credentials using standard time-based one-time password (TOTP) generators.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 font-medium pl-1">
                    <li>Select the <span className="font-bold">Security &amp; Auth</span> tab under Settings.</li>
                    <li>Locate the Two-Factor Authentication box and click <span className="font-bold">Enable MFA</span>.</li>
                    <li>Scan the generated QR code using an app like Google Authenticator or Authy.</li>
                    <li>Enter the current 6-digit dynamic code and click <span className="font-bold text-primary">Verify & Enable</span>.</li>
                  </ol>
                </CardContent>
              </Card>

              {/* Biometrics Card */}
              <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-2xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Key size={18} className="text-amber-500" />
                    Biometric &amp; Passkey Login
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-xs text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed">
                  <p>
                    Register your device face, fingerprint reader, or system PIN to bypass password typing.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 font-medium pl-1">
                    <li>Ensure your operating system supports WebAuthn / Passkeys.</li>
                    <li>Go to Settings &gt; <span className="font-bold">Security &amp; Auth</span>.</li>
                    <li>Click <span className="font-bold">Register Biometric Device</span>.</li>
                    <li>Follow the browser prompt to enroll your credential.</li>
                    <li>Toggle <span className="font-bold">Biometric Login Enabled</span> to activate single-touch login.</li>
                  </ol>
                </CardContent>
              </Card>

              {/* Active Sessions Card */}
              <Card className="border border-slate-200/60 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900 rounded-2xl hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Laptop size={18} className="text-slate-600 dark:text-slate-400" />
                    Active Device Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-xs text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed">
                  <p>
                    Check all devices currently holding a session token for your account and revoke access remotely.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 font-medium pl-1">
                    <li>Navigate to the <span className="font-bold">Active Sessions</span> tab in Settings.</li>
                    <li>Review details like device type, operating system, last active time, and IP addresses.</li>
                    <li>Identify any unauthorized or redundant session entries.</li>
                    <li>Click <span className="font-bold text-red-500">Revoke Session</span> to forcefully sign out that specific device.</li>
                  </ol>
                </CardContent>
              </Card>

              {/* Admin Panel Features Card */}
              <Card className={`border shadow-sm rounded-2xl transition-all duration-300 ${
                isAdmin 
                  ? 'border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/30' 
                  : 'border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 opacity-75'
              }`}>
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-bold flex items-center justify-between text-slate-900 dark:text-white">
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
                      Administrator Controls
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      Admins Only
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-xs text-slate-500 dark:text-slate-400 space-y-3 leading-relaxed">
                  <p>
                    Manage enterprise SMTP parameters, update white-label brand logos/text, toggle global maintenance settings, enable/disable social logins, or adjust access control.
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-700 dark:text-slate-300 font-medium pl-1">
                    <li><span className="font-bold">Email / SMTP</span>: Manage outgoing host addresses, ports, and authorization keys.</li>
                    <li><span className="font-bold">Social Logins</span>: Toggle whether users can register or sign in using Google or Facebook.</li>
                    <li><span className="font-bold">App Branding</span>: Customize the system name, version number, and main branding icons.</li>
                    <li><span className="font-bold">Maintenance Mode</span>: Block user entry for safe system changes.</li>
                    <li><span className="font-bold">Module Access</span>: Tweak role-based permissions matrix.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h3>

            <FaqItem
              id="faq-mfa"
              question="How do I secure my account with Multi-Factor Authentication (MFA)?"
              answer="To secure your account with MFA, navigate to Settings > Security & Auth. Click on the 'Enable MFA' button. Scan the displayed QR code with your chosen authenticator app (such as Google Authenticator, Microsoft Authenticator, or Authy). Finally, type the 6-digit confirmation code generated in your app and click 'Verify & Enable' to lock in the configuration. You will need to enter this code on subsequent logins."
              isOpen={openFaq === 'faq-mfa'}
              onClick={() => setOpenFaq(openFaq === 'faq-mfa' ? null : 'faq-mfa')}
            />

            <FaqItem
              id="faq-biometric"
              question="How does Biometric login work and is it secure?"
              answer="Biometric login uses the WebAuthn standard (Passkeys) to authenticate your local session securely. When you register a biometric device, your device creates a cryptographic key pair. The private key remains stored securely in your system hardware (e.g., Apple Secure Enclave or Windows TPM), while the public key is sent to our Supabase database. When logging in, your device signs a cryptographic challenge to prove identity. None of your biometric print data is ever sent to or stored on our servers."
              isOpen={openFaq === 'faq-biometric'}
              onClick={() => setOpenFaq(openFaq === 'faq-biometric' ? null : 'faq-biometric')}
            />

            <FaqItem
              id="faq-sessions"
              question="How are active sessions tracked and managed?"
              answer="Every device that logs into your account is recorded in the session manager with details like browser agent, operating system, last active time, and IP address. You can view these entries under Settings > Active Sessions. If you suspect unauthorized access, or if you logged in on a public computer and forgot to sign out, click the 'Revoke' button next to that session to immediately terminate its access tokens and force the remote device to log out."
              isOpen={openFaq === 'faq-sessions'}
              onClick={() => setOpenFaq(openFaq === 'faq-sessions' ? null : 'faq-sessions')}
            />

            <FaqItem
              id="faq-smtp"
              question="What should I do if outgoing notification emails are failing?"
              answer="If users are not receiving invite codes or update alerts, a system administrator should navigate to Settings > Email / SMTP. Verify that the host address, port, and sender email details are correctly configured. Check your SMTP login username and password. You can trigger a 'Send Test Mail' command from this tab to diagnose email delivery failures in real time."
              isOpen={openFaq === 'faq-smtp'}
              onClick={() => setOpenFaq(openFaq === 'faq-smtp' ? null : 'faq-smtp')}
            />

            <FaqItem
              id="faq-maintenance"
              question="What happens when an Administrator toggles Maintenance Mode?"
              answer="When Maintenance Mode is turned on by an admin (Settings > Maintenance Mode), the system blocks all normal operations. Any non-admin users attempting to load the platform will be redirected to a dedicated maintenance screen explaining that updates are in progress. Active sessions for regular users will be temporarily suspended from data operations. Once the administrator turns maintenance off ('Go Live'), full service resumes immediately."
              isOpen={openFaq === 'faq-maintenance'}
              onClick={() => setOpenFaq(openFaq === 'faq-maintenance' ? null : 'faq-maintenance')}
            />
          </div>
        )}
      </div>
    </div>
  )
}

