# Guía de validación: Administración de Suscripciones

**Feature**: `003-manage-subscription-types` | **Fecha**: 2026-10-20 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Muestra cómo comprobar de punta a punta que la feature cumple la spec. Parte de las guías de la 001 ([../001-auth-session-profile/quickstart.md](../001-auth-session-profile/quickstart.md)) y de la 002 ([../002-manage-users/quickstart.md](../002-manage-users/quickstart.md)): Auth0, el servicio de usuarios y las cuentas A1 a A9 se preparan allí; aquí solo se añade lo propio de esta feature.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Todo lo de la 001 y la 002 | Node 24, Docker, la aplicación SPA y la API de Auth0, el servicio de usuarios con la consulta `me` y las cuentas A1 a A9. |
| API de suscripciones | En `C:\maily\code\maily-system-api`, según su README: `docker compose up -d db` (PostgreSQL en el puerto 5434), `docker compose run --rm migrate` y `uv run uvicorn src.main:app --port 8010`. Su `.env` debe tener `USERS_API_BASE_URL` apuntando al servicio de usuarios real (`http://localhost:8000`, su valor por defecto): es quien decide los permisos. |
| Permisos de suscripciones | Existen en el catálogo del servicio de usuarios, pero ningún role los tiene: paso 1. |
| Simulación de clínicas (opcional) | Solo para los escenarios de eliminar y de clínicas asignadas (paso 3). Sin ella, todas las suscripciones muestran «No disponible» y toda eliminación se rechaza: es lo previsto (FR-018, FR-019). |
| Configuración del Backoffice | En `.env.local`, `VITE_SUBSCRIPTIONS_API_URL=/proxy/subscriptions`. Ahora es **obligatoria**: sin ella la aplicación muestra «Configuración inválida». `SUBSCRIPTIONS_API_PROXY_TARGET` solo hace falta si la API no está en `http://127.0.0.1:8010` (por ejemplo, `http://127.0.0.1:8001` si la levantaste ahí; entonces la simulación de clínicas necesita otro puerto y `CLINICS_API_BASE_URL` de la API debe apuntar a él). |
| Dependencias | Ninguna nueva: `npm ci` basta. |

## 1. Permisos de suscripciones

Se ejecuta contra la base del servicio de usuarios, como el SQL de la 001 y la 002:

```sql
-- Administrator (A1): todos los de suscripciones
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name LIKE 'subscriptions:%'
WHERE r.name = 'Administrator' ON CONFLICT DO NOTHING;

-- Billing (A3): solo consultar
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name = 'subscriptions:read'
WHERE r.name = 'Billing' ON CONFLICT DO NOTHING;
```

Para comprobar los permisos con la cuenta A4 (Developer, sin permisos de inicio), se conceden y retiran al role `Developer`. Tras cada cambio, vuelve a la pestaña (o espera 5 minutos) para que el Backoffice vuelva a comprobar el acceso (001, FR-019); la API los lee en cada petición:

```sql
-- Conceder (repite con subscriptions:write, subscriptions:update o subscriptions:delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.name = 'subscriptions:read'
WHERE r.name = 'Developer' ON CONFLICT DO NOTHING;

-- Retirar todos los de suscripciones
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'Developer')
  AND permission_id IN (SELECT id FROM permissions WHERE name LIKE 'subscriptions:%');
```

## 2. Catálogo de prueba

Desde la carpeta de la API, en su base `maily_system`:

```powershell
cd C:\maily\code\maily-system-api
docker compose exec db psql -U postgres -d maily_system
```

