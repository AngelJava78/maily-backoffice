# Guía de validación: Acceso, Sesión y Perfil del Usuario

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-17 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Muestra cómo comprobar de punta a punta que la feature cumple la spec. Las secciones reales (Usuarios, Suscripciones, Clínicas) llegan con las features 002 a 004: hasta entonces, la visibilidad de secciones por permiso (SC-007) se verifica con pruebas automatizadas que inyectan secciones de ejemplo.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Node.js y npm | Node 24 LTS (`.nvmrc`) y npm 11. |
| Docker Desktop | Para el servicio de usuarios. |
| Auth0 | Aplicación SPA y API creadas según [contracts/auth0-configuration.md](contracts/auth0-configuration.md), y las cuentas de prueba de la tabla de abajo. |
| Servicio de usuarios | Repositorio `C:\maily\code\mailySoft-usuarios`, con su `.env` completo (`AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_MANAGEMENT_CLIENT_ID` y `AUTH0_MANAGEMENT_CLIENT_SECRET`; sin ellas no arranca) y la consulta `me` implementada ([contracts/users-service-me-request.md](contracts/users-service-me-request.md)). |

## 1. Levantar el servicio de usuarios

```powershell
cd C:\maily\code\mailySoft-usuarios
Copy-Item .env.example .env              # solo si todavía no existe
docker compose up -d db
docker compose run --rm migrate
docker compose up -d api                 # http://localhost:8000 (documentación en /docs)
# En su .env: AUTH0_DOMAIN y AUTH0_AUDIENCE iguales a VITE_AUTH0_DOMAIN y VITE_AUTH0_AUDIENCE de este proyecto,
# más las credenciales de la aplicación Machine to Machine. El servicio no arranca si falta alguna.
```

## 2. Preparar los datos de prueba

Con el control de acceso del servicio, `POST /api/v1/users` crea también la cuenta en Auth0 (y exige contraseña) y cada operación pide token y permiso. Por eso los datos de prueba se cargan con SQL sobre las cuentas que ya existen en Auth0. La primera persona administradora se carga siempre así (`project-definition/bootstrap_admin.sql` del servicio); el resto se puede cargar con una plantilla como esta, que guardas en un archivo local sin versionar (por ejemplo `scripts/local/seed-test-users.sql`, ya ignorado por git) con los `user_id` (`auth0|...`) de tus cuentas de prueba y sus correos:

```sql
BEGIN;

INSERT INTO roles (name) VALUES ('Billing') ON CONFLICT DO NOTHING;   -- no viene en los datos iniciales

INSERT INTO users (auth0_id, email, first_name, paternal_last_name, maternal_last_name) VALUES
  ('auth0|ID-ADMIN',     'a1@ejemplo.com', 'Ana',   'Admin',     'Perez'),
  ('auth0|ID-MARKETING', 'a2@ejemplo.com', 'Marta', 'Marketing', NULL),
  ('auth0|ID-BILLING',   'a3@ejemplo.com', 'Beto',  'Billing',   NULL),
  ('auth0|ID-DEV',       'a4@ejemplo.com', 'Dani',  'Developer', NULL),
  ('auth0|ID-MULTI',     'a5@ejemplo.com', 'Mario', 'Multirol',  NULL),
  ('auth0|ID-OWNER',     'a6@ejemplo.com', 'Olga',  'Owner',     NULL),
  ('auth0|ID-BLOCKED',   'a7@ejemplo.com', 'Blas',  'Bloqueado', NULL),
  ('auth0|ID-DELETED',   'a8@ejemplo.com', 'Dora',  'Eliminada', NULL)
ON CONFLICT DO NOTHING;
-- A9 no se inserta: existe en Auth0 pero no en la base de usuarios.

UPDATE users SET status_id = 2 WHERE email = 'a7@ejemplo.com';   -- Bloqueado
UPDATE users SET status_id = 3 WHERE email = 'a8@ejemplo.com';   -- Eliminado

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM (VALUES
  ('a1@ejemplo.com', 'Administrator'), ('a2@ejemplo.com', 'Marketing'), ('a3@ejemplo.com', 'Billing'),
  ('a4@ejemplo.com', 'Developer'), ('a5@ejemplo.com', 'Marketing'), ('a5@ejemplo.com', 'Owner'),
  ('a6@ejemplo.com', 'Owner'), ('a7@ejemplo.com', 'Administrator'), ('a8@ejemplo.com', 'Administrator')
) AS m(email, role_name)
JOIN users u ON u.email = m.email
JOIN roles r ON r.name = m.role_name
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
     (r.name = 'Administrator'
        AND p.name ~ '^(users|roles|permissions|subscriptions|tenants):(read|write|update|delete)$')
  OR (r.name = 'Marketing' AND p.name = 'tenants:read')
  OR (r.name = 'Billing' AND p.name ~ '^subscriptions:(read|write|update|delete)$')
)
ON CONFLICT DO NOTHING;
-- Developer y Owner quedan sin permisos a propósito (User Story 1, escenarios 6 y 7).

COMMIT;
```

