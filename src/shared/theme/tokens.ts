/**
 * Design tokens copied from MailySoft v2 (web-soft), the source of truth for this feature's
 * visual design (specs/008-design-system). Names are in Spanish on purpose: they mirror
 * web-soft's own token names (constitution v1.4.0, exception to principle I).
 *
 * `colorTokens.borde` (#E3EAF2) is kept for parity with web-soft, but field borders use
 * `bordeFuerte` instead: `borde` is only 1.2:1 over white, below the 3:1 WCAG AA floor for the
 * parts of a control that identify it (see spec.md Edge Cases, FR-005 vs FR-019).
 */
export const colorTokens = {
  marca: '#C9A227',
  marcaOscuro: '#A8871F',
  marcaTinte: '#FBF3D9',
  marcaBorde: '#EBD9A0',
  accion: '#1A3D63',
  accionHover: '#0A1931',
  accionTinte: '#EEF4FA',
  accionBorde: '#B3CFE5',
  tinta: '#0A1931',
  cuerpo: '#22303F',
  suave: '#4A5567',
  tenue: '#5F6B7D',
  fondo: '#F6FAFD',
  superficie: '#FFFFFF',
  superficieSutil: '#F1F6FB',
  borde: '#E3EAF2',
  bordeFuerte: '#4A7FA7',
  exito: '#1F6E47',
  exitoTinte: '#E7F6EE',
  exitoBorde: '#B7E0C9',
  aviso: '#856404',
  avisoIcono: '#B8860B',
  avisoTinte: '#FEF6E0',
  avisoBorde: '#F0D48A',
  peligro: '#B3261E',
  peligroHover: '#8C1D18',
  peligroTinte: '#F9DEDC',
  peligroBorde: '#F1B9B4',
} as const;

export const typographyTokens = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

/** 4px-based scale, matching web-soft's (Tailwind default). In px. */
export const spaceTokens = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;

/** In px. */
export const radiusTokens = { xl: 12, '2xl': 16, full: 9999 } as const;

export const shadowTokens = {
  card: '0 1px 2px rgba(10,25,49,.06), 0 4px 12px rgba(10,25,49,.05)',
  cardAlto: '0 2px 4px rgba(10,25,49,.07), 0 12px 28px rgba(10,25,49,.08)',
} as const;

/**
 * In px. Not wired into MUI's `theme.breakpoints` (which stays at its defaults to avoid a
 * sweeping, unreviewed change to every existing responsive behaviour in the app) — only `md` is
 * actually load-bearing for this feature, as the Topbar/BottomNav switch point (research.md §9).
 */
export const breakpointTokens = { sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1536 } as const;
