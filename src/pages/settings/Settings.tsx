import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { 
  User, Bell, Palette, Shield, 
  Monitor, Camera, Mail, Key, Eye, EyeOff,
  Settings as SettingsIcon, Wrench, Lock, Loader2,
  Sun, Moon, Smartphone, Check, DollarSign, CheckCircle2,
  Image as ImageIcon, Type, QrCode, Download, Share2,
  ShieldCheck, Globe2, ClipboardList, Database, Info, Fingerprint, HelpCircle
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

// Import new tabs
import SecurityPolicyTab from './tabs/SecurityPolicyTab'
import SmtpTab from './tabs/SmtpTab'
import SystemPrefsTab from './tabs/SystemPrefsTab'
import AuditLogTab from './tabs/AuditLogTab'
import BackupTab from './tabs/BackupTab'
import SystemInfoTab from './tabs/SystemInfoTab'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import { useCurrencyStore, type Currency } from '@/store/useCurrencyStore'
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, getPushSubscriptionStatus } from '@/lib/pushNotifications'
import { fetchUserSessions, revokeSession } from '@/lib/sessionManager'
import { useMaintenanceModeStore } from '@/store/useMaintenanceModeStore'
import { useAppInfoStore } from '@/store/useAppInfoStore'
import { usePWAStore } from '@/store/usePWAStore'
import { useSocialLoginStore } from '@/store/useSocialLoginStore'
import { useBiometricStore } from '@/store/useBiometricStore'
import {
  useModulePermissionsStore,
  ALL_MODULES,
  ALL_ROLES,
  SUB_MODULES,
  type PermissionMatrix,
  type AppRole,
  type ModuleKey,
} from '@/store/useModulePermissionsStore'

interface SectionHelpGuideProps {
  title: string
  steps: string[]
  tips?: string
}

