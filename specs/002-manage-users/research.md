# Investigación (Fase 0): Administración de Usuarios y Roles de Sistema

**Feature**: `002-manage-users` | **Fecha**: 2026-10-18 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Resuelve los puntos abiertos del Technical Context y fija las decisiones de diseño. Complementa [../001-auth-session-profile/research.md](../001-auth-session-profile/research.md): lo que no se repite aquí (React Router en modo de datos, Auth0, cliente HTTP, estrategia general de pruebas, CI) sigue como allí. Versiones y compatibilidades se consultaron en el registro de npm el 2026-10-18 y se comprobaron con una **prueba de concepto fuera del repositorio** que usa las versiones exactas del proyecto; los contratos del servicio se leyeron en su repositorio local (ver [contracts/users-service.md](contracts/users-service.md)).

## D1. Versiones y dependencias nuevas (verificado)

| Paquete | Versión | Licencia | Notas |
|---|---|---|---|
| @mui/x-data-grid | 9.15.0 | MIT | Peer `@mui/material ^7.3 \|\| ^9`, `@mui/system ^7.3 \|\| ^9`, React 17 a 19. El tag `latest` sigue en 8.29.5 (exige Material ≤ 7): se instala `9.15.0` de forma explícita, como anticipó la 001 (D1, D4). Solo funciones de la versión community. |
| react-hook-form | 7.90.0 | MIT | Peer React `^16.8 \|\| ^17 \|\| ^18 \|\| ^19`. Los tags `alpha` y `beta` (8.x) no se usan. |
| @hookform/resolvers | 5.9.2 | MIT | Peer `zod ^3.25 \|\| ^4` y `react-hook-form ^7.55`. |

No se añade ninguna otra dependencia. Las tres están en el «Stack obligatorio» de la constitución, así que no requieren justificación en Complexity Tracking.

**Evidencia** (prueba de concepto del 2026-10-18 con React 19.3.1, MUI 9.5.0, Zod 4.6.7, TypeScript 6.0.3, Vitest 5.0.5 y jsdom 30.1.3):

- 11 pruebas pasan: listado con paginación en servidor (siguiente página, tamaño de 25, localización, estado vacío), formulario con React Hook Form y Zod (errores por campo, valores recortados, error del servidor asignado a su campo) y verificaciones con axe sin violaciones (listado, formulario vacío y formulario con errores).
- `tsc --noEmit` con `strict`, `noUncheckedIndexedAccess` y `verbatimModuleSyntax` sin errores, incluido el tipado de `zodResolver` con Zod 4.
- Hallazgos que condicionan el diseño: (1) la localización del Data Grid se aplica **por el tema** (`createTheme(opciones, esES de Material, esES de '@mui/x-data-grid/locales')`); pasar `esES.components.MuiDataGrid.localeText` no existe: la forma es `...MuiDataGrid.defaultProps.localeText`, y sin el tema el pie sale en inglés; (2) con pocas columnas y filas jsdom pinta cabecera y filas **sin** `disableVirtualization`; (3) el selector de tamaño es un `combobox` etiquetado «Filas por página:»: en pruebas se usa `getByLabelText(/filas por página/i)` y la opción por su rol; (4) el pie sale en español («1–10 de 120», «Ir a la página siguiente»).
- Peso: el chunk perezoso con Data Grid, React Hook Form, el resolver y los componentes de MUI de los formularios pesa **239 KB gzip** (801 KB sin comprimir) en la prueba, **sin** compartir código con el resto de la aplicación; el build real pesará menos porque MUI ya está en la ruta de entrada. Se mide al implementar (D15).

## D2. Estructura de la feature y límites entre features

