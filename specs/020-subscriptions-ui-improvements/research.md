# Investigación: Reorganización visual del formulario, el listado y el comparativo de suscripciones

**Feature**: `020-subscriptions-ui-improvements` | **Fecha**: 2026-10-27 | **Spec**: [spec.md](spec.md)

Esta feature no abre preguntas de proceso de negocio (las resolvió `/speckit-clarify`) ni de contrato de API (no agrega, cambia ni repite ninguna llamada: todo el dato ya lo trae `useSubscriptionCatalog()`, D8). La investigación real es sobre cómo encajar el pedido dentro de patrones que el código ya tiene, sobre todo uno que hoy **no existe tal como el spec lo da por hecho**: el ordenamiento interactivo de la grilla del listado está deshabilitado por completo (D1). No queda ningún `NEEDS CLARIFICATION`.

## D1. El listado necesita activar el ordenamiento de la grilla, que hoy está deshabilitado del todo

**Decisión**: `SubscriptionsGrid.tsx` tiene `disableColumnSorting` en el `DataGrid` (línea 110) y una prueba propia que fija ese comportamiento (`'neither sorts nor has a menu of columns: the order is fixed'`). El spec (FR-006, User Story 2 escenario 2) pide explícitamente que, además del orden ascendente por precio mensual al abrir, "el operador pueda reordenarlas por cualquier otra columna, con el mismo mecanismo de ordenamiento que la grilla ya ofrece" — ese mecanismo, en los hechos, no existe hoy en esta grilla (sí en el sentido de que `DataGrid` lo soporta de fábrica, pero aquí estaba apagado a propósito). Se activa quitando `disableColumnSorting`, con `sortingMode="server"` (ver D2) y `sortingOrder={['asc', 'desc']}` (dos estados únicamente, sin un tercer clic que deje la columna "sin orden": siempre hay un orden determinado, nunca ambiguo).

**Alternativas**: dejar `disableColumnSorting` y mostrar solo el orden fijo ascendente por precio mensual, sin que el operador pueda cambiarlo — se descarta: contradice la letra del FR-006 y del escenario de aceptación correspondiente, que sí pide reordenar por cualquier columna.

## D2. El orden del listado vive en la URL, como la constitución ya exige para «orden» de un listado

**Decisión**: `SubscriptionsLocation` (`schemas/subscriptionsLocation.ts`) gana un campo `sort: { field: SubscriptionsSortField; direction: 'asc' | 'desc' }`, con el mismo patrón ya usado por `page`/`pageSize`/`tab`: se parsea de un único parámetro `?sort=` (p. ej. `sort=name` o `sort=-name` para descendente, el prefijo `-` ya es una convención común y evita dos parámetros separados) y se omite de la URL cuando es el valor por defecto (`monthlyPrice` ascendente). `SubscriptionsGrid` pasa a ser una grilla controlada en su orden: `sortingMode="server"` (como ya hace con `paginationMode="server"` para una grilla cuyos datos ya están completos en el cliente, research D-pagination de la 003) con `sortModel`/`onSortModelChange` controlados desde `SubscriptionsListPage`, que a su vez llama a un nuevo `setSort` de `useSubscriptionsLocation`. El `sort` se aplica al arreglo completo (`query.data`) antes de `pageOf`, nunca a la página ya recortada, igual que tendría que hacerlo un servidor real.

**Alternativas**: dejar el orden como estado efímero de la propia `DataGrid` (ni en la URL ni en React) — se descarta: constitución III es explícita en que "orden" (junto con página, tamaño de página y filtros) de un listado DEBE vivir en los search params, para poder compartir el enlace, recargar y usar el botón Atrás.

## D3. El ciclo de precio del Comparativo se queda fuera de la URL; el filtro de tipo nuevo, dentro

