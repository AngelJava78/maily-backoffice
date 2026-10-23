# Implementation Plan: Módulos — administración de módulos del sistema y sus acciones

**Branch**: `013-manage-modules` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-manage-modules/spec.md`

## Summary

Pantalla nueva "Módulos" en el Backoffice para consultar, crear, modificar, bloquear/desbloquear y
eliminar los módulos del sistema (Sistema y Clínica) y las acciones (Ver/Crear/Modificar/Eliminar)
que cada uno tiene habilitadas, consumiendo la API ya implementada de módulos y permisos de
`mailySoft-usuarios`; además reordena el menú principal a Panel, Módulos, Usuarios, Suscripciones,
Token. Enfoque técnico: mismo patrón de feature que `subscriptions`/`users` (constitución I),
reutilizando sin cambios el cliente HTTP ya configurado para esa misma API (research D2), con un
layout maestro-detalle de una sola pantalla —no rutas separadas de alta/edición— cuyo estado
(filtros, búsqueda, panel abierto) vive en la URL (research D10).

## Technical Context

**Language/Version**: TypeScript 5.x + React 19, Vite — mismo stack ya vigente, sin cambios.

**Primary Dependencies**: React Router (estado de filtros/panel en la URL), TanStack Query (el
catálogo cruzado de módulos y permisos, research D3), React Hook Form + Zod (formulario de alta y
edición), MUI (`Table`, no `DataGrid`: research D7).

**Storage**: N/A — sin almacenamiento local nuevo; todo viaja por la API ya existente de
`mailySoft-usuarios` (módulos, permisos).

**Testing**: Vitest, React Testing Library + `user-event`, MSW con un simulador de estado nuevo
(`src/test/handlers/modulesCatalog/`, nunca mock de `fetch`), axe.

**Target Platform**: Web (SPA), los mismos navegadores ya soportados por la constitución.

**Project Type**: proyecto único de frontend (sin monorepo), igual que el resto del repositorio.

**Performance Goals**: sin objetivo numérico propio; respeta el presupuesto ya vigente de 300 KB
gzip en la ruta de entrada (`/modules` es su propio chunk, cargado con `React.lazy`).

**Constraints**: WCAG 2.1 AA; dos desviaciones justificadas del principio IV —ver Constitution Check
y Complexity Tracking—: el catálogo de módulos y de permisos no pagina del lado del servidor
(acotado, research D4/D6), y dar de alta o modificar un módulo con sus acciones no es una
transacción del backend (varias llamadas en secuencia, research D11).

**Scale/Scope**: ~23 módulos reales hoy (8 de Sistema, 15 de Clínica; hasta 100 documentados por el
contrato); una pantalla nueva (`/modules`) con un panel maestro-detalle de tres estados (vacío,
Editar, Nuevo módulo); sin pantallas nuevas adicionales (Roles y permisos y Clínicas quedan fuera de
alcance, ver spec.md Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumple | Nota |
|---|---|---|
| I. Arquitectura por Features y React Idiomático | ✅ | `src/features/modules/` con la misma forma que `subscriptions`/`users` (research D1) |
| II. TypeScript Estricto y Datos Validados en la Frontera | ✅ | Zod en `schemas/`, conversión DTO (snake_case) → dominio (camelCase) aislada en `api/` (data-model.md) |
| III. Estado de Servidor Separado del Estado de Cliente | ✅ | TanStack Query para el catálogo cruzado; tipo, estatus, búsqueda y panel abierto en los search params (research D10) |
| IV. Integración con APIs REST por Contrato | ⚠️ | Dos desviaciones justificadas en Complexity Tracking: sin paginación de servidor (catálogo acotado y documentado así por el propio contrato) y alta/edición sin transacción (varias llamadas, orden y fallos parciales definidos en research D11) |
| V. Seguridad y Autenticación con Auth0 | ✅ | Reutiliza `clients.users` y `<RequirePermission>` tal cual; no toca autenticación ni manejo de tokens |
| VI. Experiencia de Usuario, Accesibilidad y Consistencia | ✅ | MUI (`Table`, research D7), estados carga/vacío/error, confirmación explícita en eliminar y en desmarcar una acción (research D9), WCAG 2.1 AA con axe |
| VII. Calidad Verificable mediante Pruebas | ✅ | Simulador MSW con estado propio, test-first en `policy/`/`schemas/`, cobertura 80 % en `api`/`policy`/`schemas`/`hooks` |

**Nota adicional (no es un gate)**: la sección "Alcance del producto" de la constitución (v1.4.0)
no menciona módulos entre los recursos administrados; ver research.md, "Nota para quien gobierna el
proyecto".

## Project Structure

### Documentation (this feature)

```text
specs/013-manage-modules/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md         # Fase 1
├── quickstart.md         # Fase 1
├── contracts/             # Fase 1
│   ├── modules-service.md
│   └── app-routes.md
└── tasks.md              # Fase 2 (/speckit-tasks, todavía no existe)
```

### Source Code (repository root)

```text
src/features/modules/
├── api/
│   ├── modulesApi.ts              # listModules (cruza módulos+permisos, research D3),
│   │                               # createModule, updateModule, blockModule, unblockModule,
│   │                               # deleteModule, createModuleAction, deleteModuleAction
│   ├── modulesApi.*.test.ts        # uno por operación, mismo patrón que subscriptionsApi.*.test.ts
│   ├── moduleErrors.ts             # describeModuleError (research D8)
│   └── moduleErrors.test.ts
├── schemas/
│   ├── systemModule.ts             # SystemModule, MODULE_TYPE, MODULE_STATUS, isProtectedModule
│   ├── systemModule.test.ts
│   ├── moduleActionCatalog.ts      # MODULE_ACTION_ORDER, ModuleActionKey, MODULE_ACTION_ID (research D4)
│   ├── moduleActionCatalog.test.ts
│   ├── moduleForm.ts               # CreateModuleFormValues, UpdateModuleFormValues,
│   │                               # toCreateModuleBody, toUpdateModuleBody, toFormValues
│   ├── moduleForm.test.ts
│   ├── modulesLocation.ts          # ModulesLocation, parse/toSearchParams (research D10)
│   └── modulesLocation.test.ts
├── policy/
│   ├── moduleActionSelection.ts    # withActionChecked (FR-018: "read" nunca se desmarca)
│   └── moduleActionSelection.test.ts
├── hooks/
│   ├── useModulesLocation.ts
│   └── useModulesLocation.test.tsx
├── components/
│   ├── ModulesPage.tsx             # orquesta filtros + tabla + panel; <= 250 líneas o se divide
│   ├── ModulesPage.test.tsx
│   ├── ModulesFilters.tsx          # Tipo / Estatus / Buscar
│   ├── ModulesFilters.test.tsx
│   ├── ModulesTable.tsx            # tabla agrupada Sistema/Clínica (research D7)
│   ├── ModulesTable.test.tsx
│   ├── ModuleFormFields.tsx        # nombre, descripción, orden, acciones — común a alta y edición
│   ├── ModuleFormFields.test.tsx
│   ├── ModuleCreatePanel.tsx       # tipo + clave editables, usa ModuleFormFields
│   ├── ModuleCreatePanel.test.tsx
│   ├── ModuleEditPanel.tsx         # clave/tipo fijos, usa ModuleFormFields, bloquear/eliminar
│   └── ModuleEditPanel.test.tsx
└── index.ts                        # ModulesPage y ModuleCapabilities públicos