- **Decisión**: `features/users` se amplía con `api`, `components`, `hooks`, `policy` y `schemas` y su `index.ts` público. El catálogo de roles (R1) y las asociaciones usuario-rol (U10 a U12) viven en `users`, porque solo esta feature los usa y el producto no administra roles (constitución, Alcance); si otra feature los necesita, se extraerán entonces (YAGNI).
- **`users` no importa `auth`**. La 001 fijó `auth → users` (D18: `auth` usa `PlatformUser`); lo contrario crearía un ciclo `auth ↔ users`. El lint (`eslint-plugin-boundaries`) lo permite, pero `auth` construye esquemas al cargar con `platformUserSchema` y la evaluación de los módulos en ciclo es frágil. Por eso las pantallas reciben las **capacidades** y el id del operador como propiedades, y unos adaptadores finos en `app/router/users/` evalúan `useGrantedAccess()` y `getUserCapabilities()` y renderizan la pantalla perezosa. Es composición en la capa `app`, que puede importar ambas.
- **Alternativas descartadas**: un Context de capacidades dentro de `users` (copia a Context un estado derivado del servidor, lo que la constitución III prohíbe y que la 001 ya corrigió al quitar `GrantedAccessProvider`); mover `PlatformUser` a `shared` (pone una entidad de dominio en la capa genérica y toca unas 8 importaciones); permitir el ciclo.
- **La ruta de entrada no debe arrastrar las pantallas**: `auth`, que va en la ruta de entrada, importa de forma estática el `index.ts` de `users` (por `PlatformUser`). Si ese archivo reexportara las pantallas con importaciones estáticas, el Data Grid y los formularios podrían entrar en la ruta de entrada: el tree-shaking de un barril no es una garantía. Por eso `users/index.ts` expone las pantallas como **componentes perezosos** (`lazy(() => import('./components/…'))` dentro de la feature) y reexporta de forma estática solo lo ligero (esquemas, constantes, funciones puras y tipos). `app` las usa tal cual desde los adaptadores. La comprobación está en D15.
- **Cambios a código de la 001** (pequeños, en la primera tarea): `features/auth/policy/permissions.ts` incorpora `roles` a los recursos de permiso sin añadirlo a `SECTION_RESOURCES` (tipos `SectionResource` y `PermissionResource`); `SectionDefinition.resource` y `RequirePermission` pasan a `SectionResource`; nuevo `userCapabilities.ts`; `useRouteAccessibility` amplía las claves de título; las factorías de pruebas (`operatorAccess`) añaden los permisos de `roles`.
- **Tamaño de los componentes**: ninguno pasa de 250 líneas (constitución I): el listado, la tarjeta de búsqueda, el detalle, el panel de roles, las acciones de estatus, el formulario compartido y cada diálogo son componentes aparte.

## D3. Capacidades, políticas y autoprotección

- **Decisión**: la única decisión de permisos sigue siendo `can()`. Dos funciones puras la componen: `getUserCapabilities(access)` en `features/auth/policy` (el «único módulo de políticas», constitución V) y `getAvailableActions({ statusId, capabilities, isSelf })` en `features/users/policy`, que cruza lo que el **estatus** admite con las **capacidades** y con la **autoprotección**. Se escriben con prueba primero (constitución VII).
- **Permisos compuestos**: «Crear usuario» necesita tres (`users:write` para crearlo, `users:update` para asignar roles y `roles:read` para listarlos), porque el alta exige al menos un role (FR-025); «Agregar role», dos; quitar un role, uno. `can()` ya exige `users:read` para cualquier acción de la sección.
- **Autoprotección**: `isSelf` compara el id del usuario del detalle con el del operador (`OperatorAccess.user.id`). Es solo de interfaz: el servicio no la impone (spec, Assumptions), y por eso no se presenta como seguridad.
- **Alternativas descartadas**: comparar permisos o nombres de role sueltos en los componentes (constitución V); ocultar acciones sin explicar: en el detalle propio se muestra una nota (FR-012).

## D4. Tipos de la API: esquemas Zod escritos a mano

- **Decisión**: se mantienen esquemas Zod a mano a partir de [contracts/users-service.md](contracts/users-service.md); no se generan tipos con `openapi-typescript` (la 001, D12, pidió reevaluarlo en esta feature).
- **Razón**: la constitución II fija un único esquema Zod por entidad como fuente de verdad (los tipos salen de `z.infer`); generar tipos de TypeScript añadiría una segunda fuente. El OpenAPI vive en un repositorio privado ajeno, así que no estaría disponible en CI. La feature consume 13 operaciones con formas simples. Un generador de esquemas Zod añade una dependencia y un paso que depende de otro repositorio.
- **Mitigación del desvío de contrato**: la validación en la frontera convierte un desvío en un fallo explícito (`ApiError` de contrato) y el simulador de pruebas se mantiene fiel a este contrato. Se reevaluará cuando se consuman las APIs de clínicas y de suscripciones.

