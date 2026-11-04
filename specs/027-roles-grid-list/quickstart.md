# Quickstart: validar la tabla de roles y su pantalla de detalle

**Feature**: `027-roles-grid-list` | **Plan**: [plan.md](plan.md)

## 1. Comprobaciones automáticas

```bash
npm run typecheck
npm run lint
npm run format:check
npm test -- src/features/roles src/app/router/roles src/app/layouts --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000
npm run build
npm run size
```

Esperado: todo en verde; `size` dentro del presupuesto de 320 KB gzip de la ruta de entrada (las dos
pantallas de Roles son diferidas y la rejilla ya la cargan otras rutas). Con `src/features/roles` en
la ruta de las pruebas, la cobertura de `schemas` y `hooks` debe seguir ≥ 80 %.

E2E (solo con cuentas de prueba de Auth0 configuradas, `E2E_AUTH0_USER_A1`/`_PASSWORD_A1`):

```bash
npm run test:e2e -- e2e/roles.spec.ts
```

## 2. Recorrido manual

**Requisitos**: el Backoffice con `VITE_USERS_API_URL` apuntando a una API de usuarios cualquiera
(esta feature no necesita cambios en ella; ver [research.md · D1](research.md)), y una persona con
`roles:read`, `roles:write`, `roles:update` y `roles:delete`. Hacen falta **más de 10 roles activos**
para ver la paginación: si el entorno tiene menos, crear los que falten con nombres `QA role 027 …` y
eliminarlos al terminar. Tener al menos un role bloqueado de cada tipo.

