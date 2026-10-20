# Investigación (Fase 0): Administración de Suscripciones

**Feature**: `003-manage-subscription-types` | **Fecha**: 2026-10-20 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Resuelve los puntos abiertos del Technical Context y fija las decisiones de diseño. Complementa la investigación de la 001 y la de la 002 ([../002-manage-users/research.md](../002-manage-users/research.md)): lo que no se repite aquí (React Router en modo de datos, Auth0, cliente HTTP, Data Grid, React Hook Form, estrategia general de pruebas, CI) sigue como allí. El contrato de la API se leyó el 2026-10-20 en su repositorio local y se contrastó con el OpenAPI que publica el servicio en ejecución ([contracts/subscriptions-service.md](contracts/subscriptions-service.md)). Las «aclaraciones» se numeran por su orden en la sección Clarifications de la spec (1 a 6, decisiones de interfaz; 7 a 9, las de `/speckit-clarify`).

## D1. Dependencias: ninguna nueva

- **Decisión**: no se añade ninguna dependencia. Data Grid 9.15.0, React Hook Form 7.90.0 con `@hookform/resolvers` 5.9.2, MUI 9.5.0, Zod 4.6.7 y TanStack Query 5.104.4 ya están instalados y verificados por la 002 (su D1). `useFieldArray` de React Hook Form cubre la lista de «lo que incluye» e `Intl.NumberFormat` (del navegador) da el formato de moneda.
- **Alternativas descartadas**: una librería de máscaras de moneda para el precio (la aclaración 8 fija que el campo solo acepta dígitos y un punto decimal, así que no se formatea al escribir) y una de arrastrar y soltar (reordenar lo que incluye está fuera de alcance).

## D2. Estructura de la feature y piezas que pasan a ser comunes

- **Decisión**: nueva feature `features/subscriptions` con `api`, `components`, `hooks`, `policy`, `schemas` e `index.ts`, como `users`. **No importa `auth`**: como en la 002 (D2), las capacidades se calculan en `features/auth/policy` y unos adaptadores finos de `app/router/subscriptions/` se las entregan a las pantallas. `auth` solo importa de `subscriptions` el **tipo** `SubscriptionCapabilities` (`import type`, que desaparece al compilar), así que la ruta de entrada no arrastra nada de la feature. Una regla `no-restricted-imports` impide que `features/subscriptions` importe `features/auth`; se amplía la que ya protege a `users`.
- **`index.ts`**: las pantallas como componentes perezosos (`lazy` dentro de la feature) y, de forma estática, solo lo ligero: `parseSubscriptionId` (lo usa `app` para titular las direcciones con un id que no lo es) y el tipo `SubscriptionCapabilities`.
- **Piezas de la 002 que pasan a ser comunes**, sin cambiar su comportamiento y con sus pruebas:
  - `RequireCapability`, de `app/router/users/` a `app/router/` (la usan las dos secciones);
  - `atMost` y `REFRESH_WAIT_MS`, de `features/users/hooks/refreshUser.ts` a `shared/lib/atMost.ts`;
  - `RefreshFailedAlert`, de `features/users/components/` a `shared/ui/`;
  - el marco del formulario (`UserForm`: error general que recibe el foco, «Guardar» con estado pendiente y «Cancelar» deshabilitado mientras se guarda), a `shared/ui/FormFrame.tsx`, con «Guardar» en `messages.common`.

  La constitución (I) no deja que una feature use los internos de otra, así que reutilizarlas exige moverlas; copiarlas duplicaría código que ya pasó una revisión (el foco del error y el cancelar durante el guardado).
- **Lo que no se comparte**: la etiqueta de estatus, el detalle, los formularios y la política de acciones son de cada recurso (estatus, reglas y textos distintos).
- **Tamaño**: ningún componente pasa de 250 líneas (constitución I): listado, tabla, detalle, campos del detalle, menú de estatus, acción de eliminar, campos del formulario, campo de lo que incluye y las pantallas de alta y de edición son componentes aparte.

## D3. Capacidades y acciones

