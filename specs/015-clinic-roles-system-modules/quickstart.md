# Guía de validación: Permisos de Módulos de Sistema para Roles de Clínica (Backoffice)

**Feature**: `015-clinic-roles-system-modules` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Requisitos previos

| Requisito | Detalle |
|---|---|
| `mailySoft-usuarios` corriendo en local, con su propia feature `015` aplicada | La migración `0010_clinic_roles_system_modules.py` de ese repositorio (par (Clínica, Sistema) en `role_type_module_types`) ya debe estar aplicada (`alembic upgrade head`); sin ella, el backend sigue rechazando con 409 lo que esta guía da por aceptado. |
| Cuenta A1 (Administrator) | Misma cuenta que ya usa la spec `014` (`roles:update`, entre otros). Administra "Roles y permisos" sin iniciar sesión como ningún role de Clínica. |
| Dependencias | Ninguna nueva: `npm ci` basta (sin paquetes nuevos, research R1-R4). |

## Datos reales ya sembrados (sin seeding adicional para lo esencial)

Al momento de escribir la spec `014` (mismo día), el entorno local solo tenía módulos de tipo
Sistema (Usuarios, Suscripciones, Panel, Token, Roles, Permisos) y **ningún módulo de tipo Clínica
todavía**; los roles de Clínica (Owner, Doctor, Nurse, Receptionist) mostraban su matriz vacía. Esto
ya alcanza para validar FR-001/FR-002/FR-003 (W1-W2 abajo): antes de esta feature, un role de
Clínica no mostraba ninguna fila; después, muestra las de Sistema.

## 1. (Necesario solo para ver el agrupamiento de FR-004/US2, W3) Sembrar un módulo de Clínica

Sin al menos un módulo de Clínica, la matriz de cualquier role de Clínica solo tiene filas de
Sistema (un único tipo presente) y, por diseño (FR-005, [data-model.md](data-model.md)), no se
muestra ningún encabezado de grupo — no hay nada que agrupar todavía. Para ver los dos encabezados a
la vez, sembrar al menos uno (ya usado como ejemplo en el quickstart de la `014`):

```sql
-- Desde la base de datos de mailySoft-usuarios
BEGIN;

INSERT INTO modules (key, name, sort_order, type_id) VALUES ('patients', 'Pacientes', 50, 2);

UPDATE permissions p
SET module_id = m.id, action_id = a.id
FROM modules m, actions a
WHERE m.key = 'patients' AND p.name = m.key || ':' || a.key;

COMMIT;
```

## 2. Ejecutar la aplicación

```powershell
cd C:\Maily\code\maily-backoffice
npm ci
npm run dev
```

## 3. Escenarios de validación

Se entra con A1.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| W1 | FR-001, US1-1 | Pestaña Clínica → "Owner" (sin el módulo de Pacientes sembrado, o antes de sembrarlo). Marcar "Usuarios: Crear" en la matriz y "Guardar cambios". | La tabla ya no está vacía: muestra las filas de Sistema (Usuarios, Suscripciones, Panel, Token, Roles, Permisos). El guardado no muestra ningún error; "Usuarios: Ver" queda marcado también (FR-008, ya existente); el contador "X de Y" sube en 2. |
| W2 | FR-002, US3, no regresión | Pestaña Sistema → "Developer". Abrir su matriz. | Solo módulos de Sistema entre sus filas, exactamente igual que antes de esta feature; ningún módulo de Clínica aparece. |
| W3 | FR-004, US2 (requiere el Paso 1) | Con "Pacientes" ya sembrado, pestaña Clínica → "Owner" (ya con el permiso de W1). | Dos encabezados de grupo: "Módulos de Clínica" (con la fila "Pacientes") y "Módulos de Sistema" (con Usuarios, Suscripciones, Panel, Token, Roles, Permisos); el permiso marcado en W1 sigue marcado, bajo "Módulos de Sistema". |
| W4 | FR-005, no regresión | Pestaña Sistema → cualquier role. | Una sola lista de filas, sin ningún encabezado de grupo — igual que se veía antes de esta feature. |
| W5 | FR-008, US1-3 | Duplicar el role "Owner" (con el permiso de Sistema de W1). | El role nuevo (tipo Clínica) recibe ese permiso de Sistema también (y el de Pacientes, si ya estaba sembrado), sin ningún rechazo por incompatibilidad de tipos. |
| W6 | FR-003 (revisión documental, no manual) | Revisar `specs/014-roles-permisos/spec.md`. | El FR-006 ya no dice "módulos del mismo tipo que el role... y viceversa"; describe la regla asimétrica, con una nota de que esta spec lo sustituyó. |

## Lo que esta guía no cubre manualmente

Forzar un 409 `role_permission_module_type_conflict` en la dirección que sigue prohibida (un
permiso de un módulo de Clínica hacia un role de Sistema) no es práctico desde la UI real: la matriz
de un role de Sistema nunca ofrece un módulo de Clínica para marcar, así que no hay manera de
intentarlo a mano sin herramientas externas a la pantalla. Se verifica con las pruebas de
`useRolePermissionMatrix` y `PermissionsMatrix` (research R5), no aquí.
