# Guía de validación: Acceso, Sesión y Perfil del Usuario

**Feature**: `001-auth-session-profile` | **Fecha**: 2026-10-17 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Muestra cómo comprobar de punta a punta que la feature cumple la spec. Las secciones reales (Usuarios, Tipos de suscripción, Clínicas) llegan con las features 002 a 004: hasta entonces, la visibilidad de secciones por permiso (SC-007) se verifica con pruebas automatizadas que inyectan secciones de ejemplo.

## Requisitos previos

| Requisito | Detalle |
|---|---|
| Node.js y npm | Node 24 LTS (`.nvmrc`) y npm 11. |
| Docker Desktop | Para el servicio de usuarios. |
| Auth0 | Aplicación SPA y API creadas según [contracts/auth0-configuration.md](contracts/auth0-configuration.md), y las cuentas de prueba de la tabla de abajo. |
| Servicio de usuarios | Repositorio `C:\maily\code\mailySoft-usuarios`. |

## 1. Levantar el servicio de usuarios

```powershell
cd C:\maily\code\mailySoft-usuarios
Copy-Item .env.example .env              # solo si todavía no existe
docker compose up -d db
docker compose run --rm migrate
docker compose up -d api                 # http://localhost:8000 (documentación en /docs)
```

## 2. Preparar los datos de prueba

El role `Billing` no existe en los datos iniciales y ningún role trae permisos. Ajusta los identificadores de Auth0 (`auth0|...`) de tus cuentas de prueba:

```powershell
$b = 'http://127.0.0.1:8000/api/v1'
function Api($method, $path, $body) {
  $p = @{ Uri = "$b$path"; Method = $method; ContentType = 'application/json' }
  if ($body) { $p.Body = ($body | ConvertTo-Json) }
  Invoke-RestMethod @p
}

# Role Billing (si falta) e índices por nombre
if (-not (Api Get '/roles' | Where-Object name -eq 'Billing')) { Api Post '/roles' @{ name = 'Billing' } | Out-Null }
$roleId = @{}; Api Get '/roles' | ForEach-Object { $roleId[$_.name] = $_.id }
$permId = @{}; Api Get '/permissions' | ForEach-Object { $permId[$_.name] = $_.id }

# Permisos por role (ejemplo para desarrollo)
function Grant($role, $names) { foreach ($n in $names) { Api Post "/roles/$($roleId[$role])/permissions" @{ permission_id = $permId[$n] } | Out-Null } }
$acts = 'read', 'write', 'update', 'delete'
Grant 'Administrator' ($acts | ForEach-Object { "users:$_"; "subscriptions:$_"; "tenants:$_" })
Grant 'Marketing' @('tenants:read')
Grant 'Billing' ($acts | ForEach-Object { "subscriptions:$_" })
# Developer queda sin permisos a propósito (User Story 1, escenario 6)

# Usuarios de prueba
function NewUser($auth0Id, $email, $first, $last, $roles) {
  $u = Api Post '/users' @{ auth0_id = $auth0Id; email = $email; first_name = $first; paternal_last_name = $last }
  foreach ($r in $roles) { Api Post "/users/$($u.id)/roles" @{ role_id = $roleId[$r] } | Out-Null }
  $u
}
$a1 = NewUser 'auth0|ID-ADMIN'     'ana.admin@example.com'     'Ana'    'Admin'     @('Administrator')
$a2 = NewUser 'auth0|ID-MARKETING' 'marta.mkt@example.com'     'Marta'  'Marketing' @('Marketing')
$a3 = NewUser 'auth0|ID-BILLING'   'beto.billing@example.com'  'Beto'   'Billing'   @('Billing')
$a4 = NewUser 'auth0|ID-DEV'       'dani.dev@example.com'      'Dani'   'Developer' @('Developer')
$a5 = NewUser 'auth0|ID-MULTI'     'mario.multi@example.com'   'Mario'  'Multirol'  @('Marketing', 'Owner')
$a6 = NewUser 'auth0|ID-OWNER'     'olga.owner@example.com'    'Olga'   'Owner'     @('Owner')
$a7 = NewUser 'auth0|ID-BLOCKED'   'blas.blocked@example.com'  'Blas'   'Bloqueado' @('Administrator')
$a8 = NewUser 'auth0|ID-DELETED'   'dora.deleted@example.com'  'Dora'   'Eliminada'  @('Administrator')
Api Post "/users/$($a7.id)/block" | Out-Null
Api Delete "/users/$($a8.id)" | Out-Null
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
| V9 | US2-7, SC-009 | Con A1 dentro, bloquear su cuenta (`Api Post "/users/$($a1.id)/block"`) y cambiar de pestaña y volver (o esperar 5 minutos). | Deja de ver contenido protegido y aparece el acceso denegado (cuenta no activa); al desbloquear y volver a la pestaña recupera el acceso. |
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
| Tras cerrar sesión Auth0 muestra un error de URL | Falta `/access` o `/access/idle` en *Allowed Logout URLs* | Añadir ambas. |
| Recargar siempre lleva a la pantalla de acceso | El navegador bloquea cookies de terceros | Esperado: "Iniciar sesión" vuelve sin pedir credenciales; mitigar con dominio personalizado de Auth0. |
| La cuenta A1 entra pero no ve nada | Roles sin permisos asignados | Repetir el paso 2 (`Grant`). |
| `Billing` no autoriza | El role no existe en la plataforma | Crearlo (paso 2). |