- **Decisión**: `getSubscriptionCapabilities(access)` en `features/auth/policy/subscriptionCapabilities.ts`, solo con `can()`, que ya exige `subscriptions:read` para cualquier acción: `canCreate` (`subscriptions:write`), `canEdit` y `canChangeStatus` (`subscriptions:update`) y `canDelete` (`subscriptions:delete`). Se escribe con prueba primero (constitución VII).
- **Ningún estatus vigente restringe acciones**, a diferencia de los usuarios: una suscripción Activa, Inactiva, Bloqueada o de estatus desconocido admite editar, cambiar de estatus y eliminar (FR-008, FR-017, FR-020). Dos funciones puras de `features/subscriptions/policy` cubren lo que sí depende de los datos:
  - `getStatusTargets(statusId)`: los estatus que se ofrecen, Activa, Inactiva y Bloqueada menos el actual (con un estatus desconocido, los tres);
  - `getDeleteAvailability(clinicsCount)`: `allowed`, o `blocked` con el número de clínicas cuando es mayor que 0; «no disponible» es `allowed`, porque decide la API (FR-018).
- **Por qué no se impide más**: deshabilitar eliminar con clínicas es solo de interfaz; la regla es de la API, que la impone y la vuelve a comprobar (constitución IV y V).
- **Alternativa descartada**: una tabla de acciones por estatus como la de usuarios (no hay restricciones por estatus que modelar; YAGNI).

## D4. Tipos de la API: esquemas Zod escritos a mano (reevaluado)

- **Decisión**: esquemas Zod a mano a partir de [contracts/subscriptions-service.md](contracts/subscriptions-service.md); no se generan tipos ni esquemas desde el OpenAPI. La 002 (D4) pidió reevaluarlo con esta API, cuyo OpenAPI ahora es público (`/openapi.json` no pide token), y la decisión se mantiene.
- **Razón**: la constitución II fija un único esquema Zod por entidad, con los tipos de `z.infer`; generar tipos de TypeScript crearía una segunda fuente. Un generador de Zod añadiría una dependencia y un paso que necesitaría el servicio en marcha, o su repositorio, en CI. Son seis operaciones con formas sencillas. Además, el OpenAPI publicado no coincide en todo con el documentado (por ejemplo, `clinics_count` no figura como obligatorio porque tiene `null` por defecto), así que de todos modos habría que decidir qué se acepta.
- **Mitigación**: validación en la frontera (una respuesta que no cumple es un error explícito de contrato), un simulador fiel al contrato y las diferencias anotadas en el contrato consumido. Es el desvío de un DEBERÍA, justificado en Complexity Tracking como en la 002.

## D5. Rutas, estado de la URL e identificadores

- **Decisión**: cuatro rutas (`/subscriptions`, `/subscriptions/new`, `/subscriptions/:subscriptionId` y `/subscriptions/:subscriptionId/edit`, dentro de las `/subscriptions/*` que reservó la 001), con un `ErrorBoundary` por ruta y pantallas perezosas ([contracts/app-routes.md](contracts/app-routes.md)). El alta y la edición son pantallas con dirección propia que comparten el formulario (aclaración 4 y constitución VI).
- **Estado del listado en la URL** (constitución III): `page` (entero ≥ 1) y `page_size` (10, 25 o 50), leídos con `parseSubscriptionsSearchParams` (Zod), como en el listado de usuarios pero sin búsqueda. Los valores inválidos se sustituyen por los de por defecto y la URL se normaliza con `replace`. Una página posterior a la última (por ejemplo, tras eliminar la única suscripción de la última página) se reemplaza por la última.
- **Identificador**: la API usa enteros (`subscription_id` ≥ 1, una columna `serial4`), mientras que los usuarios ya usan UUID. `parseSubscriptionId` acepta solo dígitos, sin ceros a la izquierda, de 1 a 2 147 483 647 (el máximo de la columna); cualquier otro texto muestra «Página no encontrada», como `/users/abc`. `useRouteAccessibility` gana una clave de ruta `subscriptionIdParam` para titular esas direcciones como «Página no encontrada».
- **Volver al listado en la misma página** (FR-003, aclaración 3): estado de navegación `listSearch` validado con Zod (solo `page` y `page_size`), con respaldo `/subscriptions` (la primera página) tras un enlace directo. Lo llevan el enlace del nombre, el alta, la edición y el regreso tras eliminar.