## D5. Rutas y estado de la URL

- **Decisión**: cuatro rutas (`/users`, `/users/new`, `/users/:userId`, `/users/:userId/edit`) en el router de datos, con un `ErrorBoundary` por ruta y pantallas con `React.lazy` ([contracts/app-routes.md](contracts/app-routes.md)). Los formularios son rutas y no diálogos, porque la constitución VI pide un formulario compartido para crear y editar.
- **Estado del listado en la URL** (constitución III): `page`, `page_size` y `email`, leídos con `parseUsersSearchParams` (Zod). En la URL `page` empieza en 1 y el Data Grid usa 0: la conversión ocurre en un solo lugar. Los valores inválidos se sustituyen por los de por defecto y la URL se normaliza con `replace`. Una página posterior a la última (por ejemplo, tras bloquear al último usuario de la última página) se reemplaza por la última.
- **`userId`**: solo dígitos y entero ≥ 1; otro valor muestra «Página no encontrada».
- **Volver al listado en la misma página** (US1-4): estado de navegación `listSearch` validado con Zod (solo `page`, `page_size`, `email`), con respaldo `/users`. Sobrevive a la recarga porque el estado del historial persiste. Alternativas descartadas: `navigate(-1)` (impredecible tras un enlace directo) y `sessionStorage` (una excepción de almacenamiento sin justificación; constitución V).

## D6. Listado con MUI X Data Grid

- **Decisión**: `paginationMode="server"`, `rowCount` = `total`, `paginationModel` derivado de la URL y `pageSizeOptions` [10, 25, 50]. Sin ordenar, filtrar ni menú de columnas: el servicio devuelve un orden fijo y no ofrece filtros (constitución IV: orden y filtros en servidor solo cuando el contrato lo permita). `disableRowSelectionOnClick`. El **nombre es un enlace** (`Link` de MUI con el enlace del router), que es operable con teclado y no duplica la interacción de la fila.
- **Estados**: carga con la propiedad `loading` del grid; vacío con `slots.noRowsOverlay` y la acción «Crear usuario» solo si la capacidad existe; error fuera del grid con `ErrorState` y «Reintentar»; éxito con filas de **nombre completo, correo y fecha de alta**.
- **Altura y desplazamiento**: `autoHeight` para que la tabla crezca con su página (como mucho 50 filas; la constitución, en Rendimiento, prohíbe renderizar más filas que el `page_size` vigente) y no haya un desplazamiento vertical anidado; en pantallas estrechas se desplaza en horizontal **dentro de su recuadro** (001, D20).
- **Localización**: por el tema (hallazgo 1 de D1). `src/app/theme/theme.ts` pasa a `createTheme(opciones, esES de Material, esES del Data Grid)`.
- **Carga diferida**: el listado es un chunk aparte; el detalle y los formularios no cargan el Data Grid.
- **Alternativa descartada**: `Table` de MUI con `TablePagination` (más ligera): la constitución VI exige el Data Grid community para los listados.

## D7. Búsqueda por correo

- **Decisión**: `GET /api/v1/users/by-email` (U2). El correo se valida en el cliente antes de consultar con las mismas reglas del alta (vacío o sin formato = error junto al campo y ninguna llamada). Un `404 user_not_found` es un **resultado vacío**, no un error: el `queryFn` lo traduce a `null` para que no pase por el estado de error ni por los reintentos. La clave usa el correo recortado y en minúsculas; la solicitud lleva el valor recortado (el servicio ignora mayúsculas y espacios). El resultado se muestra como una **tarjeta** con el estatus, no como un Data Grid de una fila, y se anuncia en una región `aria-live`.
- **Por qué**: el listado solo trae usuarios activos; esta búsqueda es la única forma de llegar a uno bloqueado o eliminado (spec US1, FR-018).
- **Alternativas descartadas**: filtrar en el cliente la página cargada (no encuentra inactivos y obliga a descargar colecciones, constitución IV); buscar por `auth0_id` (no lo conoce el operador); búsqueda parcial (fuera de alcance, el servicio no la ofrece).

## D8. Estado de servidor con TanStack Query

