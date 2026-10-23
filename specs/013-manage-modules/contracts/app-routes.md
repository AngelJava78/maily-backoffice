# Contract: Ruta, navegación y pantalla de Módulos

## Ruta

- `/modules`, protegida por `<RequirePermission resource="modules">` (igual patrón que `/users` y
  `/subscriptions` en `src/app/router/routes.tsx`), `handle.titleKey: 'modules'`. Sin rutas hijas:
  el alta y la edición son un panel de la misma pantalla (research D10), no páginas aparte.
- Componente cargado de forma perezosa (`React.lazy`), igual que el resto de las secciones
  (constitución, Rendimiento y observabilidad).

## Navegación

- `src/features/auth/policy/permissions.ts`: `SECTION_RESOURCES` gana `'modules'` como **primer**
  elemento (antes de `'users'`).
- `src/app/navigation/sections.ts`: el arreglo `sections` gana, como **primer** elemento,
  `{ id: 'modules', path: '/modules', labelKey: 'modules', resource: 'modules', icon: 'modules' }`.
  Orden final visible (de quien tenga los cuatro permisos): **Panel, Módulos, Usuarios,
  Suscripciones, Token** (FR-026). "Roles y permisos" y "Clínicas" no se agregan: no existen todavía
  como pantallas (ver spec.md, Assumptions).
- `src/shared/ui/iconRegistry.ts`: nueva entrada `modules: Blocks` (research D12).
- `src/shared/messages/es.ts`: `nav.sections.modules: 'Módulos'`.

## Parámetros de la dirección (`ModulesLocation`, ver [data-model.md](../data-model.md))

`?type_id=1|2&status_id=1|2&q=texto&edit=123` o `...&new=1`. Sin ningún parámetro: Todos los tipos,
Activos, sin búsqueda, sin panel abierto.

## Textos de la pantalla (`messages.modules`, es.ts)

- `title: 'Módulos'`, `subtitle: 'Las partes del sistema a las que se dan permisos. Los de Sistema
  son pantallas del Backoffice y los de Clínica, de la aplicación para clínicas.'`
- `newAction: '+ Nuevo módulo'`
- `filters.type: { all: 'Todos', system: 'Sistema', clinic: 'Clínica' }`,
  `filters.status: { active: 'Activos', blocked: 'Bloqueados' }`,
  `filters.search: 'Nombre o clave'`
- `count.active: (n: number) => \`${n} módulos activos\``,
  `count.blocked: (n: number) => \`${n} módulos bloqueados\``
- `groups.system: (n: number) => \`Sistema, pantallas del Backoffice · ${n} módulos\``,
  `groups.clinic: (n: number) => \`Clínica, aplicación para clínicas · ${n} módulos\``
- `columns: { order: 'Orden', module: 'Módulo', type: 'Tipo', permissions: 'Permisos', action:
  'Acción' }`, `baseBadge: 'Base'`
- `actions.read: 'Ver'`, `actions.write: 'Crear'`, `actions.update: 'Modificar'`,
  `actions.delete: 'Eliminar'`
- `panel.editTitle: 'Editar módulo'`, `panel.createTitle: 'Nuevo módulo'`,
  `panel.emptyState: 'Selecciona un módulo para editarlo, o crea uno nuevo.'`
- `form.fields`: `type`, `key`, `name`, `description`, `order` con sus textos de ayuda del mockup
  ("La clave y el tipo no cambian nunca.", "En español: es el que ve la gente en las pantallas.",
  "En inglés, por ejemplo inventory. La usa el código y no se puede cambiar después. Solo
  minúsculas, números y guion bajo.", "Opcional. Si lo dejas vacío, queda al final ({n})." con el
  número calculado en vivo, no fijo)
- `form.actionsHelp: 'Cada acción marcada es un permiso. Después se da a los roles en Roles y
  permisos.'`
- `form.uncheckActionConfirm: (action: string, module: string) => '...'` (research D9)
- `form.save: 'Guardar cambios'`, `form.discard: 'Descartar cambios'`,
  `form.create: 'Crear módulo'`, `form.cancel: 'Cancelar'`
- `blockSection.help: 'Bloquear lo oculta y quita el acceso sin borrar nada, y se puede
  desbloquear. Eliminar lo borra junto con sus permisos.'`, `blockSection.block: 'Bloquear módulo'`,
  `blockSection.unblock: 'Desbloquear módulo'`, `blockSection.delete: 'Eliminar módulo'`,
  `blockSection.protectedNotice: '...'` (por qué un módulo base no se puede bloquear ni eliminar)
- `errors.*`: ver [modules-service.md](modules-service.md)

## Accesibilidad

Mismo nivel que el resto de la aplicación (constitución VI): el grupo de filtros con sus etiquetas,
la tabla con encabezados de columna y de sección asociados correctamente, el panel con su propio
título como región con nombre accesible, los errores de formulario con `aria-describedby`, operación
completa por teclado, sin violaciones de axe en ninguno de los tres estados del panel.
