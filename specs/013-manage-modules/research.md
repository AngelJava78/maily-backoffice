# Research: Módulos (013-manage-modules)

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Todas las decisiones parten de código ya leído en este repositorio (`subscriptions`, `users`,
`auth`) y del contrato real, ya implementado, de `C:\Maily\code\mailySoft-usuarios`
(`specs/013-modules-permissions-catalogs/` y `specs/003-permissions/`). No queda ningún
`NEEDS CLARIFICATION`.

## D1 — Arquitectura de la feature

**Decisión**: `src/features/modules/` con la misma forma que `subscriptions` (002/003/012) y
`users` (002): `api/`, `schemas/`, `components/`, `hooks/`, `policy/`, `index.ts` público.

**Razón**: es el patrón que ya exige el principio I de la constitución y el único que usan las
features existentes; no hay motivo para uno distinto.

**Alternativas consideradas**: ninguna — ya está fijado por la constitución y por el código
existente.

## D2 — Cliente HTTP y URL base: se reutiliza `clients.users`, sin variable de entorno nueva

**Decisión**: `src/features/modules/api/modulesApi.ts` recibe el mismo `HttpClient` que ya usa
`users` (`clients.users` de `HttpClientsContext`), con rutas propias:
`MODULES_PATH = '/api/v1/modules'`, `PERMISSIONS_PATH = '/api/v1/permissions'`,
`MODULE_TYPES_PATH`/`MODULE_STATUSES_PATH`/`ACTIONS_PATH` (no se usan, ver D4). No se agrega
`VITE_MODULES_API_URL` ni una entrada nueva en `HttpClientsProvider`.

**Razón**: `src/features/users/api/rolesApi.ts` ya hace exactamente esto — usa el mismo
`clients.users` para pegarle a `/api/v1/roles`, un recurso distinto de `/api/v1/users` pero del
mismo microservicio. `vite.config.ts` confirma que el proxy de desarrollo `/proxy/users` reescribe
quitando ese prefijo y reenvía lo que sigue (`rewrite: (path) => path.replace(/^\/proxy\/users/,
''))`) al mismo `USERS_API_PROXY_TARGET`, así que cualquier ruta bajo `/api/v1/...` de ese servicio
—módulos, permisos, roles, usuarios— llega al mismo backend. En producción `VITE_USERS_API_URL` es
la raíz del mismo servicio, con el mismo razonamiento. Módulos, permisos y roles son, los tres,
recursos de la API de Usuarios (`mailySoft-usuarios`); no son un servicio nuevo.

**Alternativas consideradas**: una variable `VITE_MODULES_API_URL` propia — se descarta por
innecesaria (mismo host) y porque obligaría a documentar y mantener una entrada más en
`.env.example`, `vite.config.ts` y `HttpClientsProvider` sin ningún beneficio.

## D3 — Cómo se obtienen las acciones (permisos) de cada módulo

**Decisión**: `listModules` hace dos solicitudes —`GET /api/v1/modules` (con `status_id`, ver D6) y
`GET /api/v1/permissions` (todos los activos, sin filtro)— y las cruza en la capa `api`:
cada módulo del resultado ya trae su conjunto de acciones (`actions: ReadonlySet<ModuleActionKey>`)
y el identificador del permiso detrás de cada una (`permissionIdByAction`), calculado comparando
`permission.module?.key` con la `key` del módulo y `permission.action?.key` con el catálogo fijo de
acciones (D4). Los componentes nunca ven la lista cruda de permisos.

**Razón**: ni `GET /modules` ni `GET /modules/{id}` traen el detalle de sus acciones (`data-model.md`
de la 013 de `mailySoft-usuarios`: "un módulo no trae sus permisos; cada permiso trae su módulo"); no
existe una ruta "permisos de este módulo". La lista de permisos tampoco pagina y es pequeña (los 60
y tantos predefinidos más los que se vayan creando), así que traerla completa y cruzarla en memoria
es barato y es el mismo patrón que ya usa el comparativo de Suscripciones con su propio catálogo.

**Alternativas consideradas**: pedir el permiso de cada módulo por separado (`GET
/permissions?...` no admite filtrar por módulo) — no existe esa opción en el contrato; consultar
cada acción con `GET /permissions/by-name` una por una — N llamadas por carga de pantalla en vez de
una, sin necesidad.