**Decisión**: dos controles conviven en el Comparativo, pero no son lo mismo para la constitución. El ciclo Mensual/Anual (`PriceCycleToggle`) es una preferencia de qué precio **mostrar**, no excluye ningún plan de la tabla; el spec pide explícitamente mantenerlo sin cambios de comportamiento ("se mantiene"), así que sigue como el `useState` local que ya es hoy en `SubscriptionsListPage.tsx`. El filtro de tipo nuevo (Individual/Empresarial), en cambio, sí excluye planes enteros de la tabla: es un filtro en el sentido literal de constitución III ("filtros... DEBEN vivir en los search params"), así que se agrega como `comparisonType: SubscriptionTypeId` a `SubscriptionsLocation`, con el mismo patrón que `modulesLocation.ts` ya usa para sus propios filtros (`type_id`/`status_id`, el único precedente de un filtro persistido en la URL en todo el repositorio): un parámetro `type_id` (`'2'` para Empresarial; ausente u otro valor es Individual, el valor por defecto, Assumptions del spec).

**Alternativas**: guardar el filtro de tipo también como `useState` local, igual que el ciclo — se descarta: a diferencia del ciclo, si cambia qué se ve en pantalla por exclusión de filas, cuenta como "filtro" y la constitución no deja alternativa.

## D4. El límite de clínicas es una fila propia del Comparativo, no un quinto elemento de `LIMIT_FIELDS`

**Decisión**: `LIMIT_FIELDS` (en `SubscriptionsComparisonTable.tsx`) asume cuatro campos uniformes, siempre numéricos y nunca nulos (`consultingRoomsLimit`, etc.). El límite de clínicas es `number | null` (019): se agrega como una fila propia (`MetricRow` independiente, no un quinto elemento del arreglo), con su propia celda que resuelve `null` a «No disponible», exactamente el mismo patrón que ya usa la fila «Clínicas con el plan» existente (`subscription.clinicsCount ?? text.clinics.notAvailable`). Se ubica primero dentro de la sección «Límites de la clínica», antes de Consultorios/Doctores/Asistentes/Pacientes nuevos al año, el mismo orden ya decidido para la sección «Límites» del formulario (spec, Assumptions).

**Alternativas**: forzar el límite de clínicas dentro de `LIMIT_FIELDS` con un valor de respaldo para `null` (p. ej. mostrar vacío) — se descarta: perdería el texto «No disponible» ya establecido para este mismo dato en el detalle (019) y en el listado (FR-012 de esta feature).

## D5. Los iconos de Módulos reutilizan el texto ya existente como nombre accesible, sin texto nuevo

**Decisión**: `Icon` (`shared/ui/Icon.tsx`) ya separa icono decorativo de icono informativo (`accessibleName`, anunciado por un lector de pantalla vía `role="img"`/`aria-label`). Cada celda de Módulos pasa de mostrar el texto `comparison.moduleIncluded`/`moduleNotIncluded` a mostrar `<Icon name=... accessibleName={comparison.moduleIncluded | moduleNotIncluded} .../>`: el mismo texto español que ya existe, ahora como nombre accesible del icono en vez de contenido visible de la celda. No se agrega ningún texto nuevo para esto, y las pruebas que ya consultan por ese texto (`SubscriptionsComparisonTable.test.tsx`) lo siguen encontrando, solo que como `aria-label` en vez de texto de celda.

**Alternativas**: agregar un texto nuevo tipo "Icono de módulo incluido" — se descarta: duplicaría un texto que ya existe y ya está aprobado, sin ninguna ganancia.

## D6. Dos claves nuevas en `iconRegistry`, no reutilizar `status-up`/`status-down`

**Decisión**: `iconRegistry.ts` ya tiene `'status-up': CircleCheck` y `'status-down': CircleX`, visualmente del tipo que pide el usuario (palomita/X), pero su nombre y su razón de ser son de «Salud de servicios» (feature 016): un estado operativo, no una inclusión de módulo. Se agregan dos claves propias, `included: Check` y `'not-included': X` (de `lucide-react`, el mismo paquete ya en uso, único punto de importación), con color `exito`/`peligro` (los mismos tokens de color que ya usa el resto del backoffice para afirmativo/negativo, `shared/theme/tokens.ts`). Es el único archivo que hay que tocar para esto; `IconName` se deriva automáticamente de sus claves.

