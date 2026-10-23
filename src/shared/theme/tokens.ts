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

/**
 * Segundo "Set de valores" que specs/008-design-system/data-model.md anticipó para el modo
 * oscuro (regla de extensión US5-1): mismas claves que `colorTokens`, valores propios — web-soft
 * no tiene modo oscuro que replicar (docs/DESIGN.md), así que estos valores se definen desde cero,
 * ajustados a contraste WCAG 2.1 AA (`theme.test.ts` los verifica igual que a `colorTokens`).
 * `accion` se aclara respecto del claro (no se reutiliza el mismo valor) porque también se usa
 * como color directo de icono/texto sobre superficies oscuras (contraste insuficiente si
 * quedara tan oscuro como en el set claro).
 */
export const colorTokensOscuro = {
  marca: '#D9B64A',
  marcaOscuro: '#A8871F',
  marcaTinte: '#2B2410',
  marcaBorde: '#4A3F1C',
  accion: '#5B9BD9',
  accionHover: '#8FC0EC',
  accionTinte: '#17242F',
  accionBorde: '#355871',
  tinta: '#0A1931',
  cuerpo: '#E7EDF4',
  suave: '#AEB9C7',
  tenue: '#8793A3',
  fondo: '#0E151D',
  superficie: '#17212C',
  superficieSutil: '#1D2834',
  borde: '#2B3744',
  bordeFuerte: '#6FA3D1',
  exito: '#49C98B',
  exitoTinte: '#13291E',
  exitoBorde: '#2C5A41',
  aviso: '#E0B64C',
  avisoIcono: '#E0B64C',
  avisoTinte: '#2E2610',
  avisoBorde: '#5C4A1D',
  peligro: '#F2857C',
  peligroHover: '#F6A89F',
  peligroTinte: '#301613',
  peligroBorde: '#623129',
} as const satisfies Record<keyof typeof colorTokens, string>;

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
