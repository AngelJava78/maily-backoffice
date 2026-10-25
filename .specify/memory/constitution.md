# Constitución de MailySoft Backoffice

Convención normativa (RFC 2119): DEBE = MUST, NO DEBE = MUST NOT, DEBERÍA = SHOULD, PUEDE = MAY.

## Principios Fundamentales

### I. Arquitectura por Features y React Idiomático

- Solo componentes de función y Hooks. NO DEBEN escribirse componentes de clase, salvo un único
  Error Boundary reutilizable.
- El render DEBE ser puro: sin efectos secundarios ni lectura de fuentes mutables (`Date.now()`,
  `Math.random()`, `window`) mientras se renderiza. Las Reglas de los Hooks y las dependencias de
  efectos DEBEN verificarse con `eslint-plugin-react-hooks` como error.
- `useEffect` DEBE reservarse para sincronizar con sistemas externos. NO DEBE usarse para derivar
  estado, transformar datos, responder a eventos del usuario ni obtener datos del servidor.
- Los componentes DEBEN ser pequeños, de responsabilidad única y favorecer la composición
  (`children`, props) sobre las banderas de configuración. La lógica reutilizable o con efectos
  DEBE vivir en custom hooks `useXxx`. Un archivo de componente de más de 250 líneas DEBE dividirse
  o justificarse en la revisión.
- `useMemo`, `useCallback` y `React.memo` NO DEBEN aplicarse de forma preventiva, solo con
  evidencia medida (React Profiler); si se adopta React Compiler, la memoización se delega en él.
- La estructura DEBE ser por features: `src/app` (providers, router, layouts, configuración),
  `src/features/<feature>` (api, components, hooks, schemas, pages y un `index.ts` público) y
  `src/shared` (UI genérica, hooks, utilidades). Las dependencias fluyen
  `app → features → shared`: una feature NO DEBE importar internos de otra (solo su `index.ts`) y
  `shared` NO DEBE importar de `features`. ESLint DEBE hacer cumplir estos límites.
- NO DEBEN introducirse abstracciones especulativas (HOCs, render props, patrón repositorio,
  stores globales, microfrontends) sin una necesidad demostrada; toda complejidad adicional se
  justifica en Complexity Tracking del plan (YAGNI).
- Los componentes usan PascalCase (un componente principal por archivo); los identificadores,
  archivos y rutas de código van en inglés.
- Excepción: los NOMBRES de los tokens de diseño (colores, tipografía, espaciado, radios, sombras,
  breakpoints) PUEDEN estar en español cuando repliquen los nombres de un sistema de diseño de
  referencia externo (p. ej. los tokens de MailySoft v2 / web-soft adoptados por la feature
  008-design-system: `marca`, `accion`, `tinta`, `cuerpo`, `suave`, `tenue`, `fondo`, `superficie`,
  `superficie-sutil`, `borde`, `borde-fuerte`, `exito`, `aviso`, `peligro`, con sus variantes
  `-hover`, `-tinte`, `-borde`, `-oscuro`, `-icono`). La excepción se limita estrictamente a los
  nombres de los tokens: el resto de identificadores, funciones, archivos y rutas de código sigue
  en inglés sin excepción.

**Razón**: el render predecible y las responsabilidades acotadas son lo que permite que una SPA con
tres dominios escale sin volverse un monolito acoplado. La excepción de los tokens existe porque
sus nombres deben coincidir con los de un sistema de diseño de referencia (p. ej. web-soft) para
que las aplicaciones se reconozcan como un mismo producto.

### II. TypeScript Estricto y Datos Validados en la Frontera

- TypeScript DEBE compilar con `strict` y `noUncheckedIndexedAccess`. NO DEBEN usarse `any`,
  `@ts-ignore` ni aserciones `as` para silenciar tipos (se usa `unknown` y narrowing);
  `@ts-expect-error` solo con un comentario que lo justifique.