## D6. Listado: el catálogo completo, ordenado y paginado en memoria

- **Decisión**: una sola consulta (S1) trae el catálogo completo; la función pura `sortCatalog` lo ordena (FR-015) y `pageOf` lo corta con la página y el tamaño de la URL. El Data Grid recibe solo la página (`paginationMode="server"`: la paginación se hace fuera del grid y `rowCount` es el total), sin ordenar, filtrar ni menú de columnas (`disableColumnSorting`, `disableColumnFilter`, `disableColumnMenu`). Columnas: nombre (enlace al detalle), precio mensual, estatus (etiqueta) y clínicas. `autoHeight`; estado vacío con `noRowsOverlay` y «Nueva suscripción» solo con la capacidad; error con `ErrorState` y «Reintentar». Los grupos no se separan con encabezados ni filas (aclaración 7).
- **Orden** (`sortCatalog`):
  1. grupo: Activa (id 1) primero; cualquier otro estatus, después;
  2. precio mensual de menor a mayor, comparado en centavos enteros (`toCents("4500.00")` = 450000; el máximo, 9 999 999 999, cabe sin pérdida en un número de JavaScript);
  3. nombre, con `Intl.Collator('es', { sensitivity: 'accent' })`: no distingue mayúsculas y sí acentos, como la unicidad de la API, que compara `lower(name)`;
  4. el id, para que el orden sea total aunque dos nombres empataran.

  El orden no depende del que traiga la API (fecha de creación).
- **Desvío de la constitución IV** (DEBE paginar en servidor; NO DEBE descargar una colección completa para paginarla en el cliente): lo impone el contrato, que devuelve el catálogo sin paginar (hasta 500 suscripciones; se esperan unas decenas) y en otro orden. Se justifica en Complexity Tracking; la constitución no se enmienda (spec, Assumptions). Se conserva lo que la regla protege: una sola solicitud, nunca más filas en pantalla que el `page_size` (constitución, Rendimiento) y la revisión de la feature si la API empieza a paginar.
- **Por qué paginar fuera del grid y no con su modo cliente**: el listado conserva el contrato del de usuarios (página en la URL, corrección de una página inexistente, anuncio de las filas mostradas), y el orden y el corte son funciones puras que se prueban primero; el modo cliente del Data Grid ordenaría y cortaría con su propio estado.
- **Alternativas descartadas**: pedir a la API paginación y orden (un cambio incompatible en otro repositorio que su spec descartó: «no es necesario paginar»); mostrar el catálogo sin paginar (contradice FR-001 y el patrón de la constitución VI); `Table` de MUI (la constitución VI exige el Data Grid).

## D7. Precio, número de clínicas y estatus en pantalla

- **Precio** (FR-014): `formatMxn(amount)` en `shared/lib/formatCurrency.ts`, con `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })` («$4,500.00»), y el sufijo en el módulo de mensajes (`messages.subscriptions.price.perMonth`: «$4,500.00/mes»). El dominio guarda el precio como el texto decimal de la API («4500.00», siempre con dos decimales) y solo la presentación lo formatea (constitución IV). El 0 se muestra «$0.00/mes».
- **Número de clínicas** (FR-019): un entero, o «No disponible» cuando la API envía `null` o no envía el campo (el OpenAPI publicado no lo marca como obligatorio). Nunca se convierte en 0.
- **Estatus** (FR-016, aclaración 2): `SubscriptionStatusChip` decide por el id. Activa va en verde (`success`), Inactiva en gris (`default`) y Bloqueada en naranja (`warning`); un estatus desconocido lleva el nombre que da la API, en una etiqueta neutra con contorno (`outlined`) que se distingue de Inactiva. El texto lleva el significado y el color solo lo refuerza (WCAG 1.4.1); las filas no se atenúan. Los colores salen del tema, cuya prueba ya comprueba el contraste AA.
- **Eliminada** (FR-016): la API no las devuelve; si llegara una (un desvío del contrato), el listado la descarta y el detalle muestra «no encontrada».

## D8. Estado de servidor con TanStack Query