src/features/auth/policy/
├── moduleCapabilities.ts           # getModuleCapabilities (research D8)
└── moduleCapabilities.test.ts

src/test/handlers/modulesCatalog/   # simulador MSW con estado (data-model.md, "Simulador de pruebas")
├── model.ts
├── model.test.ts
├── validation.ts
└── handlers.ts

# Archivos existentes que se amplían (no se crean):
src/app/navigation/sections.ts       # + sección 'modules', primera del arreglo
src/app/navigation/sections.test.ts  # + prueba del orden nuevo
src/app/router/routes.tsx            # + ruta /modules
src/features/auth/policy/permissions.ts  # + 'modules' en SECTION_RESOURCES
src/features/auth/index.ts           # + export de getModuleCapabilities
src/shared/ui/iconRegistry.ts        # + icono 'modules' (research D12)
src/shared/messages/es.ts            # + bloque messages.modules y nav.sections.modules
e2e/modules.spec.ts                  # recorrido E2E nuevo (igual patrón que e2e/subscriptions.spec.ts)
```

**Structure Decision**: proyecto único existente (`C:\Maily\code\maily-backoffice-013-manage-modules`,
worktree de la rama `013-manage-modules`). Una feature nueva (`src/features/modules`) con la misma
forma que las ya existentes; se amplían navegación, router, políticas de autorización, registro de
iconos y mensajes, sin tocar ninguna otra feature (`users`, `subscriptions`, `auth` solo ganan
entradas, no se modifican sus reglas existentes).

## Complexity Tracking

| Desviación del principio IV | Por qué hace falta | Alternativa más simple descartada |
|---|---|---|
| El catálogo de módulos y el de permisos se traen completos, sin paginación de servidor (research D4/D6) | Ninguna de las dos rutas (`GET /modules`, `GET /permissions`) ofrece `page`/`page_size`: el contrato de `mailySoft-usuarios` las documenta explícitamente como acotadas y sin paginar (máximo 100 módulos activos). No hay forma de pedir una página que la API no ofrece. | Paginar en el cliente una colección ya completa — es justo lo que el principio IV prohíbe; se descarta. Pedir la API y que ella pagine — no es una opción: el contrato no lo admite. |
| Dar de alta o modificar un módulo con sus acciones es más de una llamada, sin una transacción que las cubra a todas (research D11) | No existe una operación de `mailySoft-usuarios` que reciba "un módulo con sus acciones" de una sola vez: un módulo y cada uno de sus permisos son recursos independientes de ese contrato. | Una operación única en el backend — preferible por el principio IV, pero fuera del alcance de esta feature (el backend es de otro repositorio, ya implementado y fuera de esta spec). Deshacer automáticamente el módulo si alguna acción falla — más riesgoso que dejar un estado parcial bien explicado (research D11): otra llamada que puede fallar o chocar con un cambio ya visible para alguien más. |
