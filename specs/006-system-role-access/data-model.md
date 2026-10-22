# Data Model: Acceso al Backoffice Solo con Rol de Sistema

**Feature**: `006-system-role-access` | **Fecha**: 2026-10-21

Solo lo que cambia respecto a la feature 001. Lo no mencionado (DTO de usuario, formato de permiso, etc.) sigue igual.

## `AccessRole` (`features/auth/schemas/myAccess.ts`)

DTO de un rol en la respuesta de `/authorization/me`, con su tipo nuevo:

```ts
const roleTypeSchema = z.object({ id: z.number().int().min(1), name: z.string().min(1) });

export const accessRoleSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
  type: roleTypeSchema,           // NUEVO: 1 Sistema | 2 Clínica (research D1)
  permissions: z.array(permissionNameSchema),
});
```

| Campo | Regla |
|---|---|
| `type.id` | Entero ≥ 1. El Backoffice solo reconoce 1 (Sistema); cualquier otro valor (2 Clínica, o uno futuro) no da acceso ni permisos. |
| `type.name` | Texto informativo; nunca se compara (FR-002). |

Un rol sin `type` (contrato roto) hace que toda la respuesta falle la validación de Zod → `ApiError.contract` → pantalla de error con «Reintentar» (FR-024), igual que cualquier otro campo obligatorio ausente.

`password_change_required` (booleano, siempre presente en la respuesta real) **no se añade** al esquema: `z.object` sin `.strict()` ya descarta en silencio los campos que no declara, así que la indicación llega y se ignora sin romper la validación, que es exactamente lo que pide FR-010 ("no debe alterar la regla") sin construir un flujo nuevo.

`MyAccess` (`{ user, roles }`) no cambia de forma.

## `OperatorAccess` y `AccessDecision` (`features/auth/policy/types.ts`)

```ts
export interface OperatorAccess {
  readonly user: PlatformUser;
  /** Roles activos del usuario, de cualquier tipo. */
  readonly roles: readonly AccessRole[];
  /** Los de tipo Sistema: solo sus permisos cuentan dentro del Backoffice. */
  readonly authorizedRoles: readonly AccessRole[];
  readonly permissions: ReadonlySet<string>;
}

export type AccessDecision =
  | { readonly kind: 'granted'; readonly access: OperatorAccess }
  | { readonly kind: 'denied' };               // SIMPLIFICADO: sin `reason` (research D2)
```

`AccessDeniedReason` se elimina del módulo (y de todo lo que lo importaba).

## `OperatorAccessState` (`features/auth/hooks/useOperatorAccess.ts`)

```ts
export type OperatorAccessState =
  | { readonly status: 'resolving'; readonly accountEmail: string | null }
  | { readonly status: 'failed'; readonly refetch: () => void; readonly accountEmail: string | null }
  | { readonly status: 'denied'; readonly accountEmail: string | null }   // sin `reason`
  | { readonly status: 'granted'; readonly access: OperatorAccess; readonly accountEmail: string | null };
```

## `AppSettings` (`app/providers/AppSettingsProvider.tsx`)

```ts
export interface AppSettings {
  readonly dashboardRefreshMs: number;
  /** FR-015: URL de la aplicación de MailySoft para clínicas, o `undefined` sin configurar. */
  readonly mailySoftAppUrl: string | undefined;
}
```

Se construye una vez por build a partir de `env.VITE_MAILYSOFT_APP_URL` (sin transformación, a diferencia de `dashboardRefreshMs`, que convierte minutos a milisegundos).

## `AppEnv` (`app/config/env.ts`)

Nueva variable, opcional:

| Variable | Regla | Por defecto |
|---|---|---|
| `VITE_MAILYSOFT_APP_URL` | URL absoluta `http(s)`; `https` obligatorio fuera de desarrollo; sin espacios ni `\`; **admite barra final** (no es una base de API) | sin definir → el enlace no aparece (FR-015) |

## Entidades de la especificación → su forma en código

| Entidad (spec) | Dónde vive | Nota |
|---|---|---|
| Consulta de acceso | `MyAccess` (`myAccess.ts`) | Sin cambio de forma, solo el `type` de cada rol. |
| Usuario de MailySoft | `PlatformUser` (`features/users`) | Sin cambios. |
| Rol | `AccessRole` (arriba) | Gana `type`. |
| Tipo de rol | `roleTypeSchema` (estructura) + `ROLE_TYPE`/`isSystemRoleType` (`auth/policy/roleTypes.ts`, el reconocimiento) | El reconocimiento vive en política, no en el esquema (research D1). |
| Decisión de acceso | `AccessDecision` (arriba) | Pierde el motivo. |
| Cuenta del proveedor de identidad | `OperatorClaims` (`operatorClaims.ts`) | Sin cambios. |

## Flujo de datos de `/access-denied`

```
VITE_MAILYSOFT_APP_URL ──▶ env.ts (Zod) ──▶ AppSettingsProvider.mailySoftAppUrl
                                                        │
                                                        ▼
useOperatorAccess() ──▶ AccessDeniedRoute ──▶ (prop) ──▶ AccessDeniedPage
   │ accountEmail                                         │ email
   │ status                                                │ mailySoftAppUrl
   ▼                                                        ▼
switch(status): resolving/failed/granted/denied   título fijo + mensaje fijo +
                                                    "Iniciaste sesión como {email}" (si hay) +
                                                    LogoutButton + enlace (si hay URL)
```
