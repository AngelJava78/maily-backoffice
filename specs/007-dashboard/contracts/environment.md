# Contrato: configuración del Panel

**Feature**: `007-dashboard` | **Fecha**: 2026-10-20

Añade una variable al contrato de configuración de la 001 ([specs/001-auth-session-profile/contracts/environment.md](../../001-auth-session-profile/contracts/environment.md)), que se actualiza con esta fila. El resto de las variables no cambia; en particular, el Panel usa `VITE_SUBSCRIPTIONS_API_URL` (obligatoria desde la 003) y no crea otra.

## Variable nueva

| Variable | Obligatoria | Por defecto | Ejemplo | Regla de validación |
|---|---|---|---|---|
| `VITE_DASHBOARD_REFRESH_MINUTES` | No | `5` | `10` | Entero de 1 a 60 (minutos), escrito solo con dígitos. Ausente o vacía (`VITE_DASHBOARD_REFRESH_MINUTES=`) vale 5. |

| Valor | Resultado |
|---|---|
| (ausente), `` (vacía) | 5 minutos |
| `1`, `5`, `30`, `60`, `05` | Ese número de minutos |
| `0`, `61`, `999` | Inválido (fuera de rango) |
| `2.5`, `5.0`, `1e1` | Inválido (no entero) |
| `cinco`, `+5`, `-5`, `5 `, ` 5`, `   ` | Inválido (no es solo dígitos; solo espacios) |

- Un valor inválido impide arrancar: se muestra `ConfigErrorScreen` con `VITE_DASHBOARD_REFRESH_MINUTES: Entero de 1 a 60 (minutos), escrito solo con dígitos; si no se define, 5.`, sin repetir el valor (FR-029).
- Es una variable de compilación: Vite la escribe en el paquete al compilar. Cambiarla exige volver a compilar y desplegar (FR-030). No hay archivo de configuración en tiempo de ejecución (fuera de alcance).
- Pública como todas las `VITE_*`: no es un secreto.

## Cambios en archivos

| Archivo | Cambio |
|---|---|
| `src/app/config/env.ts` | Regla de la variable; `AppEnv.VITE_DASHBOARD_REFRESH_MINUTES: number`. |
| `src/vite-env.d.ts` | `readonly VITE_DASHBOARD_REFRESH_MINUTES: string \| undefined`. |
| `src/shared/messages/es.ts` | `config.rules.refreshMinutes`. |
| `.env.example` | `# VITE_DASHBOARD_REFRESH_MINUTES=5` con un comentario: minutos de 1 a 60; se fija al compilar. |
| `README.md` (tabla «Variables de entorno») | Fila de la variable: No obligatoria; «Minutos entre actualizaciones del Panel (1 a 60; 5 por defecto). Se fija al compilar: cambiarla exige volver a compilar y desplegar.» |
| `specs/001-auth-session-profile/contracts/environment.md` | Fila de la variable y la línea correspondiente en el `.env.example` previsto. |
| Arneses de prueba con `AppEnv` (`src/test/renderApp.tsx`, `HttpClientsProvider.test.tsx`, `env.test.ts`) | Valor `5` (número) en sus objetos de configuración. `renderApp` admite además `env` para cambiarlo (por ejemplo, `1`). |
| `src/test/renderWithProviders.tsx` | Envuelve el árbol en `AppSettingsProvider` con `5`, porque la ruta índice (`HomeRoute`) lee la configuración también en las pruebas que pintan `appRoutes` sin `AppRuntime`. |