- **Decisión**: factoría `subscriptionKeys` (`catalog()` y `detail(id)`) y la matriz de invalidación de [data-model.md](data-model.md). El listado usa `catalog()` con `select: sortCatalog` (el orden se calcula una vez por respuesta) y corta la página en el render: cambiar de página no hace ninguna solicitud. Las lecturas heredan el `staleTime` de 30 s y los reintentos de la 001 (máximo 2, solo red y 5xx); las mutaciones no se reintentan y su botón se deshabilita mientras están pendientes (FR-007). Las consultas reciben la señal de cancelación.
- **Sin actualizaciones optimistas** (constitución III): la pantalla cambia cuando la API responde («no se asume el éxito»).
- **Después de un cambio**: crear, modificar y cambiar el estatus guardan en `detail(id)` la suscripción que devolvió la API e invalidan `catalog()`. Eliminar espera, como mucho `REFRESH_WAIT_MS`, a que el catálogo se vuelva a consultar, lleva al listado y después olvida `detail(id)`. Un rechazo que dice que la pantalla está vieja (no encontrada, estatus sin cambio, con clínicas) vuelve a consultar el detalle y el catálogo, y la mutación sigue pendiente hasta que lo nuevo está en pantalla (el patrón `refreshUser` de la 002).
- **403 y 401**: ya los atienden `createQueryClient` (aviso sin cerrar la sesión) y el cliente HTTP (una renovación del token y, si falla, el flujo de sesión vencida de la 001).

## D9. Formulario compartido con React Hook Form y Zod

- **Decisión**: un esquema, `subscriptionFormSchema`, para el alta y la edición (mismos campos, aclaración 4), sin transformaciones (los tipos de entrada y de salida coinciden) y con `zodResolver`:
  - `name`: recortado, de 1 a 100 caracteres;
  - `description`: recortado, hasta 500; vacío equivale a no tener descripción;
  - `monthlyPrice`: texto recortado que cumple `^\d{1,8}(\.\d{1,2})?$` (aclaración 8: solo dígitos y un punto decimal opcional), de modo que el máximo de 99,999,999.99, los dos decimales y la imposibilidad de un negativo quedan en la misma regla; el campo usa `inputMode="decimal"` y muestra «$» y «/mes» alrededor del número;
  - `features`: lista de `{ value }` (React Hook Form la exige de objetos), de 0 a 20 elementos, cada uno recortado de 1 a 150 caracteres.
- **Lo que incluye** (`FeaturesField`, FR-023): `useFieldArray` con agregar (el elemento nuevo recibe el foco), editar en su campo y quitar (un botón con nombre accesible «Quitar el elemento N»; el foco pasa al elemento siguiente, al anterior o a «Agregar elemento»), sin reordenar. Con 20 elementos, «Agregar elemento» se deshabilita y un texto visible dice que se alcanzó el máximo. Cada elemento tiene su etiqueta («Elemento N») y su error.
- **Cuerpos**:
  - `toCreateSubscriptionBody(values)` envía el nombre, el precio y lo que incluye, recortados, y la descripción solo si no está vacía.
  - `toUpdateSubscriptionBody(initial, values)` devuelve **solo lo que cambió** respecto de la suscripción con que se abrió el formulario (FR-008, FR-012): el nombre si cambió su texto recortado (cambiar solo mayúsculas cuenta, US3-6); la descripción si cambió (vacía se envía como `null` para borrarla); el precio si cambió su valor en centavos («4500» y «4500.00» son el mismo); y lo que incluye, completo, si cambió algún elemento o su número. Si no cambió nada devuelve `null`: no se envía nada y se vuelve al detalle con el aviso de que no había cambios (aclaración 9; la API rechazaría un cuerpo vacío).
  - Ninguno lleva id, estatus, número de clínicas ni fechas (FR-021).
