import { useAppInfoStore } from '@/store/useAppInfoStore'

export default function TermsOfService() {
  const appName = useAppInfoStore(s => s.appName)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Terms of Service</h1>
      <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-4">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <p>
          These Terms of Service govern your use of the {appName} website and any related services provided by us.
        </p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-4">1. Acceptance of Terms</h2>
        <p>
          By accessing {appName}, you agree to abide by these Terms of Service and to comply with all applicable laws and regulations. If you do not agree with these Terms of Service, you are prohibited from using or accessing this website or using any other services provided by us.
        </p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-4">2. Limitations of Use</h2>
        <p>
          By using this website, you warrant on behalf of yourself, your users, and other parties you represent that you will not:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Modify, copy, prepare derivative works of, decompile, or reverse engineer any materials and software contained on this website.</li>
          <li>Remove any copyright or other proprietary notations from any materials and software on this website.</li>
          <li>Transfer the materials to another person or "mirror" the materials on any other server.</li>
        </ul>
      </div>
    </div>
  )
}