- Todo dato que cruce una frontera (respuestas de API, claims de tokens, variables de entorno,
  parámetros de URL, formularios) DEBE validarse en runtime con Zod. Los tipos se infieren de los
  esquemas (`z.infer`), con un único esquema por entidad como fuente de verdad.
- Los DTOs de la API (snake_case) DEBEN convertirse a modelos de dominio del frontend (camelCase)
  en la capa `api` de cada feature; los componentes solo conocen modelos de dominio.
- Las props y los valores de retorno de los hooks públicos DEBEN estar tipados explícitamente.

**Razón**: tres backends independientes pueden desviarse del contrato sin aviso; validar en la
frontera convierte el desvío en un error explícito y no en un fallo silencioso en pantalla.

### III. Estado de Servidor Separado del Estado de Cliente

- El estado de servidor (usuarios, clínicas, suscripciones, resumen del Panel, usuario actual y su
  role) DEBE gestionarse con TanStack Query. NO DEBE copiarse a `useState`, Context ni stores globales.
- Las query keys DEBEN producirse con factorías por feature (p. ej. `userKeys.list(params)`). Toda
  mutación DEBE invalidar o actualizar explícitamente las queries afectadas; las actualizaciones
  optimistas solo se usan donde el spec las justifique.
- Los formularios DEBEN usar React Hook Form con resolver Zod. Los errores de validación por campo
  devueltos por la API DEBEN mapearse a los campos correspondientes.
- El estado de UI es local por defecto (`useState`/`useReducer`) y se eleva solo cuando hay
  consumidores compartidos. Context se reserva para preocupaciones transversales de cambio poco
  frecuente (sesión, tema, notificaciones). Un store global (p. ej. Zustand) requiere
  justificación en Complexity Tracking.
- El estado navegable de los listados (página, tamaño de página, orden, filtros, búsqueda) DEBE
  vivir en los search params de la URL, para permitir enlaces compartibles, recarga y botón Atrás.
- Al cerrar sesión DEBE vaciarse por completo la caché de TanStack Query y cualquier estado
  dependiente del usuario. Esa caché NO DEBE persistirse en el almacenamiento del navegador.

**Razón**: mezclar datos remotos con estado de UI produce duplicados desactualizados; separar ambos
da caché, revalidación y manejo de carga/error sin código a medida.

### IV. Integración con APIs REST por Contrato

- Toda operación de administración (listar, mostrar, crear, modificar, eliminar) DEBE ejecutarse a
  través de las APIs REST de MailySoft. El backend es la fuente de verdad: el frontend NO DEBE
  duplicar reglas de negocio autoritativas ni usar otros medios de persistencia.
- Las URLs base de cada servicio DEBEN provenir de variables de entorno validadas al arrancar; NO
  DEBEN existir hosts, puertos ni URLs base hardcodeados en el código.
- Un único cliente HTTP tipado, basado en `fetch`, DEBE encapsular la inyección del Bearer token,
  la serialización, un timeout explícito (30 s por defecto), la cancelación con `AbortSignal` y la
  normalización de errores a un tipo `ApiError`. Los componentes NO DEBEN llamar a `fetch` ni
  construir el header `Authorization`. El token SOLO DEBE enviarse a los hosts de las APIs
  configuradas.
- Las APIs son asíncronas pero se consumen como request/response estándar (200/201/204). Toda
  llamada DEBE modelar estados explícitos (cargando, éxito, error, vacío) y ser cancelable. NO se
  asume polling ni 202 Accepted: si un endpoint requiere ese patrón, el spec DEBE documentarlo y
  justificarlo en Complexity Tracking, y la UI NUNCA DEBE asumir éxito antes del estado terminal.
- Actualización periódica: una consulta de lectura (GET) PUEDE repetirse a intervalo fijo para
  mantener vigentes los datos que la persona está viendo (p. ej. el Panel) o el acceso de la sesión.
  El spec DEBE definir el intervalo (acotado y configurable por entorno, o una constante
  documentada) y cuándo se consulta y cuándo no. La repetición DEBE pausarse con la pestaña oculta,
  NO DEBE haber más de una consulta igual en curso y NO DEBE contar como actividad para el cierre
  por inactividad. No es el polling de operaciones asíncronas del punto anterior y no requiere
  Complexity Tracking.