- **Errores del servidor**: `describeSubscriptionError` lleva a su campo el nombre en uso y los errores de validación de `name`, `description`, `monthly_price` y `features` (este, a la lista entera: la API no dice qué elemento falla), **con textos propios** del módulo de mensajes y no con los de la API (FR-010; en la 002 los de campo se mostraban tal cual). Un campo distinto (`body`, uno desconocido) es un error general del formulario. El mapa de campos es un `Map` (sin `as`).
- **Doble envío y cancelar**: `mutateAsync` dentro de `handleSubmit`, de modo que `isSubmitting` cubre todo el guardado; «Cancelar» se deshabilita mientras se guarda, y la navegación tras guardar va en el `onSuccess` de la llamada (lo aprendido en la 002). Cancelar no pregunta por cambios sin guardar, como en la 002 (D9): no se pidió.
- **Edición**: el formulario se construye con la suscripción ya cargada y no se reinicia, de modo que una nueva carga no pisa lo escrito.

## D10. Cambio de estatus

- **Decisión**: `SubscriptionStatusMenu` en el detalle: un botón «Cambiar estatus» que abre un menú de MUI con los estatus de `getStatusTargets` («Activar», «Inactivar», «Bloquear»). Inactivar y bloquear abren `ConfirmDialog` con un mensaje que nombra la suscripción y el nuevo estatus (bloquear, con la variante `danger`); activar se envía al elegirlo, con el botón en estado pendiente (aclaración 5). En todos los casos, un aviso de éxito al terminar (SC-009: tres interacciones como mucho).
- **Una sola llamada** (S5) con `{ status_id }`: el detalle muestra la suscripción que devuelve la API (estatus, fecha de modificación y número de clínicas).
- **Rechazos**: `subscription_status_unchanged` (otra persona ya le dio ese estatus) avisa y vuelve a consultar el detalle (US4-7); `subscription_not_found` avisa y el detalle pasa a «no encontrada» (US4-8). Pulsar la confirmación varias veces envía un solo cambio (US4-9): el diálogo pendiente no acepta más clics y uno que se está cerrando no hace nada (002).
- **Avisos tras un diálogo**: el resultado se guarda (`useDeferredNotice`) y se muestra cuando el diálogo terminó de cerrarse, porque MUI oculta el resto de la página a los lectores de pantalla mientras hay un diálogo (002).
- **Alternativa descartada**: un diálogo con botones de opción para los tres estatus, que añade un paso a activar (la aclaración 5 pide aplicarlo directamente).

## D11. Eliminación

- **Decisión**: `DeleteSubscriptionAction` en el detalle, solo con `canDelete`. Con `getDeleteAvailability` en `blocked`, el botón está deshabilitado y a su lado se lee el motivo («Tiene 1 clínica asignada» o «Tiene N clínicas asignadas»), asociado con `aria-describedby`; no se usa un tooltip, porque un botón deshabilitado no recibe el foco. Con `allowed` (cero clínicas o «No disponible»), abre `ConfirmDialog` (variante `danger`), que nombra la suscripción y advierte que no se puede deshacer.
- **Al confirmar** (S6): con éxito, vuelve al listado (con `listSearch`) y avisa; el detalle se olvida tras salir, para no pedir una suscripción que ya no existe. `subscription_has_clinics` avisa con el motivo y vuelve a consultar el detalle, que muestra su número y deja el botón deshabilitado (US5-6). `clinics_check_unavailable` avisa con su propio motivo («no se pudo comprobar… no se eliminó»), sin cambiar nada y con la acción disponible para reintentar (US5-7). `subscription_not_found` avisa y el detalle pasa a «no encontrada» (US5-8).
- **Sin deshacer**: la baja es lógica en la API, pero esta no ofrece recuperarla y la spec lo deja fuera de alcance.

## D12. Errores

- **Decisión**: la función pura `describeSubscriptionError(error, operation)` clasifica cada fallo por su `code` y su estado (tabla de [data-model.md](data-model.md)), y todos los textos salen de `messages.subscriptions.errors`: **ninguno** es el texto de la API (FR-010, SC-005), ni siquiera los de campo. `toNotification` decide la gravedad del aviso (información, advertencia o error) y no repite el `403`, que ya avisa la aplicación (002).
- **Códigos que se separan**: `authorization_unavailable` (el API de usuarios no respondió a la API) e `internal_error` son reintentables, con el mensaje genérico; `clinics_check_unavailable` es reintentable pero con su propio motivo; un `422` en `status_id` o en `body` no lo provoca la interfaz y se trata como error general.
- **Registro** (`logger`): la feature no registra operaciones, como la 002; si se añade, solo `code`, estado y operación.

