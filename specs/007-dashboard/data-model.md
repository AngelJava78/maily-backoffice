# Data Model: Panel de Maily (Resumen de Solo Lectura)

**Feature**: `007-dashboard` | **Fecha**: 2026-10-20 | **Research**: [research.md](research.md)

El modelo vive en el frontend: no hay persistencia propia. Los datos llegan del servicio de la plataforma ([contracts/dashboard-service.md](contracts/dashboard-service.md)), se validan en la frontera, se transforman a modelos de dominio en la capa `schemas`/`api` de `features/dashboard` (constitución II) y viven en la caché de TanStack Query durante la sesión (constitución III).

## DTO del servicio → modelo de dominio

`schemas/dashboardSummary.ts` — un único esquema por entidad; los tipos salen de `z.infer` / `z.output` (D4).

| DTO (snake_case) | Validación | Dominio (camelCase) | Notas |
|---|---|---|---|
| `total_clinics` | entero ≥ 0 o `null`; obligatorio | `totalClinics: number \| null` | `null` = no disponible (FR-007). |
| `active_clinics` | igual | `activeClinics: number \| null` | |
| `trial_clinics` | igual | `trialClinics: number \| null` | Etiqueta «Clínicas en periodo de prueba». |
| `total_doctors` | igual | `totalDoctors: number \| null` | |
| `total_patients` | igual | `totalPatients: number \| null` | |
| `total_users` | igual | `totalUsers: number \| null` | Incluye a los doctores (contrato); no se valida. |
| `recent_clinics` | arreglo de 0 a 10 `RecentClinic` o `null`; obligatorio | `recentClinics: RecentClinic[] \| null` | `[]` = «Sin clínicas registradas» (FR-008); `null` = «No disponible». Orden: el del servicio (más nueva primero), sin reordenar. |

**`RecentClinic`**

| DTO | Validación | Dominio | Notas |
|---|---|---|---|
| `id` | texto no vacío (UUID en el contrato) | `id: string` | Solo como clave de fila; no se muestra (FR-035). |
| `name` | texto no vacío | `name: string` | Sin límite de longitud en el contrato: se ajusta sin recortarse. |
| `created_at` | `z.iso.datetime({ offset: true })` | `createdAt: string` (ISO 8601) | Se formatea solo en la presentación, en la zona del navegador (constitución IV). |
| `status.id` | entero | `status.id: number` | Estable según el contrato; no se usa para pintar. |
| `status.name` | texto no vacío | `status.name: string` | Se muestra tal cual («Activa», «En prueba», «Suspendida»). |

Una respuesta que no cumple el esquema (falta un campo, un negativo, un decimal, más de 10 clínicas, una fecha inválida, un nombre vacío) es un `ApiError` de tipo `contract` y la pantalla la trata como un fallo (FR-027): nunca se muestra a medias.

## Resultado guardado en la caché

`hooks/useDashboardSummary.ts`

```text
DashboardResult =
  | { kind: 'summary'; summary: DashboardSummary }
  | { kind: 'forbidden' }          // el servicio respondió 403 (D6)
```

- Clave: `dashboardKeys.summary()` = `['dashboard', 'summary']`; `dashboardKeys.all` = `['dashboard']` (para descartarlo, D7).
- `dataUpdatedAt` (de TanStack) es la **hora de la última actualización correcta** del Panel cuando `kind` es `summary`.
- Vida: hasta que se cierra la sesión (`queryClient.clear()` en `useLogout`, `useSessionExpiry` y `useSessionEndedListener`), hasta que la persona pierde `dashboard:read` (`removeQueries`, D7) o hasta que una respuesta 403 lo sustituye por `forbidden`. Nunca se guarda en el almacenamiento del navegador (FR-022).

## Estados de la pantalla

`toDashboardView(query)` (función pura, D8) reduce la consulta a uno de estos estados; `DashboardSummary` solo los pinta.

| Estado | Condición | Se ve | Anuncio |
|---|---|---|---|
| `loading` | Sin resultado y consultando | `PageLoader` («Cargando») | Estado de carga (`role="status"`), solo en la primera visita. |
| `failed` | Sin resultado y la consulta falló | `ErrorState` con «No se pudieron cargar los indicadores», sin botón (FR-025) | `role="alert"` al aparecer (FR-034). |
| `forbidden` | Resultado `forbidden` | El aviso de que no tiene permiso para ver los indicadores (FR-015, el mismo de FR-011) | `role="alert"` (`Alert` de MUI) al aparecer, como «Sin permisos asignados»; no se repite. |
| `ready` | Resultado `summary` | Indicadores, clínicas recientes, «Actualizado: <fecha y hora con segundos>» | Ninguno en cada ciclo (FR-029, FR-033). |
| `ready` + `isUpdating` | `summary` y consultando | Además, «Actualizando…» junto a la hora (FR-009) | Ninguno; el indicador gráfico es `aria-hidden`. |
| `ready` + `refreshFailed` | `summary` y la última consulta falló | Además, `RefreshFailedAlert` sin botón: no se pudieron actualizar (FR-024) | `role="alert"` al aparecer; no se repite mientras siga visible. |

Transiciones (todas las provoca la consulta o un cambio de permisos; ninguna la persona):