- **Decisión**: factorías de claves (`userKeys`, `roleKeys`) y la matriz de invalidación de [data-model.md](data-model.md). El listado usa `placeholderData: keepPreviousData`; las lecturas heredan `staleTime` de 30 s y los reintentos de la 001 (máximo 2, solo red y 5xx); las mutaciones no se reintentan; el detalle y los roles se consultan solo cuando proceden (`enabled`: los roles solo con el usuario activo; el catálogo solo en el alta y en «Agregar role», con `staleTime` de 5 minutos). Las consultas reciben la señal de cancelación.
- **Sin actualizaciones optimistas** (constitución III: solo donde el spec las justifique): la pantalla cambia cuando el servicio responde, lo que además concuerda con «no se asume el éxito» de la spec.
- **403 y 401**: ya los atienden `createQueryClient` (aviso sin cerrar sesión) y el cliente HTTP (una renovación del token).

## D9. Formularios con React Hook Form y Zod

- **Decisión**: React Hook Form con `zodResolver`; esquemas Zod **sin transformaciones** (el tipo de entrada coincide con el de salida; `.trim()` no cambia el tipo), uno para el alta y otro para la edición. Los campos de texto usan `register` con `inputRef` para que, al enviar con errores, RHF pueda **enfocar el primer campo inválido** (con la referencia en la raíz del `TextField` no enfocaría). Los roles usan `Controller` con un `Autocomplete` múltiple (la prueba de concepto lo verificó con axe).
- **Errores del servidor**: la función pura `describeUserError` los clasifica y un `Map` (sin `as`; con un objeto, un campo llamado `constructor` encontraría una función) traduce los nombres de campo de la API a los del formulario; el resto va a un `Alert` general sobre el formulario. El error del correo duplicado incluye el enlace a la búsqueda de ese correo.
- **Doble envío** (FR-007): los botones se deshabilitan mientras la mutación está pendiente.
- **Contraseña inicial**: una sola entrada de tipo `password` con `autoComplete="new-password"` y un botón con nombre accesible para mostrarla u ocultarla. No hay campo de confirmación (el botón de ver permite verificar lo escrito con menos fricción) ni generador (fuera de alcance). La política de contraseñas es de Auth0: el cliente solo exige que no esté vacía y muestra el rechazo del servicio junto al campo.
- **Cancelar** vuelve a la pantalla de origen sin avisar de cambios sin guardar (no se pidió; YAGNI).
- **Alternativa descartada** para los roles: un grupo de casillas (más sencillo, pero largo con hasta 100 roles); `Autocomplete` escala y es un patrón accesible de MUI.

## D10. Alta con roles: orden, fallos parciales y sin compensación

La constitución IV exige definir el orden, los fallos parciales y la compensación cuando un caso necesita varias llamadas, y prefiere una operación única en el backend (DEBERÍA). Como la aclaración 2 de la spec descartó esperar a esa operación, esta es la definición (resumen en [contracts/users-service.md](contracts/users-service.md)):

1. El hook `useCreateUser` llama a U4 y, solo si funciona, asigna cada role elegido con U11, **uno por uno y en orden de `id`** (sin paralelismo: el resultado es predecible y el servicio no promete nada sobre concurrencia).
2. Si falla U4, no se asigna nada y el usuario no se da por creado (los errores se tratan por campo o como aviso).
3. Si falla una asignación: ante un error de negocio (4xx: `role_not_found`, conflictos) **se sigue con los roles restantes**; ante un fallo de infraestructura (red, tiempo agotado, 5xx) **se detiene**, porque el resto probablemente fallaría también y cada intento puede tardar hasta 30 s. Los roles no intentados cuentan como pendientes.
4. **No hay compensación**: no se elimina al usuario ni se quitan los roles ya asignados. Eliminarlo (lógico) dejaría su correo reservado y su cuenta de acceso ya creada.
5. El resultado es un `CreateUserOutcome` (`created` o `partial`) y la pantalla navega al detalle: con `partial`, pasa `rolesNotAssigned` por el estado de navegación para mostrar el aviso con «Reintentar» (spec US2-9, FR-023, SC-009). El reintento asigna solo los pendientes y trata `user_role_already_associated` como ya asignado.
6. Un `SessionExpiredError` a mitad del proceso se propaga sin más (lo maneja el cierre de sesión de la 001).

