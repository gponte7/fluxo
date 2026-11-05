const c = (v) => `rgb(var(--${v}) / <alpha-value>)`
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { bg: c('bg'), surface: c('surface'), ink: c('ink'), muted: c('muted'), line: c('line'), brand: c('brand'), inc: c('inc'), exp: c('exp') },
    fontFamily: { display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'], body: ['Figtree', 'system-ui', 'sans-serif'] },
  } },
}
