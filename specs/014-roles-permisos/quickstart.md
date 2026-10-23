# Guía de validación: Roles y permisos

**Feature**: `014-roles-permisos` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Requisitos previos

| Requisito | Detalle |
|---|---|
| `mailySoft-usuarios` corriendo en local | Mismo servicio que ya usan las specs 002 y 006 (`VITE_USERS_API_URL`, por omisión `http://127.0.0.1:8000/api/v1`); ya debe estar levantado con su base `create_database.sql` aplicada. No hace falta ninguna migración nueva para esta feature. |
| Cuenta A1 (Administrator) | Verificado en `project-definition/bootstrap_admin.sql`: ya tiene, en el backend, los 16 permisos `users:*`, `roles:*`, `permissions:*` y `modules:*`. En cuanto el frontend reconoce el recurso de política `roles` (esta feature), A1 ve y administra "Roles y permisos" sin tocar nada en el backend. |
| Cuenta A4 (Developer, sin permisos) | De la spec 001 (quickstart), para el escenario de acceso denegado. |
| Dependencias | Ninguna nueva (research D1): `npm ci` basta. |

## Datos reales ya sembrados (sin seeding adicional)

`create_database.sql` ya trae 9 roles y 4 módulos (los únicos que existen hoy):

| Tipo | Roles | Módulos | Permisos resolubles |
|---|---|---|---|
| Sistema | Administrator, Developer, Support, Marketing, Billing | Usuarios, Roles, Permisos, Módulos (4) | 16 (`users\|roles\|permissions\|modules` × Ver/Crear/Modificar/Eliminar) — Administrator los tiene los 16 concedidos; los demás, 0. |
| Clínica | Owner, Doctor, Nurse, Receptionist | *(ninguno todavía)* | 0 — la matriz de cualquier role de Clínica se ve vacía hasta que exista la futura spec "Módulos" (edge case de spec.md, no es un error). |

Con esto ya alcanza para validar casi todos los escenarios siguientes, sin preparar nada más.

## 1. (Opcional) Sembrar uno o dos módulos de Clínica, para ver la tabla "rica" del mockup

Solo para explorar visualmente una matriz con varias filas desiguales (como las páginas 15-18 del PDF); ningún escenario de abajo lo requiere. Desde la base de `mailySoft-usuarios`:

```sql
BEGIN;

INSERT INTO modules (key, name, sort_order, type_id) VALUES
  ('patients', 'Pacientes', 50, 2),
  ('appointments', 'Agenda y citas', 60, 2),
  ('reminders', 'Recordatorios', 70, 2);

-- `patients:read`, `appointments:write`, etc. ya existían como filas de `permissions` sin módulo
-- (research D3); no se sabe con certeza si el disparador de alta de `modules` las re-resuelve solo
-- con crear el módulo, así que se fuerza aquí mismo, sin depender de eso:
UPDATE permissions p
SET module_id = m.id, action_id = a.id
FROM modules m, actions a
WHERE m.key IN ('patients', 'appointments', 'reminders')
  AND p.name = m.key || ':' || a.key;

-- Para "Recordatorios" se borran Crear y Eliminar, a propósito, para reproducir el mockup
-- (una fila con menos columnas que las demás):
DELETE FROM permissions WHERE name IN ('reminders:write', 'reminders:delete');

COMMIT;

SELECT name, module_id, action_id FROM permissions WHERE name LIKE 'patients:%' OR name LIKE 'appointments:%' OR name LIKE 'reminders:%';
```

## 2. Ejecutar la aplicación

```powershell
cd C:\Maily\code\maily-backoffice
npm ci
npm run dev
```

## 3. Escenarios de validación

Se entra con A1, salvo que se indique otra cuenta.

