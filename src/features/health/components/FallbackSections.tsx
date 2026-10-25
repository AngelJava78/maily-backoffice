import type { HealthScope } from '../hooks/healthKeys';
import { useDirectCheckSection } from '../hooks/useDirectCheckSection';
import { usePlatformStatusSection } from '../hooks/usePlatformStatusSection';
import { DirectCheckSection } from './DirectCheckSection';
import { PlatformStatusSection } from './PlatformStatusSection';

/**
 * The sections of the chain of a screen (contracts/app-routes.md, «Las secciones de respaldo»):
 * «Estado de la plataforma», and «Comprobación directa» when it fails too (user story 6). Each one
 * shows while its step is in the cache; `announceToken` changes when the person asks again.
 */
export function FallbackSections({
  scope,
  announceToken,
}: {
  readonly scope: HealthScope;
  readonly announceToken: number;
}) {
  const platform = usePlatformStatusSection(scope);
  const direct = useDirectCheckSection(scope);

  return (
    <>
      <PlatformStatusSection view={platform} announceToken={announceToken} />
      <DirectCheckSection view={direct} announceToken={announceToken} />
    </>
  );
}
