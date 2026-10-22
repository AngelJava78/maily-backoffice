# Contrato: Componente común de iconos (`Icon`)

Interfaz de `src/shared/ui/Icon.tsx` + `src/shared/ui/iconRegistry.ts`. Ver `../data-model.md`
(entidad "Icono") y `../research.md` §7.

## Props de `Icon`

```ts
type IconProps = {
  name: IconName;              // clave de iconRegistry.ts — error de compilación si no existe
  size?: 'sm' | 'md' | 'lg';    // mapea a spaceTokens (16px / 20px / 24px) — nunca un número libre
  color?: keyof typeof colorTokens; // si se omite, hereda currentColor (p. ej. dentro de un botón)
  decorative?: boolean;         // true → aria-hidden, sin nombre accesible
  accessibleName?: MessageKey;  // requerido cuando decorative !== true; clave de shared/messages/es.ts
};
```

- Si `decorative` es falso/omitido y no se provee `accessibleName`, es un **error de compilación**
  (tipos condicionales o una sobrecarga de `IconProps`), no un warning en runtime — evita iconos
  informativos sin nombre accesible (US3, WCAG AA).
- `IconName` es la unión de claves de `iconRegistry.ts`: los nombres de `lucide-react` usados hoy
  (uno por cada reemplazo de los 11 archivos que usan `@mui/icons-material`, ver research.md §7) y
  los nombres reservados para los SVG propios de órganos (`public/organos/*.svg` de web-soft),
  aunque hoy ninguna pantalla los use.

## Reglas

1. Ningún archivo de `src/features/**` DEBE importar `lucide-react`, `@mui/icons-material` ni
   ningún SVG de icono directamente — siempre a través de `<Icon name="..." />` (FR-007/FR-008).
2. Agregar un icono nuevo = agregar una entrada a `iconRegistry.ts`; nunca un import inline en el
   componente que lo usa.
3. El tamaño y el color de todo icono salen de los tokens (`size`/`color` arriba), nunca un
   `fontSize`/`color` fijo en `sx`.

## Verificación

- Prueba unitaria: `Icon` renderiza el nombre accesible correcto cuando `decorative` es falso, y
  `aria-hidden="true"` sin nombre cuando es `true`.
- Búsqueda en CI: `grep -r "from '@mui/icons-material'" src/features` y
  `grep -r "from 'lucide-react'" src/features` (fuera de `shared/ui/iconRegistry.ts`) no devuelven
  resultados (SC-003: 0 iconos fuera del componente común).
