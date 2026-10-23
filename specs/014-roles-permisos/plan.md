# Implementation Plan: Roles y permisos

**Branch**: `014-roles-permisos` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-roles-permisos/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Agrega la sección "Roles y permisos" al Backoffice: una pantalla maestro-detalle (pestañas Clínica/Sistema, lista de roles a la izquierda, detalle a la derecha) para ver y editar la matriz de permisos (módulo × Ver/Crear/Modificar/Eliminar) de cada rol, crear roles nuevos (desde cero o copiando los permisos de otro), duplicar y eliminar roles. Consume la API ya existente de `mailySoft-usuarios` (roles, permisos, módulos); no agrega backend ni modifica esa API. También inserta la nueva sección en el menú principal, en la posición que deja el menú como Panel, Roles y permisos, Usuarios, Suscripciones, Token (spec FR-002).

Enfoque técnico, con detalle y alternativas en [research.md](research.md):

1. **Reutiliza el cliente HTTP `users`** (D1) y crea una feature nueva `src/features/roles` en paralelo a `features/users`, sin tocar esa feature (D2).
2. **La tabla de permisos se deriva del catálogo de permisos** (`GET /permissions`, ya trae módulo y acción resueltos), agrupado por módulo — nada de nombres de módulo hardcodeados (D3).
3. **La sección se gatea con un único recurso de permiso**, `roles`, igual que el resto del menú (D4); la falta de los scopes de catálogo (`permissions:read`/`modules:read`) solo afecta a la tabla, no a toda la pantalla (FR-020).
4. **Una sola ruta `/roles`**, maestro-detalle, con la pestaña y el rol elegido en la URL (D5) — la variante de patrón para Roles que ya reconoce la constitución v1.5.0.
5. **Sin endpoints atómicos en el backend** para "reemplazar permisos" ni "duplicar rol": el guardado de la matriz es un diff local-vs-servidor con altas/bajas una por una (D6), y crear-copiando/duplicar es crear el rol y luego asociar permisos uno por uno, sin revertir el rol si falla parte de la copia (D7) — ambos con manejo explícito de fallos parciales, como exige el Principio IV.
6. **Simulador de pruebas (MSW)** nuevo, `rolesCatalog`, con un escenario rico (varios módulos de Clínica) y uno pobre (solo los módulos de Sistema que existen hoy en el entorno local real) (D8).
7. **Navegación, textos e ícono**: nueva entrada al inicio de `sections`, clave de mensaje y un ícono nuevo (D9).
8. **Piezas nuevas o que cambian**: ver [Project Structure](#project-structure).

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js 24 LTS, sin cambios respecto al resto del proyecto.

**Primary Dependencies**: ninguna dependencia de paquete nueva. De `@mui/material`, ya presentes: `Tabs`, `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell` (la matriz de permisos, no un listado paginado: ver D5), `Checkbox`, `Autocomplete` (selector "Copiar permisos de"), `Dialog` (confirmación de eliminar), `TextField`. De `lucide-react` (ya dependencia): un ícono nuevo para `roles` en `iconRegistry` (D9).

**Storage**: N/A. Estado de servidor en TanStack Query (roles, sus permisos, catálogo de permisos y de módulos); la pestaña (Clínica/Sistema) y el rol elegido viven en los search params de la URL (D5); sin estado persistido en el navegador.

**Testing**: la infraestructura ya existente (Vitest, React Testing Library, user-event, MSW, vitest-axe, Playwright), con un simulador de dominio nuevo `test/handlers/rolesCatalog/` (D8) que cubre roles, permisos, módulos y role-types, y los códigos de error propios de este dominio (D10). Cobertura mínima de 80 % de líneas en `api`, `policy`, `schemas` y `hooks`, sin cambios.

**Target Platform**: SPA de escritorio en navegador, responsive desktop-first, sin cambios respecto al resto del proyecto. La tabla de permisos se desplaza horizontalmente dentro de su propio recuadro en anchos estrechos, igual que ya hace el Comparativo de Suscripciones (012), sin desplazamiento horizontal de la página.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: abrir el detalle de cualquier rol en menos de 30 s desde que se entra a la sección (SC-001); crear un rol completo copiando permisos de otro y ajustarlo en menos de 2 minutos (SC-003); reflejar un cambio de permisos guardado en la tabla y el contador sin recargar la página (SC-006, vía invalidación de TanStack Query, no `window.location.reload`).

**Constraints**: la tabla de permisos debe funcionar igual de bien con 0 módulos que con muchos (D3, D8) — nada de longitudes ni nombres de módulo fijos en el código; el nombre de un rol es único entre todos los roles no eliminados, sin importar el tipo, sin distinguir mayúsculas (regla del backend, no se duplica en el frontend, Principio IV); guardar permisos y crear/duplicar roles son operaciones de varios pasos sin atomicidad en el backend, con manejo de fallos parciales obligatorio (D6, D7, Principio IV).

**Scale/Scope**: 2 tipos de rol (Clínica, Sistema); hasta 4 acciones por módulo; N módulos según el catálogo vigente (hoy, en local, 4 módulos, todos de tipo Sistema). Una ruta nueva (`/roles`); cero rutas ni operaciones nuevas en el backend (reutiliza las 9 operaciones ya existentes de roles, permisos de rol, permisos y módulos).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.5.0 (ampliada en esta misma iteración para reconocer Roles como cuarto recurso administrado — ver Sync Impact Report en `.specify/memory/constitution.md`). Como es una feature nueva, se listan las filas donde hay algo que verificar; «Antes» es el estado al iniciar la investigación (código nuevo, aún no diseñado); «Después», tras el diseño de este plan.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Componentes de función; render puro; ≤ 250 líneas | La pantalla se divide por responsabilidad: `RolesPage` (orquesta), `RoleTypeTabs`, `RolesList`, `RoleDetailPanel`, `PermissionsMatrix` (+ fila), `RoleFormDialog` (crear), `CopyPermissionsFromField`, `DeleteRoleDialog` — ninguno mezcla listar, editar y confirmar | ⚠️ | ✅ |
| I. Sin abstracciones especulativas | La matriz se deriva de datos reales (D3); no se crea un "motor de permisos" genérico ni un patrón repositorio nuevo; la orquestación de D6/D7 son hooks concretos para este caso, no un framework de sagas | ✅ | ✅ |
| II. TypeScript estricto y Zod en la frontera | `schemas/role.ts`, `permission.ts`, `module.ts`, `rolePermission.ts` validan cada respuesta de la API; la capa `api` convierte snake_case → camelCase (`type_id`→`typeId`, `created_at`→`createdAt`, etc.); ningún componente ve el DTO crudo | ⚠️ | ✅ |
| III. Estado de servidor con TanStack Query; factoría de query keys; mutaciones invalidan lo afectado | `roleKeys`/`permissionKeys`/`moduleKeys` nuevas; crear/editar/eliminar un rol invalida la lista de roles (y, si cambian permisos, el propio detalle); asociar/desasociar invalida los permisos de ese rol | ⚠️ | ✅ |
| III. Estado navegable en la URL | Pestaña (`type`) y rol elegido (`roleId`) en search params de `/roles` (D5), mismo patrón que `page`/`page_size` en Usuarios | ⚠️ | ✅ |
| IV. Backend fuente de verdad; sin reglas autoritativas duplicadas | La unicidad del nombre y la compatibilidad tipo-rol/tipo-módulo las decide la API (409); el frontend solo evita llamadas que sabe que fallarán (deshabilitar módulos de otro tipo en "Copiar permisos de"), nunca como única guarda | ✅ | ✅ |
| IV. Operaciones de varios pasos: orden, fallos parciales y compensación definidos | D6 (guardar matriz) y D7 (crear copiando / duplicar) documentan orden, qué pasa si una llamada falla a medias, y que no hay reversión automática del rol — exigido porque el backend no ofrece un endpoint atómico para ninguna de las dos | ⚠️ | ✅ |
| IV. Mutaciones sin reintento automático; UI deshabilita la acción mientras está pendiente | Igual que el resto del repo: botones «Guardar cambios», «Crear role», «Duplicar», «Eliminar role» se deshabilitan durante su mutación | ✅ (patrón ya establecido) | ✅ |
| V. Autorización en un único módulo de políticas; frontend solo UX | `SECTION_RESOURCES` gana `'roles'` (ya estaba en `PERMISSION_RESOURCES`); `RequirePermission resource="roles"` protege la ruta; ninguna comparación de nombre de rol en componentes (D4) | ⚠️ | ✅ |
| VI. Mismo patrón Listar/Mostrar/Crear/Modificar/Eliminar, con la variante de Roles ya reconocida | Maestro-detalle de una sola pantalla con pestañas por tipo (D5) — variante ya admitida por el Principio VI desde la ampliación v1.5.0, no es un desvío que justificar aquí | N/A (ya reconocida en la constitución) | ✅ |
| VI. Confirmación explícita en acciones destructivas, nombrando el recurso | El diálogo de «Eliminar role» nombra el rol y advierte que no se puede deshacer (Historia 3) | ⚠️ | ✅ |
| VI. WCAG 2.1 AA | Tabla de permisos con encabezados de columna/fila asociados (`scope="col"`/`"row"`), `Tabs` estándar de MUI, foco gestionado al abrir/cerrar `RoleFormDialog` y `DeleteRoleDialog`, mensajes de error asociados a cada campo | ⚠️ | ✅ |
| VII. APIs simuladas con MSW; sin mockear fetch/cliente | `test/handlers/rolesCatalog/` (D8); pruebas de componente usan el doble de Auth0 ya centralizado | ⚠️ | ✅ |
| VII. Cobertura ≥ 80 % en api, políticas, esquemas y hooks | Los archivos nuevos de `features/roles/{api,hooks,schemas}` entran en el umbral ya exigido; sin excepción | ⚠️ | ✅ |

Filas no listadas (Auth0 y sesión, formato de fechas ISO, code splitting por ruta, presupuesto de bundle, flujo de desarrollo, CI): sin cambios respecto al resto del repo; esta feature no introduce nada que las afecte.

**Resultado**: sin violaciones sin justificar antes ni después del diseño. La única variante de patrón (maestro-detalle de una pantalla) ya quedó reconocida como parte normal del Principio VI en la ampliación v1.5.0 de la constitución, hecha para esta misma feature, así que no genera una fila en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/014-roles-permisos/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── roles-service.md
│   └── app-routes.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

Solo lo que esta feature agrega o cambia. Todo lo demás (cliente HTTP, Auth0, layout, el resto de `shared`) sigue como está.

```text
src/
├── app/
│   ├── navigation/
│   │   └── sections.ts                 # + entrada 'roles', al inicio del array (D9)
│   ├── router/
│   │   └── routes.tsx                   # + ruta /roles bajo <RequirePermission resource="roles">
│   └── providers/
│       └── HttpClientsProvider.tsx      # sin cambios (D1): se sigue usando el cliente `users`
├── features/
│   ├── auth/
│   │   └── policy/
│   │       └── permissions.ts           # 'roles' se agrega a SECTION_RESOURCES (ya estaba en PERMISSION_RESOURCES); se quita el comentario de "no se administra aquí" (D4)
│   └── roles/                           # NUEVO
│       ├── index.ts                     # export público (página + lo que necesite el router)
│       ├── api/
│       │   ├── rolesApi.ts              # list/create/update/delete de /api/v1/roles (D1)
│       │   ├── rolePermissionsApi.ts    # list/associate/disassociate de /api/v1/roles/{id}/permissions
│       │   ├── permissionsApi.ts        # list de /api/v1/permissions (catálogo)
│       │   ├── modulesApi.ts            # list de /api/v1/modules
│       │   ├── roleTypesApi.ts          # list de /api/v1/role-types
│       │   └── roleErrors.ts            # describeRoleError / describeRolePermissionError (D10)
│       ├── hooks/
│       │   ├── roleKeys.ts              # factoría de query keys
│       │   ├── useRolesCatalog.ts       # lista de roles por tipo (TanStack Query)
│       │   ├── usePermissionsCatalog.ts # catálogo de permisos (TanStack Query)
│       │   ├── useModulesCatalog.ts     # catálogo de módulos por tipo
│       │   ├── useRolePermissionMatrix.ts  # deriva la matriz módulo×acción a partir de los dos anteriores (D3)
│       │   ├── useRoleDetail.ts         # rol + sus permisos asociados
│       │   ├── useSaveRoleDetail.ts        # PATCH nombre/descripción + diff de permisos + fallos parciales (D6, FR-021)
│       │   ├── useCreateRole.ts         # crear (+ copiar permisos de otro rol) (D7)
│       │   ├── useDuplicateRole.ts      # duplicar (D7)
│       │   └── useDeleteRole.ts         # eliminar
│       ├── components/
│       │   ├── RolesPage.tsx            # orquesta pestaña + lista + detalle (≤ 250 líneas)
│       │   ├── RoleTypeTabs.tsx         # pestañas Clínica/Sistema
│       │   ├── RolesList.tsx            # lista de roles de la pestaña activa
│       │   ├── RoleDetailPanel.tsx      # nombre, descripción, tipo, contador, acciones (Duplicar/Eliminar)
│       │   ├── PermissionsMatrix.tsx    # tabla módulo × Ver/Crear/Modificar/Eliminar/Todo el módulo
│       │   ├── PermissionsMatrixRow.tsx # una fila; aplica la regla "Crear/Modificar/Eliminar exige Ver"
│       │   ├── RoleFormDialog.tsx       # alta: nombre, descripción, tipo, Copiar permisos de
│       │   ├── CopyPermissionsFromField.tsx  # Autocomplete de roles del mismo tipo
│       │   └── DeleteRoleDialog.tsx     # confirmación nombrando el rol
│       └── schemas/
│           ├── role.ts                  # Role, RoleType; RoleCreateInput; DTO → modelo
│           ├── permission.ts            # Permission (con module/action ya resueltos)
│           ├── module.ts                # Module
│           └── permissionMatrix.ts      # tipo de la matriz derivada (D3) y la regla Ver-prerequisito (FR-008)
├── shared/
│   ├── messages/
│   │   └── es.ts                        # + nav.sections.roles y las titleKey de /roles (D9)
│   └── ui/
│       └── iconRegistry.ts              # + icono 'roles' (D9)
└── test/
    └── handlers/
        ├── usersDirectory/
        │   └── model.ts                  # + createRole/updateRole/deleteRole (reglas reales) y `type` en toRoleRecordDto (D8); addRole/setRoleStatus sin cambios
        └── rolesCatalog/                 # NUEVO simulador MSW (D8); compone con el DirectoryModel de usersDirectory, no lo duplica
            ├── model.ts                  # catálogo de Module y Permission (agrupado como D3); asociar/desasociar delega en model.grant/model.revoke
            ├── roles.ts                  # handlers POST/PATCH/DELETE /roles (llaman a createRole/updateRole/deleteRole)
            ├── permissions.ts            # handlers GET/POST/DELETE /roles/:id/permissions
            ├── catalogs.ts               # handlers GET /permissions, GET /modules, GET /role-types
            ├── seed.ts                   # catálogo por omisión (4 módulos de Sistema, 0 de Clínica, como el entorno real) + richClinicModulesSeed (caso rico, opcional)
            └── index.ts                  # createRolesCatalogMock(directoryModel, initial), registra todos los handlers en el server compartido
```

**Structure Decision**: feature nueva `src/features/roles`, con las mismas cuatro capas (`api`/`hooks`/`components`/`schemas`) que `features/users` y `features/subscriptions`, más los cuatro puntos de integración compartidos que toda sección nueva del menú ya toca en este repo (`navigation/sections.ts`, `router/routes.tsx`, `auth/policy/permissions.ts`, `shared/messages/es.ts`, `shared/ui/iconRegistry.ts`) y un simulador de pruebas nuevo bajo `test/handlers/`. No se crea ninguna carpeta ni capa que el repo no tenga ya para sus otras tres features administradas.

## Complexity Tracking

*Sin violaciones que justificar: ver Constitution Check.*