## D13. Integración: cliente HTTP, configuración y acceso desde el navegador

- **Cliente**: `HttpClients` gana `subscriptions`, creado en `HttpClientsProvider` con `createHttpClient` y la misma función de token que `users`: el token de la sesión, con el audience de las APIs de MailySoft, que la API reenvía al API de usuarios. El cliente solo envía el token al origen de su URL base (constitución IV y V) y no hay credenciales nuevas.
- **`VITE_SUBSCRIPTIONS_API_URL` pasa a ser obligatoria** (hoy es opcional porque la sección no existía): la constitución la incluye entre las variables mínimas, y la sección no funciona sin su API. Se valida al arrancar, como las demás (pantalla de configuración inválida si falta). Cambian `env.ts` y sus pruebas, `.env.example`, el README y el contrato de entorno de la 001. **Alternativa descartada**: dejarla opcional y ocultar la sección sin ella (un camino condicional que la constitución no pide).
- **Acceso desde el navegador**: la API solo admite los sitios de su lista `CORS_ALLOWED_ORIGINS`, vacía por defecto. En desarrollo se usa un proxy de Vite como el de usuarios: `VITE_SUBSCRIPTIONS_API_URL=/proxy/subscriptions` y `SUBSCRIPTIONS_API_PROXY_TARGET`, por defecto `http://127.0.0.1:8010`, el puerto que documenta la API (el 2026-10-20, en esta máquina respondía en el 8001, que su README reserva para la simulación de clínicas). En los demás entornos la API se sirve en el mismo origen (proxy inverso) o se añade el origen del Backoffice a `CORS_ALLOWED_ORIGINS`, y la Content Security Policy del despliegue debe permitir su origen en `connect-src` (README).

## D14. Estrategia de pruebas

- **Simulador con estado de la API de suscripciones** (MSW, `src/test/handlers/subscriptionsCatalog/`): suscripciones con estatus (también los añadidos a mano) y número de clínicas o «no disponible», con las reglas del contrato en su orden (JSON ilegible, identidad, permiso, validación, existencia y reglas, y comprobación de clínicas). Entre ellas: nombre único sin distinguir mayúsculas entre las no eliminadas, que la propia suscripción puede conservar; `422` por campo con los mensajes del catálogo de errores; estatus sin cambio; `404` para las eliminadas; y `409` y `503` al eliminar.
  - **Los permisos salen del simulador del servicio de usuarios** (`createUsersDirectoryMock`), igual que la API real los pide al API de usuarios en cada petición: quitar `subscriptions:update` a un role cambia a la vez la respuesta de `me` y la de la API.
  - **Controles**: fallos inyectados (una vez, siempre, colgado o en espera), `authorization_unavailable`, clínicas no disponibles, conteos por suscripción y cambios hechos «por otra persona» (editar, cambiar el estatus, eliminar).
  - **Registro de solicitudes** con su cuerpo, para comprobar que solo se envía lo que cambió y nunca el id, el estatus, las clínicas ni las fechas.
- **Reutilización del simulador de la 002**: el registro de solicitudes y los fallos inyectables son genéricos; se parametrizan por URL base y se comparten (`src/test/handlers/shared/`). Lo propio de cada servicio queda en su carpeta.
- **Capas**:
  1. lógica pura con prueba primero: `sortCatalog`, `pageOf`, `toCents`, `formatMxn`, `parseSubscriptionsSearchParams`, `parseSubscriptionId`, `parseSubscriptionDetailState`, `subscriptionSchema` (clínicas ausentes = no disponible), el esquema del formulario, `toCreateSubscriptionBody`, `toUpdateSubscriptionBody`, `getSubscriptionCapabilities`, `getStatusTargets`, `getDeleteAvailability` y `describeSubscriptionError`;
  2. hooks con MSW: catálogo ordenado, efecto de cada mutación en la caché, nueva consulta ante los rechazos y ningún reintento de las mutaciones;
  3. componentes con Testing Library y user-event: tabla, etiqueta de estatus, detalle según capacidad y clínicas, menú de estatus, eliminación, formulario (validación, lo que incluye y su límite, foco, precio) y pantallas de alta y edición;
  4. integración con la aplicación completa (`renderApp`) por historia de usuario;
  5. axe en el listado, el detalle, el formulario con errores, el menú y los diálogos;
  6. E2E de Playwright (`e2e/subscriptions.spec.ts`), omitidos sin credenciales.