```text
(entrar, sin datos) → loading ─ok→ ready
                             ─fallo→ failed ─(siguiente ciclo o volver a la pestaña con el intervalo cumplido) ok→ ready
                             ─403→ forbidden
ready ─(ciclo, entrada o regreso a la pestaña)→ ready+isUpdating ─ok→ ready (hora nueva)
                                                                ─fallo→ ready+refreshFailed ─ok→ ready
                                                                ─403→ forbidden (datos descartados)
forbidden ─(salir y volver a entrar)→ forbidden+consultando ─ok→ ready ─403→ forbidden
cualquiera ─(pierde dashboard:read en la recomprobación)→ el componente se desmonta, datos descartados, aviso de FR-011
cualquiera ─(cierre de sesión)→ caché vacía
```

## Página principal: qué se compone según los permisos

`features/home/HomePage.tsx` (lee `auth`; D1, D2).

| Permisos de la persona (roles que dan acceso) | Contenido debajo de «Panel» y el saludo | Consulta al servicio |
|---|---|---|
| Incluyen `dashboard:read` | `DashboardSummary` | Sí |
| Alguna sección o herramienta, sin `dashboard:read` | Aviso «Sin acceso a los indicadores» (FR-011) | No (FR-011) |
| Ninguna sección, herramienta ni `dashboard:read` (`!hasAnythingToSee`) | Solo el aviso actual «Sin permisos asignados» (FR-012) | No |

## Reglas de actualización

`policy/refreshRules.ts` (puras, con prueba primero) y las opciones de la consulta (D5).

| Regla | Definición | Requisito |
|---|---|---|
| Intervalo | `dashboardRefreshMs = VITE_DASHBOARD_REFRESH_MINUTES × 60 000` (1 a 60 min; 5 por defecto) | FR-016, FR-028 |
| `isRefreshDue(lastSuccessAt, now, intervalMs)` | `lastSuccessAt === 0` (nunca hubo una correcta) o `now − lastSuccessAt ≥ intervalMs` | FR-019 |
| `refreshIntervalFor(result, intervalMs)` | `false` si `forbidden`; si no, `intervalMs` | FR-016, FR-015 |
| Reinicio de la cuenta | Lo hace TanStack en cada cambio de estado; la última es el final de la consulta, salga bien o mal | FR-020 |

Línea de tiempo de referencia (intervalo de 5 min), base de las pruebas con reloj simulado:

| Momento | Hecho | Consulta |
|---|---|---|
| 10:02 | Entra al Panel (correcta) | Sí (entrada) |
| 10:03 | Oculta la pestaña | — |
| 10:05 | Vuelve a la pestaña: 3 min desde la última correcta | No |
| 10:07 | Ciclo | Sí |
| 10:08 | Oculta la pestaña | — |
| 10:12 | Ciclo con la pestaña oculta | No |
| 10:15 | Vuelve: 8 min desde la última correcta | Sí; la siguiente, a las 10:20 |
| 10:20 | Ciclo, falla | Sí; aviso de fallo con la hora de las 10:15 |
| 10:25 | Ciclo, sale bien | Sí; aviso fuera, hora 10:25 |

## Configuración

| Variable | Entrada | Valor en `AppEnv` | Llega al Panel |
|---|---|---|---|
| `VITE_DASHBOARD_REFRESH_MINUTES` | Texto de solo dígitos, 1 a 60; ausente o vacía = 5 | `number` (minutos) | `AppSettingsProvider` (`dashboardRefreshMs`) → `HomeRoute` → `HomePage` → `DashboardSummary` (props) |

El detalle de la regla y de los valores inválidos está en [contracts/environment.md](contracts/environment.md).

## Textos nuevos o cambiados (`src/shared/messages/es.ts`)

Valores orientativos; la redacción final se fija en la implementación sin cambiar el sentido.

| Clave | Texto |
|---|---|
| `nav.home`, `titles.home` | «Panel» (antes «Inicio») |
| `home.title` | «Panel» (`h1`) |
| `dashboard.indicatorsTitle` | «Indicadores de la plataforma» |
| `dashboard.indicators.*` | «Clínicas totales», «Clínicas activas», «Clínicas en periodo de prueba», «Doctores», «Pacientes», «Usuarios» |
| `dashboard.notAvailable` | «No disponible» |
| `dashboard.recentClinics.title` / `.columns.*` / `.empty` | «Clínicas recientes» / «Nombre», «Estatus», «Fecha de alta» / «Sin clínicas registradas» |
| `dashboard.lastUpdated(when)` | «Actualizado: {when}» |
| `dashboard.updating` | «Actualizando…» |
| `dashboard.loadError.title` / `.message` | «No se pudieron cargar los indicadores» / «Ocurrió un problema al consultar la plataforma. Se volverá a intentar automáticamente.» |
| `dashboard.refreshFailed` | «No se pudieron actualizar los indicadores. Se muestran los de la última actualización y se volverá a intentar automáticamente.» |
| `dashboard.noPermission.title` / `.message` | «Sin acceso a los indicadores» / «No tienes permiso para ver los indicadores de la plataforma.» |
| `config.rules.refreshMinutes` | «Entero de 1 a 60 (minutos), escrito solo con dígitos; si no se define, 5.» |

## Datos de prueba

| Pieza | Contenido |
|---|---|
| `createPlatformDashboardMock` (estado inicial) | Los datos ficticios de la fase 1 del servicio: 12 / 8 / 3 / 37 / 1284 / 52 y las 5 clínicas más recientes (Clínica Santa Aurora, Consultorio Del Valle, Centro Médico Horizonte, Dental Sonríe, Clínica San Rafael). |
| `dashboardDto(overrides)`, `recentClinicDto(overrides)` | DTOs válidos con valores por defecto y sobrescrituras al final, como las demás fábricas. |
| Semilla del simulador de usuarios | Sin `dashboard:read` en ningún role; las pruebas lo dan con `grant`. |
