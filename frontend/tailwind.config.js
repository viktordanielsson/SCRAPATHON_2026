/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SENTINEL dark security palette
        base: '#0a0e14', // app background
        surface: '#10151f', // raised surface
        panel: '#161c28', // panel fill
        edge: '#1f2733', // borders / dividers
        muted: '#5b6b7f', // secondary text
        ink: '#c7d2e0', // primary text
        accent: '#22d3ee', // cyan — brand / live indicator
        safe: '#22c55e', // green — low threat
        warn: '#f59e0b', // amber — elevated threat
        danger: '#ef4444', // red — high threat
        critical: '#ff2d55', // hot pink-red — alert banner
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
