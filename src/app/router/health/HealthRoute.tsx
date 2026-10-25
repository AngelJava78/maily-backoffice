import { HealthPage } from '@/features/health';

import { useAppSettings } from '../../providers/AppSettingsProvider';

/**
 * «Salud de servicios» (feature 016) with the refresh interval of the configuration and the
 * identification of the build, which the features cannot read by themselves (research D17, D18).
 */
export function HealthRoute() {
  const { healthRefreshMs, backofficeBuild } = useAppSettings();
  return <HealthPage refreshMs={healthRefreshMs} build={backofficeBuild} />;
}