## D4 — Catálogo de tipos de módulo y de acciones: fijos en el cliente, no se piden a la API

**Decisión**: `src/features/modules/schemas/moduleActionCatalog.ts` define, como constantes
(`as const`), `MODULE_TYPE = { SYSTEM: 1, CLINIC: 2 }` y `MODULE_ACTION_ORDER = ['read', 'write',
'update', 'delete']` con su `id` fijo (`read`→1, `write`→2, `update`→3, `delete`→4) y sus textos en
`messages.modules.actions` (Ver/Crear/Modificar/Eliminar). No se llama a `GET /module-types`, `GET
/module-statuses` ni `GET /actions`.

**Razón**: igual que el catálogo fijo de los nueve módulos de Clínica que ya usa Suscripciones
(`src/features/subscriptions/schemas/clinicModuleCatalog.ts`, spec 012), estos tres catálogos son
"administrados a mano" según su propia especificación: no cambian desde una pantalla, solo con una
migración o una fila insertada directamente en la base. Pedirlos en cada carga de la pantalla
agregaría tres solicitudes y tres estados de carga por algo que no cambia en la sesión de nadie. Los
identificadores (1/2 para el tipo, 1-4 para la acción) están documentados y fijos en
`specs/013-modules-permissions-catalogs/data-model.md` del repositorio de la API.

**Alternativas consideradas**: pedirlos a la API al abrir la pantalla — más fiel a "la API es la
fuente de verdad", pero inconsistente con el patrón ya elegido para un caso idéntico en Suscripciones
y sin beneficio real dado lo estático de estos tres catálogos.

## D5 — Marcar o desmarcar una acción: crear o eliminar un permiso puntual

**Decisión**: marcar una acción nueva llama `POST /api/v1/permissions { name: "<key>:<accion>" }`;
desmarcar una acción que el módulo ya tenía llama `DELETE
/api/v1/permissions/{permissionId}` (el id lo da `permissionIdByAction`, D3).

