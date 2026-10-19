# Modelo de datos: Token de Acceso para Postman (Herramienta Temporal)

**Feature**: `005-postman-token-tool` | **Fecha**: 2026-10-19 | **Spec**: [spec.md](spec.md) | **Investigación**: [research.md](research.md)

El Backoffice no persiste datos y esta feature menos: el token solo existe en el estado de la pantalla (research D7 y D11). Este modelo describe los modelos de dominio del frontend que añade la 005, derivados del token que entrega Auth0 ([contracts/auth0-token-request.md](contracts/auth0-token-request.md)), del acceso de la persona (feature 001) y del estado de la pantalla. Como en la 001 y la 002 (constitución II), cada dato que cruza una frontera tiene un único esquema Zod. Todo lo nuevo vive en `features/postman-token`, salvo el recurso `token` de las políticas (`features/auth/policy`).

## Entidades

### Permiso `token:read` (ya existe el mecanismo, feature `auth`)

Corresponde a *Permiso `token:read`* de la spec. No es un dato nuevo del frontend: es un nombre `recurso:acción` más dentro de `OperatorAccess.permissions` (unión de los permisos activos de los roles activos que dan acceso al backoffice; ver [../001-auth-session-profile/data-model.md](../001-auth-session-profile/data-model.md)).

| Aspecto | Regla |
|---|---|
| Nombre | `token:read` (recurso `token`, acción `read`); cumple `^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$`. |
| Origen | La consulta de la propia persona (`me`) lo devuelve dentro de `roles[].permissions` cuando algún role activo lo tiene. |
| Decisión | `can(access, { resource: 'token', action: 'read' })`. El recurso `token` se añade a `SECTION_RESOURCES` (research D2). |
| Alcance | Un solo permiso cubre ver la opción y todas sus acciones (generar, copiar, refrescar, mostrar, ocultar). |
| Efecto lateral | `hasAnySectionPermission` lo cuenta: quien solo tiene `token:read` no ve el aviso de «sin permisos asignados». |

### `AccessTokenClaims` (frontera: el token que entrega Auth0)

Lo único que se lee del payload del JWT. Cualquier otro claim se descarta al validar y no se conserva ni se registra (research D6).

| Campo | Tipo | Origen | Reglas |
|---|---|---|---|
| `exp` | entero > 0 | claim `exp` | Segundos desde la época Unix (RFC 7519). Sin él, el token se considera ilegible. |

### `IssuedToken` (modelo de dominio)

Corresponde a *Token de acceso* de la spec. Lo produce `decodeAccessToken(token)`.

| Campo | Tipo | Origen | Reglas |
|---|---|---|---|
| `value` | texto no vacío | el texto que devuelve el SDK | Un JWT de tres partes separadas por punto. **Nunca** se registra, se serializa ni sale del estado de la pantalla. |
| `expiresAt` | texto ISO 8601 UTC | `new Date(exp * 1000).toISOString()` | Se muestra con `formatDateTime`, en la zona horaria del navegador. |

La validez no se guarda: se deriva comparando `expiresAt` con el reloj del estado de la pantalla (`now`, research D8).

### `TokenFailureKind` y `TokenRequestError`

Cómo falla la obtención del token. `requestAccessToken` lanza un `TokenRequestError` con uno de estos tipos:

| `kind` | Cuándo | Mensaje (`messages.token.errors`) | Acciones |
|---|---|---|---|
| `session-expired` | `mapAuth0TokenError` produce `SessionExpiredError`: `login_required`, `consent_required`, `invalid_grant`, `MissingRefreshTokenError` o `TimeoutError` del SDK | «Tu sesión ya no es válida» | «Reintentar» e «Iniciar sesión de nuevo» |
| `unreadable-token` | El SDK devolvió un texto vacío, que no es un JWT de tres partes, cuyo payload no es JSON o cuyo `exp` falta o no es un entero positivo | «No se pudo leer el token» | «Reintentar» |
| `unknown` | Cualquier otro error (red, Auth0 caído, error inesperado del SDK) | «No se pudo obtener el token» | «Reintentar» |

El error del SDK original se conserva como `cause` pero nunca se muestra ni se registra (constitución IV y V).

### `TokenScreenState` (estado de la pantalla)

Lo gestiona `tokenReducer` dentro de `useAccessToken`. No se copia a Context, a la caché de consultas ni a ningún almacenamiento.