Se ejecuta desde la carpeta del servicio, con la base levantada y migrada:

```powershell
Get-Content <ruta del archivo .sql> -Raw | docker compose exec -T db psql -U postgres -d usuarios -v ON_ERROR_STOP=1 -f -
```

| Cuenta | Usuario en MailySoft | Roles | Permisos que cuentan | Cubre |
|---|---|---|---|---|
| A1 | Activo | Administrator | `users:*`, `subscriptions:*`, `tenants:*` | US1 escenarios 2 y 5 |
| A2 | Activo | Marketing | `tenants:read` | SC-007 |
| A3 | Activo | Billing | `subscriptions:*` | SC-007 |
| A4 | Activo | Developer | ninguno | US1 escenario 6 |
| A5 | Activo | Marketing y Owner | solo los de Marketing | US1 escenario 7 |
| A6 | Activo | Owner | ninguno (no autorizado) | US2 escenario 3 |
| A7 | Bloqueado | Administrator | ninguno | US2 escenario 2 |
| A8 | Eliminado | Administrator | ninguno | US2 escenario 2 |
| A9 | No existe (cuenta de Auth0 sin crear en MailySoft) | n/a | n/a | US2 escenario 1 |

## 3. Configurar y ejecutar la aplicación (tras implementar)

```powershell
cd C:\maily\code\maily-backoffice
Copy-Item .env.example .env.local        # completa dominio, client id y audience de Auth0
npm ci
npm run dev                              # http://localhost:5173 (puerto fijo)
```

## 4. Escenarios de validación

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| V1 | US1-1, FR-001 | Sin sesión, abrir `http://localhost:5173/profile`. | Pantalla de acceso; ningún dato protegido. |
| V2 | US1-2, FR-002, FR-007 | En V1 elegir "Iniciar sesión" con A1. | Las credenciales se escriben en Auth0; al volver llega a `/profile` (la dirección pedida). |
| V3 | US1-4 | Con sesión, abrir `/access`. | Redirige a `/` sin pedir credenciales. |
| V4 | US1-5, FR-008, FR-009 | Entrar con A1. | Encabezado con nombre, perfil y cerrar sesión; sin secciones aún (no hay implementadas). |
| V5 | US1-6, FR-018 | Entrar con A4. | Página principal con aviso "tu role no tiene permisos asignados". |
| V6 | US1-7 | Entrar con A5; abrir `/profile`. | Entra; el perfil lista sus dos roles activos. |
| V7 | US2-1 a US2-4, SC-002 | Entrar con A9, A7, A8 y A6. | "Acceso denegado" con el motivo (no registrada, cuenta no activa, sin role con acceso), el correo de la cuenta con la que se identificó y opción de cerrar sesión; abrir `/` o `/profile` directamente repite el aviso. |
| V8 | US2-5, FR-005 | `docker compose stop api` y entrar con A1. | "No se pudo comprobar el acceso" con el correo de la cuenta, Reintentar y Cerrar sesión; tras `docker compose start api`, Reintentar concede el acceso. |
| V9 | US2-7, SC-009 | Con A1 dentro, bloquear su usuario en la base (`docker compose exec db psql -U postgres -d usuarios -c "UPDATE users SET status_id = 2 WHERE email = '<correo de A1>'"`, que no toca la cuenta de Auth0) y cambiar de pestaña y volver (o esperar 5 minutos). | Deja de ver contenido protegido y aparece el acceso denegado (cuenta no activa); al volver a poner `status_id = 1` y regresar a la pestaña recupera el acceso. |
| V10 | US3-1 a US3-3, FR-010, FR-011, SC-003 | Cerrar sesión; pulsar Atrás; volver a "Iniciar sesión". | Pantalla de acceso; Atrás no muestra datos; Auth0 vuelve a pedir credenciales. |
| V11 | US3-4 | Abrir dos pestañas con sesión y cerrar sesión en una. | La otra pasa de inmediato a la pantalla de acceso. |
| V12 | US4-3 a US4-5, FR-020, SC-008 | Con sesión en `/profile`, no tocar nada 14 minutos; repetir una vez eligiendo "Continuar" y otra dejando pasar el minuto. | Aviso a los 14 minutos; "Continuar" reinicia el conteo; sin respuesta, a los 15 se cierra la sesión y se muestra `/access/idle` con el motivo; al identificarse de nuevo vuelve a `/profile`. |
| V13 | US5-1, US5-2 | Abrir `/profile`. | Nombre, apellido paterno, apellido materno (vacío si no tiene), correo del usuario de MailySoft, iniciales y roles activos; sin opciones de edición. |
| V14 | FR-016 | Con sesión, abrir `/no-existe`. | "Página no encontrada" con enlace a `/`. Sin sesión, redirige a `/access`. |
| V15 | US4-1, US4-2, FR-013 | Simulado en pruebas automatizadas (error `login_required` del SDK). | Pantalla de acceso con aviso de sesión vencida y retorno a la pantalla de origen. |
| V16 | US2-8, FR-017, SC-007 | Pruebas automatizadas (T141) con secciones de ejemplo y la matriz de roles de las cuentas A1 a A5. | Secciones y acciones visibles iguales a los permisos de cada role. |
| V17 | FR-022, SC-010 | Con la ventana del navegador a 1024 px y a 320 px de ancho (o con zoom del 400 % en una ventana de 1280 px), recorrer acceso, acceso denegado (A9), inicio, perfil y una dirección inexistente. | Sin desplazamiento horizontal ni contenido cortado; "Perfil" y "Cerrar sesión" siguen visibles en el encabezado. |
| V18 | US2-5, FR-005, SC-011 | `docker compose pause api` (el servicio queda colgado: no responde ni da error), entrar con A1 y medir el tiempo hasta el aviso. | Indicador de progreso y, como máximo a los 30 s, "No se pudo comprobar el acceso" con el correo de la cuenta, Reintentar y Cerrar sesión; tras `docker compose unpause api`, Reintentar concede el acceso. |

