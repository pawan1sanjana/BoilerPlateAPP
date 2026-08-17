/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  safelist: [
    // Theme color classes are applied dynamically via JS (classList.add)
    // so Tailwind's scanner can't detect them — safelist to prevent purging
    { pattern: /^theme-(green|purple|rose|orange)$/ },
  ],
  theme: {
  	extend: {
  		colors: {
  			blue: {
  				50: 'hsl(var(--theme-50) / <alpha-value>)',
  				100: 'hsl(var(--theme-100) / <alpha-value>)',
  				200: 'hsl(var(--theme-200) / <alpha-value>)',
  				300: 'hsl(var(--theme-300) / <alpha-value>)',
  				400: 'hsl(var(--theme-400) / <alpha-value>)',
  				500: 'hsl(var(--theme-500) / <alpha-value>)',
  				600: 'hsl(var(--theme-600) / <alpha-value>)',
  				700: 'hsl(var(--theme-700) / <alpha-value>)',
  				800: 'hsl(var(--theme-800) / <alpha-value>)',
  				900: 'hsl(var(--theme-900) / <alpha-value>)',
  				950: 'hsl(var(--theme-950) / <alpha-value>)',
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