- Reintentos: solo en GET, máximo 2, con backoff y únicamente ante fallos de red o 5xx. Las
  mutaciones NO DEBEN reintentarse automáticamente y la UI DEBE deshabilitar la acción mientras la
  mutación esté pendiente (evita el doble envío).
- Los listados DEBEN usar paginación del lado del servidor con `page` y `page_size`, y orden y
  filtros en servidor cuando el contrato lo permita. NO DEBE descargarse una colección completa
  para paginarla en el cliente.
- El manejo de errores DEBE ser uniforme. 401: un único intento de renovar el token y, si falla,
  redirigir a login conservando la ruta de retorno. 403: estado "sin permisos" sin cerrar sesión.
  404: "no encontrado". 409/422: mensaje de negocio o error por campo. Red/5xx: mensaje genérico
  con opción de reintentar; en una pantalla con actualización periódica, esa opción PUEDE ser el
  reintento automático del siguiente ciclo (ver principio VI). NO DEBEN mostrarse trazas ni
  mensajes crudos del servidor.
- El frontend NO DEBE orquestar transacciones distribuidas entre servicios. Si un caso (p. ej.
  crear una clínica y asignar su owner) exige varias llamadas, el spec DEBE definir el orden, los
  fallos parciales y la compensación; DEBERÍA preferirse una operación única en el backend.
- Los contratos documentados en `specs/<feature>/contracts/` son la fuente de verdad; si las APIs
  publican OpenAPI, los tipos y esquemas DEBERÍAN derivarse de él. Las rutas exactas del backend
  (p. ej. `/suscriptions`) se aíslan en la capa `api` para que un cambio de contrato no se propague
  a los componentes.
- Las fechas viajan en ISO 8601 (UTC); el formateo localizado ocurre solo en la capa de
  presentación mediante `Intl`.

**Razón**: el frontend depende de servicios que evolucionan por separado; un único punto de
integración, validado y con errores normalizados, acota el impacto de cualquier cambio de contrato.

### V. Seguridad y Autenticación con Auth0 (NO NEGOCIABLE)

**Autenticación**

- La autenticación DEBE usar Auth0 mediante `@auth0/auth0-react` con Authorization Code Flow y
  PKCE; la aplicación en Auth0 DEBE ser de tipo Single Page Application. NO DEBE existir client
  secret, API key ni credencial privilegiada en el código, el bundle ni las variables `VITE_*`
  (todas son públicas).
- Los tokens DEBEN permanecer en memoria (caché por defecto del SDK). NO DEBEN persistirse en
  `localStorage`, `sessionStorage`, IndexedDB, cookies ni en la URL. Si se usan refresh tokens, la
  rotación DEBE estar habilitada. Cualquier excepción (p. ej. conservar la sesión entre recargas)
  requiere un análisis de riesgo documentado en Complexity Tracking. En el navegador solo PUEDEN
  guardarse preferencias de UI no sensibles.
- DEBEN existir login, logout y perfil de usuario. El logout DEBE cerrar también la sesión en
  Auth0, volver a una URL permitida y limpiar caché y estado (ver III). Si la renovación silenciosa
  de la sesión falla, DEBE redirigirse a login conservando la ruta de retorno; la única excepción
  es la de la herramienta temporal de token (ver su subsección más abajo).
- Todas las rutas, salvo las públicas explícitas (inicio de sesión y callback), DEBEN estar
  protegidas. El contenido protegido NO DEBE renderizarse mientras la sesión o el role estén sin
  resolver (fail closed).

**Autorización**

- Auth0 solo autentica. El role de sistema efectivo DEBE obtenerse de la API de usuarios de
  MailySoft tras el login (fuente de verdad) y gobierna el acceso y la navegación. Un usuario
  autenticado sin usuario o role autorizado en MailySoft DEBE ver "acceso denegado" con opción de
  cerrar sesión.