```sql
BEGIN;

INSERT INTO subscriptions (name, description, monthly_price, features, status_id) VALUES
  ('Básico', NULL, 1500, ARRAY['1 consultorio', 'Hasta 3 usuarios', 'Agenda y pacientes', 'Recordatorios WhatsApp'], 1),
  ('Pro', 'Para clínicas en crecimiento.', 4500, ARRAY['Hasta 5 consultorios', 'Usuarios ilimitados', 'Todo lo clínico'], 1),
  ('Clínica Plus', 'Empata en precio con Pro.', 4500, ARRAY['Hasta 3 consultorios'], 1),
  ('Premium', 'Para redes de clínicas.', 8900, ARRAY['Consultorios ilimitados', 'Todo lo de Pro'], 1),
  ('Enterprise', 'Precio a cotizar.', 0, '{}', 1),
  ('Solo', 'Para el médico que trabaja por su cuenta.', 900, ARRAY['1 consultorio', '1 usuario'], 2),
  ('Legacy full', 'Plan histórico.', 0, ARRAY['Todo lo clínico'], 2),
  ('Suspendido', 'Bloqueado para las pruebas.', 2000, '{}', 3)
ON CONFLICT DO NOTHING;

-- Más de 10 para paginar
INSERT INTO subscriptions (name, monthly_price)
SELECT 'Plan prueba ' || lpad(n::text, 2, '0'), 100 * n FROM generate_series(1, 12) AS n
ON CONFLICT DO NOTHING;

-- Un estatus añadido a mano (FR-020)
INSERT INTO subscription_statuses (id, name, description)
VALUES (5, 'En revisión', 'Estatus de prueba de la 003') ON CONFLICT DO NOTHING;
UPDATE subscriptions SET status_id = 5 WHERE name = 'Plan prueba 12';

COMMIT;

SELECT id, name, monthly_price, status_id FROM subscriptions WHERE status_id <> 4 ORDER BY id;
```

Quedan 20 suscripciones. Con el orden fijo (FR-015), la **página 1** (10 por página) es Enterprise ($0.00) y de Plan prueba 01 a Plan prueba 09. La **página 2** es Plan prueba 10, Plan prueba 11, Básico, Clínica Plus y Pro (las dos de $4,500.00: empatan y van por nombre) y Premium, y luego el segundo grupo: Legacy full (Inactiva, $0.00), Solo (Inactiva, $900.00), Plan prueba 12 (En revisión, $1,200.00) y Suspendido (Bloqueada, $2,000.00).

## 3. Simulación de clínicas (opcional)

La API de suscripciones trae una simulación del API de clínicas. Con su README y su `.env` por defecto (`CLINICS_API_BASE_URL=http://localhost:8001`), en otra terminal y desde la carpeta de la API:

```powershell
uv run uvicorn app:app --app-dir tests/stubs/clinics_api --port 8001
```

Si la API ya estaba en marcha, reiníciala. Sin conteos fijados, todas tienen 0 clínicas. Para fijar los conteos (sustituyen a los anteriores; usa los ids del `SELECT` del paso 2):

```powershell
$counts = @{ '1' = 2; '4' = 1 }   # Básico con 2 clínicas y Premium con 1
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8001/__test__/counts -ContentType 'application/json' -Body ($counts | ConvertTo-Json)
```

Detener la simulación (o no levantarla) devuelve el comportamiento sin API de clínicas: «No disponible» y eliminaciones rechazadas.

## 4. Ejecutar la aplicación

```powershell
cd C:\maily\code\maily-backoffice
npm ci
npm run dev                              # http://localhost:5173, con los proxies /proxy/users y /proxy/subscriptions
```

## 5. Escenarios de validación

