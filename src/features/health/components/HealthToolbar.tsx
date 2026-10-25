import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';

import { LastUpdatedAgo } from './LastUpdatedAgo';

/** How fresh the data on screen is, and how to ask again: only while there is data. */
export interface HealthFreshness {
  readonly updatedAt: number;
  readonly isUpdating: boolean;
  readonly onRefresh: () => void;
}

/**
 * The bar of the page (contracts/app-routes.md, point 2): with data, how long ago it arrived and
 * «Actualizar»; always, the link to «Componentes monitoreados» (FR-005). «Actualizar» is never
 * disabled: pressed during a cycle, it joins it (FR-025, US2-6), and the focus stays on it (FR-026).
 */
export function HealthToolbar({ freshness }: { readonly freshness?: HealthFreshness }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}
    >
      {freshness !== undefined && (
        <LastUpdatedAgo updatedAt={freshness.updatedAt} isUpdating={freshness.isUpdating} />
      )}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', ml: 'auto' }}>
        {freshness !== undefined && (
          <Button
            variant="outlined"
            startIcon={<Icon name="refresh" decorative />}
            onClick={freshness.onRefresh}
          >
            {messages.health.page.refresh}
          </Button>
        )}
        <Button component={RouterLink} to="/health/components">
          {messages.health.registry.link}
        </Button>
      </Stack>
    </Stack>
  );
}
