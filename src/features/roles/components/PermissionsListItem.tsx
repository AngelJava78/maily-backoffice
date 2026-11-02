import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';

import {
  ACTION_KEYS,
  type ActionKey,
  type PermissionMatrixRow as Row,
} from '../schemas/permissionMatrix';

const actions = messages.roles.detail.actions;

/**
 * Below `sm` the four buttons of the widest module, each with its check mark, are wider than a
 * phone line (320 px measured at 344 px): tighter padding and type there (FR-013). From `sm` on the
 * buttons keep MUI's own `small` size, the same as the filters of Módulos (FR-012).
 */
const compactBelowSm: SxProps<Theme> = (theme) => ({
  [theme.breakpoints.down('sm')]: { px: 0.75, fontSize: '0.75rem' },
});

interface PermissionsListItemProps {
  readonly row: Row;
  /** A save is in flight, or the person cannot edit: every button of this item is disabled. */
  readonly pending: boolean;
  readonly onToggle: (actionKey: ActionKey, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
}

/**
 * The label of a toggle button, a check mark ahead of it (FR-011): the pressed state must not
 * depend on colour alone, because the default pressed tint is only a few percent of the text
 * colour. The mark's slot is always there and only seen while pressed, so the button keeps its
 * width and its neighbours do not move when it is toggled (research D4).
 */
function ToggleLabel({
  pressed,
  children,
}: {
  readonly pressed: boolean;
  readonly children: ReactNode;
}) {
  return (
    <>
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-flex',
          mr: 0.5,
          visibility: pressed ? 'visible' : 'hidden',
          [theme.breakpoints.down('sm')]: { mr: 0.25, '& svg': { width: 12, height: 12 } },
        })}
      >
        <Icon name="included" size="sm" decorative />
      </Box>
      {children}
    </>
  );
}

/**
 * One module of the permission list and the actions it actually has, each a toggle button that is
 * pressed while the action is granted (FR-002, FR-003, FR-008), plus "Todo el módulo" (FR-006): a
 * button of its own, outside the group of actions (research D3), pressed only while every action
 * the module has is. A module with no action shows only its name; an action the module does not
 * have is never painted, not even disabled.
 */
export function PermissionsListItem({
  row,
  pending,
  onToggle,
  onToggleAll,
}: PermissionsListItemProps) {
  const present = ACTION_KEYS.flatMap((key) => {
    const cell = row.cells[key];
    return cell === undefined ? [] : [{ key, granted: cell.granted }];
  });
  const allGranted = present.length > 0 && present.every(({ granted }) => granted);

  return (
    <ListItem
      divider
      sx={{
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        columnGap: 2,
        rowGap: 1,
        px: { xs: 0, sm: 2 },
      }}
    >
      <Typography
        component="span"
        sx={{ flex: '1 1 220px', minWidth: 0, overflowWrap: 'anywhere' }}
      >
        {row.module.name}
      </Typography>
      {present.length > 0 && (
        // The controls travel together: when they do not fit beside the name they all drop to the
        // next line, and if even that is too narrow "Todo el módulo" wraps below the group (FR-013).
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <ToggleButtonGroup size="small" disabled={pending}>
            {present.map(({ key, granted }) => (
              <ToggleButton
                key={key}
                value={key}
                selected={granted}
                onClick={() => {
                  // The value asked for; the Ver rule is applied upstream by `withPermissionToggled`.
                  onToggle(key, !granted);
                }}
                aria-label={`${actions[key]} de ${row.module.name}`}
                sx={compactBelowSm}
              >
                <ToggleLabel pressed={granted}>{actions[key]}</ToggleLabel>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <ToggleButton
            size="small"
            value="all"
            selected={allGranted}
            disabled={pending}
            onClick={() => {
              onToggleAll(!allGranted);
            }}
            aria-label={`${actions.allModule} de ${row.module.name}`}
            sx={compactBelowSm}
          >
            <ToggleLabel pressed={allGranted}>{actions.allModule}</ToggleLabel>
          </ToggleButton>
        </Box>
      )}
    </ListItem>
  );
}
