/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Editorial light — warm neutral foundation, one accent.
        canvas: '#FBFAF8', // app background (warm off-white)
        surface: '#FFFFFF', // cards / panels
        raised: '#F4F3EF', // inset fills (tracks, subtle bubbles)
        hairline: '#E8E6E0', // borders / dividers
        ink: '#1A1C1F', // primary text (warm near-black)
        'ink-soft': '#56554E', // secondary text
        muted: '#8C8A82', // tertiary / labels
        accent: '#5B5BD6', // brand / interactive (restrained indigo)
        'accent-strong': '#4F46E5',
        // Threat ramp — desaturated, calm → alarm. Nominal is SLATE, not green,
        // so the baseline reads serene and red carries real meaning.
        nominal: '#6B7280',
        elevated: '#B7791F',
        critical: '#DC2626',
        'critical-soft': '#FCEBEA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 17, 26, 0.04), 0 2px 6px rgba(17, 17, 26, 0.04)',
      },
    },
  },
  plugins: [],
}