- Las reglas role → capacidad DEBEN residir en un único módulo de políticas (p. ej.
  `can('clinics:create')`); NO DEBEN compararse nombres de role sueltos en los componentes. El
  frontend usa el role solo para UX (mostrar, ocultar, deshabilitar): la autorización real SIEMPRE
  la imponen las APIs y el frontend DEBE manejar el 403.

**Datos y entorno**

- NO DEBEN registrarse (consola, logs, reportes de errores, analítica) tokens, claims completos ni
  datos personales innecesarios. NO DEBE usarse `dangerouslySetInnerHTML` con contenido no
  confiable; si es inevitable, DEBE sanitizarse (p. ej. con DOMPurify) y aprobarse en revisión.
- Todo entorno distinto del desarrollo local DEBE servirse y consumir las APIs por HTTPS; el
  despliegue DEBERÍA aplicar una Content Security Policy restrictiva.

**Herramienta temporal de token para Postman**

- DEBE implementarse como módulo aislado (`features/postman-token`) y su pantalla DEBE cargarse de
  forma diferida, solo cuando la persona pasa la guarda de permiso. Su disponibilidad la decide
  únicamente el permiso `token:read` de los roles de la persona, evaluado en el módulo de políticas
  y asignado o retirado en la API de usuarios: NO DEBE depender del entorno ni de una variable de
  configuración. Mientras ningún role tenga el permiso, la herramienta no existe para nadie.
- "Generar" significa solicitar al SDK de Auth0 un access token vigente (con el `audience` de las
  APIs de MailySoft) del usuario autenticado. NO DEBE firmar tokens, usar client credentials ni
  manejar secretos. El token se muestra enmascarado por defecto, con acciones de mostrar/ocultar y
  copiar, su fecha de expiración y una advertencia de sensibilidad; vive solo en el estado del
  componente, se descarta al desmontar o cerrar sesión y NO DEBE persistirse ni registrarse.
- Excepción a la renovación fallida: si la persona pulsa «Generar» o «Refrescar» y la renovación
  de la sesión falla, la herramienta PUEDE mostrar el fallo en su pantalla, con «Reintentar» e
  «Iniciar sesión de nuevo», en lugar de redirigir de inmediato, para no perder el token que ya
  tiene en pantalla y poder reintentar. «Iniciar sesión de nuevo» DEBE redirigir a login
  conservando la ruta de retorno. La excepción cubre solo la solicitud que la persona inicia en esa
  pantalla: las renovaciones en segundo plano y los `401` de las APIs siguen la regla general.
- Ningún otro módulo DEBE depender de él. Retirarlo (quitar el permiso a los roles y eliminar el
  módulo, su ruta, su entrada de navegación y su recurso en el módulo de políticas) NO requiere
  enmienda de esta constitución.

**Razón**: un backoffice administra usuarios, clínicas y suscripciones de todos los clientes, así
que un compromiso expone a todos ellos. Ocultar opciones en la UI no es seguridad: por eso la
autorización vive en las APIs y los tokens nunca se persisten.

### VI. Experiencia de Usuario, Accesibilidad y Consistencia

- La UI DEBE construirse con MUI y MUI X Data Grid (versión community) con un theme centralizado
  (color, tipografía, espaciado). NO DEBEN mezclarse otras librerías de componentes ni CSS global
  ad hoc; los estilos usan el sistema de estilos de MUI.
- Toda pantalla que dependa de datos remotos DEBE implementar los estados cargando, vacío, error
  (con acción de reintentar) y éxito; las mutaciones DEBEN notificar el éxito o el error al usuario.
  En una pantalla de solo lectura con actualización periódica (principio IV), el reintento
  automático del siguiente ciclo PUEDE sustituir a la acción de reintentar; si falla una
  actualización con datos en pantalla, DEBEN conservarse junto con la hora de su última
  actualización correcta y DEBE avisarse de que no se pudieron actualizar.
