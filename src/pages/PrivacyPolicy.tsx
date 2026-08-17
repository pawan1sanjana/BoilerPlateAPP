import { useAppInfoStore } from '@/store/useAppInfoStore'

export default function PrivacyPolicy() {
  const appName = useAppInfoStore(s => s.appName)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Privacy Policy</h1>
      <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-4">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <p>
          Welcome to {appName}. We respect your privacy and are committed to protecting your personal data.
          This privacy policy will inform you as to how we look after your personal data when you visit our website
          and tell you about your privacy rights and how the law protects you.
        </p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-4">1. Information We Collect</h2>
        <p>
          We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
          <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
          <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-4">2. How We Use Your Data</h2>
        <p>
          We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
          <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
        </ul>
      </div>
    </div>
  )
}