- **Desvío justificado** de un DEBERÍA de la constitución IV: Complexity Tracking del plan.
- **Alternativas descartadas**: asignar en paralelo (informe parcial más difícil y riesgo con el ritmo de Auth0); eliminar al usuario al fallar (correo reservado y cuenta creada); crear el usuario sin roles y asignarlos «más tarde» (contradice FR-005); esperar a una operación única del servicio (retrasa la feature, aclaración 2).

## D11. Cambios de estatus y de roles: confirmaciones y conflictos

- **`ConfirmDialog` compartido** (`shared/ui`): título, mensaje que **nombra al usuario**, etiqueta de confirmación, estado pendiente y variante delicada. `Dialog` de MUI con `aria-labelledby` y `aria-describedby`, `Esc` para cancelar (bloqueado mientras la mutación está pendiente), foco inicial en «Cancelar» en las acciones que cambian si la persona puede iniciar sesión y regreso del foco al botón de origen (lo hace MUI). Se usa para bloquear, desbloquear, eliminar, reactivar y quitar un role; «Agregar role» es un diálogo con el selector cuya confirmación nombra al usuario y al role.
- **Mutaciones**: una mutación `useChangeUserStatus` (acción: bloquear, desbloquear, eliminar o reactivar) y mutaciones de agregar y quitar role. Al terminar con éxito guardan el detalle y siguen la matriz de invalidación; ante un error cierran el diálogo, avisan y, si es de estatus o de roles, **vuelven a consultar** lo afectado para mostrar el estado vigente (US4-7, US5-4, US3-7).
- **Tiempo**: el servicio limita a 10 s sus llamadas a Auth0 (`AUTH0_TIMEOUT_SECONDS`), de modo que estas acciones pueden tardar; el límite de 30 s del cliente HTTP se mantiene y el diálogo muestra un indicador mientras espera.
- **Alternativa descartada**: mantener el diálogo abierto con el error dentro; se prefiere cerrar y notificar (constitución VI: las mutaciones notifican su éxito o su error) para dejar a la vista la pantalla ya actualizada.

## D12. Errores

- **Decisión**: la función pura `describeUserError(error, operation)` clasifica cada fallo (tabla de [data-model.md](data-model.md)) y los textos salen del módulo de mensajes. **No se muestran los mensajes del servidor tal cual**, salvo los de campo de un `validation_error`, que son textos para personas sin datos técnicos y se asignan al campo que nombran. Los demás mensajes del servicio mencionan identificadores y pueden cambiar de redacción, y la constitución IV prohíbe mostrar mensajes crudos.
- **Registro** (`logger`): hoy esta feature no registra nada de las operaciones: lo que falla se explica a la persona y lo registran los Error Boundaries de la 001. Si se añade, solo `code`, estado y operación; nunca el cuerpo, el correo, los nombres ni la contraseña (una prueba comprueba que el alta no registra su cuerpo, ni por `logger` ni por `console`).

## D13. Contraseña y datos personales

- **Contraseña**: vive únicamente en el estado del formulario y en el cuerpo de la solicitud; nunca en la URL, el estado de navegación, la caché de consultas, el almacenamiento ni los registros. La mutación del alta usa `gcTime: 0` y se reinicia al terminar, porque TanStack Query conserva las variables de una mutación (la contraseña) en su caché durante cinco minutos por defecto. El campo está oculto por defecto y el formulario conserva lo escrito tras un fallo (spec US2-8) solo mientras siga abierto.
- **Datos personales**: nombres y correos se muestran a quien tiene permiso y no se registran. La búsqueda lleva el correo en la URL (la spec exige que sea compartible, FR-018), de modo que puede quedar en el historial del navegador; la política de `Referrer` por defecto (`strict-origin-when-cross-origin`) no lo envía a otros orígenes y el despliegue no debe debilitarla.
- **Cuentas de prueba**: crear un usuario crea una cuenta real en Auth0 (quickstart).

## D14. Estrategia de pruebas

