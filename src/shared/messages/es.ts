/** Single module of user-facing texts (constitution VI). Spanish only; no text lives in components. */
export const messages = {
  common: {
    appName: 'MailySoft Backoffice',
    retry: 'Reintentar',
    logout: 'Cerrar sesión',
    loading: 'Cargando',
    continue: 'Continuar',
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
  denied: {
    title: 'Acceso denegado',
    reasons: {
      notRegistered: 'Tu cuenta no está registrada en MailySoft.',
      inactiveAccount: 'Tu cuenta no está activa.',
      noAuthorizedRole: 'No tienes un role con acceso al Backoffice.',
    },
  },
  checkFailed: {
    title: 'No se pudo comprobar el acceso',
    message: 'Ocurrió un problema al verificar tu cuenta. Puedes reintentar o cerrar sesión.',
  },
  home: {
    greeting: (name: string) => `Hola, ${name}`,
    noPermissionsTitle: 'Sin permisos asignados',
    noPermissionsNotice:
      'Tu role todavía no tiene permisos asignados. Pide a un administrador que los configure.',
    permissionsChanged:
      'Tus permisos cambiaron y la sección en la que estabas ya no está disponible.',
  },
  nav: {
    label: 'Navegación principal',
    skipLink: 'Saltar al contenido',
    home: 'Inicio',
    profile: 'Perfil',
    sections: {
      users: 'Usuarios',
      subscriptionTypes: 'Tipos de suscripción',
      clinics: 'Clínicas',
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
      flag: '`true` o `false`; por defecto `false`.',
    },
  },
  titles: {
    access: 'Acceso',
    home: 'Inicio',
    profile: 'Mi perfil',
    notFound: 'Página no encontrada',
  },
} as const;