Salvo que se indique otra cuenta, se entra con A1. Los escenarios con clínicas usan la simulación del paso 3.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| V1 | US1-1, US1-4, FR-001, FR-002, FR-016 | Abrir «Suscripciones» en la navegación. | El `h1` «Suscripciones» recibe el foco; la tabla muestra 10 filas con nombre (enlace), precio mensual, estatus y clínicas, el pie dice «1–10 de 20» y ninguna fila se ve atenuada; cada estatus es una etiqueta con texto. Las filas no tienen acciones. |
| V2 | US1-2 | Elegir 25 por página. | Aparecen las 20 en la página 1 y la URL lleva `page_size=25`. |
| V3 | US1-3, FR-015, SC-007 | Recorrer las dos páginas de 10. | El orden es el del paso 2: Clínica Plus antes que Pro, y el segundo grupo al final. Las cabeceras no ordenan al pulsarlas y no hay menú de columnas. |
| V4 | US1-6, US1-7, FR-014, FR-019 | Mirar Pro y Enterprise, sin la simulación de clínicas. | «$4,500.00/mes» y «$0.00/mes»; todas las clínicas dicen «No disponible», nunca 0. |
| V5 | US1-5, US1-8, FR-003 | En la página 2, abrir Solo y pulsar «Volver al listado». Recargar el listado. | El detalle muestra nombre, descripción, precio, Inactiva, clínicas, lo que incluye en su orden y las fechas en hora local; al volver, la tabla está en la página 2. La recarga conserva la página. |
| V6 | US1-10, FR-004 | Detener la API y abrir «Suscripciones» y un detalle; volver a levantarla y pulsar «Reintentar». El estado vacío se comprueba con pruebas automatizadas. | Indicador de carga y, tras los reintentos, el mensaje de error con «Reintentar», que vuelve a mostrar los datos. |
| V7 | US1-11 | Abrir `/subscriptions/99999`, `/subscriptions/abc` y `/subscriptions/0`. | La primera, «Suscripción no encontrada» con enlace al listado; las otras dos, «Página no encontrada». |
| V8 | US1-12, US1-13, US1-14, FR-013, SC-010 | Con A4 sin permisos de suscripciones, mirar la navegación y abrir `/subscriptions`. Conceder `subscriptions:read` y volver a la pestaña. Repetir con A3 (Billing). | Sin permiso, no hay «Suscripciones» y `/subscriptions` lleva a `/` con aviso. Con `subscriptions:read`, listado y detalle sin «Nueva suscripción», «Editar», «Cambiar estatus» ni «Eliminar». |
| V9 | US2-1 a US2-4, FR-005, FR-023, SC-001 | «Nueva suscripción»: nombre «QA Plan», precio 1999.5 y tres elementos; editar el segundo, quitar el primero y guardar. En otra alta, agregar 20 elementos. | El formulario no tiene campo de estatus; tras guardar, «Suscripción creada.», el detalle con Activa, $1,999.50/mes y los dos elementos en su orden, y la suscripción en su lugar del listado. Con 20 elementos, «Agregar elemento» se deshabilita y se lee el máximo; al quitar uno, vuelve. |
| V10 | US2-5, US2-6, FR-006, FR-010 | Guardar vacío; un nombre de 101 caracteres; precios `-1`, `4,500`, `$4500`, `12.345` y `100000000`; un elemento vacío; el nombre « pro » (ya existe Pro). | Errores junto a cada campo, con el foco en el primero; « pro » muestra «Ya existe una suscripción con este nombre.» junto al nombre. No se crea nada, y ningún texto es el de la API. |
| V11 | US2-7 a US2-9, FR-007, SC-004 | Cancelar un alta con datos; detener la API y guardar, levantarla y reintentar; pulsar «Guardar» dos veces seguidas. | Cancelar vuelve al listado sin crear nada; con la API detenida, error con los datos conservados; un solo alta (pestaña Red: un solo `POST`). |
| V12 | US2-10 | Con A4 con solo `subscriptions:read`: buscar «Nueva suscripción» y abrir `/subscriptions/new`. | No hay botón; la dirección vuelve al listado con «No tienes permiso para realizar esta acción.». |
| V13 | US3-1 a US3-4 | Editar Solo: cambiar el precio a 3000 y guardar. Editar otra vez y cancelar. Editar y guardar sin cambiar nada. | El formulario trae los valores actuales y no tiene estatus; «Suscripción guardada.», «$3,000.00/mes» en el detalle y Solo al final del segundo grupo del listado (después de Suspendido); cancelar no cambia nada; sin cambios, «No había cambios que guardar.» y ningún `PATCH` en la pestaña Red. |
| V14 | US3-5, US3-6 | Editar Solo con el nombre «Pro»; después, con «SOLO». | «Pro» se rechaza junto al nombre; «SOLO» se guarda (solo cambian las mayúsculas). |
| V15 | US3-7, US3-8, FR-012 | Abrir «Editar» de Premium en dos pestañas; en la 2 cambiar el precio y guardar; en la 1 cambiar la descripción y guardar. Abrir «Editar» de Clínica Plus, eliminarla por SQL (`UPDATE subscriptions SET status_id = 4 WHERE name = 'Clínica Plus';`) y guardar. | Premium conserva los dos cambios (el `PATCH` de cada pestaña lleva solo su dato); Clínica Plus: «La suscripción ya no existe.», no se guarda nada y la pantalla ofrece volver al listado. |
| V16 | US3-9, US3-10 | Con A4 con `subscriptions:read` y `subscriptions:update`, abrir «Editar», retirarle `subscriptions:update` y guardar. Sin el permiso, abrir `/subscriptions/<id>/edit`. | Al guardar, aviso de que no tiene permiso, sin cerrar la sesión y sin guardar nada; sin el permiso, no hay «Editar» y la dirección vuelve al detalle con el aviso. |
| V17 | US4-1 a US4-5, FR-017, SC-003, SC-009 | En Pro, «Cambiar estatus» → «Inactivar» (confirmar); después «Bloquear»; después «Inactivar»; después «Activar». | El menú ofrece solo los estatus distintos del actual; inactivar y bloquear piden una confirmación que nombra Pro y el nuevo estatus; activar se aplica sin diálogo; cada cambio avisa de su éxito, el detalle muestra el estatus y el listado mueve Pro de grupo. Tres interacciones como mucho. |
| V18 | US4-6 | Con la simulación y Básico con 2 clínicas, inactivarlo y activarlo. | Se permite; Básico sigue con 2 clínicas. |
| V19 | US4-7, US4-8 | Abrir Premium en dos pestañas e inactivarlo en ambas. Después, con el detalle de Plan prueba 05 abierto, eliminarla por SQL (`UPDATE subscriptions SET status_id = 4 WHERE name = 'Plan prueba 05';`) y cambiar su estatus. | La segunda pestaña avisa de que ya tenía ese estatus y se actualiza; la eliminada: «La suscripción ya no existe.» con la opción de volver al listado. |
| V20 | US4-9, US4-10 | Pulsar dos veces seguidas la confirmación de inactivar. Con A4 sin `subscriptions:update`, abrir un detalle. | Un solo `PATCH .../status`, sin aviso de «ya tenía ese estatus»; sin el permiso, no hay «Cambiar estatus». |
| V21 | US5-1 a US5-3, SC-003 | Con la simulación, eliminar «QA Plan» de V9 (0 clínicas); antes, cancelar una vez. | El diálogo nombra «QA Plan» y advierte que no se puede deshacer; cancelar no cambia nada; al confirmar, vuelve al listado con «Suscripción eliminada.» y el total baja en uno. |
| V22 | US5-4 a US5-7, FR-018, SC-008 | Con la simulación: abrir Básico (2) y Premium (1). Abrir Pro (0), fijar en la simulación 1 clínica a Pro sin quitar las de Básico y Premium (los conteos se sustituyen: `@{ '1' = 2; '4' = 1; '2' = 1 }`) y confirmar su eliminación. Detener la simulación, recargar Enterprise y eliminarla. | Básico: «Eliminar» deshabilitado y «Tiene 2 clínicas asignadas»; Premium: «Tiene 1 clínica asignada». Pro: el rechazo dice que tiene clínicas asignadas y el detalle se actualiza (botón deshabilitado). Enterprise con «No disponible»: «Eliminar» se ofrece y, al confirmar, «No se pudo comprobar si la suscripción tiene clínicas asignadas, así que no se eliminó.»; sigue en el listado. |
| V23 | US5-8 a US5-11 | Con la simulación: abrir Plan prueba 06 en dos pestañas y eliminarla en ambas; en Plan prueba 07, pulsar dos veces seguidas «Eliminar» del diálogo; crear una suscripción llamada «Plan prueba 07»; con A4 sin `subscriptions:delete`, abrir un detalle. | La segunda pestaña: «La suscripción ya no existe.»; un solo `DELETE`; el nombre de la eliminada se acepta; sin el permiso no hay «Eliminar». |
| V24 | FR-020 | Abrir Plan prueba 12 (En revisión) y su «Cambiar estatus». | La etiqueta dice «En revisión», neutra y con contorno; está en el segundo grupo del listado; el menú ofrece Activar, Inactivar y Bloquear; «Editar» funciona. |
| V25 | FR-014, FR-022 de la 001 | Recorrer listado, detalle, alta y edición a 1024 px y a 320 px (o con zoom del 400 % en 1280 px) y solo con teclado. | Textos en español; sin desplazamiento horizontal de la página (la tabla se desplaza dentro de su recuadro); menú y diálogos operables con teclado y con el foco devuelto; el motivo de «Eliminar» deshabilitado se lee; las etiquetas de estatus se distinguen sin depender del color. |
| V26 | SC-002, SC-006 | Con la pestaña Red y sin limitación, abrir «Suscripciones» y buscar y abrir Premium. | La primera página aparece en menos de 2 s con una sola solicitud; cambiar de página no hace solicitudes; abrir Premium lleva menos de 30 s. |
| V27 | FR-022, SC-011 | En la pestaña Red y en Aplicación, revisar las solicitudes y el almacenamiento durante V9 a V23. | Las solicitudes de la sección van solo a `/proxy/subscriptions` (o a la URL configurada), con `Authorization: Bearer …`; el token no está en `localStorage`, `sessionStorage`, la URL ni la consola. |