| # | Spec | Pasos | Resultado esperado |
|---|---|---|---|
| W1 | FR-002 | Mirar el menú superior completo. | Panel, Roles y permisos, Usuarios, Suscripciones, Token, en ese orden (FR-002; Módulos y Clínicas todavía no son secciones). |
| W2 | US1-1, FR-003 | Abrir "Roles y permisos". | Pestaña Clínica seleccionada por defecto, con Owner, Doctor, Nurse y Receptionist; al elegir cualquiera, su tabla de permisos se ve vacía (sin filas), no como un error (edge case de spec.md). |
| W3 | US1-2, FR-005, FR-006, FR-007 | Cambiar a la pestaña Sistema, elegir "Administrator". | Tipo "Sistema" (no editable); "16 de 16 permisos"; cuatro filas (Usuarios, Roles, Permisos, Módulos), cada una con las cuatro columnas Ver/Crear/Modificar/Eliminar, todas marcadas. |
| W4 | US1-2 | Elegir "Developer". | "0 de 16 permisos"; mismas cuatro filas, ninguna celda marcada. |
| W5 | US1-3, US1-4, FR-008 | En el detalle de Developer, marcar "Crear" en la fila Roles. Después desmarcar "Ver" de esa misma fila. | Al marcar Crear, Ver se marca solo. Al desmarcar Ver, Crear se desmarca con él. |
| W6 | US1-5, FR-009 | Marcar la casilla "Todo el módulo" de la fila Permisos. | Ver, Crear, Modificar y Eliminar de esa fila quedan marcados a la vez. |
| W7 | US1-6, US1-7, FR-010, SC-006 | Pulsar "Guardar cambios". Recargar la página (F5) y volver a abrir Developer. Marcar otra celda sin guardar y pulsar "Descartar cambios". | Tras guardar y recargar: "4 de 16", con Permisos completo. El contador se actualiza sin recargar al guardar. Tras descartar: la tabla vuelve a "4 de 16", sin la celda que se marcó sin guardar. |
| W8 | US2-1, FR-011 | "Nuevo role": nombre "Soporte Nivel 2", tipo Sistema, sin tocar la tabla ni "Copiar permisos de". "Crear role". | Se crea con "0 de 16 permisos" y aparece en la lista de la pestaña Sistema. |
| W9 | US2-2, FR-012 | "Nuevo role": tipo Sistema, "Copiar permisos de" → Administrator. "Crear role". | La tabla se precarga igual que la de Administrator (16 marcadas) antes de guardar; el role creado queda con "16 de 16". |
| W10 | US2-3, FR-006 | Al crear un role de tipo Clínica, abrir "Copiar permisos de". | Solo aparecen Owner, Doctor, Nurse y Receptionist; ningún role de Sistema. |
| W11 | US2-4, FR-013 | "Nuevo role" con el nombre "Owner" (ya existe, de tipo Clínica) pero tipo Sistema. Intentar guardar. | Error en el campo nombre: ya existe un role con ese nombre — se rechaza aunque el existente sea de otro tipo (unicidad global). |
| W12 | US4, FR-014 | Abrir "Soporte Nivel 2" (de W8) y pulsar "Duplicar". | Se crea un role nuevo, mismo tipo (Sistema) y mismos permisos (0 de 16), con el nombre listo para editarse de inmediato; cambiar sus permisos no afecta a "Soporte Nivel 2". |
| W13 | US3-1, US3-2, FR-015 | Abrir el duplicado de W12 y pulsar "Eliminar role"; confirmar. | Aviso de que la acción no se puede deshacer antes de confirmar; tras confirmar, el role desaparece de la lista. |
| W14 | US3-3, FR-015, edge case | Abrir la confirmación de eliminar de cualquier role y cerrarla sin confirmar. | No se elimina nada. |
| W15 | SC-005, FR-001 | Cerrar sesión y entrar con A4 (sin permisos). Intentar ir a `/roles` escribiendo la URL. | "Roles y permisos" no aparece en el menú; la ruta no muestra su contenido (redirección de `RequirePermission`, igual que en Usuarios/Suscripciones). |

## Lo que esta guía no cubre manualmente

El manejo de fallos parciales al guardar permisos o al crear copiando/duplicando (research D6, D7; FR-018, FR-019) no es práctico de reproducir a mano de forma confiable (requiere que una de varias llamadas falle y otras no): se verifica con pruebas de componente (MSW forzando una respuesta de error en una de las asociaciones) en `/speckit-implement`, no aquí.
