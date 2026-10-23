# Quickstart: Módulos (013-manage-modules)

Guía de validación manual, igual estilo que `specs/012-configure-subscription-plans/quickstart.md`.
Los escenarios automatizados (Vitest + RTL + axe) corren en CI; esta pasada es manual, como cierre
de la feature. Requiere una cuenta con los cuatro permisos `modules:*` para los pasos W1 a W16, y una
sin `modules:read` para W5.

**Preparación**: `npm run dev`, backend de `mailySoft-usuarios` corriendo en el puerto configurado
por `USERS_API_PROXY_TARGET` (o el simulador MSW en las pruebas automatizadas, que arranca con el
catálogo real de 23 módulos de las páginas 11 a 14 del mockup).

## Consultar (US1)

- **W1**: abrir `/modules`. Se ven dos grupos —"Sistema, pantallas del Backoffice · 8 módulos" y
  "Clínica, aplicación para clínicas · 15 módulos"—, cada módulo con su clave, su tipo y sus
  acciones exactas (p. ej. `dashboard`/Panel solo con Ver; `appointments`/Agenda y citas con las
  cuatro). `users`, `roles`, `permissions` y `modules` llevan la etiqueta "Base".
- **W2**: elegir el filtro Tipo = Sistema. Solo se ve ese grupo, con su conteo.
- **W3**: elegir el filtro Estatus = Bloqueados sin que exista ninguno. Se ve el aviso de que no hay
  módulos bloqueados (no un error).
- **W4**: escribir «agenda» en Buscar. Solo aparece "Agenda y citas".
- **W5**: entrar con una cuenta sin `modules:read`. "Módulos" no aparece en el menú ni se puede
  entrar escribiendo `/modules` directamente.

## Crear (US2)

- **W6**: pulsar "+ Nuevo módulo", elegir Tipo = Clínica, Nombre = "Inventario", Clave =
  `inventory`, marcar Ver y Modificar (dejar Crear y Eliminar sin marcar), guardar. El módulo
  aparece de inmediato en el grupo de Clínica con exactamente esas dos acciones.
- **W7**: repetir la alta con la misma clave `inventory` (o el mismo nombre "Inventario", cambiando
  mayúsculas). Se rechaza explicando que ya existe; no se crea nada.
- **W8**: en el formulario de alta, escribir una clave con mayúsculas o que empieza con un número.
  Se explica el formato esperado antes de poder guardar.
- **W9**: crear un módulo sin indicar el orden. Queda al final de todos los módulos existentes
  (compararlo contra el mayor `sortOrder` real de toda la lista, no solo el de su grupo).

## Modificar (US3)

- **W10**: editar `appointments` (Agenda y citas): cambiar su descripción y su orden. Se guarda; su
  clave y su tipo siguen mostrándose como información fija, nunca como campos editables.
- **W11**: en el mismo módulo, marcar una acción que no tenía. Queda disponible de inmediato en la
  lista de acciones de esa fila.
- **W12**: desmarcar una acción que sí tenía. Antes de guardar se pide confirmar, nombrando el
  módulo y la acción (research D9); al confirmar, la acción desaparece de esa fila.
- **W13**: editar el módulo base `users` (Usuarios). Su nombre, descripción y orden se pueden
  cambiar igual que cualquier otro módulo.

## Bloquear, desbloquear y eliminar (US4, US5)

- **W14**: bloquear `inventory` (creado en W6). Desaparece del filtro Activos y aparece con el
  filtro Bloqueados; sus acciones dejan de figurar como permisos activos. Desbloquearlo lo devuelve
  a como estaba.
- **W15**: en el panel de edición de `users`, `roles`, `permissions` o `modules`, comprobar que no
  hay forma de bloquearlos ni eliminarlos (la opción no está disponible, con una explicación).
- **W16**: eliminar `inventory`. Desaparece de toda lista y consulta; después, crear un módulo nuevo
  con la misma clave `inventory` se permite.

## Accesibilidad (cierre)

- **W17**: recorrer los filtros, la tabla y los tres estados del panel (vacío, Editar, Nuevo módulo)
  solo con teclado, a 1024 px y a 320 px; sin violaciones de axe en ninguno de los tres.