function SectionHelpGuide({ title, steps, tips }: SectionHelpGuideProps) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="mb-4 animate-in fade-in duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer focus:outline-none"
        title="View configuration steps for this section"
        id={`btn-help-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <HelpCircle size={14} className="text-blue-500" />
        {isOpen ? 'Hide Section Guide' : 'Need Help? Show Guide'}
      </button>
      {isOpen && (
        <div className="mt-3 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 text-xs space-y-3.5 shadow-inner">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-xs">
              How to configure {title}
            </h4>
            <ol className="list-decimal list-inside space-y-2">
              {steps.map((step, idx) => (
                <li key={idx} className="pl-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          {tips && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/20 rounded-xl p-3 flex gap-2.5">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-600 dark:text-blue-400/90 leading-normal">
                <span className="font-bold">Pro Tip: </span>{tips}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const { user } = useAuthStore()
  const { theme, setTheme, themeColor, setThemeColor } = useThemeStore()
  const { currency, setCurrency } = useCurrencyStore()
  const { isMaintenanceMode, setMaintenanceMode } = useMaintenanceModeStore()
  const { isInstallable, isInstalled, promptInstall } = usePWAStore()
  const { socialLoginEnabled, setSocialLoginEnabled, fetch: fetchSocialLogin } = useSocialLoginStore()
  const [isSocialLoginSaving, setIsSocialLoginSaving] = useState(false)
  const {
    biometricEnabled,
    isSupported: biometricSupported,
    hasCredential,
    setBiometricEnabled,
    removeCredential,
    register: registerBiometricDevice,
    checkSupport,
    fetch: fetchBiometric,
    cacheSession,
  } = useBiometricStore()
  const [isBiometricSaving, setIsBiometricSaving] = useState(false)
  const [biometricRegLoading, setBiometricRegLoading] = useState(false)
  const [isMaintenanceSaving, setIsMaintenanceSaving] = useState(false)
  const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false)
  const [showGoLiveModal, setShowGoLiveModal] = useState(false)
  const [deploymentNoteInput, setDeploymentNoteInput] = useState('')

  // App Branding state
  const { appName, appIcon, appVersion, companyName, setAppInfo } = useAppInfoStore()
  const [draftAppName, setDraftAppName] = useState(appName)
  const [draftAppIcon, setDraftAppIcon] = useState(appIcon)
  const [draftAppVersion, setDraftAppVersion] = useState(appVersion)
  const [draftCompanyName, setDraftCompanyName] = useState(companyName)
  const [isBrandingSaving, setIsBrandingSaving] = useState(false)
  const brandingIconInputRef = useRef<HTMLInputElement>(null)

  // Module permissions state
  const { subPermissions, saveSubPermissions, resetToDefaults: resetPermissions, checkAccess } = useModulePermissionsStore()
  const [draftPermissions, setDraftPermissions] = useState<PermissionMatrix>(() => ({ ...subPermissions }))
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isPermSaving, setIsPermSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState<AppRole>('user')
  const [expandedModules, setExpandedModules] = useState<Set<ModuleKey>>(new Set())

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Password and Validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [passwords, setPasswords] = useState({
    current_password: '', new_password: '', confirm_password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  
  // Sessions & Tabs
  const [sessions, setSessions] = useState<any[]>([])
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [notifications, setNotifications] = useState({ push: false, email: true, sms: false })
  
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // MFA State
  const [mfaEnrolled, setMfaEnrolled] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaQrCode, setMfaQrCode] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [isMfaLoading, setIsMfaLoading] = useState(false)

  const [profile, setProfile] = useState({
    name: '', email: '', role: '', phone: ''
  })

  const formatRelativeTime = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }

  const loadSessions = async () => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const data = await fetchUserSessions(user.id, session.access_token)
      const formatted = data.map((s: any) => ({
        ...s,
        time: s.current ? 'Active now' : formatRelativeTime(s.last_active),
      }))
      setSessions(formatted)
    } catch (err) {
      console.error('Failed to load sessions', err)
    }
  }

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      await revokeSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      toast.success('Session revoked successfully')
    } catch (err) {
      toast.error('Failed to revoke session')
    } finally {
      setRevokingId(null)
    }
  }

  useEffect(() => {
    fetchSocialLogin()
    checkSupport()
    fetchBiometric()
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        if (!user) return

        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (userData) {
          setProfile({
            name: userData.name || '',
            email: userData.email || user.email || '',
            role: userData.role || '',
            phone: userData.phone || ''
          })
        } else if (error) {
          console.error(error)
        }

        if (user.user_metadata?.avatar_url) {
          setAvatarPreview(user.user_metadata.avatar_url)
        }

        await loadSessions()

        const pushStatus = await getPushSubscriptionStatus()
        
        // Fetch notification preferences
        const { data: notifData } = await supabase.from('system_settings').select('value').eq('key', `user_notifications_${user.id}`).maybeSingle()
        if (notifData) {
          const parsed = JSON.parse(notifData.value)
          setNotifications({ ...parsed, push: pushStatus })
        } else {
          setNotifications(prev => ({ ...prev, push: pushStatus }))
        }

        // Fetch MFA Status
        const { data: factorsData } = await supabase.auth.mfa.listFactors()
        if (factorsData && factorsData.totp.length > 0) {
          setMfaEnrolled(true)
          setMfaFactorId(factorsData.totp[0].id)
        }
      } catch (err) {
        console.error('Failed to load user data', err)
        toast.error('Failed to load user data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const handleRegisterBiometricInSettings = async () => {
    setBiometricRegLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Session not found. Please sign in again.')
        return
      }
      const ok = await registerBiometricDevice(
        user!.id,
        profile.name || 'User',
        profile.email,
        session.refresh_token,
      )
      if (ok) {
        // Keep the cached session token up to date
        cacheSession(session.refresh_token)
        toast.success('Biometric login registered for this device!')
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        toast.error('Failed to register biometric. Please try again.')
      }
    } finally {
      setBiometricRegLoading(false)
    }
  }

  const handleRemoveBiometricInSettings = async () => {
    setBiometricRegLoading(true)
    try {
      await removeCredential()
      toast.success('Biometric login removed from this device.')
    } catch {
      toast.error('Failed to remove biometric registration.')
    } finally {
      setBiometricRegLoading(false)
    }
  }

  const tabs = React.useMemo(() => {
    const role = (profile.role || 'user') as AppRole
    const baseTabs = [
      { id: 'profile', label: 'Profile Information', icon: User },
      { id: 'security', label: 'Security & Auth', icon: Shield },
      { id: 'preferences', label: 'Preferences', icon: Palette },
      { id: 'currency', label: 'Currency Options', icon: DollarSign },
      { id: 'sessions', label: 'Active Sessions', icon: Monitor }
    ]
    const filtered = baseTabs.filter(t => checkAccess(role, '/settings/' + t.id).allowed)
    if (role === 'admin') {
      filtered.push({ id: 'branding', label: 'App Branding', icon: ImageIcon })
      filtered.push({ id: 'maintenance_mode', label: 'Maintenance Mode', icon: Wrench })
      filtered.push({ id: 'module_access', label: 'Module Access', icon: Lock })
      filtered.push({ id: 'security_policy', label: 'Security Policy', icon: ShieldCheck })
      filtered.push({ id: 'smtp', label: 'Email / SMTP', icon: Mail })
      filtered.push({ id: 'system_prefs', label: 'Regional & Time', icon: Globe2 })
      filtered.push({ id: 'audit_log', label: 'Audit Log', icon: ClipboardList })
      filtered.push({ id: 'backup', label: 'Backup & Export', icon: Database })
      filtered.push({ id: 'system_info', label: 'System Info', icon: Info })
    }
    return filtered
  }, [profile.role, checkAccess, subPermissions])

  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  // Sync draft branding when store updates
  useEffect(() => {
    setDraftAppName(appName)
    setDraftAppIcon(appIcon)
    setDraftAppVersion(appVersion)
    setDraftCompanyName(companyName)
  }, [appName, appIcon, appVersion, companyName])

  const handleSaveBranding = async () => {
    if (!draftAppName.trim()) {
      toast.error('App name cannot be empty')
      return
    }
    setIsBrandingSaving(true)
    try {
      const success = await setAppInfo(draftAppName.trim(), draftAppIcon, draftAppVersion.trim(), draftCompanyName.trim())
      if (success) {
        toast.success('App branding updated successfully')
      } else {
        toast.error('Failed to update app branding')
      }
    } finally {
      setIsBrandingSaving(false)
    }
  }

  const handleToggle = async (key: keyof typeof notifications) => {
    if (key === 'push') {
      try {
        if (!notifications.push) {
          if (!user) return;
          await subscribeToPushNotifications(user.id);
          setNotifications(prev => ({ ...prev, push: true }));
          toast.success('Push notifications enabled');
        } else {
          if (!user) return;
          await unsubscribeFromPushNotifications(user.id);
          setNotifications(prev => ({ ...prev, push: false }));
          toast.success('Push notifications disabled');
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to toggle push notifications');
      }
      return;
    }
    const newNotifs = { ...notifications, [key]: !notifications[key as keyof typeof notifications] }
    setNotifications(newNotifs)
    if (user) {
      supabase.from('system_settings').upsert({ key: `user_notifications_${user.id}`, value: JSON.stringify(newNotifs) }).then()
    }
    toast.success('Preferences updated')
  }

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const validateProfile = () => {
    const errors: Record<string, string> = {}
    if (!profile.name) errors.name = 'Full name is required'
    if (!profile.email) errors.email = 'Email is required'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email)) errors.email = 'Invalid email format'
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveProfile = async () => {
    if (!validateProfile() || !user) {
      toast.error('Please fix validation errors')
      return
    }
    setIsSaving(true)
    try {
      const { error: dbError } = await supabase
        .from('users')
        .update({ name: profile.name, phone: profile.phone })
        .eq('id', user.id)

      if (avatarPreview) {
        await supabase.auth.updateUser({
          data: { avatar_url: avatarPreview, name: profile.name }
        })
      }
      
      if (dbError) throw dbError
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Save profile failed', error)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswords(prev => ({ ...prev, [name]: value }))
  }

  const savePassword = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    setIsSaving(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || profile.email,
        password: passwords.current_password
      })
      
      if (signInError) {
        toast.error('Current password is incorrect')
        setIsSaving(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password: passwords.new_password })
      if (!error) {
        toast.success('Password updated successfully')
        setPasswords({ current_password: '', new_password: '', confirm_password: '' })
      } else {
        toast.error(error.message || 'Failed to update password')
      }
    } catch (error) {
      console.error('Save password failed', error)
      toast.error('Server error while updating password')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEnrollMfa = async () => {
    setIsMfaLoading(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
      if (error) throw error
      setMfaFactorId(data.id)
      setMfaQrCode(data.totp.uri)
      setMfaSecret(data.totp.secret)
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll MFA')
    } finally {
      setIsMfaLoading(false)
    }
  }

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || !mfaCode) return
    setIsMfaLoading(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: mfaCode
      })
      if (error) throw error
      setMfaEnrolled(true)
      setMfaQrCode('')
      setMfaSecret('')
      setMfaCode('')
      toast.success('Two-factor authentication enabled successfully')
    } catch (err: any) {
      toast.error(err.message || 'Invalid code')
    } finally {
      setIsMfaLoading(false)
    }
  }

  const handleUnenrollMfa = async () => {
    if (!mfaFactorId) return
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will reduce your account security.')) return
    setIsMfaLoading(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
      if (error) throw error
      setMfaEnrolled(false)
      setMfaFactorId('')
      toast.success('Two-factor authentication disabled')
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable MFA')
    } finally {
      setIsMfaLoading(false)
    }
  }

  const handleMaintenanceModeToggle = () => {
    if (!isMaintenanceMode) {
      setShowMaintenanceConfirm(true)
    } else {
      setDeploymentNoteInput('')
      setShowGoLiveModal(true)
    }
  }

  const confirmMaintenanceModeChange = async (value: boolean, note?: string) => {
    setShowMaintenanceConfirm(false)
    setShowGoLiveModal(false)
    setIsMaintenanceSaving(true)
    try {
      const ok = await setMaintenanceMode(value, note)
      if (ok) {
        toast.success(value ? 'Maintenance mode enabled' : 'Maintenance mode disabled')
      } else {
        toast.error('Failed to update maintenance mode')
      }
    } finally {
      setIsMaintenanceSaving(false)
    }
  }

  // --- Module Access Methods ---
  const toggleSubModule = (subKey: string) => {
    if (selectedRole === 'admin') return
    setDraftPermissions(prev => {
      const currentSet = new Set(prev[selectedRole] ?? [])
      if (currentSet.has(subKey)) currentSet.delete(subKey)
      else currentSet.add(subKey)
      return { ...prev, [selectedRole]: Array.from(currentSet) }
    })
  }

  const toggleModuleAll = (moduleKey: ModuleKey, allow: boolean) => {
    if (selectedRole === 'admin') return
    const modSubs = SUB_MODULES.filter(s => s.moduleKey === moduleKey).map(s => s.key)
    setDraftPermissions(prev => {
      const currentSet = new Set(prev[selectedRole] ?? [])
      if (allow) modSubs.forEach(k => currentSet.add(k))
      else modSubs.forEach(k => currentSet.delete(k))
      return { ...prev, [selectedRole]: Array.from(currentSet) }
    })
  }

  const handleSavePermissions = async () => {
    setIsPermSaving(true)
    try {
      await saveSubPermissions(draftPermissions)
      toast.success('Permissions updated successfully')
    } catch {
      toast.error('Failed to save permissions')
    } finally {
      setIsPermSaving(false)
    }
  }

  const handleResetPermissions = async () => {
    setShowResetConfirm(false)
    setIsPermSaving(true)
    try {
      await resetPermissions()
      setDraftPermissions({ ...useModulePermissionsStore.getState().subPermissions })
      toast.success('Permissions reset to defaults')
    } catch {
      toast.error('Failed to reset permissions')
    } finally {
      setIsPermSaving(false)
    }
  }

  const hasUnsavedChanges = JSON.stringify(draftPermissions) !== JSON.stringify(subPermissions)

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-8 animate-pulse">
        <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded mb-6"></div>
        <div className="flex gap-8">
          <div className="w-64 space-y-4">
            {[...Array(4)].map((_,i) => <div key={i} className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div>)}
          </div>
          <div className="flex-1 space-y-6">
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            <SettingsIcon size={14} className="text-blue-500" /> Manage your profile, security, and preferences
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-blue-500' : 'opacity-70'} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <SectionHelpGuide
                title="Profile Information"
                steps={[
                  'Under the Profile Information tab, edit your full name and phone number fields.',
                  'To change your profile picture, click on the avatar preview or hover and select a new image file.',
                  'Click the Save Profile button at the bottom of the section to apply changes.'
                ]}
                tips="Keeping your phone number updated ensures you receive real-time SMS notifications for critical updates."
              />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-8 shadow-sm">
                <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="relative group cursor-pointer" aria-label="Upload Avatar">
                  <input
                    type="file"
                    accept="image/*"
                    ref={avatarInputRef}
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        const reader = new FileReader()
                        reader.onload = () => {
                          const result = reader.result as string
                          setAvatarPreview(result)
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                  />
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 p-1 overflow-hidden">
                    <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <User size={40} className="text-slate-300" />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => avatarInputRef.current && avatarInputRef.current.click()}
                  >
                    <Camera size={24} className="text-white" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name || 'System Administrator'}</h3>
                  <p className="text-sm font-medium text-slate-400 mt-0.5">Role: <span className="capitalize">{profile.role || 'Super Admin'}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 ml-1">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" name="name" value={profile.name} onChange={handleProfileChange} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" />
                    {validationErrors.name && <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" name="email" value={profile.email} onChange={handleProfileChange} disabled className="w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all opacity-70 cursor-not-allowed" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 ml-1">Phone Number</label>
                  <input type="tel" name="phone" value={profile.phone} onChange={handleProfileChange} placeholder="+1 (555) 000-0000" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={saveProfile} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null} Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <SectionHelpGuide
                title="Security & Auth Settings"
                steps={[
                  'To change your password, input your current password, type the new password twice, and select Update Password.',
                  'To set up MFA (TOTP), click Enroll MFA, scan the generated QR code with an authenticator app, and input the 6-digit code.',
                  'To enable passwordless biometrics (WebAuthn), click Register Device under Biometric Login and perform verification.'
                ]}
                tips="Multi-Factor Authentication and biometric security significantly reduce the vulnerability of your account."
              />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Key size={18} className="text-blue-500" /> Change Password
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Ensure your account is using a long, random password to stay secure.</p>
                </div>
                
                <div className="space-y-4 max-w-md">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="current_password"
                        value={passwords.current_password}
                        onChange={handlePasswordChange}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 ml-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="new_password"
                        value={passwords.new_password}
                        onChange={handlePasswordChange}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 ml-1">Confirm New Password</label>
                    <input type="password" name="confirm_password" value={passwords.confirm_password} onChange={handlePasswordChange} placeholder="••••••••" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" />
                  </div>
                  <button onClick={savePassword} disabled={isSaving || !passwords.new_password} className="w-full flex justify-center items-center gap-2 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : null} Update Password
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <QrCode size={18} className="text-blue-500" /> Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Add an extra layer of security to your account using an authenticator app.
                    </p>
                  </div>
                  {mfaEnrolled && (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                      Enabled
                    </span>
                  )}
                </div>

                {!mfaEnrolled && !mfaQrCode && (
                  <div>
                    <button 
                      onClick={handleEnrollMfa} 
                      disabled={isMfaLoading}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isMfaLoading && <Loader2 size={16} className="animate-spin" />}
                      Enable Two-Factor Authentication
                    </button>
                  </div>
                )}

                {!mfaEnrolled && mfaQrCode && (
                  <div className="space-y-6 max-w-md p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">1. Scan the QR code</h4>
                      <p className="text-xs text-slate-500 mt-1 mb-4">Use Google Authenticator, Authy, or your preferred TOTP app.</p>
                      <div className="bg-white p-4 rounded-xl inline-block shadow-sm">
                        <QRCodeSVG value={mfaQrCode} size={150} />
                      </div>
                      <p className="text-xs text-slate-500 mt-3 break-all font-mono">Secret: {mfaSecret}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">2. Enter the verification code</h4>
                      <p className="text-xs text-slate-500 mt-1 mb-3">Enter the 6-digit code generated by your app.</p>
                      <div className="space-y-3">
                        <input
                          type="text"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="000000"
                          className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center tracking-widest font-mono text-lg focus:border-blue-500 outline-none transition-all"
                        />
                        <div className="flex gap-3">
                          <button 
                            onClick={() => { setMfaQrCode(''); setMfaSecret(''); setMfaFactorId(''); setMfaCode(''); }}
                            className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleVerifyMfa}
                            disabled={isMfaLoading || mfaCode.length !== 6}
                            className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
                          >
                            {isMfaLoading && <Loader2 size={16} className="animate-spin" />}
                            Verify Code
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mfaEnrolled && (
                  <div>
                    <button 
                      onClick={handleUnenrollMfa} 
                      disabled={isMfaLoading}
                      className="px-6 py-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 text-sm font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isMfaLoading && <Loader2 size={16} className="animate-spin" />}
                      Disable Two-Factor Authentication
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Fingerprint size={18} className="text-blue-500" /> Biometric Authentication
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Sign in using your device's fingerprint, Face ID, or Windows Hello sensor.
                    </p>
                  </div>
                  {hasCredential && (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                      Registered
                    </span>
                  )}
                </div>

                {!biometricSupported ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                    <p className="text-sm text-amber-800 dark:text-amber-400">
                      Your current browser or device does not support biometric authentication, or it is disabled at the system level.
                    </p>
                  </div>
                ) : !hasCredential ? (
                  <div>
                    <button
                      onClick={handleRegisterBiometricInSettings}
                      disabled={biometricRegLoading}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {biometricRegLoading && <Loader2 size={16} className="animate-spin" />}
                      Register This Device
                    </button>
                    <p className="text-xs text-slate-500 mt-3 max-w-md">
                      Registering this device will allow you to sign in instantly without typing your password.
                    </p>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={handleRemoveBiometricInSettings}
                      disabled={biometricRegLoading}
                      className="px-6 py-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 text-sm font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                      {biometricRegLoading && <Loader2 size={16} className="animate-spin" />}
                      Remove Biometric Login
                    </button>
                    <p className="text-xs text-slate-500 mt-3 max-w-md">
                      Removing this registration will require you to use your password to sign in on this device.
                    </p>
                  </div>
                )}
              </div>

              {/* Biometric Toggle — admin only */}
              {profile.role === 'admin' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Fingerprint size={18} className="text-blue-500" /> Biometric Logins
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {biometricEnabled
                          ? 'Users can register their devices for biometric sign-in.'
                          : 'Biometric sign-in is disabled system-wide. Users must use passwords.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {isBiometricSaving && <Loader2 size={16} className="animate-spin text-slate-400" />}
                      <button
                        onClick={async () => {
                          setIsBiometricSaving(true)
                          const ok = await setBiometricEnabled(!biometricEnabled)
                          setIsBiometricSaving(false)
                          if (ok) {
                            toast.success(biometricEnabled ? 'Biometric logins disabled' : 'Biometric logins enabled')
                          } else {
                            toast.error('Failed to update biometric login setting')
                          }
                        }}
                        disabled={isBiometricSaving}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                          biometricEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        } disabled:opacity-60`}
                        aria-label="Toggle biometric logins"
                        role="switch"
                        aria-checked={biometricEnabled}
                      >
                        <div
                          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                            biometricEnabled ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Social Login Toggle — admin only */}
              {profile.role === 'admin' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Share2 size={18} className="text-blue-500" /> Social Logins
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {socialLoginEnabled
                          ? 'Google and Facebook sign-in buttons are shown on the login page.'
                          : 'Social sign-in is hidden. Users must log in with email and password.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {isSocialLoginSaving && <Loader2 size={16} className="animate-spin text-slate-400" />}
                      <button
                        onClick={async () => {
                          setIsSocialLoginSaving(true)
                          const ok = await setSocialLoginEnabled(!socialLoginEnabled)
                          setIsSocialLoginSaving(false)
                          if (ok) {
                            toast.success(socialLoginEnabled ? 'Social logins disabled' : 'Social logins enabled')
                          } else {
                            toast.error('Failed to update social login setting')
                          }
                        }}
                        disabled={isSocialLoginSaving}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                          socialLoginEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        } disabled:opacity-60`}
                        aria-label="Toggle social logins"
                        role="switch"
                        aria-checked={socialLoginEnabled}
                      >
                        <div
                          className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                            socialLoginEnabled ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-3">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        socialLoginEnabled
                          ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 line-through'
                      }`}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                        socialLoginEnabled
                          ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 line-through'
                      }`}>
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#1877F2" aria-hidden="true">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <SectionHelpGuide
                title="Preferences & Themes"
                steps={[
                  'Choose between Light, Dark, or System mode to change the overall look.',
                  'Select a theme color from the interactive color circles to customize accent colors system-wide.',
                  'Toggle switches for Email, SMS, and Push notifications to choose how you want to be alerted.'
                ]}
                tips="Ensure your web browser is permitted to show notifications to get instant desktop updates."
              />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Palette size={18} className="text-blue-500" /> Appearance
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Customize how the application looks on your device.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
                  <button 
                    onClick={() => theme !== 'light' && setTheme('light')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all group ${
                      theme === 'light' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className={`p-3 rounded-full transition-colors shrink-0 ${theme === 'light' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
                      <Sun size={20} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                        Light Mode
                        {theme === 'light' && <Check size={16} className="text-blue-500" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Best for bright environments</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => theme !== 'dark' && setTheme('dark')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all group ${
                      theme === 'dark' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className={`p-3 rounded-full transition-colors shrink-0 ${theme === 'dark' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
                      <Moon size={20} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                        Dark Mode
                        {theme === 'dark' && <Check size={16} className="text-blue-500" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Easier on the eyes, saves battery</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => theme !== 'system' && setTheme('system')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all group ${
                      theme === 'system' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className={`p-3 rounded-full transition-colors shrink-0 ${theme === 'system' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
                      <Monitor size={20} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                        System Default
                        {theme === 'system' && <Check size={16} className="text-blue-500" />}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Adapts to device settings</div>
                    </div>
                  </button>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Theme Color</h4>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'blue', name: 'Blue', bg: 'bg-[#3b82f6]' },
                      { id: 'green', name: 'Green', bg: 'bg-green-500' },
                      { id: 'purple', name: 'Purple', bg: 'bg-purple-500' },
                      { id: 'rose', name: 'Rose', bg: 'bg-rose-500' },
                      { id: 'orange', name: 'Orange', bg: 'bg-orange-500' }
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setThemeColor(c.id as any)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          themeColor === c.id 
                            ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-900 scale-110' 
                            : 'hover:scale-105 opacity-80 hover:opacity-100'
                        } ${c.bg}`}
                        title={c.name}
                      >
                        {themeColor === c.id && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Download size={18} className="text-blue-500" /> Install Application
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {isInstalled 
                        ? 'The application is currently installed on your device.'
                        : isInstallable 
                          ? 'Install this application to your device for a better, app-like experience.'
                          : 'Installation is not available. You might already have it installed or your browser does not support it.'}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={promptInstall}
                      disabled={!isInstallable || isInstalled}
                      className="whitespace-nowrap px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <Download size={16} /> 
                      {isInstalled ? 'Installed' : 'Install App'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell size={18} className="text-blue-500" /> Notifications
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Choose how and when you want to be notified.</p>
                </div>
                
                <div className="space-y-3 max-w-xl">
                  {[
                    { id: 'push', title: 'Push Notifications', desc: 'Receive alerts on this device', icon: Bell },
                    { id: 'email', title: 'Email Notifications', desc: 'Receive daily summaries and important alerts', icon: Mail },
                    { id: 'sms', title: 'SMS Notifications', desc: 'Get text messages for urgent issues', icon: Smartphone },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900/80">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                          <item.icon size={18} className="text-slate-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{item.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleToggle(item.id as keyof typeof notifications)} 
                        className={`relative w-12 h-6 rounded-full transition-colors ${notifications[item.id as keyof typeof notifications] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${notifications[item.id as keyof typeof notifications] ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'currency' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <SectionHelpGuide
                title="Currency Options"
                steps={[
                  'Select your preferred currency (e.g., USD, EUR, GBP) from the dropdown list.',
                  'The currency converter will automatically update views across dashboard statistics.'
                ]}
                tips="This setting is personal to your profile and will not alter global database prices."
              />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-500" /> Currency Options
                </h3>
                <p className="text-sm text-slate-500 mt-1">Select your preferred currency for the application.</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(['LKR', 'USD', 'EUR', 'GBP', 'AUD'] as Currency[]).map((c) => (
                  <button 
                    key={c}
                    onClick={() => {
                      setCurrency(c)
                      toast.success(`Currency changed to ${c}`)
                    }}
                    className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 flex items-center justify-between group ${
                      currency === c 
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-md shadow-blue-500/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <h4 className={`font-bold ${currency === c ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                        {c}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {c === 'LKR' ? 'Sri Lankan Rupee' : c === 'USD' ? 'US Dollar' : c === 'EUR' ? 'Euro' : c === 'GBP' ? 'British Pound' : 'Australian Dollar'}
                      </p>
                    </div>
                    {currency === c && <div className="animate-in zoom-in duration-300"><CheckCircle2 size={24} className="text-blue-500" /></div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

          {activeTab === 'sessions' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <SectionHelpGuide
                title="Active Sessions"
                steps={[
                  'Examine the list of sessions displaying the device, browser type, IP address, and active times.',
                  'Identify any stale or unrecognized connections.',
                  'Click the Revoke Session button to instantly terminate login access for that device.'
                ]}
                tips="If you see an unfamiliar session, revoke it immediately and change your account password."
              />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor size={18} className="text-blue-500" /> Active Sessions
                </h3>
              </div>
              <div className="space-y-4">
                {sessions.map((session, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <Monitor size={20} className={session.current ? "text-blue-500" : "text-slate-400"} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          {session.device} • {session.browser}
                          {session.current && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] uppercase font-bold rounded-full tracking-wider">Current</span>}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">{session.os} • {session.ip_address} • Last active: {session.time}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <button onClick={() => handleRevoke(session.id)} disabled={revokingId === session.id} className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors">
                        {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

          {activeTab === 'branding' && profile.role === 'admin' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <SectionHelpGuide
                title="App Branding"
                steps={[
                  'Update the App Name field to change the header title across the platform.',
                  'Upload a square logo (recommended size 512x512 with transparency) using the logo file selector.',
                  'Modify the App Version tag and Company Name to customize the footer copyright details.',
                  'Click Save Branding to apply settings globally.'
                ]}
                tips="Global branding changes affect all users immediately upon page reload."
              />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
               <div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <ImageIcon size={18} className="text-blue-500" /> App Branding
                 </h3>
                 <p className="text-sm text-slate-500 mt-1">
                   Update the application name and icon. These changes will be visible to all users.
                 </p>
               </div>
               
               <div className="space-y-6 max-w-xl">
                 <div className="flex items-center gap-6">
                   <div className="relative group cursor-pointer" aria-label="Upload App Icon">
                     <input
                       type="file"
                       accept="image/*"
                       ref={brandingIconInputRef}
                       className="hidden"
                       onChange={e => {
                         if (e.target.files && e.target.files[0]) {
                           const file = e.target.files[0]
                           const reader = new FileReader()
                           reader.onload = () => {
                             setDraftAppIcon(reader.result as string)
                           }
                           reader.readAsDataURL(file)
                         }
                       }}
                     />
                     <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-colors group-hover:border-blue-500 bg-slate-50 dark:bg-slate-950">
                       {draftAppIcon ? (
                         <img src={draftAppIcon} alt="App Icon Preview" className="w-full h-full object-contain p-2" />
                       ) : (
                         <ImageIcon size={32} className="text-slate-300" />
                       )}
                     </div>
                     <button
                       type="button"
                       className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                       onClick={() => brandingIconInputRef.current && brandingIconInputRef.current.click()}
                     >
                       <Camera size={24} className="text-white" />
                     </button>
                   </div>
                   <div>
                     <h4 className="text-sm font-semibold text-slate-900 dark:text-white">App Icon</h4>
                     <p className="text-xs text-slate-500 mt-1 mb-2">Recommended: Square image, transparent PNG or SVG, at least 192x192px.</p>
                     {draftAppIcon && (
                       <button 
                         onClick={() => setDraftAppIcon('')}
                         className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                       >
                         Remove custom icon
                       </button>
                     )}
                   </div>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-500 ml-1">Application Name</label>
                   <div className="relative">
                     <Type size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="text" 
                       value={draftAppName} 
                       onChange={e => setDraftAppName(e.target.value)} 
                       className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
                     />
                   </div>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-500 ml-1">Company Name</label>
                   <div className="relative">
                     <Type size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="text" 
                       value={draftCompanyName} 
                       onChange={e => setDraftCompanyName(e.target.value)} 
                       className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
                     />
                   </div>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-500 ml-1">App Version</label>
                   <div className="relative">
                     <Info size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="text" 
                       value={draftAppVersion} 
                       onChange={e => setDraftAppVersion(e.target.value)} 
                       className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none transition-all" 
                     />
                   </div>
                 </div>
                 
                 <div className="pt-2 flex justify-end">
                    <button 
                      onClick={handleSaveBranding} 
                      disabled={isBrandingSaving || !draftAppName.trim()} 
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isBrandingSaving ? <Loader2 size={16} className="animate-spin" /> : null} Save Branding
                    </button>
                 </div>
               </div>
            </div>
          </div>
        )}

          {activeTab === 'maintenance_mode' && profile.role === 'admin' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <SectionHelpGuide
                title="Maintenance Mode"
                steps={[
                  'Toggle the maintenance controller switch to put the application offline.',
                  'Fill in a personalized warning text to display to users attempting to access the platform.',
                  'When upgrades are completed, toggle the switch off, write a quick deployment change note, and click Go Live.'
                ]}
                tips="Maintenance mode locks out normal users immediately but permits administrators to continue setup."
              />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
               <div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   <Wrench size={18} className="text-blue-500" /> Maintenance Mode
                 </h3>
                 <p className="text-sm text-slate-500 mt-1">
                   When enabled, normal users will see a maintenance screen. Admins can still access the system.
                 </p>
               </div>
               
               <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                 <div>
                   <h4 className="font-semibold text-sm text-slate-900 dark:text-white">System Status</h4>
                   <p className="text-xs text-slate-500 mt-0.5">
                     Currently: <span className={isMaintenanceMode ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>{isMaintenanceMode ? 'Maintenance' : 'Live'}</span>
                   </p>
                 </div>
                 <button 
                   onClick={handleMaintenanceModeToggle}
                   disabled={isMaintenanceSaving}
                   className={`px-6 py-2 text-sm font-bold rounded-xl transition-colors ${
                     isMaintenanceMode 
                       ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400' 
                       : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400'
                   }`}
                 >
                   {isMaintenanceSaving ? 'Processing...' : (isMaintenanceMode ? 'Go Live' : 'Enable Maintenance Mode')}
                 </button>
               </div>
               
               {showMaintenanceConfirm && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMaintenanceConfirm(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                      <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">Enable Maintenance Mode?</h3>
                      <p className="text-sm text-slate-500 mb-6">
                        All active non-admin users will immediately lose access and see the maintenance screen. Ensure you've warned them if necessary.
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowMaintenanceConfirm(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                        <button onClick={() => confirmMaintenanceModeChange(true)} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700">Yes, Enable</button>
                      </div>
                    </div>
                  </div>
               )}

               {showGoLiveModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowGoLiveModal(false)}></div>
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                      <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2">Go Live</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Users will regain access immediately. You can optionally include a note about what was updated.
                      </p>
                      <div className="mb-6 space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 ml-1">Deployment Note (Optional)</label>
                        <textarea 
                          value={deploymentNoteInput}
                          onChange={e => setDeploymentNoteInput(e.target.value)}
                          placeholder="e.g. Added new dashboard features..."
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-blue-500 outline-none resize-none h-24"
                        ></textarea>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowGoLiveModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                        <button onClick={() => confirmMaintenanceModeChange(false, deploymentNoteInput)} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700">Go Live Now</button>
                      </div>
                    </div>
                  </div>
               )}
            </div>
          </div>
        )}

          {activeTab === 'module_access' && profile.role === 'admin' && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <SectionHelpGuide
                title="Module Access & Permissions"
                steps={[
                  'Select a role category from the dropdown (e.g., Driver, Dispatcher, Manager, User).',
                  'Review the permissions grid for sub-modules such as Users, Settings, and Reports.',
                  'Check or uncheck boxes to control viewing, adding, editing, or deleting privileges.',
                  'Click Save Permissions to commit policies.'
                ]}
                tips="Administrator settings are locked by default to prevent accidental privilege revocation."
              />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock size={18} className="text-blue-500" /> Module Access Control
                </h3>
                <p className="text-sm text-slate-500 mt-1">Configure which roles can access specific sub-modules. Admin role always has full access.</p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {ALL_ROLES.map(role => (
                  <button
                    key={role.key}
                    onClick={() => setSelectedRole(role.key)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      selectedRole === role.key 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>

              {selectedRole === 'admin' ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Shield size={48} className="mx-auto text-blue-500 mb-4 opacity-50" />
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">Admin Always Has Full Access</h4>
                  <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                    The Administrator role cannot be restricted. Select another role to configure permissions.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ALL_MODULES.map(module => {
                    const allowedSubs = new Set(draftPermissions[selectedRole] ?? [])
                    const hasAdminSettings = allowedSubs.has('admin/settings')
                    const modSubs = SUB_MODULES.filter(s => {
                      if (s.moduleKey !== module.key) return false
                      if (s.key.startsWith('settings/') && !hasAdminSettings) return false
                      return true
                    })
                    
                    const enabledCount = modSubs.filter(s => allowedSubs.has(s.key)).length
                    const totalCount = modSubs.length
                    const isAll = enabledCount === totalCount
                    const isExpanded = expandedModules.has(module.key as ModuleKey)

                    return (
                      <div key={module.key} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50">
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                          onClick={() => {
                            setExpandedModules(prev => {
                              const next = new Set(prev)
                              if (next.has(module.key as ModuleKey)) next.delete(module.key as ModuleKey)
                              else next.add(module.key as ModuleKey)
                              return next
                            })
                          }}
                        >
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{module.label}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                              {enabledCount} / {totalCount}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                            <div className="flex justify-end pt-3 pb-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); toggleModuleAll(module.key as ModuleKey, !isAll) }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {isAll ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {modSubs.filter(sub => !sub.key.startsWith('settings/')).map(sub => {
                                  const active = allowedSubs.has(sub.key)
                                  return (
                                    <label key={sub.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors group">
                                      <div className="flex items-center gap-3 flex-1 truncate">
                                        <span className={`text-sm font-semibold truncate transition-colors ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                          {sub.label}
                                        </span>
                                      </div>
                                      <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 border-2 ${active ? 'bg-blue-600 border-blue-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600'}`}>
                                        <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                      </div>
                                      <input 
                                        type="checkbox" 
                                        className="hidden" 
                                        checked={active}
                                        onChange={() => toggleSubModule(sub.key)}
                                      />
                                    </label>
                                  )
                                })}
                              </div>

                              {hasAdminSettings && modSubs.some(sub => sub.key.startsWith('settings/')) && (
                                <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 ml-4 relative before:absolute before:left-[-17px] before:top-[-20px] before:bottom-6 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-800 before:rounded-bl-xl">
                                  <div className="absolute left-[-17px] bottom-6 w-4 h-[2px] bg-slate-200 dark:bg-slate-800"></div>
                                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                                    <SettingsIcon size={14} className="text-slate-400" /> Granular Settings Access
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {modSubs.filter(sub => sub.key.startsWith('settings/')).map(sub => {
                                      const active = allowedSubs.has(sub.key)
                                      return (
                                        <label key={sub.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-950 cursor-pointer transition-colors group shadow-sm">
                                          <div className="flex items-center gap-3 flex-1 truncate">
                                            <span className={`text-sm font-semibold truncate transition-colors ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                              {sub.label}
                                            </span>
                                          </div>
                                          <div className={`relative w-11 h-6 rounded-full transition-colors shrink-0 border-2 ${active ? 'bg-blue-600 border-blue-600' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600'}`}>
                                            <div className={`absolute top-[2px] left-[2px] bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${active ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                          </div>
                                          <input 
                                            type="checkbox" 
                                            className="hidden" 
                                            checked={active}
                                            onChange={() => toggleSubModule(sub.key)}
                                          />
                                        </label>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="text-sm font-bold text-red-500 hover:text-red-600"
                >
                  Reset to Defaults
                </button>

                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && (
                    <button 
                      onClick={() => setDraftPermissions({ ...subPermissions })}
                      className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={handleSavePermissions}
                    disabled={isPermSaving || !hasUnsavedChanges}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isPermSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                    Save Permissions
                  </button>
                </div>
              </div>

              {/* Reset Confirm Modal */}
              {showResetConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}></div>
                  <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Reset Permissions?</h3>
                    <p className="text-sm text-slate-500 mb-6">
                      This will restore all roles to their factory default permissions. Custom setups will be lost.
                    </p>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm hover:bg-slate-200">Cancel</button>
                      <button onClick={handleResetPermissions} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700">Yes, Reset</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

          {activeTab === 'security_policy' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <SectionHelpGuide
                title="Global Security Policies"
                steps={[
                  'Configure password rules including minimum length and alphanumeric constraints.',
                  'Set maximum failed login attempts before temporarily locking a user out.',
                  'Define inactivity limits to automatically sign out idle user sessions.'
                ]}
                tips="Tighter session timeouts are recommended if users are accessing the system from shared hardware."
              />
              <SecurityPolicyTab />
            </div>
          )}
          {activeTab === 'smtp' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <SectionHelpGuide
                title="Email & SMTP Setup"
                steps={[
                  'Fill in your SMTP Hostname, outgoing Port, and security protocols (SSL/TLS or STARTTLS).',
                  'Input the credential username and specialized application password.',
                  'Customize the system sender address and display name.',
                  'Use the connection test tool to send a test message before saving the configuration.'
                ]}
                tips="Ensure your server firewall allows outbound connections on port 587 or 465."
              />
              <SmtpTab />
            </div>
          )}
          {activeTab === 'system_prefs' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <SectionHelpGuide
                title="Regional & Time Preferences"
                steps={[
                  'Select default local time zone parameters for unified logging timestamps.',
                  'Customize default date layout (e.g., YYYY-MM-DD or DD/MM/YYYY) and numerical systems.',
                  'Click Save Preferences to apply.'
                ]}
              />
              <SystemPrefsTab />
            </div>
          )}
          {activeTab === 'audit_log' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <SectionHelpGuide
                title="Audit Logs"
                steps={[
                  'Review the real-time activity table documenting the actor, action, timestamp, and details.',
                  'Use search filters or date boundaries to isolate specific configurations changes.',
                  'Click Export CSV to download the log table for documentation reviews.'
                ]}
              />
              <AuditLogTab />
            </div>
          )}
          {activeTab === 'backup' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <SectionHelpGuide
                title="Database Backup & Export"
                steps={[
                  'Click Create Database Backup to trigger a database state export.',
                  'Select specific database tables to download tables in CSV or JSON structure.'
                ]}
                tips="Run a backup before performing any bulk operations or permission overrides."
              />
              <BackupTab />
            </div>
          )}
          {activeTab === 'system_info' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <SectionHelpGuide
                title="System Information"
                steps={[
                  'Inspect performance displays detailing system memory usage, environment indicators, and server uptime.',
                  'Review current framework version stamps and technical logs.'
                ]}
              />
              <SystemInfoTab />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
