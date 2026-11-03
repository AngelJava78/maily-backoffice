import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import type { RolesStatusFilter, RolesTypeFilter } from '../schemas/rolePermissionsLocation';

const text = messages.roles.filters;

interface RolesFiltersProps {
  readonly type: RolesTypeFilter;
  readonly status: RolesStatusFilter;
  readonly onTypeChange: (type: RolesTypeFilter) => void;
  readonly onStatusChange: (status: RolesStatusFilter) => void;
}

/**
 * Tipo and Estatus of the roles list (feature 025): the same groups, sizes and labels as the
 * Módulos filters (FR-020, research D8), applied at once. MUI hands `null` when the pressed button
 * is pressed again; ignoring it keeps one button pressed in each group (FR-003).
 */
export function RolesFilters({ type, status, onTypeChange, onStatusChange }: RolesFiltersProps) {
  return (
    <Stack direction="row" useFlexGap sx={{ gap: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <Stack spacing={1}>
        <Typography component="span" variant="body2" color="text.secondary">
          {text.typeLabel}
        </Typography>
        <ToggleButtonGroup
          aria-label={text.typeLabel}
          exclusive
          size="small"
          value={type}
          onChange={(_event, next: RolesTypeFilter | null) => {
            if (next !== null) {
              onTypeChange(next);
            }
          }}
        >
          <ToggleButton value="all">{text.type.all}</ToggleButton>
          <ToggleButton value="system">{text.type.system}</ToggleButton>
          <ToggleButton value="clinic">{text.type.clinic}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack spacing={1}>
        <Typography component="span" variant="body2" color="text.secondary">
          {text.statusLabel}
        </Typography>
        <ToggleButtonGroup
          aria-label={text.statusLabel}
          exclusive
          size="small"
          value={status}
          onChange={(_event, next: RolesStatusFilter | null) => {
            if (next !== null) {
              onStatusChange(next);
            }
          }}
        >
          <ToggleButton value="active">{text.status.active}</ToggleButton>
          <ToggleButton value="blocked">{text.status.blocked}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Stack>
  );
}