- Los recursos administrados DEBEN seguir el mismo patrón para Listar, Mostrar, Crear, Modificar y
  Eliminar: listado paginado, detalle, formulario compartido para crear y editar, y eliminación con
  diálogo de confirmación. El recurso de Roles sigue este patrón con una variante de presentación:
  lista maestro-detalle en una sola pantalla, con pestañas por tipo (Clínica/Sistema), en vez de
  listado y detalle en rutas separadas; esta variante es parte normal del patrón para ese recurso y
  no requiere Complexity Tracking.
- Las acciones destructivas o de alto impacto (eliminar cualquier recurso, cambiar el role de
  sistema de un usuario, asignar o cambiar el owner de una clínica) DEBEN pedir confirmación
  explícita que nombre el recurso afectado.
- La accesibilidad DEBE cumplir WCAG 2.1 AA: HTML semántico, etiquetas asociadas a cada control,
  operación completa por teclado, gestión de foco en diálogos y cambios de ruta, y contraste
  suficiente. `eslint-plugin-jsx-a11y` DEBE estar activo y las pantallas principales DEBEN pasar
  verificaciones automáticas con axe en las pruebas.
- Los textos de interfaz DEBEN estar en español y centralizados en un único módulo de mensajes (sin
  literales dispersos en JSX) para que añadir i18n sea barato; los componentes de MUI (incluido
  Data Grid) DEBEN usar su localización en español.
- El diseño DEBE ser responsive con enfoque desktop-first. Navegadores soportados: las dos últimas
  versiones estables de Chrome, Edge, Firefox y Safari.

**Razón**: un backoffice lo usan operadores todos los días; la consistencia reduce errores y el
costo de aprendizaje, y las confirmaciones evitan daños difíciles de revertir.

### VII. Calidad Verificable mediante Pruebas

- Toda feature DEBE incluir sus pruebas automatizadas en el mismo PR. El enfoque test-first DEBE
  aplicarse al corregir bugs (primero una prueba que falla) y en la lógica pura (políticas de
  autorización, mapeadores, esquemas Zod), y DEBERÍA aplicarse en el resto.
- Pirámide de pruebas: unitarias para lógica pura y hooks (Vitest); de componentes e integración con
  React Testing Library y user-event, consultando por role o etiqueta accesible y nunca por
  detalles de implementación; E2E con Playwright para los recorridos críticos (login/logout,
  acceso según role, CRUD de cada recurso) cuando exista un entorno Auth0 de pruebas.
- Las APIs DEBEN simularse a nivel de red con MSW; NO DEBE mockearse `fetch` ni el cliente HTTP
  directamente. Las pruebas de componentes DEBEN usar un doble centralizado de Auth0; solo los E2E
  PUEDEN tocar un entorno real de pruebas, nunca producción.
- Las pruebas unitarias y de componentes viven junto al código (`*.test.ts(x)`) y los E2E en
  `e2e/`. DEBEN ser deterministas: sin red real, reloj real ni dependencia del orden de ejecución.
- CI DEBE exigir una cobertura mínima del 80 % de líneas en la capa `api`, las políticas de
  autorización, los esquemas y los hooks. No se exige cobertura sobre componentes puramente
  visuales.

**Razón**: las pruebas son la red de seguridad para refactorizar y detectar desvíos de contrato;
probar comportamiento y no implementación las mantiene útiles ante cambios de librerías.

## Alcance, Stack y Restricciones Técnicas

### Alcance del producto

- MailySoft Backoffice es una SPA interna cuyo único origen de datos son las APIs REST de MailySoft.
  Administra (1) usuarios y su role de sistema, (2) suscripciones, (3) clínicas, donde crear
  una clínica asigna un owner que pasa a ser su administrador, (4) roles y sus permisos por
  módulo y acción (de tipo Clínica y de tipo Sistema), consumiendo el catálogo de módulos y
  acciones que ya expone MailySoft Usuarios — ese catálogo (qué módulos existen y qué acciones
  admite cada uno) se consume tal cual y no se crea ni edita desde el Backoffice —, y (5) el
  registro de componentes monitoreados que sirve maily-system-api: los microservicios y frontends
  cuya salud se vigila, que se suman sin desplegar nada. Los componentes integrados
  (maily-system-api y su base de datos) se monitorean siempre y no se registran ni se editan.
  Incluye login, logout, perfil del usuario, el Panel (la página principal, con un resumen de solo
  lectura de la plataforma) y la herramienta temporal de token para Postman.
