# Implementation Plan: Módulos y submódulos en árbol jerárquico

**Branch**: `024-modules-submodules-tree` | **Date**: 2026-11-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/024-modules-submodules-tree/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

La sección «Módulos» muestra hoy el catálogo como una lista plana agrupada por tipo. El servicio de
usuarios (versión 5.4.0) ya define los **submódulos** (un módulo con un **módulo padre**, un solo
nivel, del mismo tipo). Esta feature hace que esa jerarquía **se vea como un árbol** (cada submódulo
bajo su padre, con contraer y expandir) y **se pueda administrar**: elegir, cambiar o quitar el padre
al crear y editar, y avisar de lo que pasa al bloquear o eliminar un módulo con submódulos. Todo el
cambio está en `features/modules`, con textos nuevos en `shared/messages`. «Roles y permisos»,
«Suscripciones» y el resto siguen mostrando los módulos como lista plana (FR-019).

Enfoque técnico, con el detalle y las alternativas en [research.md](research.md):

1. **Una sola consulta** (D1): `GET /modules` ya trae módulos de primer nivel y submódulos juntos, cada
   uno con `parent_module`. No hay claves de consulta nuevas; el árbol se arma en el cliente con una
   función pura, `buildModuleTree`, que absorbe a `filterModules` (D2).
2. **Tres clases de fila** (D3): módulo, submódulo y **fila de contexto** (el padre atenuado y sin
   acciones que se muestra solo para ubicar a un submódulo, cuando el padre no está en la vista o no
   coincide con la búsqueda). Los contadores distinguen módulos de submódulos y no cuentan el contexto.
3. **La `Table` de MUI con un botón nativo de contraer** (D5), no un `treegrid`: `aria-expanded`, nombre
   «{n} submódulos de {Módulo}» y, en cada submódulo, «Submódulo de {Padre}» para lectores de pantalla.
   Lo contraído es estado de pantalla (D6) y no hay control durante una búsqueda.
4. **El padre se elige con un `select`** (D7) cuyas opciones salen de la consulta de Activos que ya existe
   (`eligibleParents`); el valor es un texto y el cuerpo envía `null` para quitar el padre (D8).
5. **Reglas adelantadas a la interfaz, la API manda** (D9, D11): el padre se limpia al cambiar el tipo en
   el alta; el campo se bloquea con submódulos a la vista o en módulos base; los cinco códigos de error
   nuevos van al campo con textos propios, sin texto crudo del servicio.
6. **Aviso de bloqueo y eliminación restringida** (D12) con el conteo «a la vista»; las mutaciones
   invalidan el catálogo también al fallar (D13).
7. **El simulador MSW aplica las reglas de la 5.4.0** (D14) sin tocar la semilla; los datos de prueba
   llevan `parent_module: null` por omisión (D15).
