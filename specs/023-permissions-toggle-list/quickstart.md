# Quickstart: validar los permisos como lista con botones

**Feature**: `023-permissions-toggle-list` | **Date**: 2026-11-01

Guía de validación, no de implementación (eso va en `tasks.md`). Contratos y datos:
[contracts/permissions-list-ui.md](contracts/permissions-list-ui.md) y [data-model.md](data-model.md).

## Requisitos previos

- Dependencias instaladas (`npm ci`, o `npm install` si `node_modules` quedó atrás).
- Sin variables de entorno nuevas ni cambios en `.env.example`.
- Para la validación manual: `npm run dev` (http://localhost:5173), la API de usuarios en marcha y una
  cuenta con permiso de ver **y** editar «Roles y permisos»; para el caso de solo lectura, una cuenta
  que pueda ver pero no editar.

## 1. Puertas automáticas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test -- src/features/roles src/app/router/roles   # componentes e integración de Roles
npm run test:coverage                                 # umbral de 80 % en api/schemas/policy/hooks
npm run build                                         # build de producción y presupuesto de bundle
```

Resultado esperado: todo en verde. Sin `PermissionsMatrix*` ni `role=checkbox` de permisos en ninguna
prueba; la prueba de axe de `RolesPage.test.tsx` sin violaciones (SC-006).

## 2. E2E (necesita las cuentas de prueba de Auth0, `E2E_AUTH0_USER_A1`/`_PASSWORD_A1`)

```powershell
npm run test:e2e -- e2e/roles.spec.ts
```

Esperado: «W3 to W7» alterna el permiso «Ver de Roles» con `aria-pressed`, guarda, y deja el entorno
como estaba. Sin las cuentas, la suite se omite sola (no es un fallo).

## 3. Recorrido manual (por historia del spec)

Con un role Clínica que tenga módulos de Clínica y de Sistema, y otro role de Sistema:

| # | Historia | Pasos | Esperado |
|---|---|---|---|
| V1 | US1 | Abrir «Roles y permisos», elegir un role | los permisos son una **lista** (no tabla), un módulo por elemento, mismo orden que antes |
| V2 | US1 | Mirar un módulo con pocas acciones (p. ej. Recordatorios: Ver y Modificar) | solo esos botones, en orden, sin huecos ni botones inactivos |
| V3 | US1 | Comparar los botones con «Tipo»/«Estatus» de Módulos | misma forma, tamaño y tipografía; el pulsado solo se distingue por la marca ✓ |
| V4 | US1 | Role de Clínica con módulos de Sistema; luego un role de Sistema | encabezados «Módulos de Clínica/Sistema» en el primero; ninguno en el segundo |
| V5 | US2 | Pulsar «Crear» con «Ver» sin pulsar | «Ver» se pulsa solo; el contador «X de Y» sube de inmediato en 2 |
| V6 | US2 | Despulsar «Ver» en un módulo con varias acciones | todas quedan sin pulsar |
| V7 | US2 | Pulsar y volver a pulsar un botón | sin cambio pendiente: «Guardar cambios» y «Descartar cambios» se deshabilitan |
| V8 | US2 | Cambiar permisos → «Guardar cambios» → recargar | el estado persiste; contador correcto |
| V9 | US2 | Cambiar permisos → «Descartar cambios» | todo vuelve al último guardado |
| V10 | US2 | Cambiar permisos y cambiar de role/pestaña | aviso de cambios sin guardar |
| V11 | US2 | Durante el guardado | ningún botón admite cambios |
| V12 | US3 | «Todo el módulo» con alguna acción sin pulsar; de nuevo; pulsar la última acción que faltaba | todas pulsadas; todas sin pulsar; «Todo el módulo» se pulsa solo |
| V13 | US1 | Cuenta sin permiso de edición | se ve el estado (con ✓) pero no se puede cambiar |
| V14 | US4 | Solo teclado: Tab entra al grupo de un módulo, ← → mueven entre acciones, Espacio/Enter alterna, Tab pasa a «Todo el módulo» | todo operable, foco visible |
| V15 | US4 | Lector de pantalla sobre un botón | anuncia «Ver de Pacientes», botón, pulsado/no pulsado |
| V16 | US4 | Ancho de 320 px y modo oscuro | nombre y botones se reacomodan en varias líneas, sin scroll horizontal ni texto cortado; la marca ✓ se ve en ambos temas |
| V17 | — | Alternar un botón repetidamente | los botones vecinos no se desplazan (hueco de la marca reservado) |
| V18 | FR-014 | Leer el texto sobre la lista y el de «Copiar permisos de» al crear un role | hablan de «lista» y de activar, no de «tabla» ni de «marcar» |

## 4. Criterios de salida

- Las puertas del punto 1 en verde y V1–V18 sin hallazgos.
- SC-001 (localizar un permiso en < 10 s en un role de 20 módulos) y SC-007 (comparación visual con
  los filtros de Módulos) confirmados a ojo por quien implementa y quien revisa el PR.
