import { Link } from 'react-router-dom'
import { useAppInfoStore } from '@/store/useAppInfoStore'

export default function Footer() {
  const appName = useAppInfoStore(s => s.appName)

  return (
    <footer className="w-full py-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 mt-auto">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center text-sm">
        <p>
          &copy; {new Date().getFullYear()} {appName}. All rights reserved.
        </p>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link to="/support" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Support
          </Link>
        </div>
      </div>
    </footer>
  )
}
