# Quickstart: validar la lista de roles con filtros y el bloqueo

**Feature**: `025-roles-type-status-filters` | **Plan**: [plan.md](plan.md)

## 1. Comprobaciones automáticas

```bash
npm run typecheck
npm run lint
npm run format:check
npm test -- src/features/roles src/app/router/roles src/test/handlers/usersDirectory src/test/handlers/rolesCatalog --maxWorkers=2 --testTimeout=60000 --hookTimeout=60000
npm run build
npm run size
```

Esperado: todo en verde; `size` dentro del presupuesto de 320 KB gzip de la ruta de entrada (la ruta
de Roles es diferida).

E2E (solo con cuentas de prueba de Auth0 configuradas, `E2E_AUTH0_USER_A1`/`_PASSWORD_A1`):

```bash
npm run test:e2e -- e2e/roles.spec.ts
```

## 2. Recorrido manual

**Requisitos**: el Backoffice con `VITE_USERS_API_URL` apuntando a una API de usuarios cualquiera
(esta feature no necesita la 5.4.0; ver [contracts/roles-status-service.md](contracts/roles-status-service.md)),
y una persona con `roles:read`, `roles:write`, `roles:update` y `roles:delete`. Tener al menos un role
de cada tipo.

| # | Paso | Resultado esperado | Requisitos |
|---|---|---|---|
| V1 | Abrir `/roles` | Título, grupos «Tipo» y «Estatus» con «Todos» y «Activos» pulsados; lista con roles de ambos tipos, cada uno con su tipo; ninguna pestaña | US1-1, FR-001, FR-002, FR-004, FR-006 |
| V2 | Pulsar «Sistema», luego «Clínica», luego «Todos» | Cada vez, solo los roles del tipo; la dirección cambia (`type=sistema`/`clinica`/sin `type`) | US1-2, US1-3, FR-005 |
| V3 | Pulsar de nuevo el botón ya pulsado | Sigue pulsado; nada cambia | FR-003 |
| V4 | Abrir un role de Sistema, bloquearlo («Bloquear role» → confirmar) | Confirmación que nombra el role y las consecuencias; al confirmar, aviso de éxito «… Ahora está en «Bloqueados».», el detalle se cierra, el role sale de Activos, el foco queda en el título | US3-3, US3-4, FR-013, FR-015, US5-3 |
| V5 | Cancelar la confirmación de V4 en otro role | No cambia nada; el foco vuelve a «Bloquear role» | US3-5, US5-3 |
| V6 | Pulsar «Bloqueados» | Solo el role bloqueado, sin «n permisos»; combinarlo con cada Tipo | US2-1, US2-2, US2-5, FR-006 |
| V7 | Elegir el role bloqueado | Nombre, descripción, tipo, «Estatus: Bloqueado» y la explicación; sin permisos ni acciones de guardar/duplicar/eliminar; sin error; en la pestaña Red del navegador, ninguna petición a `/roles/{id}/permissions` | US2-4, FR-012, SC-004 |
| V8 | «Desbloquear role» | Inmediato; aviso «… Ahora está en «Activos».»; en Activos, el role con el mismo nombre, descripción, tipo y número de permisos | US3-7, US3-8, FR-014, SC-006 |
| V9 | Con un role abierto con cambios sin guardar, intentar cambiar un filtro | Aviso de cambios sin guardar; «Bloquear role» deshabilitado mientras haya cambios | US4-5, US3-2, FR-007 |
| V10 | Recargar con filtros y un role elegidos; Atrás desde otra sección | Mismos filtros y role | US4-1, FR-008 |
| V11 | Abrir `/roles?type=clinica` y `/roles?type=sistema` (enlaces antiguos) | Abren ese tipo con Activos | US4-2, FR-009 |
| V12 | Abrir `/roles?type=xyz&status=otro` | Abre con los valores por omisión, sin error | US4-3 |
| V13 | Con «Clínica» + «Bloqueados», crear un role de Sistema | Queda elegido y visible: Estatus pasa a Activos y Tipo a Sistema | US4-6, FR-010 |
| V14 | Abrir `/roles?roleId={id de un role bloqueado}` | Mensaje de elegir un role, sin error | US4-7, FR-011 |
| V15 | Bloquear un role desde otra sesión y volver a intentarlo aquí | Aviso informativo «… ya estaba bloqueado…» y la lista se actualiza | US3-10, FR-016 |
| V16 | Sin `roles:update` | Mismos filtros y lista; sin «Bloquear role» ni «Desbloquear role» | US3-1, US3-6, SC-007 |
| V17 | Teclado y lector de pantalla | Tab entra a cada grupo, flechas entre botones, Espacio elige; se anuncian «Tipo»/«Estatus» y el estado pulsado | US5-1, US5-2, FR-021 |
| V18 | Ventana de 320 px | Filtros y acciones en varias líneas, sin scroll horizontal | US5-4, FR-022 |
| V19 | Comparar con Módulos | Los grupos son indistinguibles en forma, tamaño, tipografía y estado pulsado | FR-020, SC-011 |