- **Cobertura**: los archivos nuevos van en `api`, `policy`, `schemas`, `hooks` y `shared/lib`, que ya cuentan para el umbral de 80 %.

## D15. Rendimiento y presupuesto de bundle

- Las pantallas de la sección son fragmentos perezosos y el listado comparte con el de usuarios el fragmento del Data Grid. `auth` solo importa un tipo de la feature y `app` solo `parseSubscriptionId`, así que la ruta de entrada crece apenas por los textos, la entrada del registro y las rutas (tras la 005: 274,3 KB de 300). `npm run size` sigue fallando si el Data Grid entra en la ruta de entrada; no hace falta un marcador nuevo.
- **SC-002**: una sola solicitud del catálogo (hasta 100 suscripciones; la API lo entrega completo hasta 500), ordenar y cortar en memoria es inmediato y cambiar de página no pide nada.

## D16. Accesibilidad y diseño adaptable

- Estatus con texto y no solo con color, y filas sin atenuar (WCAG 1.4.1 y 1.4.3); el nombre como enlace; una región `role="status"` que anuncia «Mostrando X a Y de Z suscripciones.» al cambiar de página; lo que incluye, en el detalle, como lista (`<ul>`); campos con etiqueta visible y error asociado; el motivo de un «Eliminar» deshabilitado como texto visible; menú y diálogos operables con teclado y con el foco gestionado; foco al `h1` en cada pantalla. Pruebas con axe (D14).
- Diseño fluido, como en la 001 y la 002: el detalle pasa a una columna en pantallas estrechas, los botones envuelven y la tabla se desplaza dentro de su recuadro, de 1024 a 320 px sin desplazamiento horizontal de la página.

## D17. Fechas

- `formatDateTime` (`shared/lib`) muestra las fechas de creación y de última modificación en la zona horaria del operador; viajan en ISO 8601 (constitución IV).

## D18. Dependencias y riesgos externos

| Riesgo o dependencia | Efecto | Responsable / mitigación |
|---|---|---|
| Los permisos `subscriptions:*` existen en el catálogo del API de usuarios, pero `bootstrap_admin.sql` no se los da a ningún role | Nadie ve la sección y la API responde 403 | Quickstart, paso 1: SQL que los asigna a `Administrator` (y `subscriptions:read` a `Billing`) |
| El API de clínicas aún no existe | Todas las suscripciones muestran «No disponible» y toda eliminación se rechaza con `clinics_check_unavailable` | Es lo previsto (FR-018, FR-019); para validar eliminar, la simulación de clínicas de la API (quickstart) |
| CORS desactivado por defecto en la API | Sin proxy ni lista, el navegador no puede leer sus respuestas | Proxy de desarrollo y configuración por entorno (D13) |
| La API devuelve el catálogo completo (hasta 500) | Si crece o empieza a paginar, este diseño deja de servir | Spec, Assumptions; Complexity Tracking |
| El OpenAPI publicado difiere del documentado: `clinics_count` no figura como obligatorio, `servers` dice 8010 (en esta máquina corre en el 8001) y hay una operación de dashboard que esta feature no consume | Un esquema demasiado estricto o una URL equivocada | Un `clinics_count` ausente es «no disponible»; URL por entorno; contrato consumido |
| La API no controla la concurrencia | Gana la última edición de cada dato | Spec, Concurrencia; solo se envía lo que cambió |
| El catálogo de estatus se edita a mano | Aparecen estatus desconocidos | Se tratan como vigentes (FR-020) |
| El API de usuarios no responde a la API de suscripciones | Todas las operaciones dan `503 authorization_unavailable` | Mensaje genérico con reintento (FR-010) |
| Los ids de suscripción son enteros y los de usuario, UUID | Un parser equivocado rompería las rutas | `parseSubscriptionId` propio (D5) |
