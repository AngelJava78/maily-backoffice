import { getModuleCapabilities, useGrantedAccess } from '@/features/auth';
import { ModulesPage } from '@/features/modules';

/**
 * Joins the Módulos screen with the access of the operator: the modules feature does not know
 * `auth`, so the capabilities are worked out here and handed to the screen (research D2 of 013).
 */
export function ModulesRoute() {
  return <ModulesPage capabilities={getModuleCapabilities(useGrantedAccess())} />;
}
