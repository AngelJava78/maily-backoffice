# Data Model: Estilos, Diseño e Iconografía de MailySoft v2

No hay estado de servidor ni persistencia (ver Technical Context: Storage = N/A). Las "entidades"
de esta feature son estructuras de diseño/documentación que viven en código fuente y en
`docs/DESIGN.md`, no en una base de datos. Se listan aquí con sus campos y reglas de validación
para que `/speckit-tasks` pueda derivar tareas concretas de implementación y documentación.

## Token de diseño

Valor con nombre de una de seis categorías. Los componentes solo usan tokens (FR-006): ningún
color, tamaño de fuente o espaciado fijo.

| Campo | Tipo | Regla |
|---|---|---|
| `name` | string | Nombre de web-soft (español) si existe; si no, un nombre semántico nuevo (p. ej. `color-danger`). Único dentro de su categoría. |
| `category` | `'color' \| 'tipografia' \| 'espaciado' \| 'radio' \| 'sombra' \| 'breakpoint'` | Fija el tipo de valor permitido. |
| `value` | string | Valor literal (hex, rem, px, sombra CSS). DEBE coincidir con el valor de web-soft salvo la excepción documentada de `borde-fuerte` para campos (ver research.md §4). |
| `role` | string | Para qué se usa (p. ej. "fondo de página", "texto principal", "acción", "peligro", "borde de campo"). Un token puede tener más de un `role`. |
| `sourceFile` | string \| null | Archivo de web-soft de donde sale (alimenta la tabla de Equivalencia). `null` solo si el token es semántico nuevo sin equivalente. |

**Validación**: todo token de categoría `color` usado como borde de campo de formulario DEBE
cumplir WCAG AA (3:1) — por eso `borde-fuerte`, no `borde`, tiene `role: "borde de campo"`.

## Set de valores

Los valores de todos los tokens para una apariencia completa.

| Campo | Tipo | Regla |
|---|---|---|
| `name` | string | Esta feature entrega exactamente un set: `"web-soft"`. |
| `tokens` | `Record<tokenName, value>` | Un valor por cada Token de diseño definido arriba. |

**Regla de extensión (US5-1)**: la Spec 4 (modo oscuro) agrega un segundo `Set de valores`
(`"web-soft-oscuro"` o similar) con los mismos nombres de token y valores distintos, sin que los
componentes cambien. Esta feature no crea ese segundo set; solo garantiza que la estructura lo
admita (los componentes nunca referencian un valor directo, solo el nombre del token).

## Componente base

Pieza reutilizable con el aspecto y comportamiento de web-soft.

| Campo | Tipo | Regla |
|---|---|---|
| `name` | string | PascalCase, en inglés (p. ej. `Badge`, `Avatar`, `EmptyState`). |
| `category` | `'control' \| 'dato' \| 'mensaje' \| 'estado'` | Agrupación de FR-009 a FR-012. |
| `filePath` | string | Ruta en `src/shared/ui/` (o el archivo de MUI retematizado que lo implementa, p. ej. `MuiDialog` para `ConfirmDialog`). |
| `webSoftEquivalent` | string \| null | Archivo/clase CSS de web-soft del que copia aspecto (p. ej. `.badge-success` en `web-soft/src/index.css`). `null` si no tiene equivalente (ver Edge Cases del spec: se construye con tokens y se consulta). |
| `accessibleBehaviorPreserved` | boolean | `true` cuando el Backoffice conserva un comportamiento accesible que web-soft no tiene (modales: Escape, trampa de foco — ver research.md §13). |

Contratos de props detallados por componente: ver `contracts/base-components.md`,
`contracts/icon-component.md` y `contracts/layout.md`.

## Icono

Pictograma mostrado a través del componente común `Icon`.

| Campo | Tipo | Regla |
|---|---|---|
| `name` | string | Clave del registro (`iconRegistry.ts`), en inglés/kebab-case. |
| `source` | `'lucide-react' \| 'propio'` | De dónde sale el pictograma. |
| `libraryIconName` | string \| null | Nombre del export de `lucide-react` (p. ej. `BarChart3`) si `source = 'lucide-react'`. |
| `svgPath` | string \| null | Ruta del SVG propio copiado de `web-soft/public/organos/` si `source = 'propio'`. |
| `accessibleName` | string \| null | Clave de `src/shared/messages/es.ts` con el nombre accesible, requerida cuando el icono es informativo (no decorativo). |

**Validación**: FR-008 — ningún archivo de `src/features/**` DEBE importar `@mui/icons-material`
ni ningún otro paquete de iconos directamente; todo pasa por `Icon`.

## Recurso de marca

Logo, favicon y fuente, copiados de web-soft.

| Campo | Tipo | Regla |
|---|---|---|
| `type` | `'logo-horizontal' \| 'isotipo' \| 'logo-vertical' \| 'fuente'` | Los 3 activos gráficos de `web-soft/public/marca/` más la fuente Inter. |
| `sourceFile` | string | Ruta en `web-soft` (p. ej. `public/marca/maily-horizontal.png`). |
| `targetFile` | string | Ruta en el Backoffice (p. ej. `src/assets/brand/maily-horizontal.png`). |
| `fallback` | string \| null | Para los logos: texto `"maily"` si la imagen no carga (edge case del spec). Para la fuente: la pila de fuentes de respaldo del sistema. `null` para el favicon (no tiene fallback visual). |

## Equivalencia

Fila de la tabla de FR-003/FR-022, documentada en `docs/DESIGN.md`.

| Campo | Tipo | Regla |
|---|---|---|
| `webSoftFile` | string | Ruta o clase de origen en `web-soft` (archivo, clase CSS, o `tailwind.config.js`/`index.css` para tokens). |
| `backofficeFile` | string | Ruta de destino en el Backoffice. |
| `elementType` | `'token' \| 'icono' \| 'componente' \| 'marca'` | Qué tipo de pieza relaciona esta fila. |
| `notes` | string \| null | Aclaraciones (p. ej. "valor sustituido por WCAG AA: `borde-fuerte` en vez de `borde`", o "sin equivalente en web-soft, valor consultado el 2026-10-21"). |

**Validación**: toda fila con `notes` vacío y `elementType = 'token'` cuyo valor no coincida
exactamente con el de `webSoftFile` es un error de documentación (FR-022 exige que la tabla sea
fiel); toda sustitución deliberada (como la del borde, §4 de research.md) DEBE llevar su nota.

**Ejemplo (semilla, no exhaustivo — la tabla completa es un entregable de implementación)**:

| webSoftFile | backofficeFile | elementType | notes |
|---|---|---|---|
| `tailwind.config.js` (`colors.borde-fuerte`) | `src/shared/theme/tokens.ts` (`colors.bordeFuerte`) | token | usado como borde de campo en vez de `borde`, por WCAG AA |
| `src/components/Topbar.tsx` | `src/app/layouts/Topbar.tsx` | componente | layout de barra superior |
| `public/marca/maily-isotipo.png` | `src/assets/brand/maily-isotipo.png` | marca | favicon |
| `lucide-react` (`BarChart3`) | `src/shared/ui/iconRegistry.ts` | icono | — |
