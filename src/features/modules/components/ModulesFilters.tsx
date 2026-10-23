import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import type { ModulesStatusFilter, ModulesTypeFilter } from '../schemas/modulesLocation';

const text = messages.modules.filters;

interface ModulesFiltersProps {
  readonly type: ModulesTypeFilter;
  readonly status: ModulesStatusFilter;
  readonly search: string;
  readonly onTypeChange: (type: ModulesTypeFilter) => void;
  readonly onStatusChange: (status: ModulesStatusFilter) => void;
  readonly onSearchChange: (search: string) => void;
}

/** The three filters of the Módulos screen: Tipo and Estatus apply at once, Buscar as it is typed. */
export function ModulesFilters({
  type,
  status,
  search,
  onTypeChange,
  onStatusChange,
  onSearchChange,
}: ModulesFiltersProps) {
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
          onChange={(_event, next: ModulesTypeFilter | null) => {
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
          onChange={(_event, next: ModulesStatusFilter | null) => {
            if (next !== null) {
              onStatusChange(next);
            }
          }}
        >
          <ToggleButton value="active">{text.status.active}</ToggleButton>
          <ToggleButton value="blocked">{text.status.blocked}</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <TextField
        label={text.search}
        value={search}
        onChange={(event) => {
          onSearchChange(event.target.value);
        }}
        size="small"
        sx={{ minWidth: 240 }}
      />
    </Stack>
  );
}
