import { useParams } from 'react-router';

import { getHealthCapabilities, useGrantedAccess } from '@/features/auth';
import {
  MonitoredComponentCreatePage,
  MonitoredComponentDetailPage,
  MonitoredComponentEditPage,
  MonitoredComponentsListPage,
  parseComponentId,
} from '@/features/health';

import { NotFoundPage } from '../../pages/LazyNotFoundPage';
import { RequireCapability } from '../RequireCapability';

// The screens of the registry of «Salud de servicios» joined with the access of the operator: the
// health feature does not know `auth`, so the capabilities are worked out here and handed to the
// screens (research D1). The service still checks every call with its 403.

/** «Componentes monitoreados» (FR-034). */
export function MonitoredComponentsListRoute() {
  return <MonitoredComponentsListPage capabilities={getHealthCapabilities(useGrantedAccess())} />;
}

/** «Detalle del componente» (FR-035). An address whose id is not one is a page that does not exist. */
export function MonitoredComponentDetailRoute() {
  const access = useGrantedAccess();
  const componentId = parseComponentId(useParams().componentId);

  if (componentId === null) {
    return <NotFoundPage />;
  }
  return (
    <MonitoredComponentDetailPage
      componentId={componentId}
      capabilities={getHealthCapabilities(access)}
    />
  );
}

/**
 * «Nuevo componente» needs `health:write` (FR-036). Without it the person goes back to the list
 * with a notice, and the same happens if they lose it while the form is open (FR-032).
 */
export function MonitoredComponentCreateRoute() {
  const { canCreate } = getHealthCapabilities(useGrantedAccess());

  return (
    <RequireCapability allowed={canCreate} to="/health/components">
      <MonitoredComponentCreatePage />
    </RequireCapability>
  );
}

/**
 * «Editar componente» needs `health:update` (FR-037). Without it the person goes back to the list
 * with a notice, and the same happens if they lose it while the form is open (FR-032). An address
 * whose id is not one is a page that does not exist.
 */
export function MonitoredComponentEditRoute() {
  const { canEdit } = getHealthCapabilities(useGrantedAccess());
  const componentId = parseComponentId(useParams().componentId);

  if (componentId === null) {
    return <NotFoundPage />;
  }
  return (
    <RequireCapability allowed={canEdit} to="/health/components">
      <MonitoredComponentEditPage componentId={componentId} />
    </RequireCapability>
  );
}