| # | Paso | Resultado esperado | Requisitos |
|---|---|---|---|
| V1 | Abrir `/roles` | Título «Roles y permisos» con «Nuevo role» a la derecha, grupos «Tipo» y «Estatus» con «Todos» y «Activos» pulsados y una tabla a todo lo ancho; ni lista a la izquierda ni panel ni «Elige un role…» | US1-1, FR-001 |
| V2 | Mirar las filas | Columnas Nombre, Estatus, Tipo y Permisos, en ese orden: nombre como enlace, «Activo», «Sistema» o «Clínica» y «n permisos» («1 permiso»); sin Descripción ni Fecha de alta | US1-2, FR-002, FR-003 |
| V3 | Comparar con la tabla de Usuarios, en tema claro y oscuro | Mismo encabezado, separadores, enlace, resaltado y pie; solo cambia el contenido | US1-5, FR-006, SC-004 |
| V4 | Mirar el encabezado | No ofrece ordenar, filtrar ni menú de columna; no hay buscador de texto | US1-6, FR-005 |
| V5 | Usar las flechas del pie y cambiar «Filas por página» a 25 y a 10 | Cambia la página y el rango («11–12 de 12»); nunca hay más filas que las elegidas; al cambiar el tamaño vuelve a la página 1; la dirección escribe `page` y `page_size` | US1-3, US1-4, FR-004, FR-008, FR-018 |
| V6 | Pulsar «Sistema», «Clínica», «Todos» y «Bloqueados», en una página posterior a la primera | Cada vez, exactamente los roles de la combinación, con su total y su rango, y de vuelta en la página 1 | US1-7, FR-007, US4-2 |
| V7 | Con «Bloqueados» | Cada fila dice «Bloqueado» y «—» en Permisos; en la pestaña Red, ninguna petición a `/roles/{id}/permissions` | US1-8, FR-003, SC-004 de la 025 |
| V8 | Un filtro sin roles (p. ej. «Clínica» + «Bloqueados» sin ninguno) y, con una persona sin `roles:write`, el mismo | Mensaje del caso (`No hay roles bloqueados.`, etc.); «Nuevo role», junto al título, a la vista con cualquier filtro y solo con permiso, y el botón de dentro del mensaje solo en «Activos»; los filtros siguen | US1-9, FR-009 |
| V9 | Con la red bloqueada para `/api/v1/roles`, abrir `/roles` | Error «No se pudieron cargar los roles» con «Reintentar», sin ocultar título, filtros ni «Nuevo role»; al reintentar con red, la tabla | US1-10, US1-11, FR-009 |
| V10 | Hacer fallar `GET /roles/{id}/permissions` de un solo role | Su celda de Permisos dice «—» y el resto de la fila y de la tabla funciona | US1-12, FR-003 |
| V11 | Pulsar el nombre de un role activo (ratón y teclado: Tab hasta el nombre y Enter) | Pantalla propia con el nombre como título y «Volver al listado»; sin tabla; el foco en el título | US2-1, FR-011, US5-1 |
| V12 | En ese detalle, cambiar un permiso y «Guardar cambios» | Igual que en la 023 y la 025: contador «X de Y permisos», aviso «Cambios guardados.» | US2-2, FR-011, SC-003 |
| V13 | «Volver al listado» y, en otra visita, Atrás del navegador | La misma tabla: mismos filtros, página y tamaño | US2-3, FR-013, SC-002 |
| V14 | Con una persona sin `roles:update`, abrir un role | Campos y botones de permisos de solo lectura; sin las acciones que no le tocan | US2-4 |
| V15 | Con «Bloqueados», pulsar el nombre de un role | Detalle con descripción, tipo, «Estatus: Bloqueado», la explicación y «Desbloquear role» (con `roles:update`); sin permisos ni guardar/duplicar/eliminar; sin error | US2-5, FR-012 |
| V16 | Abrir `/roles/999999` y `/roles/abc` | «Este role ya no existe» con «Volver al listado»; y «Página no encontrada» | US2-6, FR-014 |
| V17 | Con «Bloqueados» y página 2, «Nuevo role»: crear un role de Sistema | Se abre su detalle; «Volver al listado» **y** Atrás llevan a «Activos» (Tipo solo si hacía falta), en la página donde está, con el role a la vista | US3-1 a US3-3, FR-015, FR-017, SC-007 |
| V18 | En ese role, «Duplicar» | Se abre el detalle de la copia con el foco en «Nombre»; «Volver al listado» muestra la copia | US3-4, FR-015, FR-017 |
| V19 | «Bloquear role» (confirmar) | Vuelve a la tabla con los mismos filtros, aviso «… Ahora está en «Bloqueados».», el foco en el título; el role ya no está en «Activos» | US3-5, FR-016, SC-008 |
| V20 | En «Bloqueados», abrir ese role y «Desbloquear role» | Vuelve a la tabla, aviso «… Ahora está en «Activos».», foco en el título; aparece en «Activos» | US3-6, FR-016, SC-008 |
| V21 | Eliminar un role (confirmar), y repetir con cambios sin guardar en el formulario | Vuelve a la tabla y el role no está; con cambios pendientes no pregunta tras eliminar | US3-7, FR-016, D9 |
| V22 | Hacer fallar bloquear o eliminar (p. ej. el role ya no existe desde otra sesión) | La persona se queda en el detalle con el mensaje de error y puede reintentar | US3-8 |
| V23 | Recargar con filtros, página y tamaño elegidos; abrir `/roles?type=xyz&page=0&page_size=7`; abrir `/roles?page=99` | Mismo estado tras recargar; los valores no válidos se reescriben a los de omisión sin error; la página 99 se corrige a la última | US4-1, US4-3, FR-018 |
| V24 | Abrir los enlaces antiguos `/roles?type=clinica`, `/roles?roleId={id activo}`, `/roles?type=sistema&status=bloqueados&roleId={id bloqueado}` y `/roles?roleId=007` | Tabla de Clínica; el detalle de ese role (el bloqueado, con su explicación); y la tabla sin error. «Volver al listado» regresa a los filtros del enlace | US4-4, US4-5, FR-019, SC-005 |
| V25 | Con un role abierto y cambios sin guardar, probar «Volver al listado», el menú de secciones y Atrás | Aviso «Tienes cambios sin guardar»; «Quedarme» conserva la edición; «Descartar y continuar» sale | US4-6, FR-020, SC-006 |
| V26 | Teclado y lector de pantalla | Tab llega a cada nombre y al pie; el lector dice el nombre de la tabla, los encabezados y, al paginar o filtrar, «Mostrando 1 a 10 de 12 roles.»; el foco y el título de la pestaña cambian con la pantalla | US5-1 a US5-4, FR-021, FR-022, SC-009 |
| V27 | Ventana de 320 px | Sin scroll horizontal de la página; la rejilla se desplaza por dentro; el pie conserva «Filas por página» en varias líneas; filtros y «Nuevo role» sin texto cortado | US5-5, FR-023 |
| V28 | Pestaña Red al abrir `/roles` con 12 roles activos y página de 10 | Una petición `GET /roles` y 10 de permisos (no 12); abrir un role de la página no repite la suya | SC-010, D4 |
