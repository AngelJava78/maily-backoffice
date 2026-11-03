# Quickstart: validar los módulos y submódulos en árbol

**Feature**: `024-modules-submodules-tree` | **Date**: 2026-11-02

Guía de validación, no de implementación (eso va en `tasks.md`). Contratos y datos:
[contracts/modules-tree-ui.md](contracts/modules-tree-ui.md),
[contracts/modules-service-changes.md](contracts/modules-service-changes.md) y
[data-model.md](data-model.md).

## Requisitos previos

- Dependencias instaladas (`npm ci`, o `npm install` si `node_modules` quedó atrás).
- Sin variables de entorno nuevas ni cambios en `.env.example`.
- **Para la validación manual**: la API de usuarios en su versión **5.4.0** (commit `2e17ecb` de
  `mailySoft-usuarios`) corriendo en el puerto 8000 (`USERS_API_PROXY_TARGET`), con la migración
  `0012_module_submodules` aplicada a la base de datos que use, `npm run dev`
  (http://localhost:5173) y una cuenta con permisos de ver, crear, editar, bloquear y eliminar
  módulos. Sin esa versión, la pantalla de Módulos fallará al validar las respuestas (el campo
  `parent_module` es obligatorio): es lo esperado (research D2), no un error de esta feature.
- Las pruebas automáticas **no** necesitan la API: usan el simulador (MSW).

## 1. Puertas automáticas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm test -- src/features/modules src/app/router/modules src/test/handlers --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000
npm run test:coverage        # umbral de 80 % en api/schemas/policy/hooks
npm run build                # build de producción y presupuesto de bundle
```

Resultado esperado: todo en verde. Las pruebas de `roles` y `subscriptions` no cambian y siguen
pasando (FR-019); la prueba de axe de `ModulesPage.test.tsx` no reporta violaciones (SC-006).

## 2. E2E (necesita las cuentas de prueba de Auth0, `E2E_AUTH0_USER_A1`/`_PASSWORD_A1`)

```powershell
npm run test:e2e -- e2e/modules.spec.ts
```

Esperado: un módulo de prueba se crea como submódulo de otro, se ve anidado bajo su padre y se limpia
al terminar. Sin las cuentas, la suite se omite sola (no es un fallo).

## 3. Datos de partida para el recorrido manual

Con la API 5.4.0 y la pantalla «Módulos» abierta, preparar (desde la propia pantalla, que es parte de la
prueba) este catálogo de Clínica; las claves y nombres son ejemplos:

- Un módulo «Pacientes» (`patients_demo`) con orden 100 y tres submódulos: «Recetas»
  (`prescriptions_demo`), «Signos vitales» (`vitals_demo`) y «Expediente clínico» (`records_demo`).
- Un módulo «Inventario» (`inventory_demo`) sin submódulos.
- Un módulo de Sistema «Reportes» (`reports_demo`) con un submódulo «Reportes de uso» (`usage_demo`).

## 4. Recorrido manual (por historia del spec)

| # | Historia | Pasos | Esperado |
|---|---|---|---|
| V1 | US1 | Abrir «Módulos» | los submódulos están **debajo de su padre**, con sangría, dentro del grupo de su tipo; ninguno suelto |
| V2 | US1 | Mirar el padre «Pacientes» | tiene un botón «3 submódulos» y empieza expandido |
| V3 | US1 | Mirar «Inventario» y cualquier módulo sin submódulos | sin botón de contraer; la fila es como antes |
| V4 | US1 | Contraer y expandir «Pacientes»; recargar la página | contraer oculta los 3 submódulos y expandir los muestra; tras recargar, todo expandido |
| V5 | US1 | Leer los contadores del encabezado de grupo y de la lista | distinguen módulos y submódulos («… módulos y N submódulos»); sin submódulos, solo módulos |
| V6 | US1 | Ordenar: cambiar el «Orden» de un submódulo | los hermanos se reordenan por orden y luego por nombre |
| V7 | US1 | Buscar «recetas» | aparece «Pacientes» atenuado (contexto) con «Recetas» debajo; sin botón de contraer; limpiar la búsqueda devuelve el estado anterior |
| V8 | US1 | Buscar «pacientes» | «Pacientes» con sus 3 submódulos |
| V9 | US1 | Filtrar por Tipo «Sistema» y por «Clínica» | cada submódulo sigue bajo su padre |
| V10 | US1 | Bloquear el submódulo «Recetas»; abrir «Bloqueados» | «Recetas» aparece bajo una fila de contexto de «Pacientes» (atenuada, sin acciones, «Está en «Activos»»); «Recetas» se puede editar; el contexto no cuenta |
| V11 | US2 | «Nuevo módulo» → Tipo Clínica → abrir «Módulo padre» | solo «Pacientes» e «Inventario» (de primer nivel, activos, de Clínica, ningún módulo base); «Ninguno» por omisión |
| V12 | US2 | Elegir «Pacientes» y luego cambiar el Tipo a Sistema | el padre se limpia; las opciones pasan a ser las de Sistema |
| V13 | US2 | Crear «Citas hijas» (`appointments_demo`) con padre «Inventario» | aparece anidado bajo «Inventario», que queda expandido |
| V14 | US2 | Editar «Citas hijas»: cambiar el padre a «Pacientes»; luego «Ninguno» | se mueve bajo «Pacientes»; después pasa a primer nivel; sin recargar |
| V15 | US2 | Editar «Pacientes» (tiene submódulos) | «Módulo padre» deshabilitado con su explicación |
| V16 | US2 | Editar «Usuarios» (módulo base) | «Módulo padre» deshabilitado: «Los módulos base no tienen módulo padre»; «Usuarios» no aparece como opción en ningún alta |
| V17 | US2 | Editar un submódulo cuyo padre esté Bloqueado (bloquear «Reportes» y buscarlo en «Bloqueados») | el campo muestra a «Reportes» como valor actual |
| V18 | US2 | Dos pestañas: en la B eliminar un padre sin submódulos; en la A intentar guardar un módulo con ese padre | mensaje en el campo del padre, el formulario conserva lo escrito y la lista se actualiza |
| V19 | US3 | Abrir la zona de bloqueo de «Pacientes» | texto: «Si lo bloqueas, 3 submódulos dejarán de estar disponibles…» |
| V20 | US3 | Bloquear «Pacientes» | ni él ni sus submódulos activos aparecen en «Activos»; los submódulos bloqueados se ven bajo su contexto en «Bloqueados» |
| V21 | US3 | Desbloquear «Pacientes» | todos vuelven a su lugar en el árbol |
| V22 | US3 | Zona de eliminación de «Pacientes» | no hay botón «Eliminar módulo»; un texto explica qué hacer primero |
| V23 | US3 | Con «Recetas» bloqueado (no se ve entre los activos), intentar eliminar «Pacientes» | aviso de que tiene submódulos; no se elimina nada |
| V24 | US3 | Bloquear y eliminar un submódulo | funciona como con cualquier módulo; si era el único, el padre pierde el botón de contraer |
| V25 | US4 | Solo teclado: Tab llega al botón de contraer de cada padre y a «Editar» de cada fila; Enter y Espacio los operan | todo operable, foco visible y sin saltos al alternar |
| V26 | US4 | Lector de pantalla sobre el padre y un submódulo | «3 submódulos de Pacientes, botón, expandido»; «Submódulo de Pacientes» antes del nombre |
| V27 | US4 | Ancho de 320 px y modo oscuro | la sangría sigue legible, sin desplazamiento horizontal de la página; la fila de contexto se lee en ambos temas |
| V28 | FR-019 | Abrir «Roles y permisos» (un role de Clínica) y el alta de un plan de «Suscripciones» | los submódulos aparecen como módulos independientes, en la lista plana de siempre |

Al terminar, eliminar de la propia pantalla los módulos de ejemplo (primero los submódulos y después los
padres, V22).
