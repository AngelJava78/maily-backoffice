# Contrato HTTP: lo que cambia en el servicio de módulos (versión 5.4.0)

**Fuente de verdad**: el contrato del servicio de usuarios,
`mailySoft-usuarios/specs/017-module-submodules/contracts/` (`openapi-changes.md` y `error-catalog.md`),
versión **5.4.0** (commit `2e17ecb`). Este documento resume solo lo que el Backoffice consume y cómo lo
traduce; sigue vigente
[../../013-manage-modules/contracts/modules-service.md](../../013-manage-modules/contracts/modules-service.md)
para todo lo demás. Las rutas exactas se quedan en la capa `api` (`modulesApi.ts`).

**Orden de despliegue**: el Backoffice exige la 5.4.0 (el campo `parent_module` es obligatorio en toda
respuesta que muestra un módulo). Primero se despliega el servicio y después el Backoffice.

## 1. Respuesta de un módulo (`ModuleRead`)

Gana un campo, **obligatorio y anulable**:

```text
parent_module: null | { id: entero ≥ 1, key: texto, name: texto }
```

`null` = módulo de primer nivel; si no es `null` es un submódulo, y su padre es siempre de primer
nivel y del mismo tipo. Lo llevan `GET /api/v1/modules`, `POST`, `PATCH`, `POST …/block` y
`POST …/unblock`. `PermissionRead.module` **no cambia** (por eso `roles` y `subscriptions` no se
tocan).

## 2. Operaciones que usa el Backoffice

| Operación | Cambio | Uso en esta feature |
|---|---|---|
| `GET /api/v1/modules?status_id=` | Devuelve módulos de primer nivel y submódulos juntos, sin paginar (hasta ~200), cada uno con su `parent_module`. Un submódulo con el padre Bloqueado **no está disponible**: no sale entre los Activos y, entre los Bloqueados, solo si él mismo lo está | La única consulta del árbol (research D1) |
| `POST /api/v1/modules` | El cuerpo admite `parent_module_id` (opcional; sin él o con `null`, de primer nivel). Respuestas nuevas: 404 `module_parent_not_found` y 409 de jerarquía | Alta con padre |
| `PATCH /api/v1/modules/{id}` | El cuerpo admite `parent_module_id`: un número asigna o cambia el padre; `null` lo quita; si no viaja, no cambia | Asignar, cambiar y quitar el padre |
| `DELETE /api/v1/modules/{id}` | 409 `module_has_submodules` si tiene submódulos no eliminados (Activos o Bloqueados) | Aviso de eliminación |
| `POST …/block`, `POST …/unblock` | Sin cambios de contrato; bloquear un padre deja a sus submódulos sin disponibilidad, desbloquearlo los devuelve | Aviso de bloqueo y lista |

**No se usan** los filtros nuevos de la lista `parent_module_id` y `top_level`: la consulta única ya trae
la jerarquía completa.

**Qué no hace el Backoffice con el padre**: nunca ofrece un padre Bloqueado (el servicio lo admite),
nunca envía `parent_module` (el servicio lo rechaza: 422) y nunca envía `parent_module_id` si no cambió.

## 3. Cuerpos

```text
POST   { key, name, type_id, description?, sort_order?, parent_module_id? }
PATCH  { name?, description?, sort_order?, parent_module_id? }     // al menos un campo; key y type_id jamás
```

## 4. Errores y cómo se muestran

El código (`code`) del servicio decide; el texto del servicio nunca se muestra (constitución IV). Los
textos son de `shared/messages/es.ts`, bloque `modules.errors`.

| Código (estado) | Operaciones | Resultado en pantalla | Texto |
|---|---|---|---|
| `module_parent_not_found` (404) | alta, edición | Error en «Módulo padre»; el formulario conserva lo escrito; el catálogo se refresca | «El módulo padre ya no existe o fue eliminado. Elige otro.» |
| `module_parent_is_submodule` (409) | alta, edición | Error en «Módulo padre» | «Ese módulo ya es un submódulo y no puede ser padre: la jerarquía tiene un solo nivel. Elige otro.» |
| `module_parent_type_mismatch` (409) | alta, edición | Error en «Módulo padre» | «El módulo padre debe ser del mismo tipo (Sistema o Clínica) que este módulo.» |
| `module_parent_self_reference` (409) | edición | Error en «Módulo padre» | «Un módulo no puede ser su propio módulo padre.» |
| `module_protected` (409) | alta, edición | Error en «Módulo padre» (el módulo o el padre es uno de los cuatro módulos base) | «Los módulos base de administración (Usuarios, Roles, Permisos y Módulos) no pueden ser módulos padre ni submódulos.» |
| `module_has_submodules` (409) | edición | Error en «Módulo padre» (el módulo tiene submódulos que no se ven y quiso hacerlo submódulo) | «Este módulo tiene submódulos y no puede pasar a ser submódulo: la jerarquía tiene un solo nivel.» |
| `module_has_submodules` (409) | eliminación | Aviso de error (`notify`) y no se elimina nada | «Este módulo tiene submódulos y no se puede eliminar: primero elimínalos o cámbialos de padre.» |
| `validation_error` (422) con el campo `parent_module_id` | alta, edición | Error en «Módulo padre» | «Elige un módulo padre válido.» |
| `module_protected` (409) | bloqueo, eliminación | Sin cambios: el aviso de siempre | (el de 013) |

Con cualquiera de ellos, las consultas del catálogo se invalidan (research D13). El resto de los
códigos (`module_not_found`, `module_key_already_exists`, `module_name_already_exists`,
`module_already_blocked`, `module_already_active`, 403, 5xx) se tratan como hasta ahora.

## 5. Garantías del servicio en las que se apoya la interfaz

- **Un solo nivel y mismo tipo**: el servicio los impone; la interfaz solo evita ofrecer lo que sabe que
  se rechazará (FR-010) y trata los datos inesperados sin fallar (research D3).
- **Los módulos base** (`users`, `roles`, `permissions`, `modules`) no son padres ni submódulos.
- **Una solicitud rechazada no cambia nada**, tampoco los demás campos que traiga (todo o nada), así
  que el formulario puede conservar lo escrito y volver a intentarlo.
- **El `key` es único en todo el catálogo** y el de un submódulo no incluye el de su padre
  (`prescriptions`, no `patients.prescriptions`): ninguna validación nueva en el formulario.
