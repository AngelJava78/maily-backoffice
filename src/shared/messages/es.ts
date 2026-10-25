/** Single module of user-facing texts (constitution VI). Spanish only; no text lives in components. */

/** How a monthly or annual price is written: the form tells it, and so does a refusal of that field. */
const PRICE_RULE =
  'Escribe un importe de 0 a 99,999,999.99 solo con números y hasta dos decimales.';

/** How a clinic limit is written (consultorios, doctores, asistentes, pacientes nuevos al año). */
const LIMIT_RULE = 'Escribe un número entero de 0 a 1,000,000.';

export const messages = {
  common: {
    appName: 'MailySoft Backoffice',
    brandName: 'Maily',
    brandNameLowercase: 'maily',
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
    mobileLabel: 'Navegación móvil',
    skipLink: 'Saltar al contenido',
    home: 'Panel',
    appLabel: 'Backoffice',
    // Accessible name of the light/dark toggle (009-dark-mode-toggle): names the theme it switches
    // *to*, like a light switch does, not the one currently active.
    theme: {
      switchToDark: 'Cambiar a tema oscuro',
      switchToLight: 'Cambiar a tema claro',
    },
    // Accessible name of the avatar button that opens the profile menu (011-profile-avatar-menu).
    profileMenu: (displayName: string) => `Menú de ${displayName}`,
    sections: {
      modules: 'Módulos',
      users: 'Usuarios',
      subscriptions: 'Suscripciones',
      clinics: 'Clínicas',
      token: 'Token',
      roles: 'Roles y permisos',
      health: 'Salud de servicios',
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
    // 011-profile-avatar-menu, US3: la API de usuarios todavía no soporta subir una fotografía.
    changePhoto: 'Cambiar foto',
    changePhotoUnavailable: 'Cambiar la fotografía todavía no está disponible.',
  },
  modules: {
    title: 'Módulos',
    subtitle:
      'Las partes del sistema a las que se dan permisos. Los de Sistema son pantallas del Backoffice y los de Clínica, de la aplicación para clínicas.',
    newAction: '+ Nuevo módulo',
    filters: {
      typeLabel: 'Tipo',
      type: { all: 'Todos', system: 'Sistema', clinic: 'Clínica' },
      statusLabel: 'Estatus',
      status: { active: 'Activos', blocked: 'Bloqueados' },
      search: 'Nombre o clave',
    },
    count: {
      active: (n: number) => `${n} módulos activos`,
      blocked: (n: number) => `${n} módulos bloqueados`,
      noResults: 'Ningún módulo coincide con la búsqueda.',
      noneActive: 'No hay módulos activos.',
      noneBlocked: 'No hay módulos bloqueados.',
    },
    loadError: {
      title: 'No se pudo cargar el catálogo de módulos',
      message: 'Ocurrió un problema al consultar los módulos. Inténtalo de nuevo.',
    },
    groups: {
      system: (n: number) => `Sistema, pantallas del Backoffice · ${n} módulos`,
      clinic: (n: number) => `Clínica, aplicación para clínicas · ${n} módulos`,
    },
    columns: {
      order: 'Orden',
      module: 'Módulo',
      type: 'Tipo',
      permissions: 'Permisos',
      action: 'Acción',
    },
    baseBadge: 'Base',
    editAction: 'Editar',
    type: { system: 'Sistema', clinic: 'Clínica' },
    typeHelp: { system: 'Pantallas del Backoffice', clinic: 'Aplicación para clínicas' },
    actions: { read: 'Ver', write: 'Crear', update: 'Modificar', delete: 'Eliminar' },
    panel: {
      editTitle: 'Editar módulo',
      createTitle: 'Nuevo módulo',
      emptyState: 'Selecciona un módulo para editarlo, o crea uno nuevo.',
    },
    form: {
      fields: {
        type: 'Tipo',
        typeImmutable:
          'No se puede cambiar después. Un módulo de Clínica solo se da a roles de Clínica.',
        key: 'Clave',
        keyHelp:
          'En inglés, por ejemplo inventory. La usa el código y no se puede cambiar después. Solo minúsculas, números y guion bajo.',
        keyAndTypeFixed: 'La clave y el tipo no cambian nunca.',
        name: 'Nombre',
        nameHelp: 'En español: es el que ve la gente en las pantallas.',
        description: 'Descripción',
        descriptionHelp: 'Opcional. Hasta 500 caracteres.',
        order: 'Orden',
        orderHelp: (n: number) => `Opcional. Si lo dejas vacío, queda al final (${n}).`,
        orderHelpEdit: 'Opcional. Si lo dejas vacío, queda como estaba.',
        actionsLabel: 'Acciones del módulo',
      },
      actionsHelp:
        'Cada acción marcada es un permiso. Después se da a los roles en Roles y permisos.',
      uncheckActionTitle: 'Quitar acción',
      uncheckActionConfirm: (action: string, moduleName: string) =>
        `¿Quitar la acción «${action}» del módulo «${moduleName}»? Quien ya la tenga por un role podría perder esa acción.`,
      uncheckActionRemove: 'Quitar',
      save: 'Guardar cambios',
      discard: 'Descartar cambios',
      create: 'Crear módulo',
      cancel: 'Cancelar',
    },
    blockSection: {
      help: 'Bloquear lo oculta y quita el acceso sin borrar nada, y se puede desbloquear. Eliminar lo borra junto con sus permisos.',
      block: 'Bloquear módulo',
      unblock: 'Desbloquear módulo',
      delete: 'Eliminar módulo',
      deleteConfirm: (name: string) =>
        `¿Eliminar el módulo «${name}»? Esta acción no se puede deshacer.`,
      deleteConfirmButton: 'Eliminar',
      deleted: 'Módulo eliminado.',
      protectedNotice:
        'Los módulos base de administración (Usuarios, Roles, Permisos y Módulos) no se pueden bloquear ni eliminar.',
    },
    validation: {
      keyRequired: 'Escribe la clave del módulo.',
      keyInvalid:
        'Usa minúsculas, números y guion bajo, empezando con una letra (hasta 50 caracteres).',
      nameRequired: 'Escribe el nombre del módulo.',
      nameTooLong: 'El nombre admite hasta 100 caracteres.',
      descriptionTooLong: 'La descripción admite hasta 500 caracteres.',
      sortOrderInvalid: 'Escribe un número entero, o déjalo vacío.',
      actionsReadRequired: 'El módulo debe tener marcada, al menos, la acción Ver.',
    },
    notices: {
      created: 'Módulo creado.',
      createdPartial: (failedLabels: string) =>
        `Módulo creado, pero no se pudo marcar: ${failedLabels}. Puedes reintentarlo desde Editar.`,
      saved: 'Cambios guardados.',
      savedPartial: (failedLabels: string) =>
        `Cambios guardados, pero no se pudo aplicar: ${failedLabels}. Puedes reintentarlo.`,
      blocked: 'Módulo bloqueado.',
      unblocked: 'Módulo desbloqueado.',
    },
    errors: {
      formInvalid: 'Revisa los datos del formulario.',
      keyInUse: 'Ya existe un módulo con esa clave.',
      nameInUse: 'Ya existe un módulo con ese nombre.',
      notFound: 'Este módulo ya no existe.',
      protected:
        'Este módulo es uno de los módulos base de administración y no se puede bloquear ni eliminar.',
      statusUnchanged: 'El estatus de este módulo ya cambió; vuelve a intentarlo.',
      retryable: 'No se pudo completar la operación. Inténtalo de nuevo.',
      fields: {
        key: 'Escribe una clave válida: minúsculas, números y guion bajo, empezando con una letra.',
        name: 'Escribe un nombre de 1 a 100 caracteres.',
        description: 'La descripción admite hasta 500 caracteres.',
        sortOrder: 'Escribe un número entero, o déjalo vacío.',
        type: 'Elige un tipo de módulo.',
      },
    },
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
    price: {
      perMonth: (amount: string) => `${amount}/mes`,
      perYear: (amount: string) => `${amount}/año`,
      savingsBadge: (percent: number) => `Ahorra ${percent}%`,
      savingsCaption: (monthly: string, yearly: string) =>
        `Equivale a ${monthly} al mes. Ahorras ${yearly} al año.`,
      trialDays: (days: number) => `${days} días de prueba`,
    },
    clinics: { notAvailable: 'No disponible' },
    badge: { selfService: 'Autoconsumo', custom: 'A la medida' },
    // The nine clinic modules a plan can include (FR-007), in the order of CLINIC_MODULE_ORDER.
    modules: {
      catalog: {
        patients: {
          name: 'Pacientes',
          description: 'Directorio de pacientes y sus datos de contacto.',
        },
        scheduling: {
          name: 'Agenda y citas',
          description: 'Calendario por doctor y consultorio; citas y confirmaciones.',
        },
        reminders: {
          name: 'Recordatorios',
          description: 'Avisos de cita por WhatsApp, SMS o correo.',
        },
        clinical_records: {
          name: 'Expediente clínico',
          description: 'Historia clínica, notas de consulta y archivos.',
        },
        clinical_record_templates: {
          name: 'Plantillas de expediente',
          description:
            'Plantillas de preguntas de MailySoft que el doctor usa al abrir el expediente de un paciente.',
        },
        prescriptions: {
          name: 'Recetas',
          description: 'Recetas en PDF con los datos del doctor.',
        },
        finance: {
          name: 'Finanzas',
          description: 'Cobros, caja y gastos de la clínica.',
        },
        reports: {
          name: 'Reportes',
          description: 'Indicadores de citas, ingresos y pacientes.',
        },
        billing: {
          name: 'Facturación',
          description: 'Facturas CFDI para los pacientes.',
        },
      },
      requires: (name: string) => `Requiere ${name}`,
      alwaysIncluded: 'Siempre incluido',
      marked: (count: number) => `Marcados: ${count} de 9`,
    },
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
        annualPrice: 'Precio anual',
        trialDays: 'Días de prueba',
        selfService: 'Autoconsumo',
        modules: 'Módulos incluidos',
        consultingRoomsLimit: 'Consultorios',
        doctorsLimit: 'Doctores',
        assistantsLimit: 'Asistentes',
        newPatientsPerYearLimit: 'Pacientes nuevos al año',
        status: 'Estatus',
        clinics: 'Clínicas',
        otherFeatures: 'Otras funcionalidades',
        createdAt: 'Fecha de creación',
        updatedAt: 'Última modificación',
      },
      notIncluded: (names: string) => `No incluye: ${names}`,
      emptyValue: '—',
      noOtherFeatures: 'Sin elementos',
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
        annualPrice: 'Precio anual',
        trialDays: 'Días de prueba',
        selfService: 'Autoconsumo en el portal de MailySoft',
        consultingRoomsLimit: 'Consultorios',
        doctorsLimit: 'Doctores',
        assistantsLimit: 'Asistentes',
        newPatientsPerYearLimit: 'Pacientes nuevos al año',
        otherFeatures: 'Otras funcionalidades',
      },
      descriptionHelper: 'Opcional. Hasta 500 caracteres.',
      priceHelper: 'Solo números y punto decimal, por ejemplo 4500 o 4500.50.',
      pricePrefix: '$',
      priceSuffix: '/mes',
      annualPriceHelper: 'Solo números y punto decimal, por ejemplo 12990 o 12990.50.',
      annualPriceSuffix: '/año',
      trialDaysHelper: '0 = sin periodo de prueba.',
      selfServiceHelper:
        'Activada: aparece en el portal de MailySoft y cualquier clínica puede contratarla por su cuenta.',
      consultingRoomsLimitHelper: 'Espacios donde se da consulta; cada uno tiene su agenda.',
      doctorsLimitHelper: 'Usuarios de la clínica con el rol Doctor.',
      assistantsLimitHelper: 'Usuarios de la clínica con el rol Asistente.',
      newPatientsPerYearLimitHelper:
        'Pacientes que puede registrar toda la clínica cada año, sin importar cuántos doctores tenga.',
      otherFeaturesHelper:
        'Lo que ofrece el plan sin ser un módulo del sistema, como soporte o capacitación. Se muestra en este orden, hasta 20 elementos.',
      otherFeatureLabel: (n: number) => `Funcionalidad ${n}`,
      removeOtherFeature: (n: number) => `Quitar la funcionalidad ${n}`,
      addOtherFeature: 'Agregar funcionalidad',
      otherFeaturesCount: (n: number) => `${n} de 20`,
      otherFeaturesMax: 'Se alcanzó el máximo de 20 funcionalidades.',
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
      annualPriceRequired: 'El precio anual es obligatorio.',
      annualPriceInvalid: PRICE_RULE,
      trialDaysInvalid: 'Escribe un número entero de 0 a 3650.',
      consultingRoomsLimitInvalid: LIMIT_RULE,
      doctorsLimitInvalid: LIMIT_RULE,
      assistantsLimitInvalid: LIMIT_RULE,
      newPatientsPerYearLimitInvalid: LIMIT_RULE,
      otherFeatureRequired: 'Escribe el texto o quita la funcionalidad.',
      otherFeatureTooLong: 'Cada funcionalidad admite hasta 150 caracteres.',
      otherFeaturesTooMany: 'Otras funcionalidades admite hasta 20 elementos.',
    },
    // Own texts, chosen by the code of the refusal: the text of the API is never shown (FR-010).
    errors: {
      nameInUse: 'Ya existe una suscripción con este nombre.',
      formInvalid: 'Hay datos no válidos en el formulario.',
      fields: {
        name: 'Revisa el nombre: debe tener de 1 a 100 caracteres.',
        description: 'Revisa la descripción: admite hasta 500 caracteres.',
        monthlyPrice: PRICE_RULE,
        annualPrice: PRICE_RULE,
        trialDays: 'Revisa los días de prueba: deben ser un número entero de 0 a 3650.',
        selfService: 'Revisa el autoconsumo.',
        moduleKeys:
          'Revisa los módulos incluidos: alguno no es válido o le falta su módulo requisito.',
        consultingRoomsLimit: LIMIT_RULE,
        doctorsLimit: LIMIT_RULE,
        assistantsLimit: LIMIT_RULE,
        newPatientsPerYearLimit: LIMIT_RULE,
        otherFeatures: 'Revisa otras funcionalidades: hasta 20 elementos de 1 a 150 caracteres.',
      },
      notFound: 'La suscripción ya no existe.',
      statusUnchanged: 'La suscripción ya tenía ese estatus. Se actualizó la pantalla.',
      hasClinics:
        'No se puede eliminar: la suscripción tiene clínicas asignadas. Se actualizó la pantalla.',
      clinicsUnavailable:
        'No se pudo comprobar si la suscripción tiene clínicas asignadas, así que no se eliminó. Inténtalo de nuevo.',
      retryable: 'No pudimos completar la acción. Inténtalo de nuevo.',
    },
    comparison: {
      listTabLabel: 'Listado',
      tabLabel: 'Comparativo',
      priceToggle: { monthly: 'Mensual', annual: 'Anual' },
      sections: {
        modules: 'Módulos',
        limits: 'Límites de la clínica',
        otherFeatures: 'Otras funcionalidades',
        includes: 'Incluye',
        other: 'Otros',
        trialDays: 'Días de prueba',
        clinics: 'Clínicas con el plan',
        actions: 'Acciones',
      },
      editAction: 'Editar',
      footerNote: 'Precios simulados en pesos mexicanos, antes de IVA.',
      moduleIncluded: 'Incluido',
      moduleNotIncluded: 'No incluido',
    },
    preview: {
      title: 'Vista previa',
      subtitle: 'Así verá el plan la clínica',
      limitsTitle: 'Podrá dar de alta',
      namePlaceholder: '[Nombre del plan]',
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
      healthRefreshSeconds:
        'Entero de 10 a 300 (segundos), escrito solo con dígitos; si no se define, 30.',
      healthDirectServices:
        'Lista JSON de hasta 20 objetos { code, name, url }: code con el formato del código de un componente, único y distinto de maily-system-api y mailysoft-usuarios; name de 1 a 100 caracteres; url con las reglas de las URL base de las APIs.',
      mailySoftAppUrl: 'URL http(s) completa; en builds de producción debe ser https.',
    },
  },
  titles: {
    access: 'Acceso',
    home: 'Panel',
    profile: 'Mi perfil',
    notFound: 'Página no encontrada',
    modules: 'Módulos',
    users: 'Usuarios',
    userCreate: 'Crear usuario',
    userDetail: 'Detalle del usuario',
    userEdit: 'Editar usuario',
    subscriptions: 'Suscripciones',
    subscriptionCreate: 'Nueva suscripción',
    subscriptionDetail: 'Detalle de la suscripción',
    subscriptionEdit: 'Editar suscripción',
    token: 'Token',
    roles: 'Roles y permisos',
    health: 'Salud de servicios',
    healthComponents: 'Componentes monitoreados',
    healthComponentCreate: 'Nuevo componente',
    healthComponentDetail: 'Detalle del componente',
    healthComponentEdit: 'Editar componente',
  },
  // Feature 014: "Roles y permisos" — pantalla maestro-detalle (pestañas Clínica/Sistema, lista y
  // matriz de permisos por módulo y acción).
  roles: {
    title: 'Roles y permisos',
    newRole: 'Nuevo role',
    tabs: { clinica: 'Clínica', sistema: 'Sistema', ariaLabel: 'Tipo de role' },
    list: {
      clinicaDescription: 'Roles de los usuarios de las clínicas.',
      sistemaDescription: 'Roles del personal del Backoffice.',
      emptyClinica: 'Todavía no hay roles de Clínica. Crea el primero.',
      emptySistema: 'Todavía no hay roles de Sistema. Crea el primero.',
      permissionsCount: (count: number) => `${count} permisos`,
    },
    detail: {
      emptySelection: 'Elige un role para ver y cambiar lo que puede hacer en cada módulo.',
      fields: { name: 'Nombre', description: 'Descripción', type: 'Tipo' },
      nameHelper: 'Hasta 50 caracteres.',
      permissionsCount: (granted: number, total: number) => `${granted} de ${total} permisos`,
      duplicate: 'Duplicar',
      save: 'Guardar cambios',
      saved: 'Cambios guardados.',
      discard: 'Descartar cambios',
      matrixTitle: (roleName: string) => `Permisos de ${roleName} por módulo y acción`,
      matrixHelper:
        'Marca lo que puede hacer en cada módulo. Para crear, modificar o eliminar también necesita Ver.',
      matrixError: 'No se pudo cargar la tabla de permisos.',
      moduleGroupHeader: (typeName: string) => `Módulos de ${typeName}`,
      columns: {
        module: 'Módulo',
        read: 'Ver',
        write: 'Crear',
        update: 'Modificar',
        delete: 'Eliminar',
        allModule: 'Todo el módulo',
      },
      emptyModules: 'Este tipo todavía no tiene módulos en el catálogo.',
      unsavedChangesTitle: 'Tienes cambios sin guardar',
      unsavedChangesBody: 'Si continúas, perderás los cambios que no has guardado.',
      unsavedChangesDiscard: 'Descartar y continuar',
      unsavedChangesStay: 'Quedarme',
    },
    form: {
      createTitle: 'Nuevo role',
      typeHelper: 'No se puede cambiar después.',
      copyFrom: 'Copiar permisos de',
      copyFromHelper:
        'Opcional. Llena la tabla con los permisos de otro role; después la puedes ajustar.',
      create: 'Crear role',
      cancel: 'Cancelar',
    },
    delete: {
      action: 'Eliminar role',
      confirmTitle: (roleName: string) => `¿Eliminar ${roleName}?`,
      confirmBody: 'Eliminar borra el role y no se puede deshacer.',
      confirm: 'Eliminar role',
      cancel: 'Cancelar',
    },
    validation: {
      nameRequired: 'El nombre es obligatorio.',
      nameTooLong: 'Escribe hasta 50 caracteres.',
      nameInvalid: 'Revisa el nombre: no es válido.',
      typeRequired: 'Elige un tipo.',
    },
    errors: {
      nameAlreadyExists: 'Ya existe un role con este nombre.',
      notFound: 'Este role ya no existe.',
      moduleTypeConflict: 'Este permiso no corresponde al tipo de este role.',
      saveIncomplete: (failed: number) =>
        `No se pudieron guardar ${failed} ${failed === 1 ? 'cambio' : 'cambios'}. Vuelve a intentarlo.`,
      retryable: 'No pudimos completar la operación. Inténtalo de nuevo.',
    },
  },
  // Feature 016: «Salud de servicios», the health of the components of Maily (data-model §2).
  health: {
    status: {
      up: 'Operativo',
      degraded: 'Degradado',
      down: 'Caído',
      stopped: 'Detenida por horario',
      unknown: 'Desconocido',
    },
    overall: {
      ok: 'Todo operativo',
      degraded: 'Degradado',
      down: 'Con componentes caídos',
      unknown: 'Desconocido',
      operationalCount: (up: number, total: number) => `${up} de ${total} operativos`,
    },
    kinds: {
      service: 'Microservicio',
      database: 'Base de datos',
      frontend: 'Frontend',
      unknown: 'Componente',
    },
    checks: {
      ok: 'Correcto',
      error: 'Con error',
      unknown: 'Desconocido',
      names: { database: 'Base de datos' },
    },
    // What each error code of a component means (FR-016).
    errors: {
      timeout: 'No respondió a tiempo.',
      connection_error: 'No se pudo conectar.',
      dns_error: 'No se encontró la dirección del servicio.',
      host_not_allowed: 'Su dirección no está en la lista permitida; no se comprobó.',
      unexpected_status: 'Respondió con un código inesperado.',
      invalid_response: 'Su respuesta no cumple el contrato de salud.',
      response_too_large: 'Su respuesta fue demasiado grande.',
      not_ready: 'Está en línea, pero no está listo para atender.',
      not_configured: 'Le falta configuración, por ejemplo la conexión a la base de datos.',
      unexpected_error: 'Ocurrió un error inesperado al comprobarlo.',
      unknownCode: 'Ocurrió un problema al comprobar este componente.',
    },
    notAvailable: 'No disponible',
    latency: (ms: string) => `${ms} ms`,
    page: {
      title: 'Salud de servicios',
      componentsTitle: 'Componentes',
      empty: 'No hay componentes para mostrar.',
      noPermission: 'No tienes permiso para ver la salud de los servicios.',
      loadError: {
        title: 'No se pudo consultar la salud de los servicios',
        message: 'Ocurrió un problema al consultar el monitoreo. Puedes reintentar.',
      },
      authorizationUnavailable:
        'Puede deberse a que mailySoft-usuarios o la base de datos no están disponibles, por ejemplo fuera del horario de encendido.',
      refresh: 'Actualizar',
      updating: 'Actualizando…',
      updatedSecondsAgo: (seconds: number) => `Actualizado hace ${seconds} s`,
      updatedMinutesAgo: (minutes: number) => `Actualizado hace ${minutes} min`,
      updatedAt: (when: string) => `Actualizado: ${when}`,
      refreshFailed:
        'No se pudo actualizar la salud de los servicios. Se muestran los datos de la última actualización correcta.',
    },
    fields: {
      kind: 'Tipo',
      status: 'Estado',
      latency: 'Latencia',
      checkedAt: 'Última comprobación',
      version: 'Versión',
      commit: 'Commit',
      buildDate: 'Fecha de build',
      environment: 'Entorno',
    },
    details: {
      toggle: 'Detalle',
      toggleLabel: (name: string) => `Detalle de ${name}`,
      checksTitle: 'Chequeos',
      none: 'Sin detalles adicionales.',
    },
    notices: {
      databaseStopped:
        'La base de datos está detenida por horario: se apaga a propósito fuera de su horario de encendido y, mientras tanto, los servicios que dependen de ella pueden aparecer degradados.',
      databaseDown:
        'La base de datos no responde, así que los servicios que dependen de ella pueden aparecer degradados.',
      registryUnavailable:
        'No se pudo leer el registro de componentes: la lista puede estar incompleta o desactualizada.',
    },
    // The registry of components (user story 3, FR-034 to FR-043).
    registry: {
      title: 'Componentes monitoreados',
      link: 'Componentes monitoreados',
      backToHealth: 'Salud de servicios',
      backToList: 'Volver a Componentes monitoreados',
      builtInNote: 'maily-system-api y la base de datos se monitorean siempre, sin registrarlos.',
      empty: 'Todavía no hay componentes registrados.',
      noPermission: 'No tienes permiso para ver los componentes monitoreados.',
      create: 'Nuevo componente',
      edit: 'Editar',
      delete: 'Eliminar',
      enabled: 'Habilitado',
      disabled: 'Deshabilitado',
      gridLabel: 'Componentes registrados',
      kinds: { service: 'Microservicio', frontend: 'Frontend', unknown: 'Componente' },
      columns: {
        name: 'Nombre',
        code: 'Código',
        kind: 'Tipo',
        baseUrl: 'URL base',
        enabled: 'Habilitado',
        sortOrder: 'Orden',
      },
      fields: {
        name: 'Nombre',
        code: 'Código',
        kind: 'Tipo',
        baseUrl: 'URL base',
        livePath: 'Ruta de vida',
        readyPath: 'Ruta de disponibilidad',
        infoPath: 'Ruta de información',
        healthPath: 'Ruta de salud',
        enabled: 'Habilitado',
        sortOrder: 'Orden',
        createdAt: 'Fecha de alta',
        updatedAt: 'Última modificación',
      },
      form: {
        frontendWarning:
          'En un frontend que responde con su página a cualquier dirección, una ruta que no existe parecería sana: comprueba que la ruta de salud exista.',
        fixedInfo:
          'El código y el tipo no se pueden cambiar. Para cambiarlos, elimina el componente y regístralo de nuevo.',
        optional: 'Opcional.',
        sortOrderHelper: 'Opcional. Si lo dejas vacío, vale 0.',
        required: 'Este campo es obligatorio.',
        name: 'Escribe un nombre de 1 a 100 caracteres.',
        code: 'Usa de 2 a 50 caracteres: minúsculas, números y guiones, empezando con una letra, sin guion al final ni dos seguidos.',
        baseUrl:
          'Escribe una dirección http:// o https:// con dominio, sin usuario, contraseña, parámetros (?) ni fragmento (#), de hasta 255 caracteres.',
        path: 'Escribe una ruta que empiece con una sola /, de hasta 200 caracteres, sin espacios, sin los caracteres \\ ? # % y sin segmentos . o ...',
        sortOrder: 'Escribe un número entero de 0 a 9999.',
      },
      notices: {
        created: 'Componente registrado.',
        updated: 'Componente actualizado.',
        deleted: 'Componente eliminado.',
      },
      errors: {
        codeTaken: 'Ya existe un componente con este código.',
        hostNotAllowed:
          'Esta dirección no se puede monitorear. Su dominio debe agregarse a la lista permitida del servicio de salud.',
        notFound: 'Este componente ya no existe.',
        form: 'No se pudo guardar el componente. Revisa los datos e inténtalo de nuevo.',
        unavailable: 'No pudimos completar la operación. Inténtalo de nuevo.',
        loadError: {
          listTitle: 'No se pudieron cargar los componentes monitoreados',
          detailTitle: 'No se pudo cargar el componente',
          message:
            'Ocurrió un problema al consultar el registro de componentes. Puedes reintentar.',
        },
      },
      deleteDialog: {
        title: (name: string) => `¿Eliminar ${name}?`,
        message: 'Dejará de monitorearse y de aparecer en Salud de servicios.',
        confirm: 'Eliminar',
        cancel: 'Cancelar',
      },
    },
    // The section of the public status, in the failure screen and in the page (user story 5).
    platform: {
      title: 'Estado de la plataforma',
      loading: 'Consultando el estado de la plataforma…',
      failed: 'No se pudo obtener el estado de la plataforma.',
      empty: 'No hay componentes para mostrar.',
      databaseStopped: 'Base de datos detenida por horario',
      refreshing: 'Actualizando…',
    },
    // The block of the build of this Backoffice (user story 4).
    backoffice: {
      title: 'Backoffice',
      version: 'Versión',
      commit: 'Commit',
      buildDate: 'Fecha de build',
    },
    // The direct check from the browser, when neither the aggregator nor the public status answer
    // (user story 6).
    direct: {
      title: 'Comprobación directa',
      intro:
        'No se pudo consultar el monitoreo central (maily-system-api). Esto es lo que tu navegador pudo comprobar directamente:',
      names: { systemApi: 'maily-system-api', users: 'mailySoft-usuarios' },
      status: { operational: 'Operativo', degraded: 'Degradado', unreachable: 'No responde' },
      explanations: {
        database: 'Su base de datos no responde.',
        notConfigured: 'Le falta configuración, por ejemplo la conexión a la base de datos.',
        unknownCheck: 'Falló uno de sus chequeos.',
        notReady: 'Está en línea, pero no está listo para atender.',
      },
      others:
        'Los demás componentes (base de datos, MailySoft y los componentes registrados que no aparecen en esta lista) no se pueden comprobar desde el navegador: Sin información.',
      loading: 'Comprobando los servicios desde tu navegador…',
      refreshing: 'Actualizando…',
    },
    // When the database comes back (FR-059): «a la» for the hour 1 (1:00 to 1:59), «a las» otherwise.
    returnLine: {
      future: (date: string, time: string) =>
        `Vuelve a estar disponible el ${date} ${time.startsWith('1:') ? 'a la' : 'a las'} ${time}`,
      past: (date: string, time: string) =>
        `Su encendido estaba programado para el ${date} ${time.startsWith('1:') ? 'a la' : 'a las'} ${time}`,
    },
  },
} as const;