**Alternativas**: reutilizar `status-up`/`status-down` — se descarta: mezclaría un nombre pensado para el dominio de salud de servicios con un uso de inclusión de módulos; el costo de dos claves nuevas en el mismo archivo es mínimo y mantiene el registro legible.

## D7. Los precios se ordenan con `toCents()`, ya escrito y probado exactamente para esto

**Decisión**: `schemas/price.ts` ya tiene `toCents(text: string): number`, documentado explícitamente como «to compare and to sort prices exactly» (evita el error de coma flotante de multiplicar un decimal por 100, p. ej. `0.29 * 100` da `28.999...`), y ya tiene sus propias pruebas (`price.test.ts`). Las columnas Precio mensual y Precio anual de `SubscriptionsGrid` usan `toCents(subscription.monthlyPrice)`/`toCents(subscription.annualPrice)` como valor que la grilla ordena (`valueGetter`), y lo reconvierten a texto solo para mostrarlo (`valueFormatter`, D10). El orden del Comparativo por el ciclo vigente (spec, User Story 3 escenario 6) usa la misma función.

**Alternativas**: `Number(subscription.monthlyPrice)` directo — se descarta: existe ya una función hecha, probada y pensada exactamente para comparar y ordenar precios en este mismo repositorio; no reusarla sería reinventar lo que `price.ts` ya resuelve.

## D8. Sin contrato de API nuevo: todo el dato ya lo trae el catálogo que la pantalla ya pide

**Decisión**: tipo, límite de clínicas, límite de consultorios, precio anual y número de clínicas con el plan ya están en `Subscription` (`subscription.ts`, de las features 003/012/018/019) y ya los trae `useSubscriptionCatalog()`, la misma consulta que el listado y el Comparativo ya usan hoy. Esta feature no agrega, cambia ni repite ninguna llamada a la API de suscripciones: por eso no se genera ningún `contracts/` nuevo (a diferencia de la 019, que sí predijo un contrato todavía no implementado). El único cambio de "comportamiento" nuevo (el filtro de tipo del Comparativo) es enteramente de presentación en el cliente, sobre datos ya recibidos.

**Alternativas**: ninguna; no hay una decisión de contrato que tomar porque no hay contrato que cambie.

## D9. Cambiar el orden del listado regresa a la página 1

**Decisión**: igual criterio que ya usa `setPageSize` (que también regresa a la página 1 al cambiar), el nuevo `setSort` de `useSubscriptionsLocation` también regresa a la página 1: con un orden distinto, "la página 3" ya no muestra las mismas filas que el operador esperaba encontrar ahí.

**Alternativas**: mantener la página vigente al cambiar el orden — se descarta por consistencia con el único precedente ya existente en este mismo hook (`setPageSize`).

## D10. Valor de orden separado del formato de presentación en las columnas numéricas

**Decisión**: las columnas que se agregan o cambian de forma (Precio mensual, Precio anual, Clínicas, Consultorios) usan `valueGetter` para el valor exacto que la grilla ordena (centavos para precios, D7; el número crudo para Clínicas/Consultorios) y `valueFormatter`/`renderCell` solo para el texto que se muestra (p. ej. `text.price.perMonth(formatMxn(...))`). Es necesario porque hoy `monthlyPrice` ya devuelve directamente el texto formateado (`"$4,500.00/mes"`) como valor de celda: si se activara el ordenamiento (D1) sin este cambio, la grilla ordenaría ese texto alfabéticamente («$1,000.00/mes» antes que «$200.00/mes»), no numéricamente.

**Alternativas**: un `sortComparator` personalizado que reinterprete el texto ya formateado — se descarta: es más frágil (depende de parsear de vuelta un texto pensado para leerse, no para compararse) que separar desde el origen el valor de orden del texto de presentación.
