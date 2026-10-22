/** Single module of user-facing texts (constitution VI). Spanish only; no text lives in components. */

/** How a monthly price is written: the form tells it, and so does a refusal of that field. */
const PRICE_RULE =
  'Escribe un importe de 0 a 99,999,999.99 solo con números y hasta dos decimales.';

export const messages = {
  common: {
    appName: 'MailySoft Backoffice',
    retry: 'Reintentar',
    logout: 'Cerrar sesión',
    loading: 'Cargando',
    continue: 'Continuar',
    cancel: 'Cancelar',
    save: 'Guardar',
    account: (email: string) => `Cuenta: ${email}`,
  },
  access: {
    title: 'Acceso al Backoffice',
    description: 'Identifícate con tu cuenta corporativa para continuar.',
    loginButton: 'Iniciar sesión',
    notices: {
      idle: 'Tu sesión se cerró por inactividad. Vuelve a identificarte para continuar.',
      expired: 'Tu sesión venció. Vuelve a identificarte para continuar.',
      cancelled: 'Cancelaste el inicio de sesión. Puedes intentarlo de nuevo cuando quieras.',
      idpError: 'No pudimos completar el inicio de sesión. Inténtalo de nuevo.',
    },
  },
  callback: {
    progress: 'Completando el acceso…',
  },
  // "Sin acceso" (feature 006): a single page and a single message for every reason — not
  // registered, account not Active, or no role of type Sistema (FR-003, FR-013).
  denied: {
    title: 'No tienes acceso al Backoffice',
    // Shorter, for the browser tab (no route `handle` manages it here: research D5 of 006).
    tabTitle: 'Sin acceso',
    message:
      'Tu usuario no tiene un rol de sistema asignado. Si crees que es un error, contacta al administrador.',
    signedInAs: (email: string) => `Iniciaste sesión como ${email}`,
    goToMailySoft: 'Ir a MailySoft',
  },
  checkFailed: {
    title: 'No se pudo comprobar el acceso',
    message: 'Ocurrió un problema al verificar tu cuenta. Puedes reintentar o cerrar sesión.',
  },
  home: {
    title: 'Panel',
    greeting: (name: string) => `Hola, ${name}`,
    noPermissionsTitle: 'Sin permisos asignados',
    noPermissionsNotice:
      'Tu role todavía no tiene permisos asignados. Pide a un administrador que los configure.',
    permissionsChanged:
      'Tus permisos cambiaron y la sección en la que estabas ya no está disponible.',
  },
  // The summary of the platform on the Panel, feature 007 (contracts/app-routes.md).
  dashboard: {
    indicatorsTitle: 'Indicadores de la plataforma',
    indicators: {
      totalClinics: 'Clínicas totales',
      activeClinics: 'Clínicas activas',
      trialClinics: 'Clínicas en periodo de prueba',
      totalDoctors: 'Doctores',
      totalPatients: 'Pacientes',
      totalUsers: 'Usuarios',
    },
    notAvailable: 'No disponible',
    recentClinics: {
      title: 'Clínicas recientes',
      columns: { name: 'Nombre', status: 'Estatus', createdAt: 'Fecha de alta' },
      empty: 'Sin clínicas registradas',
    },
    lastUpdated: (when: string) => `Actualizado: ${when}`,
    updating: 'Actualizando…',
    loadError: {
      title: 'No se pudieron cargar los indicadores',
      message:
        'Ocurrió un problema al consultar la plataforma. Se volverá a intentar automáticamente.',
    },
    refreshFailed:
      'No se pudieron actualizar los indicadores. Se muestran los de la última actualización y se volverá a intentar automáticamente.',
    noPermission: {
      title: 'Sin acceso a los indicadores',
      message: 'No tienes permiso para ver los indicadores de la plataforma.',
    },
  },
  nav: {
    label: 'Navegación principal',
    skipLink: 'Saltar al contenido',
    home: 'Panel',
    profile: 'Perfil',
    sections: {
      users: 'Usuarios',
      subscriptions: 'Suscripciones',
      clinics: 'Clínicas',
      token: 'Token',
    },
  },
  idleDialog: {
    title: 'Tu sesión está por cerrarse',
    body: (seconds: number) => `Por inactividad, tu sesión se cerrará en ${seconds} segundos.`,
    continue: 'Continuar',
  },
  profile: {
    title: 'Mi perfil',
    name: 'Nombre',
    paternalLastName: 'Apellido paterno',
    maternalLastName: 'Apellido materno',
    email: 'Correo electrónico',
    roles: 'Roles',
    noRoles: 'Sin roles activos',
    emptyValue: '—',
  },
  users: {
    title: 'Usuarios',
    status: { active: 'Activo', blocked: 'Bloqueado', deleted: 'Eliminado' },
    list: {
      gridLabel: 'Usuarios',
      columns: { name: 'Nombre', email: 'Correo electrónico', createdAt: 'Fecha de alta' },
      empty: 'No hay usuarios activos',
      createAction: 'Crear usuario',
      pageStatus: (from: number, to: number, total: number) =>
        `Mostrando ${from} a ${to} de ${total} usuarios.`,
      loadError: {
        title: 'No se pudieron cargar los usuarios',
        message: 'Ocurrió un problema al consultar los usuarios. Puedes reintentar.',
      },
    },
    search: {
      label: 'Buscar por correo electrónico',
      helper: 'Escribe el correo completo; también encuentra usuarios bloqueados o eliminados.',
      submit: 'Buscar',
      clear: 'Limpiar búsqueda',
      found: 'Se encontró un usuario.',
      notFound: 'No se encontró ningún usuario con ese correo.',
      viewDetail: 'Ver detalle',
      loadError: {
        title: 'No se pudo completar la búsqueda',
        message: 'Ocurrió un problema al buscar. Puedes reintentar.',
      },
    },
    detail: {
      title: 'Detalle del usuario',
      backToList: 'Volver al listado',
      fields: {
        name: 'Nombre',
        paternalLastName: 'Apellido paterno',
        maternalLastName: 'Apellido materno',
        email: 'Correo electrónico',
        status: 'Estatus',
        createdAt: 'Fecha de alta',
        updatedAt: 'Última modificación',
      },
      emptyValue: '—',
      loadError: {
        title: 'No se pudo cargar el usuario',
        message: 'Ocurrió un problema al consultar al usuario. Puedes reintentar.',
      },
      refreshError:
        'No se pudo actualizar la información del usuario. Se muestra la última que se tenía.',
      notFound: {
        title: 'Usuario no encontrado',
        message: 'El usuario no existe o ya no está disponible.',
        backToList: 'Volver al listado',
      },
      selfNote: 'Este es tu usuario: no puedes bloquearlo, eliminarlo ni cambiar tus roles.',
    },
    actions: {
      edit: 'Editar',
      block: 'Bloquear',
      unblock: 'Desbloquear',
      delete: 'Eliminar',
      reactivate: 'Reactivar',
    },
    dialogs: {
      block: {
        title: 'Bloquear usuario',
        body: (name: string) =>
          `El usuario ${name} no podrá iniciar sesión mientras esté bloqueado.`,
        confirm: 'Bloquear',
      },
      unblock: {
        title: 'Desbloquear usuario',
        body: (name: string) => `El usuario ${name} podrá iniciar sesión de nuevo.`,
        confirm: 'Desbloquear',
      },
      delete: {
        title: 'Eliminar usuario',
        body: (name: string) =>
          `El usuario ${name} dejará de aparecer en el listado y no podrá iniciar sesión. Podrás reactivarlo más adelante.`,
        confirm: 'Eliminar',
      },
      reactivate: {
        title: 'Reactivar usuario',
        body: (name: string) =>
          `El usuario ${name} volverá a estar activo con sus roles anteriores y podrá iniciar sesión.`,
        confirm: 'Reactivar',
      },
    },
    statusNotices: {
      blocked: 'Usuario bloqueado.',
      unblocked: 'Usuario desbloqueado.',
      deleted: 'Usuario eliminado.',
      reactivated: 'Usuario reactivado.',
    },
    edit: {
      title: 'Editar usuario',
      emailReadOnlyNote: 'El correo no se puede cambiar.',
      saved: 'Datos guardados.',
      inactive: {
        title: 'No se puede editar',
        message: 'Solo se puede modificar a un usuario activo.',
        backToDetail: 'Volver al detalle',
        backToList: 'Volver al listado',
      },
    },
    roles: {
      title: 'Roles',
      none: 'Sin roles',
      unavailable: 'Los roles de este usuario no se muestran mientras no esté activo.',
      loadError: {
        title: 'No se pudieron cargar los roles',
        message: 'Ocurrió un problema al consultar los roles. Puedes reintentar.',
      },
      refreshError: 'No se pudieron actualizar los roles. Se muestran los últimos que se tenían.',
      add: 'Agregar role',
      /** What a screen reader hears; the button itself reads `removeLabel`. */
      remove: (roleName: string) => `Quitar el role ${roleName}`,
      removeLabel: 'Quitar',
    },
    addRole: {
      title: 'Agregar role',
      roleLabel: 'Role',
      confirm: 'Agregar',
      summary: (role: string, user: string) => `Se agregará el role ${role} a ${user}.`,
      none: 'No hay más roles disponibles para agregar.',
      added: 'Role agregado.',
    },
    removeRole: {
      title: 'Quitar role',
      body: (role: string, user: string) => `Se quitará el role ${role} a ${user}.`,
      confirm: 'Quitar',
      removed: 'Role quitado.',
    },
    form: {
      createTitle: 'Crear usuario',
      fields: {
        email: 'Correo electrónico',
        firstName: 'Nombre',
        paternalLastName: 'Apellido paterno',
        maternalLastName: 'Apellido materno',
        password: 'Contraseña inicial',
        roles: 'Roles',
      },
      emailNote: 'No podrás cambiarlo después.',
      passwordHelper:
        'Debe cumplir los requisitos de seguridad de la cuenta de acceso. No se vuelve a mostrar.',
      showPassword: 'Mostrar contraseña',
      hidePassword: 'Ocultar contraseña',
      rolesEmpty: 'No hay roles disponibles: no se puede crear un usuario sin roles.',
      rolesLoadError: {
        title: 'No se pudieron cargar los roles',
        message: 'Sin la lista de roles no se puede crear un usuario. Puedes reintentar.',
      },
    },
    notices: {
      created: 'Usuario creado.',
      createdPartial: 'El usuario se creó, pero faltan roles por asignar.',
    },
    pendingRoles: {
      title: 'Faltan roles por asignar',
      message: (names: string) => `No se pudieron asignar: ${names}.`,
      retry: 'Reintentar asignación',
      dismiss: 'Descartar',
      done: 'Roles asignados.',
    },
    validation: {
      emailRequired: 'El correo es obligatorio.',
      emailInvalid: 'El correo no tiene un formato válido.',
      emailTooLong: 'El correo no puede superar los 255 caracteres.',
      firstNameRequired: 'El nombre es obligatorio.',
      firstNameTooLong: 'El nombre no puede superar los 100 caracteres.',
      paternalLastNameRequired: 'El apellido paterno es obligatorio.',
      paternalLastNameTooLong: 'El apellido paterno no puede superar los 100 caracteres.',
      maternalLastNameTooLong: 'El apellido materno no puede superar los 100 caracteres.',
      passwordRequired: 'La contraseña es obligatoria.',
      rolesRequired: 'Elige al menos un role.',
      rolesNoLongerAvailable:
        'Alguno de los roles elegidos ya no está disponible. Revisa los que quedan y vuelve a guardar.',
    },
    // What the person reads when the service rejects an operation (`describeUserError`).
    errors: {
      passwordRejected:
        'La contraseña no cumple los requisitos de seguridad de la cuenta de acceso.',
      emailAlreadyRegistered: 'El correo ya está registrado.',
      emailAlreadyRegisteredHint:
        'Si pertenece a un usuario bloqueado o eliminado, búscalo por su correo para desbloquearlo o reactivarlo.',
      searchThisEmail: 'Buscar este correo',
      accountAlreadyExists: 'Ya existe una cuenta de acceso con ese correo.',
      formInvalid: 'Hay datos no válidos en el formulario.',
      statusChanged: 'El usuario ya tiene otro estatus. Se actualizó la pantalla.',
      alreadyDone: 'El cambio ya estaba hecho. Se actualizaron los roles.',
      notFound: 'El usuario ya no existe.',
      roleUnavailable: 'El role ya no está disponible. Se actualizó la lista de roles.',
      accountMissingUnblock: 'No se pudo desbloquear al usuario: no existe su cuenta de acceso.',
      accountMissingReactivate: 'No se pudo reactivar al usuario: no existe su cuenta de acceso.',
      identityUnavailableCreate:
        'No se pudo crear la cuenta de acceso por ahora. No se creó el usuario; inténtalo de nuevo.',
      identityUnavailable:
        'No se pudo actualizar la cuenta de acceso por ahora. El usuario no cambió; inténtalo de nuevo.',
      identityRejectedCreate:
        'El sistema de cuentas de acceso rechazó la creación del usuario. No se creó nada.',
      identityRejected:
        'El sistema de cuentas de acceso rechazó la operación. No se hizo ningún cambio.',
      retryable: 'No pudimos completar la acción. Inténtalo de nuevo.',
    },
  },
  // The subscriptions section of feature 003 (contracts/app-routes.md).
  subscriptions: {
    title: 'Suscripciones',
    // By the id of the status, never by its name (FR-016).
    status: { active: 'Activa', inactive: 'Inactiva', blocked: 'Bloqueada' },
    price: { perMonth: (amount: string) => `${amount}/mes` },
    clinics: { notAvailable: 'No disponible' },
    list: {
      createAction: 'Nueva suscripción',
      gridLabel: 'Suscripciones',
      columns: {
        name: 'Nombre',
        monthlyPrice: 'Precio mensual',
        status: 'Estatus',
        clinics: 'Clínicas',
      },
      empty: 'No hay suscripciones registradas',
      pageStatus: (from: number, to: number, total: number) =>
        `Mostrando ${from} a ${to} de ${total} suscripciones.`,
      loadError: {
        title: 'No se pudieron cargar las suscripciones',
        message: 'Ocurrió un problema al consultar las suscripciones. Puedes reintentar.',
      },
    },
    detail: {
      title: 'Detalle de la suscripción',
      backToList: 'Volver al listado',
      fields: {
        name: 'Nombre',
        description: 'Descripción',
        monthlyPrice: 'Precio mensual',
        status: 'Estatus',
        clinics: 'Clínicas',
        features: 'Lo que incluye',
        createdAt: 'Fecha de creación',
        updatedAt: 'Última modificación',
      },
      emptyValue: '—',
      noFeatures: 'Sin elementos',
      loadError: {
        title: 'No se pudo cargar la suscripción',
        message: 'Ocurrió un problema al consultar la suscripción. Puedes reintentar.',
      },
      refreshError:
        'No se pudo actualizar la información de la suscripción. Se muestra la última que se tenía.',
      notFound: {
        title: 'Suscripción no encontrada',
        message: 'La suscripción no existe o ya no está disponible.',
        backToList: 'Volver al listado',
      },
    },
    form: {
      createTitle: 'Nueva suscripción',
      fields: {
        name: 'Nombre',
        description: 'Descripción',
        monthlyPrice: 'Precio mensual',
        features: 'Lo que incluye',
      },
      descriptionHelper: 'Opcional. Hasta 500 caracteres.',
      priceHelper: 'Solo números y punto decimal, por ejemplo 4500 o 4500.50.',
      pricePrefix: '$',
      priceSuffix: '/mes',
      featuresHelper: 'Se muestra en este orden. Hasta 20 elementos.',
      featureLabel: (n: number) => `Elemento ${n}`,
      removeFeature: (n: number) => `Quitar el elemento ${n}`,
      addFeature: 'Agregar elemento',
      featuresCount: (n: number) => `${n} de 20`,
      featuresMax: 'Se alcanzó el máximo de 20 elementos.',
    },
    notices: {
      created: 'Suscripción creada.',
      deleted: 'Suscripción eliminada.',
    },
    actions: {
      edit: 'Editar',
      changeStatus: 'Cambiar estatus',
      delete: 'Eliminar',
    },
    deleteBlocked: (clinics: number) =>
      clinics === 1 ? 'Tiene 1 clínica asignada' : `Tiene ${clinics} clínicas asignadas`,
    // The verbs of the menu, by the id of the status they take the subscription to.
    statusTargets: { activate: 'Activar', inactivate: 'Inactivar', block: 'Bloquear' },
    dialogs: {
      inactivate: {
        title: 'Inactivar suscripción',
        body: (name: string) =>
          `La suscripción ${name} pasará a Inactiva. Las clínicas que ya la tienen la conservan.`,
        confirm: 'Inactivar',
      },
      block: {
        title: 'Bloquear suscripción',
        body: (name: string) =>
          `La suscripción ${name} pasará a Bloqueada. Las clínicas que ya la tienen la conservan.`,
        confirm: 'Bloquear',
      },
      delete: {
        title: 'Eliminar suscripción',
        body: (name: string) =>
          `La suscripción ${name} dejará de aparecer y su nombre quedará libre. Esta acción no se puede deshacer.`,
        confirm: 'Eliminar',
      },
    },
    statusNotices: {
      activated: 'Suscripción activada.',
      inactivated: 'Suscripción inactivada.',
      blocked: 'Suscripción bloqueada.',
    },
    edit: {
      title: 'Editar suscripción',
      saved: 'Suscripción guardada.',
      noChanges: 'No había cambios que guardar.',
    },
    validation: {
      nameRequired: 'El nombre es obligatorio.',
      nameTooLong: 'El nombre no puede superar los 100 caracteres.',
      descriptionTooLong: 'La descripción no puede superar los 500 caracteres.',
      priceRequired: 'El precio mensual es obligatorio.',
      priceInvalid: PRICE_RULE,
      featureRequired: 'Escribe el texto o quita el elemento.',
      featureTooLong: 'Cada elemento admite hasta 150 caracteres.',
      featuresTooMany: 'Lo que incluye admite hasta 20 elementos.',
    },
    // Own texts, chosen by the code of the refusal: the text of the API is never shown (FR-010).
    errors: {
      nameInUse: 'Ya existe una suscripción con este nombre.',
      formInvalid: 'Hay datos no válidos en el formulario.',
      fields: {
        name: 'Revisa el nombre: debe tener de 1 a 100 caracteres.',
        description: 'Revisa la descripción: admite hasta 500 caracteres.',
        monthlyPrice: PRICE_RULE,
        features: 'Revisa lo que incluye: hasta 20 elementos de 1 a 150 caracteres.',
      },
      notFound: 'La suscripción ya no existe.',
      statusUnchanged: 'La suscripción ya tenía ese estatus. Se actualizó la pantalla.',
      hasClinics:
        'No se puede eliminar: la suscripción tiene clínicas asignadas. Se actualizó la pantalla.',
      clinicsUnavailable:
        'No se pudo comprobar si la suscripción tiene clínicas asignadas, así que no se eliminó. Inténtalo de nuevo.',
      retryable: 'No pudimos completar la acción. Inténtalo de nuevo.',
    },
  },
  // The Token tool of feature 005 (contracts/app-routes.md).
  token: {
    title: 'Token',
    warning:
      'Este token da acceso a MailySoft con tus permisos. No lo compartas ni lo guardes en lugares públicos.',
    fields: { token: 'Token', expiresAt: 'Fecha y hora de expiración' },
    emptyToken: 'Aún no has generado un token. Pulsa «Generar» para obtener uno.',
    emptyExpiry: '—',
    mask: '••••••••••••',
    validity: { valid: 'Vigente', expired: 'Expirado' },
    actions: {
      generate: 'Generar',
      refresh: 'Refrescar',
      show: 'Mostrar',
      hide: 'Ocultar',
      copy: 'Copiar',
      signInAgain: 'Iniciar sesión de nuevo',
    },
    copied: 'Token copiado al portapapeles.',
    copyFailed: 'No se pudo copiar al portapapeles. Pulsa «Mostrar» y copia el token a mano.',
    announce: {
      generated: (expiresAt: string) => `Token generado. Expira el ${expiresAt}.`,
      expired: 'El token expiró. Pulsa «Refrescar» para obtener uno nuevo.',
    },
    /** What the person reads when they open the tool without `token:read` (FR-005). */
    noPermission: 'No tienes permiso para usar la herramienta Token.',
    errors: {
      sessionExpired: {
        title: 'Tu sesión ya no es válida',
        message:
          'No se pudo obtener el token porque tu sesión terminó. Reintenta o inicia sesión de nuevo.',
      },
      unreadableToken: {
        title: 'No se pudo leer el token',
        message:
          'El proveedor de acceso devolvió un token con un formato inesperado. Puedes reintentar.',
      },
      unknown: {
        title: 'No se pudo obtener el token',
        message: 'Ocurrió un problema al pedir el token. Puedes reintentar.',
      },
    },
  },
  notFound: {
    title: 'Página no encontrada',
    message: 'La dirección que abriste no existe.',
    backHome: 'Ir al inicio',
  },
  forbidden: {
    action: 'No tienes permiso para realizar esta acción.',
  },
  errors: {
    network: 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.',
    unexpected: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    routeTitle: 'Algo salió mal',
  },
  config: {
    title: 'Configuración inválida',
    message:
      'La aplicación no puede iniciar por un problema de configuración. Avisa al equipo de desarrollo.',
    // The rule each environment variable has to follow (contracts/environment.md).
    rules: {
      domain: 'Nombre de dominio sin esquema.',
      nonEmpty: 'Texto no vacío.',
      audience: 'Texto no vacío (identificador de la API de Auth0).',
      apiUrl:
        'Ruta que empieza con `/` o URL `http(s)`; en builds de producción una URL absoluta debe ser `https`. Sin `/` final.',
      refreshMinutes: 'Entero de 1 a 60 (minutos), escrito solo con dígitos; si no se define, 5.',
      mailySoftAppUrl: 'URL http(s) completa; en builds de producción debe ser https.',
    },
  },
  titles: {
    access: 'Acceso',
    home: 'Panel',
    profile: 'Mi perfil',
    notFound: 'Página no encontrada',
    users: 'Usuarios',
    userCreate: 'Crear usuario',
    userDetail: 'Detalle del usuario',
    userEdit: 'Editar usuario',
    subscriptions: 'Suscripciones',
    subscriptionCreate: 'Nueva suscripción',
    subscriptionDetail: 'Detalle de la suscripción',
    subscriptionEdit: 'Editar suscripción',
    token: 'Token',
  },
} as const;