**Razón**: no existe una operación de la API que reciba "las acciones de un módulo" de una vez; cada
acción es, literalmente, un permiso `clave_del_módulo:clave_de_la_acción` independiente
(`specs/003-permissions` de `mailySoft-usuarios`). Eliminar (no bloquear) es la opción correcta
porque `DELETE /permissions/{id}` libera el nombre de inmediato ("el nombre de un permiso eliminado
se puede reutilizar"), así que volver a marcar la misma acción más tarde simplemente crea un permiso
nuevo con el mismo nombre: no hace falta una operación de "reactivar" ni que la pantalla recuerde el
id del permiso anterior.

**Alternativas consideradas**: `POST /permissions/{id}/block` en vez de eliminar — se descarta
porque "bloquear" ya tiene un significado propio y visible en esta misma pantalla (bloquear el
**módulo completo**, con su botón "Bloquear módulo"); usarlo también para una sola acción mezclaría
dos conceptos distintos bajo el mismo verbo. El mockup tampoco muestra ningún estado intermedio por
acción, solo marcada o sin marcar.

## D6 — Filtro de estatus en el servidor; tipo y búsqueda en el cliente

**Decisión**: el filtro "Estatus" (Activos/Bloqueados) viaja como `status_id` en `GET /modules`
(dispara una solicitud nueva al cambiarlo). Los filtros "Tipo" y "Buscar" se aplican en el cliente
sobre el resultado ya cargado, sin solicitud nueva.

**Razón**: el contrato sí ofrece `status_id` como filtro de servidor y el principio IV pide usar los
filtros de servidor cuando el contrato lo permite; Activos y Bloqueados son, en los hechos, dos
listas distintas y no tiene sentido traer ambas para descartar la mitad en el cliente. "Tipo" y
"Buscar" no tienen equivalente de servidor con esta forma (el `type_id` existe, pero cambiarlo no
debería generar una solicitud nueva cuando ya se tiene el catálogo completo de ese estatus en
memoria): es el mismo criterio que ya usa el comparativo de Suscripciones para su control
Mensual/Anual, que reutiliza el catálogo ya cargado en vez de volver a pedirlo (FR-019/SC-005 de la
012).

**Alternativas consideradas**: los tres filtros de servidor — más solicitudes de red por cada cambio
de Tipo o de texto en Buscar, sin beneficio porque el catálogo completo de un estatus ya es pequeño
(máximo 100, documentado en el contrato).

## D7 — Tabla con secciones, no MUI X Data Grid

**Decisión**: el listado usa `Table`/`TableHead`/`TableBody`/`TableRow`/`TableCell` de MUI con filas
de encabezado de grupo ("Sistema, pantallas del Backoffice · N módulos"), no `DataGrid`.

**Razón**: mismo caso ya resuelto en la 012 (research D7, `SubscriptionsComparisonTable`): el Data
Grid de MUI X no modela limpio una tabla con secciones agrupadas y filas de encabezado intercaladas;
una `Table` normal sí, y con 23 filas reales (hasta 100 documentadas) no hace falta virtualización.

**Alternativas consideradas**: `DataGrid` con agrupamiento — su agrupamiento community no reproduce
el diseño exacto del mockup (encabezado de sección con conteo, sin controles de expandir/contraer) y
agrega una dependencia pesada para una tabla pequeña y sin paginar.

## D8 — Catálogo de errores y capacidades

**Decisión**: `src/features/modules/api/moduleErrors.ts` exporta `describeModuleError(error,
operation)`, mismo patrón que `subscriptionErrors.ts`, mapeando los códigos reales del contrato:
`module_key_already_exists`/`module_name_already_exists` → error de campo (`key`/`name`);
`module_not_found`/`permission_not_found` → `notFound`; `module_protected` → `protected`;
`module_already_blocked`/`module_already_active` → `statusUnchanged`; `validation_error` → error de
campo o de formulario según el campo que reporte (`key`, `type_id`, `name`, etc.);
`permission_name_already_exists` → se trata como reintentable/"vuelve a intentar" (no debería
ocurrir en uso normal, solo por una carrera entre dos personas marcando la misma acción a la vez).
`src/features/auth/policy/moduleCapabilities.ts` exporta `getModuleCapabilities(access)`, mismo
patrón que `subscriptionCapabilities.ts`: `canCreate` (`modules:write`), `canEdit`/`canBlock`/
`canUnblock` (los tres con `modules:update`, igual que editar y cambiar de estatus comparten permiso
en Suscripciones) y `canDelete` (`modules:delete`). El tipo `ModuleCapabilities` se define en
`src/features/modules` y `auth` lo importa, igual que ya hace con `SubscriptionCapabilities`.

**Razón**: son los dos únicos lugares que ya existen en el código para esto; reproducirlos letra por
letra evita inventar un tercer patrón.

## D9 — Confirmación al desmarcar una acción: siempre, no condicionada a si algún role la tiene

**Decisión**: la pantalla pide confirmación explícita (nombrando el módulo y la acción) cada vez que
se va a desmarcar una acción que el módulo ya tenía, sin importar si algún role la tiene asignada de
verdad.

**Razón**: el principio VI exige confirmación en acciones de alto impacto, pero ninguna respuesta de
la API (ni la del permiso, ni la de un módulo) dice qué roles tienen asociado un permiso dado; solo
`GET /roles/{id}/permissions` lo muestra, uno por rol, lo que exigiría recorrer todos los roles del
sistema en cada edición de un módulo solo para decidir si preguntar. Preguntar siempre es la opción
honesta, barata y segura: nunca se corre el riesgo de omitir el aviso porque no se pudo verificar a
tiempo.

## D10 — Maestro-detalle en una sola pantalla, con su estado en la URL

**Decisión**: una sola ruta `/modules` (sin `/modules/new` ni `/modules/:id/edit`); un hook
`useModulesLocation` (mismo patrón que `useSubscriptionsLocation`) guarda en los parámetros de
búsqueda el tipo, el estatus, el texto de búsqueda y cuál panel está abierto (ninguno, editando el
módulo `N` o creando uno nuevo), para que la dirección se pueda compartir, recargar o volver atrás
sin perder nada (principio III).

**Razón**: el mockup (páginas 11 a 14) nunca navega a otra pantalla para editar o crear: el panel de
la derecha cambia de contenido sobre la misma pantalla. Esto es distinto de cómo hoy funcionan
Usuarios y Suscripciones (rutas separadas de alta y edición), pero Módulos no es uno de "los tres
recursos" que el principio VI obliga a seguir ese patrón (usuarios, suscripciones, clínicas); el
propio mockup ya define un patrón distinto para esta pantalla y se sigue tal cual. El panel de
edición reutiliza el módulo ya cargado por la lista (misma consulta de TanStack Query): no hace falta
una segunda solicitud al abrirlo.

## D11 — Alta y edición no son transacciones: orden, fallos parciales y qué se le dice a la persona

**Decisión** (principio IV: "si un caso exige varias llamadas, el spec DEBE definir el orden, los
fallos parciales y la compensación"):

- **Alta**: primero `POST /modules`. Si falla, no se crea ningún permiso (nada que deshacer). Si
  tiene éxito, se crea un permiso por cada acción marcada, **en secuencia** (no en paralelo), para
  poder decir con precisión cuál falló. Si alguna falla, el módulo ya existe: no se deshace (borrarlo
  justo después de crearlo arriesga chocar con alguien que ya lo vio, y la API no ofrece una
  operación atómica que lo evite). La persona queda de inmediato en el panel de **Editar** ese módulo
  ya creado, con un aviso de qué acciones se guardaron y cuál no, y puede reintentar marcarla: desde
  ahí es una sola llamada.
- **Edición**: primero `PATCH /modules/{id}` si cambió nombre, descripción u orden. Después, cada
  acción que cambió (marcada → crear permiso; desmarcada → eliminar permiso), también en secuencia.
  Mismo criterio de reporte parcial si alguna falla a medio camino.

**Razón**: ninguna operación cubre "módulo con sus acciones" de una sola vez; es justo el caso que el
principio IV pide documentar en vez de ignorar. Deshacer automáticamente es más riesgoso que dejar un
estado parcial claramente explicado, porque exigiría otra llamada (un `DELETE` del módulo recién
creado) que puede fallar igual o pisar un cambio ya visible para otra persona.

## D12 — Icono de navegación

**Decisión**: se agrega `modules: Blocks` a `src/shared/ui/iconRegistry.ts` (de `lucide-react`,
el mismo paquete ya usado por el resto del registro).

**Razón**: ningún icono existente del registro representa "piezas del sistema"; `Blocks` es
distinto visualmente de `users` (`Users`), `subscriptions` (`CreditCard`), `clinics` (`Building2`) y
`token` (`KeyRound`), y es la metáfora habitual para "módulos" en paneles de administración.

## D13 — El orden por omisión es global, no por tipo (aunque el mockup lo muestre así)

**Decisión**: cuando se crea un módulo sin indicar `sortOrder`, el valor que se envía es el mayor
`sort_order` entre **todos** los módulos no eliminados (Sistema y Clínica juntos) más 10 — nunca el
mayor del mismo tipo. El cálculo se hace con la lista ya cargada por la pantalla (sin una llamada
aparte).

**Razón**: `specs/013-modules-permissions-catalogs/spec.md` de `mailySoft-usuarios` (FR-009) y su
`data-model.md` lo dicen en esos términos — "el mayor `sort_order` entre los módulos no eliminados
más 10" — sin ninguna mención a agruparlo por tipo; los cuatro módulos protegidos (todos de Sistema)
ya ocupan 10/20/30/40 en ese único orden global. Las páginas 11 a 14 del mockup muestran cada grupo
(Sistema y Clínica) empezando otra vez en 10, pero es un dato de ejemplo del diseño, no un
comportamiento documentado en ningún lado: tomarlo como regla contradiría la especificación explícita
y ya implementada del backend. El listado de esta pantalla sigue mostrando cada módulo dentro de su
grupo en el mismo orden relativo que ya trae la API (FR-001, FR-016 de esa misma spec: "ordenados por
`sort_order` y después por `name`"); solo cambia de qué número exacto parte un módulo de Clínica
creado sin indicar orden.

**Alternativas consideradas**: calcular el máximo por tipo (para que cada grupo arranque limpio en
10, como en el mockup) — se descarta por contradecir el contrato real ya implementado; no es una
decisión de esta pantalla, sino del backend.

## Nota para quien gobierna el proyecto (no bloqueante)

La constitución vigente (v1.4.0, "Alcance del producto") describe el alcance como usuarios,
suscripciones y clínicas. Esta feature agrega módulos como un cuarto recurso administrado, ya
visible en el mockup como una sección más del Backoffice. Enmendar esa sección (con
`/speckit-constitution`) queda fuera de alcance de este plan; se deja señalado para que la persona
responsable del proyecto decida si corresponde.
