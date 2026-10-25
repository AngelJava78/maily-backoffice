import { useAccessCheckFallback } from '../hooks/useAccessCheckFallback';
import { FallbackSections } from './FallbackSections';

/**
 * The sections that «No se pudo comprobar el acceso» adds (user stories 5 and 6): the chain of the
 * screen, once per `round`, paused while the access is checked, and announced again in each round
 * that the person asked for (research D9, D14).
 */
export function AccessCheckFallback({
  round,
  paused,
}: {
  readonly round: number;
  readonly paused: boolean;
}) {
  useAccessCheckFallback({ round, paused });
  return <FallbackSections scope="access" announceToken={round} />;
}
