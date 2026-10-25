import { Badge } from '@/shared/ui/Badge';

import type { StatusPresentation } from '../policy/statusPresentation';

/**
 * A status of «Salud de servicios» (research D12): its text, reinforced by its icon and its tone,
 * so that it is never told by its color alone (FR-013, WCAG 1.4.1). The icon is decorative,
 * because the text already says the status.
 */
export function StatusBadge({ presentation }: { readonly presentation: StatusPresentation }) {
  return <Badge label={presentation.label} tone={presentation.tone} icon={presentation.icon} />;
}