| Campo | Tipo | Significado |
|---|---|---|
| `token` | `IssuedToken` o `null` | El token en pantalla (oculto o visible). `null` en el estado inicial. |
| `revealed` | booleano | `true` si el valor completo está visible; `false` (por defecto) si está oculto. |
| `status` | `'idle'` o `'pending'` | `pending` mientras se espera a Auth0. |
| `failure` | `TokenFailureKind` o `null` | El último fallo, hasta la siguiente solicitud. |
| `now` | entero (ms desde la época Unix) | El reloj de la pantalla. Solo lo escriben `issued` y `ticked`, desde un manejador de eventos, un temporizador o un listener; el render nunca lee el reloj (research D8). Sin significado mientras `token` es `null`. |

Estado inicial: `{ token: null, revealed: false, status: 'idle', failure: null, now: 0 }`.

**Transiciones** (funciones puras, con prueba primero):

| Estado | Evento | Siguiente estado | Spec |
|---|---|---|---|
| Cualquiera salvo `pending` | `requested` | `status: 'pending'`, `failure: null`; el `token` y `revealed` no cambian | FR-009, FR-016 |
| `pending` | `requested` | Sin cambios (se ignora) | FR-016 |
| `pending` | `issued(token, now)` | `token` = el nuevo, `now` = el instante en que llegó, `revealed: false`, `status: 'idle'`, `failure: null` | FR-010, FR-015 |
| `pending` | `failed(kind)` | `status: 'idle'`, `failure: kind`; el `token` y `revealed` no cambian | FR-019 |
| Con `token` | `revealToggled` | `revealed` invertido | FR-010 |
| Sin `token` | `revealToggled` | Sin cambios | — |
| Cualquiera | `ticked(now)` | Solo cambia `now` (lo dispara el temporizador de expiración o el regreso a la pestaña) | FR-013 |

El descarte no es una transición: al desmontarse el componente el estado deja de existir (research D7).

**Valores derivados en el render** (nada se almacena):

| Valor | Cálculo | Spec |
|---|---|---|
| `primaryAction` | `token === null` → «Generar»; si no → «Refrescar» | FR-014 |
| `validity` | sin `token` → ninguna; con él, `now >= Date.parse(token.expiresAt)` → «Expirado», si no «Vigente» (usa el `now` del estado, no el reloj) | FR-012, FR-013 |
| `canCopy` | `token !== null` y no expirado | FR-009, FR-011, FR-013 |
| `showsValue` | `token !== null` y `revealed` | FR-010 |

### Ciclo de vida de lo que ve la persona

```text
Inicial ──Generar──▶ Generando ──ok──▶ Vigente (oculto) ◀──Mostrar/Ocultar──▶ Vigente (visible)
   ▲                    │                  │  ▲                                     │
   │                    └─fallo─▶ Inicial  │  └──────────── Refrescar ──────────────┘
   │                        (con alerta)   │            (Generando, token anterior en pantalla)
   │                                       └─llega la hora─▶ Expirado ──Refrescar──▶ Generando
   └──── salir de la página · recargar · cerrar sesión · perder `token:read` ◀───────────┘
```

Un fallo al refrescar vuelve al estado anterior (vigente o expirado) con la alerta, sin perder el token.

## Qué no se persiste ni se comparte

| Dato | Dónde puede estar | Dónde nunca |
|---|---|---|
| `IssuedToken.value` | Estado del hook; el DOM solo mientras está visible; el portapapeles cuando la persona pulsa «Copiar» | URL, estado de navegación, claves de consulta, caché de TanStack Query, `localStorage`, `sessionStorage`, Context, `logger`, `console` |
| `expiresAt` | Estado del hook y pantalla | Registros junto al token |
| Claims distintos de `exp` | En ningún sitio (se descartan al validar) | — |
| Máscara | Constante de `messages.token` | No depende de la longitud del token |

## Relaciones

- `TokenScreenState.token` es, como mucho, **un** `IssuedToken` (spec: «como máximo uno a la vez»); «Refrescar» lo reemplaza, no lo acumula, y el anterior sigue siendo válido en Postman hasta su `exp` (no se revoca).
- El acceso (`OperatorAccess`) solo se **lee** para decidir si la pantalla existe; la pantalla no depende de él una vez abierta, y si pierde el permiso la guarda la desmonta (research D11).