8. **`ModuleEditPanel` (244 líneas) y `ModulesTable` se dividen** para no pasar de 250 (D10).
9. Piezas que cambian: ver [Project Structure](#project-structure).

### Ajustes al spec detectados durante el plan

Se hicieron dos, ya aplicados en [spec.md](spec.md): **FR-004** (durante una búsqueda el control de
contraer no se ofrece, solo el conteo; al limpiar, cada padre recupera su estado) y la **suposición de
la dependencia del servicio** (la versión 5.4.0 ya está en el repositorio del servicio, y como el campo
del padre es obligatorio en sus respuestas, se despliega primero el servicio y después el Backoffice).
El resto del spec se cumple tal como está escrito.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict`, `noUncheckedIndexedAccess`), React 19.3.1 y Node.js ≥ 24.15.0 (`engines`), sin cambios.

**Primary Dependencies**: las mismas ya en uso, sin dependencias nuevas ni cambios de versión. MUI 9.5.0 (`Table`, `TextField select`, `IconButton`, `Typography`; sin `@mui/x-tree-view` ni datos en árbol del Data Grid, que son de pago, research D5), TanStack Query 5.104.4, React Hook Form 7.90.0 con `@hookform/resolvers` 5.9.2 y Zod 4.6.7. El icono de expandir sale del registro único (`arrow-drop-down`, ya existe).

**Storage**: N/A. Ningún estado de servidor ni de navegador nuevo: los ids contraídos son un `useState` de la pantalla y no se guardan (FR-004).

**Testing**: la infraestructura existente (Vitest 5.0.5, Testing Library, user-event, vitest-axe 0.1.0, MSW 3.0.3, Playwright 1.64.1). El simulador `src/test/handlers/modulesCatalog` se amplía con la jerarquía (research D14). Cobertura mínima del 80 % en `api`/`schemas`/`policy`/`hooks`: la lógica nueva (`buildModuleTree`, `moduleHierarchy`, `systemModule`, `moduleForm`, `moduleErrors`, `useCollapsedModules`) se prueba aparte. El E2E exige un entorno Auth0 de pruebas y no se ejecuta aquí.

**Target Platform**: SPA estática en navegadores de escritorio actuales, de 1024 a 320 px, claro y oscuro, sin cambios.

**Project Type**: aplicación web de solo frontend, proyecto único en la raíz del repositorio, sin cambios.

**Performance Goals**: el catálogo es chico y acotado por el contrato (≈ 200 entradas activas, sin paginar). Armar y aplanar el árbol es O(n log n) en el render, sin memoización preventiva (constitución I; React Compiler en uso). Contraer o expandir 30 submódulos debe responder en menos de 1 s (SC-005) y no monta las filas ocultas. El bundle de la ruta de Módulos ya se carga de forma diferida y no usa dependencias nuevas; se mide al final (presupuesto de 320 KB gzip).

**Constraints**: la API es la autoridad de las reglas de jerarquía (la interfaz solo las adelanta); el campo `parent_module` es obligatorio, así que el Backoffice exige la API 5.4.0; ningún archivo de componente pasa de 250 líneas (`ModuleEditPanel.tsx` está en 244, research D10); el nombre accesible del control contiene su texto visible (WCAG 2.5.3); la atenuación de la fila de contexto conserva el contraste AA; sin desplazamiento horizontal de la página hasta 320 px.

**Scale/Scope**: 4 piezas de lógica pura nuevas o cambiadas (`buildModuleTree`, `moduleHierarchy`, `systemModule`, `moduleForm`) más `moduleErrors`; 2 hooks nuevos; 4 componentes nuevos (`ModuleTreeRows`, `ModuleNameCell`, `ModuleParentField` y `ModuleFixedInfo`) y 6 modificados (`ModulesPage`, `ModulesTable`, `ModuleCreatePanel`, `ModuleEditPanel`, `ModuleDangerZone`, `applyModuleRefusal`); un bloque de textos en `es.ts`; el simulador MSW y sus pruebas; ≈ 20 archivos de pruebas nuevos o ampliados. Cero rutas nuevas, cero operaciones HTTP nuevas (solo campos y códigos nuevos en las existentes), cero variables de entorno.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluado contra la constitución v1.7.0. Solo se listan las reglas que esta feature toca; «Antes» es el
estado al iniciar la investigación y «Después», tras el diseño.

| Regla | Cómo se cumple | Antes | Después |
|---|---|---|---|
| I. Estructura por features; una feature no importa los internos de otra | Todo vive en `features/modules`; el icono sale de `shared/ui` (`Icon`) y los textos de `shared/messages`; `roles` y `subscriptions` no se tocan ni se importan | ✅ | ✅ |
| I. Componentes pequeños y de responsabilidad única | `ModulesTable` se divide en `ModulesTable`, `ModuleTreeRows` y `ModuleNameCell`; el campo del padre es un componente propio (`ModuleParentField`); la lógica del árbol es una función pura | ✅ | ✅ |
| I. Archivo de componente ≤ 250 líneas | `ModuleEditPanel` (244) extrae `ModuleFixedInfo` antes de ganar el campo (research D10); `ModuleCreatePanel` (208) y `ModulesPage` (172) ganan poco | ⚠️ (244 de 250) | ✅ |
| I. Sin `useEffect` para derivar estado; sin memoización preventiva | El árbol, el aplanado, las opciones y los conteos se derivan en el render; `useCollapsedModules` es un `useState`; ningún `useMemo`/`useCallback` | ✅ | ✅ |
| II. Sin `any`/`as`; Zod en la frontera; DTO → dominio en la capa `api`/`schemas` | `systemModuleSchema` valida `parent_module` (obligatorio, anulable) y lo convierte a `parentModule`; los componentes no ven el DTO | ✅ | ✅ |
| III. Estado de servidor con TanStack Query, claves por factoría, mutaciones que invalidan | Sin claves nuevas (`moduleKeys.catalog`); las opciones del padre reutilizan la consulta de Activos; las tres mutaciones invalidan `moduleKeys.all` también al fallar (D13) | ✅ | ✅ |
| III. Formularios con React Hook Form + Zod; errores por campo a su campo | `parentModuleId` en `moduleFormSchema`; los 404/409/422 del padre van al campo con `setError` (D11) | ✅ | ✅ |
| III. Estado navegable en la URL; estado de UI local | Filtros, búsqueda y panel siguen en la URL (`useModulesLocation`, sin cambios); lo contraído es de pantalla y el spec exige que no se conserve (FR-004) | ✅ | ✅ |
| IV. Contratos REST; el backend es la fuente de verdad; sin reglas autoritativas duplicadas | La interfaz solo adelanta reglas para no ofrecer lo que se rechazará; el servicio decide y sus códigos se traducen ([contracts/modules-service-changes.md](contracts/modules-service-changes.md)) | ✅ | ✅ |
| IV. Errores uniformes: 404, 409/422 como mensaje de negocio o error por campo; sin texto crudo | Cada código tiene su texto en `es.ts`; el `message` del servicio nunca se muestra | ✅ | ✅ |
| IV. Listados con paginación de servidor | **Desvío heredado de la 013**: `GET /modules` no pagina por contrato (catálogo acotado; ahora ≈ 200 entradas). No hay forma de pedir una página que la API no ofrece (Complexity Tracking) | ⚠️ (heredado) | ⚠️ (heredado) |
| IV. Un cliente HTTP, sin hosts ni puertos fijos, mutaciones sin reintento y sin doble envío | Sin cambios: se usa el cliente `users`; las mutaciones siguen sin reintento y con el botón en `loading` | ✅ | ✅ |
| V. Autorización por el módulo de políticas | `ModuleCapabilities` no cambia; el campo del padre y las acciones siguen gobernados por `canCreate`/`canEdit`/`canBlock`/`canDelete`; ningún componente compara nombres de role | ✅ | ✅ |
| VI. UI con MUI y theme centralizado; sin CSS global | `Table`, `TextField`, `IconButton` y el sistema de estilos `sx`; el color atenuado sale del tema | ✅ | ✅ |
| VI. Estados cargando, vacío, error y éxito | Se conservan los de la pantalla y se añaden los de las opciones del padre (cargando y error, contrato de UI §5); éxito con las notificaciones existentes | ✅ | ✅ |
| VI. Acciones de alto impacto con confirmación | Eliminar sigue confirmando; la zona de eliminación se restringe con submódulos; bloquear sigue sin confirmación por decisión vigente de la 013 (reversible) y gana un aviso del efecto | ✅ | ✅ |
| VI. Textos en español, centralizados | Bloque nuevo `modules.tree`, campo del padre, avisos y errores en `es.ts`; sin literales en JSX | ✅ | ✅ |
| VI. Accesibilidad WCAG 2.1 AA | Botón nativo con `aria-expanded` y nombre que contiene el texto visible, «Submódulo de {Padre}» para lectores, teclado completo, atenuación con contraste AA, axe en `ModulesPage.test.tsx` | ✅ | ✅ |
| VI. Responsive desktop-first | La sangría se reduce a 320 px y el contenedor de la tabla conserva su propio `overflow-x`; verificado a mano (quickstart V27) | ✅ | ✅ |
| VII. Pruebas en el mismo PR; APIs simuladas con MSW, sin mockear `fetch` | Unitarias, de componente, de integración con el simulador ampliado (D14) y un escenario E2E (D16) | ✅ | ✅ |
| VII. Cobertura ≥ 80 % en `api`/`schemas`/`policy`/`hooks` | Cada pieza nueva en esas capas lleva su prueba (D16) | ✅ | ✅ |
| Stack: dependencias mínimas | Ninguna dependencia nueva; `@mui/x-tree-view` y el Data Grid Pro se descartaron (D5) | ✅ | ✅ |
| Configuración: variables `VITE_*` validadas | Sin variables nuevas ni cambios en `.env.example` | ✅ | ✅ |
| Puertas de CI y presupuesto de bundle | `typecheck`, `lint` (0 advertencias), `format:check`, `test:coverage`, `build` y el tamaño (quickstart §1) | ✅ | ✅ |

Filas no listadas (seguridad y Auth0, cliente HTTP único, reintentos, observabilidad y `logger`):
sin cambios; esta feature no introduce nada que las afecte.

**Resultado**: el único desvío es el de la paginación, **heredado** de la 013 y ya justificado allí; no
añade ninguno nuevo. Tras el diseño, la fila de las 250 líneas pasó de ⚠️ a ✅ gracias a la extracción de
D10. Observación sin consecuencias para este plan: la frase del alcance del producto que dice que el
catálogo de módulos «no se crea ni edita desde el Backoffice» está desactualizada desde la 013 (research
D17).

## Project Structure

### Documentation (this feature)

```text
specs/024-modules-submodules-tree/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   ├── modules-service-changes.md   # Phase 1 output: lo que cambia en la API 5.4.0 y cómo se traduce
│   └── modules-tree-ui.md           # Phase 1 output: contrato de interfaz del árbol y del campo del padre
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

El contrato HTTP completo del servicio vive en `mailySoft-usuarios/specs/017-module-submodules/contracts/`;
[contracts/modules-service-changes.md](contracts/modules-service-changes.md) resume solo lo que el
Backoffice consume, y
[../013-manage-modules/contracts/modules-service.md](../013-manage-modules/contracts/modules-service.md)
sigue vigente para todo lo demás.

### Source Code (repository root)

```text
src/
├── features/modules/
│   ├── schemas/
│   │   ├── systemModule.ts                  # + ParentModuleRef y parentModule (D2)
│   │   ├── systemModule.test.ts             # parent_module: null, un padre, falta del campo
│   │   ├── moduleForm.ts                    # + parentModuleId y parent_module_id en los cuerpos (D8)
│   │   └── moduleForm.test.ts
│   ├── policy/
│   │   ├── buildModuleTree.ts               # NUEVO: tipo, búsqueda, contexto, orden y conteos (D1, D3)
│   │   ├── buildModuleTree.test.ts          # NUEVO (absorbe los casos de filterModules)
│   │   ├── moduleHierarchy.ts               # NUEVO: eligibleParents y submoduleCountOf (D7, D9, D12)
│   │   ├── moduleHierarchy.test.ts          # NUEVO
│   │   ├── filterModules.ts                 # ELIMINADO (lo absorbe buildModuleTree, D2)
│   │   └── filterModules.test.ts            # ELIMINADO (sus casos pasan a buildModuleTree.test.ts)
│   ├── api/
│   │   ├── moduleErrors.ts                  # + campo parentModuleId y los códigos nuevos (D11)
│   │   └── moduleErrors.test.ts
│   ├── hooks/
│   │   ├── useCollapsedModules.ts           # NUEVO: lo contraído, toggle y expand (D6)
│   │   ├── useCollapsedModules.test.tsx     # NUEVO
│   │   ├── useParentModuleOptions.ts        # NUEVO: opciones del padre desde la consulta de Activos (D7)
│   │   ├── useParentModuleOptions.test.tsx  # NUEVO
│   │   ├── useCreateModule.ts               # onSuccess → onSettled (D13)
│   │   ├── useUpdateModule.ts               # onSuccess → onSettled (D13)
│   │   └── useDeleteModule.ts               # onSuccess → onSettled (D13)
│   └── components/
│       ├── ModulesPage.tsx                  # arma el árbol; useCollapsedModules; pasa submoduleCount y onParentAssigned
│       ├── ModulesPage.test.tsx             # árbol, búsqueda, axe
│       ├── ModulesTable.tsx                 # tabla y grupos con los conteos de módulos y submódulos
│       ├── ModulesTable.test.tsx
│       ├── ModuleTreeRows.tsx               # NUEVO: filas de módulo, submódulo y contexto (D3, D5)
│       ├── ModuleTreeRows.test.tsx          # NUEVO
│       ├── ModuleNameCell.tsx               # NUEVO: sangría, botón de contraer, nombre, «Base» y clave (D5)
│       ├── ModuleNameCell.test.tsx          # NUEVO
│       ├── ModuleParentField.tsx            # NUEVO: el select «Módulo padre» (D7, D9)
│       ├── ModuleParentField.test.tsx       # NUEVO
│       ├── ModuleFixedInfo.tsx              # NUEVO: clave y tipo fijos, extraído de ModuleEditPanel (D10)
│       ├── ModuleCreatePanel.tsx            # + campo del padre y su reinicio al cambiar el tipo (D9)
│       ├── ModuleCreatePanel.test.tsx
│       ├── ModuleEditPanel.tsx              # usa ModuleFixedInfo; + campo del padre, submoduleCount, onParentAssigned
│       ├── ModuleEditPanel.test.tsx
│       ├── ModuleDangerZone.tsx             # + avisos de bloqueo y eliminación restringida (D12)
│       ├── ModuleDangerZone.test.tsx        # (las pruebas actuales viven en ModuleEditPanel.test.tsx; se amplían)
│       └── applyModuleRefusal.ts            # + parentModuleId en el orden de los campos
├── shared/
│   └── messages/es.ts                       # modules.count, groups, tree, form.fields.parent*, blockSection, errors (D4, D11)
├── test/
│   ├── factories.ts                         # parent_module: null por omisión (D15)
│   └── handlers/modulesCatalog/
│       ├── model.ts / model.test.ts         # parentModuleId y las reglas de la 5.4.0 (D14)
│       ├── validation.ts                    # parent_module_id: entero positivo
│       └── create.ts / update.ts / reads.ts / remove.ts   # reciben y devuelven la jerarquía
└── app/router/modules/
    ├── submodulesTree.integration.test.tsx  # NUEVO: ver, contraer, buscar, contexto, bloquear y eliminar
    ├── createModule.integration.test.tsx    # + alta con padre
    ├── editModule.integration.test.tsx      # + asignar, cambiar y quitar el padre; errores por campo
    ├── blockModule.integration.test.tsx     # «1 módulos bloqueados» → «1 módulo bloqueado» (D4)
    └── deleteModule.integration.test.tsx    # + eliminación restringida
e2e/modules.spec.ts                          # + escenario: crear un submódulo y verlo anidado (D16)
```

No se tocan: `features/roles` y `features/subscriptions` (sus esquemas descartan el campo nuevo, research
hallazgo 6), `ModuleFormFields.tsx`, `useModulesLocation.ts` y `modulesLocation.ts`, `useModulesCatalog.ts`
y `moduleKeys.ts`, `ModulesFilters.tsx`, `ModuleFormDialog.tsx`, `modulesApi.ts` (las rutas y
los esquemas de respuesta son los mismos; solo cambia el esquema que validan), la semilla del simulador
(`seed.ts`), las rutas, los permisos (`features/auth`), el tema y `.env.example`.

**Structure Decision**: se mantiene la estructura por features vigente (`app → features → shared`).
Todo lo nuevo vive en `features/modules` (`policy`, `hooks`, `components`); los textos, en
`shared/messages`. No hay archivos nuevos en `app` ni en `shared`. La lógica del árbol es una función
pura en `policy` (probada sin renderizar), igual que `filterModules` antes y que las políticas de
`moduleActionSelection`.

## Dependencias y riesgos

- **API 5.4.0 desplegada primero.** Sin ella la pantalla de Módulos no valida las respuestas (campo
  obligatorio). La migración `0012_module_submodules` del servicio debe estar aplicada en la base de
  datos que se use. Hay que avisar al desplegar.
- **Estado del repositorio del servicio.** El commit `2e17ecb` está en el repositorio local de
  `mailySoft-usuarios`; no se verificó que esté publicado en su remoto.
- **Pruebas existentes.** Todo lo de primer nivel debe seguir igual (SC-007): se apoya en
  `parent_module: null` por omisión en el simulador y las fábricas; la única aserción que cambia por
  texto es «1 módulos bloqueados».
- **Contraste de la fila de contexto.** Se valida con axe y a mano en ambos temas (quickstart V27).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| El catálogo de módulos no se pagina en el servidor (principio IV). **Heredado de la 013**, sin cambios: solo se actualiza el máximo esperado (de 100 a ≈ 200 entradas activas, según el contrato 5.4.0) | `GET /api/v1/modules` no ofrece `page`/`page_size`: el contrato del servicio lo documenta como catálogo pequeño y acotado, sin paginación. No hay forma de pedir una página que la API no ofrece | Paginar en el cliente una colección ya completa es justo lo que el principio IV prohíbe; pedir al servicio que pagine no es una opción de esta feature, y el árbol necesita ver al padre junto a sus hijos en la misma respuesta |
