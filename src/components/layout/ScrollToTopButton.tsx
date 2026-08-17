import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useSystemPrefsStore } from '@/store/useSystemPrefsStore'

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)
  const { prefs } = useSystemPrefsStore()

  useEffect(() => {
    const container = document.getElementById('main-scroll-container')
    if (!container) return

    const handleScroll = () => {
      if (container.scrollTop > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    // Check initial scroll position
    handleScroll()

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    const container = document.getElementById('main-scroll-container')
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    }
  }

  if (!prefs.showScrollToTop) return null

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-8 right-8 p-3 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 z-50 ${
        isVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
      aria-label="Scroll to top"
    >
      <ArrowUp size={24} />
    </button>
  )
}