Los escenarios con espera (V9, V12, V18) también se cubren con pruebas automatizadas con reloj simulado, para no depender del tiempo real.

## 5. Comprobaciones automatizadas

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage                    # umbral de 80 % de líneas en api, policy, schemas, hooks y shared
npm run build
npm run size                             # JS de la ruta de entrada <= 300 KB gzip
npm run test:e2e                         # solo con entorno de pruebas de Auth0 (variables E2E_*)
```

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Error de CORS en la consola | La app llama directo al servicio | Usar `VITE_USERS_API_URL=/proxy/users` y el proxy de Vite. |
| "Service not found" al iniciar sesión | El `audience` no coincide con ninguna API de Auth0 | Revisar `VITE_AUTH0_AUDIENCE` y crear la API. |
| "Callback URL mismatch" | Falta `http://localhost:5173/callback` en Auth0 | Añadirla a *Allowed Callback URLs*. |
| Tras "Iniciar sesión" se vuelve a `/access` con "No pudimos completar el inicio de sesión"; la URL de `/callback` trae `error=invalid_request` y "is not authorized to access resource server" | La aplicación SPA no está autorizada para usar la API de Auth0 | En la API, pestaña *Application Access*, autorizar la aplicación para el acceso de usuarios. |
| Tras cerrar sesión Auth0 muestra un error de URL | Falta `/access` o `/access/idle` en *Allowed Logout URLs* | Añadir ambas. |
| Recargar siempre lleva a la pantalla de acceso | El navegador bloquea cookies de terceros | Esperado: "Iniciar sesión" vuelve sin pedir credenciales; mitigar con dominio personalizado de Auth0. |
| La cuenta A1 entra pero no ve nada | Roles sin permisos asignados | Repetir el paso 2 (permisos de los roles). |
| `Billing` no autoriza | El role no existe en la plataforma | Crearlo (paso 2). |
| Todas las llamadas al servicio dan 401 `invalid_token` | `AUTH0_DOMAIN` o `AUTH0_AUDIENCE` del servicio no coinciden con `VITE_AUTH0_DOMAIN` o `VITE_AUTH0_AUDIENCE`, o se envió un ID token | Igualar las variables y reiniciar el servicio. |
| El servicio de usuarios no arranca | Falta alguna variable `AUTH0_*` obligatoria en su `.env` | Completarla; el registro nombra las que faltan. |
| `/api/v1/authorization/me` responde 404 o 405 | La consulta `me` aún no está implementada en el servicio | Implementarla ([solicitud](contracts/users-service-me-request.md)); mientras tanto, solo las pruebas con MSW. |