- **Simulador con estado del servicio de usuarios** (MSW, carpeta `src/test/handlers/usersDirectory/`: el modelo con las reglas, un archivo por operación, el registro de solicitudes y los comportamientos inyectables): usuarios con estatus, catálogo de roles, asociaciones y las reglas del contrato (correo único con cualquier estatus, conflictos de estatus, orden de comprobaciones, `404` y `409`), permisos por operador a partir del token `Bearer test-token:<sub>` (`403 permission_denied`), inyección de fallos de la cuenta de acceso (`identity_provider_unavailable`, `identity_provider_error`, `auth0_account_not_found`, `password_rejected`), respuestas lentas o colgadas, y registro de las solicitudes con su cuerpo para comprobar lo enviado. Convive con el simulador de `me` de la 001 (`createUsersServiceMock`, que usan las pruebas de acceso): no se componen, porque `createUsersDirectoryMock` reimplementa `me` y la lectura del token con las mismas reglas (`me.ts`, `authorize.ts`); unificarlos queda para cuando se toque la 001.
- **Capas**: (1) lógica pura con prueba primero: `getUserCapabilities`, `getAvailableActions`, `describeUserError`, `parseUsersSearchParams`, esquemas del formulario, constructores de cuerpos y `formatDateTime`; (2) hooks con MSW: orquestación del alta (éxito, parcial, detención ante fallo de infraestructura, conflicto 409), invalidaciones y `gcTime: 0`; (3) componentes con Testing Library y user-event: listado (paginación, tamaño, enlace), búsqueda, formularios (validación, foco en el primer error, error del servidor, doble envío), diálogos (foco, `Esc`, estado pendiente) y detalle según capacidad, estatus y autoprotección; (4) integración con la aplicación completa (`renderApp`) por historia de usuario; (5) axe en listado, resultado de búsqueda, detalle (activo y bloqueado), formulario con errores y diálogos; (6) E2E de Playwright (`e2e/users.spec.ts`), omitidos sin credenciales, con el recorrido crítico (constitución VII) y la comprobación de diseño a 1024 y 320 px.
- **Cobertura**: los archivos nuevos siguen las carpetas `api`, `policy`, `schemas` y `hooks`, que ya cuentan para el umbral de 80 %.
- **Datos**: las factorías ganan `userPageDto`, variantes de usuario por estatus y el catálogo de roles; `operatorAccess` incluye los permisos de `roles`.

## D15. Rendimiento y presupuesto de bundle

- **Decisión**: el Data Grid nunca entra en la ruta de entrada: el listado es un chunk perezoso y el detalle y los formularios, otro. El presupuesto de 300 KB gzip de la ruta de entrada (hoy 264,8 KB) debe seguir cumpliéndose; se mide con `npm run size` tras el primer build de la feature y el tamaño de cada chunk perezoso se registra en las notas de implementación. Además, `scripts/check-entry-size.mjs` falla si el JS de la ruta de entrada contiene alguno de los atributos del DOM `data-rowindex` o `data-colindex`, que el Data Grid necesita como literales (en la prueba de concepto, con la localización en el tema de la entrada: 1 y 5 apariciones en el chunk perezoso y 0 en la entrada), de modo que una importación estática que lo arrastre (D2) se detecta aunque el tamaño aún quepa en el presupuesto. Dos marcadores que parecían obvios no sirven, y se midieron: `MuiDataGrid` está en la entrada a propósito (es la clave `MuiDataGrid` de la localización del tema, 1 aparición) y `MuiDataGrid-` no está en ningún sitio (los nombres de clase se componen en tiempo de ejecución: 0 apariciones incluso en el chunk perezoso, la guarda no se habría activado nunca). Para que la guarda no quede obsoleta en silencio al actualizar el Data Grid, el script también falla si el build contiene Data Grid (algún archivo fuera de la entrada con `MuiDataGrid` más de una vez) y ningún archivo contiene un marcador.
- **SC-002** (primera página del listado en menos de 2 s en el 95 %): una sola solicitud (U1) y un chunk perezoso; el cambio de página conserva la anterior mientras carga (`keepPreviousData`). No se precarga nada (YAGNI).

## D16. Accesibilidad y diseño adaptable

- Data Grid con su semántica propia; enlace en el nombre; estatus con texto y no solo con color (WCAG 1.4.1); etiquetas visibles y errores asociados con `aria-describedby`; región `aria-live` para el resultado de la búsqueda; diálogos con foco gestionado; operación completa por teclado. Pruebas con axe (D14).
- Diseño fluido como en la 001 (D20): sin anchos fijos; el detalle usa una lista de definiciones que pasa a una columna en pantallas estrechas; los botones envuelven; la tabla se desplaza dentro de su recuadro. Verificación real en Playwright a 1024×768 y 320×640 (`scrollWidth` de la página ≤ `clientWidth`).

