# Guía de validación: Panel de Maily

**Feature**: `007-dashboard` | **Fecha**: 2026-10-20 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Muestra cómo comprobar de punta a punta que la feature cumple la spec. Parte de las guías de la 001 ([../001-auth-session-profile/quickstart.md](../001-auth-session-profile/quickstart.md)) y de la 003 ([../003-manage-subscription-types/quickstart.md](../003-manage-subscription-types/quickstart.md)): Auth0, el servicio de usuarios, las cuentas A1 a A9 y la API `maily-system-api` se preparan allí; aquí solo se añade lo propio del Panel.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001 y la 003 | Node 24, Docker, la aplicación SPA y la API de Auth0, el servicio de usuarios con la consulta `me`, las cuentas A1 a A9 y la API `maily-system-api` levantada en `http://127.0.0.1:8010` con `USERS_API_BASE_URL` apuntando al servicio de usuarios real. |
| El permiso | `dashboard:read` creado y asignado (sección 1). **Hoy no existe en la API de usuarios.** El servicio del panel no lo crea. |
| Configuración del Backoffice | En `.env.local`: `VITE_SUBSCRIPTIONS_API_URL=/proxy/subscriptions` (obligatoria desde la 003; sin ella aparece «Configuración inválida»). `VITE_DASHBOARD_REFRESH_MINUTES` es opcional (5 por defecto); para validar a mano conviene `1`. |
| Datos | Ninguno que cargar: en la fase 1 el servicio devuelve datos ficticios fijos ([contracts/dashboard-service.md](contracts/dashboard-service.md#d1--consultar-el-resumen)). |
| Dependencias | Ninguna nueva: `npm ci` basta. |

## 1. Crear y asignar el permiso

Contra la base del servicio de usuarios, como el SQL de la 001 y la 005:

```sql
BEGIN;

INSERT INTO permissions (name) VALUES ('dashboard:read') ON CONFLICT DO NOTHING;

-- Administrator (A1) y Billing (A3) ven los indicadores; Marketing (A2) y Developer (A4), no.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name = 'dashboard:read'
WHERE r.name IN ('Administrator', 'Billing') ON CONFLICT DO NOTHING;

COMMIT;
```

Para los escenarios de cambio de permisos durante la sesión (V7, V8), se concede y se retira a `Developer` (A4). Tras cada cambio, vuelve a la pestaña o espera 5 minutos para que el Backoffice vuelva a comprobar el acceso (001, FR-019); la API lo lee en cada petición:

```sql
-- Conceder
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name = 'dashboard:read'
WHERE r.name = 'Developer' ON CONFLICT DO NOTHING;

-- Retirar
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'Developer')
  AND permission_id = (SELECT id FROM permissions WHERE name = 'dashboard:read');
```

## 2. Ejecutar la aplicación

```powershell
npm ci
npm run dev   # http://localhost:5173
```

En desarrollo, React monta dos veces cada pantalla (StrictMode): en la pestaña Red puede verse una primera petición del Panel cancelada justo antes de la buena. No ocurre en producción.

## 3. Escenarios de validación

Abre las herramientas del navegador en la pestaña Red, filtrando por `dashboard`, para contar las peticiones.

| # | Escenario | Pasos | Resultado esperado | Spec |
|---|---|---|---|---|
| V1 | Nombre | Entra con A2 (Marketing) | La navegación, el `h1` y la pestaña dicen «Panel»; ningún «Inicio»; el saludo debajo del `h1`. | US1-1, FR-001 a FR-003, SC-001 |
| V2 | Con permiso | Entra con A1 | Seis indicadores (12, 8, 3, 37, 1,284 y 52), cinco clínicas recientes con nombre, estatus y fecha de alta local, «Actualizado: …» con fecha y segundos; sin enlaces ni botones. Una petición sin `limit`. | US1-2, US1-3, US1-8, US1-9, FR-004 a FR-010, SC-002 |
| V3 | Sin permiso, con otros | Entra con A2 | Saludo y «Sin acceso a los indicadores»; **0** peticiones a `dashboard`. | US2-1, FR-011, SC-003 |
| V4 | Sin ningún permiso | Entra con una cuenta cuyo role no tenga permisos (la de la 001 para "role sin permisos") | Saludo y solo «Sin permisos asignados»; 0 peticiones. | US2-2, FR-012 |
| V5 | Solo `dashboard:read` | Asigna solo `dashboard:read` a Developer y entra con A4 | Indicadores; **sin** «Sin permisos asignados». | US2-3, FR-012 |
| V6 | Actualización automática | Con `VITE_DASHBOARD_REFRESH_MINUTES=1`, quédate en el Panel 3 minutos con la pestaña visible | Una petición por minuto, contando desde que terminó la anterior; la hora cambia sin mover el foco. | US3-1, US3-2, FR-016, FR-020, SC-004 |
| V7 | Pierde el permiso | Con A4 en el Panel, retira `dashboard:read` y vuelve a la pestaña | El resumen desaparece; aparece «Sin acceso a los indicadores»; no hay más peticiones. | US2-5, FR-014 |
| V8 | Gana el permiso | Con A4 en el Panel sin permiso, concédelo y vuelve a la pestaña | Aparece la carga y luego los indicadores, sin salir del Panel. | US2-6, FR-014 |
| V9 | Pestaña oculta | Con intervalo 1, cambia a otra pestaña 3 minutos | 0 peticiones mientras está oculta; al volver, una petición (pasó el intervalo). Repite volviendo a los 20 s: ninguna al volver. | US3-3, US3-7, US3-8, FR-017, FR-019 |
| V10 | Volver al Panel | Ve a «Usuarios» y regresa | Los datos anteriores aparecen al instante con su hora y «Actualizando…»; llega la respuesta y la hora cambia (los segundos). | US3-4, US3-6, FR-018, SC-005 |
| V11 | Entrar y salir rápido | Alterna 10 veces entre «Panel» y «Usuarios» deprisa | Nunca dos peticiones `dashboard` en curso a la vez: cada salida cancela la suya. | US3-9, FR-021, SC-007 |
| V12 | Fallo con datos | Con datos en pantalla, detén la API (`Ctrl+C` en uvicorn) y espera un ciclo | Siguen los datos con su hora y aparece el aviso de que no se pudieron actualizar (un lector de pantalla lo anuncia); sin botón. Levanta la API: en el siguiente ciclo el aviso desaparece. | US4-1, US4-2, US4-4, US4-5, FR-024, FR-026, SC-006 |
| V13 | Fallo de la primera carga | Con la API detenida, recarga el navegador | Mensaje «No se pudieron cargar los indicadores», sin botón; al levantar la API, el siguiente ciclo carga los datos. | US4-3, FR-025 |
| V14 | Rechazo por permiso | Con A4 en el Panel con permiso, retíralo y espera el siguiente ciclo **sin** volver a la pestaña | El servicio responde 403: «Sin acceso a los indicadores» en lugar de los datos, sin la notificación «No tienes permiso para realizar esta acción.», y la sesión sigue. | US2-7, FR-015 |
| V15 | Cerrar sesión | Con datos en pantalla, cierra sesión y entra con A1 | Carga y datos nuevos; nunca los de la sesión anterior. En Aplicación → Almacenamiento no hay datos del Panel. | US3-10, FR-022, SC-009 |
| V16 | Configuración inválida | `VITE_DASHBOARD_REFRESH_MINUTES=2.5` (y luego `61`, `cinco`, `   `) y reinicia `npm run dev` | «Configuración inválida» con `VITE_DASHBOARD_REFRESH_MINUTES` y su regla; el Backoffice no arranca. | US5-3, FR-029, SC-008 |
| V17 | Accesibilidad y diseño | Recorre el Panel con NVDA o VoiceOver y a 320 px de ancho | Foco en «Panel»; cada indicador con su etiqueta y valor; la tabla con sus encabezados; sin desplazamiento horizontal. | US1-10, FR-032 a FR-034, SC-010 |

Los valores «No disponible» y la lista vacía no pueden provocarse con el servicio de la fase 1 (sus fuentes no fallan): se comprueban con las pruebas automatizadas (sección 4).

## 4. Comprobaciones automatizadas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage   # incluye las del Panel; umbral de 80 % de líneas en api, schemas, hooks y policy
npm run build
npm run size            # la ruta de entrada sigue por debajo de 300 KB gzip
```

Solo las del Panel:

```powershell
npx vitest run src/features/dashboard src/features/home src/app/router/dashboard src/app/config src/features/auth/policy src/app/providers/AppSettingsProvider.test.tsx src/app/ConfigErrorScreen.test.tsx src/test/handlers/platformDashboard
```

Prueba de extremo a extremo (necesita las cuentas `E2E_*` de la 001 y `dashboard:read` asignado al role de A1; se omite sin ellas):

```powershell
npx playwright test e2e/dashboard.spec.ts e2e/responsive.spec.ts
```

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| «Configuración inválida» con `VITE_SUBSCRIPTIONS_API_URL` | Falta en `.env.local` (obligatoria desde la 003) | Añade `VITE_SUBSCRIPTIONS_API_URL=/proxy/subscriptions`. |
| El Panel muestra siempre «No se pudieron cargar los indicadores» | La API no está en `127.0.0.1:8010` | Ajusta `SUBSCRIPTIONS_API_PROXY_TARGET` (por ejemplo, `http://127.0.0.1:8001`) y reinicia `npm run dev`. |
| Con A1 aparece «Sin acceso a los indicadores» | `dashboard:read` no existe o no está asignado | Sección 1; vuelve a la pestaña para que se recomprueben los permisos. |
| El 403 llega como 503 | El servicio no pudo consultar al de usuarios | Revisa `USERS_API_BASE_URL` de la API. |
| No se ve el cambio de hora al volver | Volviste en el mismo segundo | Espera un segundo; la hora tiene segundos para que el cambio sea visible. |