- Incluye también el monitoreo de salud de la plataforma: la página «Salud de servicios», de solo
  lectura y con actualización periódica (principio IV), con el estado de cada componente que
  entrega el agregador de maily-system-api y la versión del propio Backoffice; el estado público de
  la plataforma, el resumen sin autenticación de maily-system-api que se muestra cuando no se puede
  comprobar el acceso de la persona o falla la consulta al agregador, sin conceder ni negar el
  acceso; y la comprobación directa que lo respalda cuando maily-system-api no responde, en la que
  el navegador consulta sin credencial solo las rutas públicas de salud (`/health/live` y
  `/health/ready`) de los servicios cuya URL base está configurada, nunca las direcciones del
  registro.
- "Administrar" significa Listar, Mostrar, Crear, Modificar y Eliminar.
- El repositorio contiene solo el frontend, como proyecto único en la raíz (sin monorepo). Los
  backends viven fuera y solo se simulan con MSW en las pruebas.
- Ejemplos de desarrollo local (no normativos; siempre configurables por entorno):
  usuarios `http://127.0.0.1:8000/api/v1/users`, clínicas `http://127.0.0.1:8001/api/v1/clinics`,
  suscripciones `http://127.0.0.1:8002/api/v1/suscriptions`. Roles y permisos se sirven desde la
  misma API de usuarios, y la salud de los servicios, su registro de componentes y el estado
  público, desde maily-system-api (la API de suscripciones y del Panel): no agregan un backend
  nuevo.

### Stack obligatorio

- TypeScript y React (última versión estable, 19 o superior) como SPA con renderizado en cliente,
  construida con Vite. Node.js LTS vigente fijado en `.nvmrc` y `engines`; npm como único gestor de
  paquetes, con `package-lock.json` versionado e instalación con `npm ci` en CI.
- React Router, `@auth0/auth0-react`, TanStack Query, React Hook Form con Zod, y MUI con MUI X Data
  Grid (community).
- Calidad y pruebas: Vitest, React Testing Library, user-event, MSW, axe, Playwright, ESLint
  (typescript-eslint, react-hooks, jsx-a11y y límites de importación) y Prettier.
- Añadir o reemplazar una dependencia estructural (router, estado, UI, HTTP, auth) requiere
  justificación en Complexity Tracking. Solo se permiten licencias permisivas (MIT, Apache-2.0,
  BSD, ISC) para dependencias de código; las funciones de pago de MUI X (Pro/Premium) requieren
  aprobación explícita. Excepción: los activos de fuente tipográfica (no las dependencias de
  código) PUEDEN usar también la licencia SIL Open Font License 1.1 (OFL-1.1) —p. ej. Inter,
  autoalojada vía `@fontsource/inter` o un empaquetado equivalente servido desde el propio origen
  de la aplicación, sin depender de un proveedor externo de fuentes. Las dependencias DEBEN
  mantenerse al mínimo.

### Configuración y secretos

- La configuración por entorno DEBE viajar en variables `VITE_*` (públicas), validadas con Zod al
  arrancar con falla inmediata y mensaje claro, y documentadas en `.env.example` (versionado). Los
  archivos `.env*` reales NO DEBEN versionarse.
- Variables mínimas: dominio, client id y audience de Auth0, y la URL base de cada API (p. ej.
  `VITE_USERS_API_URL`, `VITE_CLINICS_API_URL`, `VITE_SUBSCRIPTIONS_API_URL`). Las URLs de
  callback, logout y orígenes web permitidos en Auth0 se configuran por entorno.