Los escenarios con fallos, esperas y conflictos simultáneos (V6, V11, V15, V19, V22 y V23) también se cubren con pruebas automatizadas contra el simulador de la API, para no depender de ellos.

## 6. Comprobaciones automatizadas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage                    # umbral de 80 % de líneas en api, policy, schemas, hooks y shared
npm run build
npm run size                             # JS de la ruta de entrada <= 300 KB gzip, sin el Data Grid
npm run test:e2e                         # solo con entorno de pruebas de Auth0 (variables E2E_*)
```

`e2e/subscriptions.spec.ts` se omite sin las variables de la cuenta A1 (`E2E_AUTH0_USER_A1` y `E2E_AUTH0_PASSWORD_A1`); con ellas, y con el catálogo del paso 2 y los permisos del paso 1, corren las lecturas (V1 a V5 y V7). El recorrido que **modifica** el catálogo (crear «QA 003 <marca de tiempo>», editarla, cambiar su estatus y eliminarla) solo corre con `E2E_ALLOW_SUBSCRIPTION_WRITES=true`, y necesita la simulación de clínicas del paso 3 para poder eliminar lo que crea.

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| La aplicación muestra «Configuración inválida» al arrancar | Falta `VITE_SUBSCRIPTIONS_API_URL`, que ahora es obligatoria | Añadirla a `.env.local` (`/proxy/subscriptions`). |
| No aparece «Suscripciones» en la navegación | El operador no tiene `subscriptions:read` en un role autorizado | Paso 1 y volver a la pestaña. |
| El listado falla con error de red o `502` en `/proxy/subscriptions` | La API no está en el destino del proxy (`http://127.0.0.1:8010`) | Levantarla ahí o definir `SUBSCRIPTIONS_API_PROXY_TARGET`. |
| Todo responde «No pudimos completar la acción» y la API devuelve `503 authorization_unavailable` | La API no alcanza el servicio de usuarios | Revisar `USERS_API_BASE_URL` en el `.env` de la API y que el servicio de usuarios esté en marcha. |
| Todo responde 403 con A1 | Faltan los permisos de suscripciones | Paso 1. |
| Todas dicen «No disponible» y eliminar siempre se rechaza | No hay API de clínicas (o la simulación no corre, o `CLINICS_API_BASE_URL` no apunta a ella) | Es lo previsto; para eliminar, paso 3. |
| La simulación de clínicas no arranca en el 8001 | La API de suscripciones ya ocupa ese puerto | Mover la API al 8010 (su puerto por defecto) o usar otro puerto para la simulación y apuntar a él `CLINICS_API_BASE_URL`. |
| El orden no es el esperado | Estatus o precios distintos de los del paso 2 | Revisar el `SELECT` del paso 2: Activas primero, cada grupo por precio y, a igualdad, por nombre. |