## D17. Fechas y formato

- Las fechas viajan en ISO 8601 y se mantienen así en el dominio (constitución IV); `formatDateTime` (en `shared/lib`) las muestra con `Intl.DateTimeFormat` en español y la zona horaria del operador (FR-016), con estilo medio de fecha y corto de hora. Las pruebas fijan la zona horaria para no depender de la máquina.

## D18. Dependencias y riesgos externos

| Riesgo o dependencia | Efecto | Responsable / mitigación |
|---|---|---|
| La consulta `me` del servicio (001, D19) | Sin ella no hay acceso real a la sección | Ya está en el servicio (su spec 009); la solicitud que la originó sigue en [../001-auth-session-profile/contracts/users-service-me-request.md](../001-auth-session-profile/contracts/users-service-me-request.md). Las pruebas la simulan con MSW |
| Crear, bloquear, desbloquear, eliminar y reactivar usan la Management API de Auth0 | Sin las credenciales de la aplicación Machine to Machine en el `.env` del servicio, el servicio ni arranca. Sus alcances son `read:users`, `create:users`, `update:users` y `delete:users`; sin este último, si Auth0 crea la cuenta y falla el guardado en la base, el servicio no puede deshacerla (lo registra y pide borrarla a mano): queda una cuenta huérfana y ese correo da después `auth0_account_already_exists` | Quickstart, requisitos previos |
| Esas operaciones pueden tardar hasta 10 s (tiempo máximo del servicio con Auth0) | Esperas visibles | Indicador en los diálogos y límite de 30 s del cliente (D11) |
| Crear usuarios desde el Backoffice crea cuentas reales en Auth0 | Cuentas residuales en el tenant | Usar correos desechables; eliminar un usuario deja la cuenta bloqueada y marcada, no la borra; limpieza manual (quickstart) |
| Solo el rol `Administrator` trae `roles:read` en los datos de prueba | Otros operadores no pueden crear ni agregar roles | Las acciones se ocultan por capacidad; el quickstart cambia permisos con SQL para comprobarlo |
| El listado solo muestra usuarios activos | Un usuario bloqueado o eliminado desaparece de la pantalla | Búsqueda exacta por correo y enlace directo (D7) |
| El correo no se sincroniza con Auth0 y aquí no se edita | Un correo mal escrito exige eliminar y crear de nuevo; el correo erróneo queda reservado | Spec, aclaración 4; sincronización futura en el servicio |
| El servicio no controla la concurrencia ni ofrece clave de idempotencia | Gana la última edición; un alta con respuesta perdida puede duplicarse como error de correo ya registrado | Spec, aclaración 5; sugerencia de buscar el correo (contrato) |
| Los roles de un usuario no activo no se pueden consultar | El detalle de un bloqueado o eliminado no los muestra | Aviso en el detalle; vuelven al reactivar o desbloquear |
| La autoprotección es solo de interfaz | Un cliente ajeno puede saltársela | Declarado en la spec; la autorización real es del servicio |
| El servicio tiene un borrador sin publicar (`specs/010-user-id-uuid`) que pasa el id del usuario, `{user_id}` y `user_roles.user_id` a UUID | Sería un cambio incompatible: `121` y `abc` darían 422 y todo lo que aquí asume enteros dejaría de funcionar (`platformUserSchema.id`, el esquema de la asignación de roles, `parseUserId`, las claves de consulta, `isSelf`, el esquema de `me` de la 001, el simulador) | Vigilar esa spec. Si sale, cambiar el tipo del id en un solo lugar (un esquema y un tipo `UserId`) antes de actualizar el contrato |
| Data Grid 9.x es reciente y el tag `latest` apunta a 8.x | Una actualización automática podría retroceder o exigir Material 7 | Versión fijada y explícita; Dependabot revisa las mayores |
| Contraseña inicial elegida por el operador | Debe comunicarse a la persona por otra vía y no se obliga a cambiarla | Spec, Assumptions; depende de la configuración de Auth0 |