- Ningún secreto DEBE versionarse; si se detecta uno, DEBE rotarse de inmediato.

### Rendimiento y observabilidad

- Code splitting por ruta con `React.lazy` y `Suspense`; las dependencias pesadas (p. ej. Data Grid)
  DEBERÍAN cargarse de forma diferida. Presupuesto de JS inicial: 300 KB gzip en la ruta de entrada,
  verificado en CI y ajustable mediante enmienda tras medir la línea base.
- Los listados NO DEBEN renderizar más filas que el `page_size` vigente.
- El logging DEBE pasar por un único módulo `logger`; `console.*` está prohibido en código de
  producción (ESLint `no-console`). DEBEN existir Error Boundaries global y por ruta que registren
  vía `logger` y muestren un fallback amigable.

## Flujo de Desarrollo y Puertas de Calidad

- El desarrollo es guiado por especificación: cada feature DEBE recorrer `/speckit-specify`,
  `/speckit-clarify` (si hay ambigüedades), `/speckit-plan`, `/speckit-tasks` e
  `/speckit-implement`. NO DEBE escribirse código de producción sin spec y plan de la feature,
  salvo correcciones triviales (typos, actualización de dependencias).
- Todo cambio llega a `main` mediante Pull Request desde una rama de feature (`NNN-nombre`, creada
  por Spec Kit). Los PRs DEBEN ser pequeños y enfocados, y los commits seguir Conventional Commits
  en inglés.
- Puertas de CI (todas DEBEN pasar para fusionar): verificación de tipos (`tsc --noEmit`), lint sin
  advertencias, formato (Prettier), pruebas con el umbral de cobertura, build de producción,
  `npm audit` de dependencias de producción sin vulnerabilidades altas ni críticas, y presupuesto
  de bundle.
- La revisión de cada PR (propia o de un tercero) DEBE verificar el cumplimiento de esta
  constitución: Constitution Check del plan, ausencia de `any`, estados de carga/error/vacío,
  pruebas, accesibilidad, y ausencia de secretos, tokens o datos personales en logs.
- Definición de terminado: criterios de aceptación del spec cumplidos y probados; CI en verde;
  `.env.example` y la documentación (`README.md`, `quickstart.md`) actualizados si cambia la
  configuración; sin `console.*`, código muerto ni `TODO` sin issue asociado.
- La documentación del proyecto (constitución, specs, planes, README) se redacta en español; el
  código, los nombres de archivo y los mensajes de commit, en inglés.
- La actualización de dependencias DEBERÍA automatizarse (Dependabot o Renovate), con revisión
  manual de los cambios de versión mayor.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica, guía o preferencia del proyecto. Las
  desviaciones puntuales se registran y justifican en Complexity Tracking del plan; las
  permanentes DEBEN convertirse en enmienda.
- Las enmiendas se proponen mediante un PR que modifique `.specify/memory/constitution.md` (con
  `/speckit-constitution`) y DEBEN incluir el motivo, el impacto sobre specs, planes y tareas
  existentes, y un plan de migración si rompen compatibilidad. Las aprueba el responsable del
  proyecto.
- Versionado semántico. MAJOR: eliminación o redefinición incompatible de principios o de la
  gobernanza. MINOR: nuevo principio o sección, o ampliación material de una guía. PATCH:
  aclaraciones, redacción o correcciones no semánticas.
- Revisión de cumplimiento: `/speckit-plan` aplica el Constitution Check antes de la investigación y
  de nuevo tras el diseño; `/speckit-analyze` trata los conflictos con la constitución como
  CRÍTICOS; cada PR verifica el cumplimiento. La constitución DEBERÍA revisarse al cierre de cada
  trimestre o tras cada release mayor.
- La guía operativa de desarrollo vive en `README.md` y en `specs/<feature>/quickstart.md`.

**Version**: 1.6.0 | **Ratified**: 2026-10-17 | **Last Amended**: 2026-10-24
