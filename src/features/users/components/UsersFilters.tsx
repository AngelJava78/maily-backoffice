import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import type { UsersStatusFilter, UsersTypeFilter } from '../schemas/usersLocation';

const text = messages.users.filters;

interface UsersFiltersProps {
  readonly type: UsersTypeFilter;
  readonly status: UsersStatusFilter;
  readonly onTypeChange: (type: UsersTypeFilter) => void;
  readonly onStatusChange: (status: UsersStatusFilter) => void;
}

/**
 * Tipo and Estatus of the users list (feature 026): the same groups, sizes and labels as the filters
 * of Módulos and Roles (FR-015, research D9), applied at once. MUI hands `null` when the pressed
 * button is pressed again; ignoring it keeps one button pressed in each group (FR-003).
 */
export function UsersFilters({ type, status, onTypeChange, onStatusChange }: UsersFiltersProps) {
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
          onChange={(_event, next: UsersTypeFilter | null) => {
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
          onChange={(_event, next: UsersStatusFilter | null) => {
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
