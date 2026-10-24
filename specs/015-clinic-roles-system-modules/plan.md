# Implementation Plan: Permisos de Módulos de Sistema para Roles de Clínica (Backoffice)

**Branch**: `015-clinic-roles-system-modules` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-clinic-roles-system-modules/spec.md`

## Summary

Ajusta la matriz de permisos de "Roles y permisos" (feature `014`) para reflejar una regla ya
vigente en el backend (`mailySoft-usuarios`, spec `015` de ese repositorio, sin cambios de API): un
role de tipo Clínica puede recibir permisos de módulos de tipo Sistema además de los de tipo
Clínica; un role de tipo Sistema sigue limitado a módulos de tipo Sistema. Hoy el Backoffice filtra
de más (FR-006 de la `014`): `buildPermissionMatrix` solo ofrece módulos del mismo `type.id` que el
role, en ambas direcciones.

Enfoque técnico, con detalle y alternativas en [research.md](research.md):

1. **`buildPermissionMatrix` no cambia** (R1): sigue filtrando por un único `roleTypeId`, exactamente
   como hoy (y sus pruebas actuales siguen pasando sin tocarlas). Para un role de Clínica,
   `useRolePermissionMatrix` la invoca dos veces (una por tipo de módulo) y concatena las dos listas
   de filas resultantes en un único `PermissionMatrix` plano, en vez de enseñarle a la función a
   mezclar dos tipos a la vez.
2. **`useModulesCatalog` tampoco cambia de forma**: `useRolePermissionMatrix` llama siempre a los dos
   tipos (`useModulesCatalog(1)` y `useModulesCatalog(2)`), sin condicionar cuántos Hooks se invocan
   según `typeId` — `RoleDetailPanel` no se remonta al cambiar de role (R2), así que el número de
   llamadas a Hooks no puede depender de su valor. `typeId` decide, con lógica plana, cuáles de los
   dos resultados se usan. Catálogos pequeños y ya cacheados 5 minutos: la petición de más para un
   role de Sistema es barata y no justifica restructurar el montaje del panel para evitarla.
3. **El agrupamiento visual es puramente de presentación** (R3): `PermissionsMatrix` detecta, a
   partir de `row.module.type` (dato que ya trae cada fila), si la tabla mezcla más de un tipo de
   módulo; si es así, inserta un encabezado de grupo antes de las filas de cada tipo, con el nombre
   del tipo tal como lo da el catálogo (sin textos de "Sistema"/"Clínica" hardcodeados por separado).
   Para un role de Sistema (un solo tipo presente) la tabla se ve exactamente igual que hoy.
4. **Sin cambios de contrato de API** (R4): el backend ya acepta estas asociaciones (spec `015` de
   `mailySoft-usuarios`); esta feature no agrega ni modifica ningún endpoint, payload ni esquema de
   respuesta, así que no genera una carpeta `contracts/` propia.
5. **`useEditablePermissionMatrix`, `RoleDetailPanel`, `countGranted`/`countTotal`, "Copiar permisos
   de" y "Duplicar" no cambian**: ya operan de forma genérica sobre "lo que haya en la matriz" sin
   conocer el tipo de módulo de cada fila (R1); heredan el comportamiento nuevo sin tocar su código.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1, sin
cambios respecto al resto del proyecto.

**Primary Dependencies**: ninguna dependencia nueva. Mismas piezas de `@mui/material` que ya usa la
matriz (`Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell`, `Checkbox`); el encabezado de grupo
es una `TableRow` más, con una celda `colSpan`.

**Storage**: N/A. Mismo estado de servidor vía TanStack Query que ya usa la feature `014`
(`modulesCatalogKeys.byType(typeId)`, reutilizada tal cual, solo invocada una vez más para el role
de Clínica); sin estado nuevo en el cliente ni en la URL.

**Testing**: misma infraestructura (Vitest, React Testing Library, user-event, MSW). Pruebas
existentes que siguen verificando una regla que ya no es del todo cierta y deben actualizarse o
ampliarse (detalle en [research.md](research.md), R5):
`src/features/roles/hooks/useRolePermissionMatrix.test.ts`,
`src/features/roles/components/PermissionsMatrix.test.tsx`.
`src/test/handlers/rolesCatalog/seed.ts` (D8 de la spec `014`) NO cambia: `richClinicModulesScenario()`
ya combina los 4 módulos de Sistema con 3 de Clínica en un mismo catálogo, exactamente la mezcla que
esta feature necesita probar; no hace falta una semilla nueva.
`src/features/roles/schemas/permissionMatrix.test.ts` (`buildPermissionMatrix`) NO cambia: sigue
probando una función que no cambia (R1).

**Target Platform**: SPA de escritorio en navegador, sin cambios. La tabla ya se desplaza
horizontalmente dentro de su propio recuadro (D-table de la `014`); los encabezados de grupo no
cambian ese comportamiento.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin
cambios.

**Performance Goals**: sin objetivo nuevo; abrir la matriz de un role de Clínica sigue sin recarga
de página (invalidación de TanStack Query, como ya exige la `014`, SC-006).

**Constraints**: el cambio MUST ser compatible con un role de Sistema sin ninguna diferencia visible
(FR-002/FR-005); MUST seguir sin introducir el par (Sistema, Clínica) en ningún punto del cliente
(ninguna UI debe ofrecer, ni siquiera deshabilitado, un módulo de Clínica en la matriz de un role de
Sistema).

**Scale/Scope**: mismos 2 tipos de rol y hasta 4 acciones por módulo de la `014`; cambia solo cuántos
módulos se piden y cómo se presentan para el caso Clínica. Cero rutas, endpoints u operaciones
nuevas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.5.0. Como es un ajuste acotado de una feature ya existente
(`014`), se listan solo las filas donde hay algo que verificar.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Sin abstracciones especulativas | No se generaliza `buildPermissionMatrix` para "N tipos" ni se crea un concepto nuevo de "grupo" en el modelo de datos; se reutiliza la función existente, invocada dos veces, y se agrupa solo en la presentación (R1, R3) | ✅ | ✅ |
| I. Componentes ≤ 250 líneas, responsabilidad única | El encabezado de grupo se agrega dentro de `PermissionsMatrix` (ya es la responsable de armar la tabla); `PermissionsMatrixRow` no cambia | ✅ | ✅ |
| II. TypeScript estricto; Zod en la frontera | Ningún esquema nuevo: `Module`/`ModuleType` (spec `013`) ya traen `type.id`/`type.name`; no hay una frontera nueva que validar | ✅ | ✅ |
| III. Estado de servidor con TanStack Query; factoría de query keys | `useModulesCatalog`/`modulesCatalogKeys.byType` se reutilizan sin cambiar de forma, solo invocadas una vez más (R2) | ✅ | ✅ |
| IV. Backend fuente de verdad; sin regla autoritativa duplicada en el cliente | La regla (qué par rol-módulo es válido) vive solo en el backend (spec `015` de `mailySoft-usuarios`); el cliente solo deja de filtrar de más, nunca decide por su cuenta qué combinación es válida | ✅ | ✅ |
| IV. Contratos documentados en `specs/<feature>/contracts/` | Sin cambios de contrato (R4): esta feature no crea `contracts/` propio; el contrato vigente sigue siendo `specs/014-roles-permisos/contracts/roles-service.md`, sin modificar | ✅ | ✅ |
| VI. Mismo patrón ya reconocido para Roles (maestro-detalle con pestañas) | Sin cambios de navegación, rutas ni patrón de pantalla; solo cambia el contenido de la matriz dentro del detalle ya existente | N/A | ✅ |
| VI. WCAG 2.1 AA | El encabezado de grupo usa una fila de tabla con su propio texto (no solo color) para distinguir los módulos; no introduce un control nuevo que necesite foco propio | ⚠️ | ✅ |
| VII. APIs simuladas con MSW; sin mockear fetch | `richClinicModulesScenario()`, ya en el simulador `test/handlers/rolesCatalog/` (D8 de la `014`), ya combina módulos de Sistema y de Clínica; no necesita cambiar (R5); sigue sin mockear el cliente HTTP | ✅ | ✅ |
| VII. Cobertura ≥ 80 % en api, políticas, esquemas y hooks | Los archivos que cambian (`hooks/useRolePermissionMatrix.ts`, `components/PermissionsMatrix.tsx`) ya estaban dentro del umbral exigido por la `014`; sin excepción nueva | ✅ | ✅ |

Filas no listadas (Auth0/sesión, fechas ISO, code splitting, presupuesto de bundle, flujo de
desarrollo, CI, el resto de los principios de la `014` ya evaluados allí): sin cambios; esta feature
no introduce nada que las afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. Nada que registrar en
Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/015-clinic-roles-system-modules/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

Sin carpeta `contracts/` propia (R4): no hay contrato nuevo ni modificado que documentar.

### Source Code (repository root)

Solo lo que esta feature cambia; todo lo demás de `features/roles` (creado por la `014`) sigue
igual.

```text
src/features/roles/
├── hooks/
│   └── useRolePermissionMatrix.ts   # para typeId=2 (Clínica), arma también el grupo de módulos de
│                                      # Sistema (llama useModulesCatalog(1) además de (2) y
│                                      # buildPermissionMatrix dos veces); para typeId=1 (Sistema),
│                                      # sin cambios de comportamiento
├── components/
│   └── PermissionsMatrix.tsx        # agrega el encabezado de grupo por tipo de módulo cuando la
│                                      # tabla mezcla más de uno; PermissionsMatrixRow no cambia
└── schemas/
    └── permissionMatrix.ts          # sin cambios (R1): buildPermissionMatrix sigue filtrando por
                                       # un único roleTypeId, tal como hoy

specs/014-roles-permisos/
└── spec.md                          # FR-006 se corrige para describir la regla asimétrica (FR-003
                                       # de esta spec), dejando trazado que esta feature lo sustituye

```

`src/test/handlers/rolesCatalog/seed.ts` no aparece arriba porque no cambia: `richClinicModulesScenario()`
(D8 de la spec `014`) ya siembra los 4 módulos de Sistema junto con 3 de Clínica.

**Structure Decision**: ajuste dentro de la feature `features/roles` ya existente (`014`); no se
crea ninguna carpeta, capa ni feature nueva. El único archivo fuera de `src/` que cambia es el propio
`spec.md` de la `014` (FR-006), para no dejar dos specs con reglas contradictorias en el repositorio.

## Complexity Tracking

*Sin violaciones que justificar: ver Constitution Check.*
