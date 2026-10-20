# Contrato de la interfaz: el Panel en la ruta `/`

**Feature**: `007-dashboard` | **Fecha**: 2026-10-20

Completa [specs/001-auth-session-profile/contracts/app-routes.md](../../001-auth-session-profile/contracts/app-routes.md): la ruta `/` sigue siendo la página principal protegida, ahora llamada «Panel».

## Ruta

| Ruta | Acceso | Pantalla | Título de la pestaña | Navegación |
|---|---|---|---|---|
| `/` | Protegida (guarda de la 001); sin permiso propio | Panel: `h1` «Panel», saludo y, según los permisos, el resumen o un aviso | «Panel — MailySoft Backoffice» | Primera entrada, «Panel», visible para toda persona con acceso (FR-001, FR-002) |

- La ruta índice usa `HomeRoute` (en `app/router`), que lee el intervalo de `AppSettingsProvider` y carga `HomePage` de forma diferida (research D11).
- No hay `RequirePermission` en `/`: el permiso `dashboard:read` decide solo el contenido, no el acceso a la ruta.
- Llegar a `/` desde una sección retirada por cambio de permisos sigue mostrando la notificación «Tus permisos cambiaron…» de la 001 (FR-021 de la 001).

## Contenido según los permisos

| Permisos | Debajo del `h1` y el saludo | Consulta |
|---|---|---|
| `dashboard:read` | Resumen (estados abajo) | Sí |
| Algún permiso de lectura, sin `dashboard:read` | `Alert` informativo «Sin acceso a los indicadores» | Ninguna |
| Ningún permiso de lectura (ni secciones, ni herramientas, ni `dashboard:read`) | Solo el `Alert` actual «Sin permisos asignados» | Ninguna |

## Estados del resumen

| Estado | Contenido | Accesibilidad |
|---|---|---|
| Cargando (primera visita de la sesión) | `PageLoader` | `role="status"`, «Cargando» |
| Error de la primera carga | `ErrorState` «No se pudieron cargar los indicadores», **sin** botón | `role="alert"` |
| Sin permiso (403 del servicio) | El mismo `Alert` de "Sin acceso a los indicadores" | `role="alert"` del `Alert` de MUI, como «Sin permisos asignados»: se anuncia al aparecer, una vez |
| Datos | `h2` «Indicadores de la plataforma» + lista de descripción con seis indicadores; `h2` «Clínicas recientes» + tabla (Nombre, Estatus, Fecha de alta) o «Sin clínicas registradas» o «No disponible»; «Actualizado: <fecha y hora con segundos>» | Cada indicador se lee con su etiqueta; la tabla, con sus encabezados; nada se anuncia en cada ciclo |
| Datos + actualizando | Además «Actualizando…» junto a la hora | Sin anuncio; indicador gráfico `aria-hidden` |
| Datos + actualización fallida | Además `RefreshFailedAlert` sin botón, encima del resumen | `role="alert"` al aparecer |

## Comportamiento temporal

| Situación | Consulta |
|---|---|
| Entrar a `/` desde cualquier pantalla (o al cargar la aplicación) | Siempre (FR-018) |
| En `/`, pestaña visible, pasa el intervalo desde que terminó la última consulta | Sí (FR-016, FR-020) |
| En `/`, pestaña oculta | No; el intervalo sigue contando (FR-017) |
| Volver a la pestaña en `/` | Solo si pasó el intervalo desde la última actualización correcta o no hubo ninguna (FR-019) |
| Salir de `/` con una consulta en curso | Se cancela (FR-021) |
| Fuera de `/` | Ninguna (FR-017) |
| Tras un 403 en esta visita | Ninguna hasta volver a entrar (FR-015) |

## Foco

- Al entrar, el foco va al `h1` «Panel» (`useFocusOnMount` y `useRouteAccessibility`).
- Las actualizaciones y los cambios de estado no mueven el foco (FR-033).

## Pruebas que cambian por el nuevo `h1`

`HomePage.test.tsx`, `app/authFlow.integration.test.tsx`, `app/router/accessFlow.test.tsx` y los E2E `access.spec.ts`, `session.spec.ts` y `responsive.spec.ts` buscan hoy el `h1` con el saludo («Hola, …»); pasan a buscar el `h1` «Panel» y el saludo como texto (research D12).
