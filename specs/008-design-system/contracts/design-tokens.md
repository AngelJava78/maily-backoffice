# Contrato: Tokens de diseño

Interfaz que `src/shared/theme/tokens.ts` expone al resto del código (theme de MUI, componentes
base, y a las Specs 4-7). Ver `../data-model.md` (entidad "Token de diseño") y `../research.md`
(§3, §4, §6) para el origen de cada valor.

## Forma del módulo

```ts
export const colorTokens = {
  marca: '#C9A227', marcaOscuro: '#A8871F', marcaTinte: '#FBF3D9', marcaBorde: '#EBD9A0',
  accion: '#1A3D63', accionHover: '#0A1931', accionTinte: '#EEF4FA', accionBorde: '#B3CFE5',
  tinta: '#0A1931', cuerpo: '#22303F', suave: '#4A5567', tenue: '#5F6B7D',
  fondo: '#F6FAFD', superficie: '#FFFFFF', superficieSutil: '#F1F6FB',
  borde: '#E3EAF2', bordeFuerte: '#4A7FA7',
  exito: '#1F6E47', exitoTinte: '#E7F6EE', exitoBorde: '#B7E0C9',
  aviso: '#856404', avisoIcono: '#B8860B', avisoTinte: '#FEF6E0', avisoBorde: '#F0D48A',
  peligro: '#B3261E', peligroHover: '#8C1D18', peligroTinte: '#F9DEDC', peligroBorde: '#F1B9B4',
} as const;

export const typographyTokens = {
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

export const spaceTokens = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const; // px

export const radiusTokens = { xl: 12, '2xl': 16, full: 9999 } as const; // px

export const shadowTokens = {
  card: '0 1px 2px rgba(10,25,49,.06), 0 4px 12px rgba(10,25,49,.05)',
  cardAlto: '0 2px 4px rgba(10,25,49,.07), 0 12px 28px rgba(10,25,49,.08)',
} as const;

export const breakpointTokens = { sm: 640, md: 768, lg: 1024, xl: 1280, xxl: 1536 } as const; // px
```

Nombres de clave en `camelCase` (identificador TypeScript válido); los **valores** de color que
tienen nombre en web-soft conservan ese nombre en español dentro de la cadena solo donde
`docs/DESIGN.md` los cita, no en la clave del objeto (la clave es un identificador de código,
cubierto por la excepción del principio I solo en cuanto a que representa 1:1 un token de
web-soft — ver constitución v1.4.0).

## Reglas de consumo (contrato con quien use los tokens)

1. Ningún componente de `src/features/**` o `src/shared/ui/**` DEBE escribir un valor de color,
   tamaño de fuente, espaciado, radio, sombra o breakpoint literal en `sx`, CSS o props de estilo.
   Siempre se referencia `colorTokens.x` / `spaceTokens[n]` / etc., o la variable de tema
   correspondiente (`theme.palette...`, `theme.shape.borderRadius`) una vez que `theme.ts` los
   consume.
2. El borde de un campo de formulario (input, select, textarea) usa `colorTokens.bordeFuerte`,
   nunca `colorTokens.borde` (research.md §4).
3. `colorTokens.marca` y sus variantes NO DEBEN usarse en botones, badges ni ningún elemento que
   comunique estado — son exclusivos del logo y la marca.
4. Extensión futura (Spec 4, modo oscuro): un segundo módulo (p. ej. `tokens.dark.ts`) exporta los
   mismos nombres de clave con valores distintos; `theme.ts` elige el módulo según el modo activo.
   Ningún componente base cambia para soportarlo.

## Verificación

- Prueba unitaria (`tokens.test.ts`): cada valor de `colorTokens` coincide exactamente con el
  valor citado en `research.md` §3, salvo `bordeFuerte` usado como borde de campo (documentado).
- Búsqueda en CI (lint/regex o `grep`, a definir en tasks.md): ningún archivo de
  `src/features/**` contiene un literal `#[0-9a-fA-F]{6}` fuera de `theme.ts`/`tokens.ts`.
