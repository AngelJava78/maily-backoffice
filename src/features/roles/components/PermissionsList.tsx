import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import { Fragment, useId } from 'react';

import { messages } from '@/shared/messages/es';
import { EmptyState } from '@/shared/ui/EmptyState';

import type { ActionKey, PermissionMatrix as Matrix } from '../schemas/permissionMatrix';
import { PermissionsListItem } from './PermissionsListItem';

const text = messages.roles.detail;

interface PermissionsListProps {
  readonly matrix: Matrix;
  /** The accessible name of the list: «Permisos de {role} por módulo y acción». */
  readonly label: string;
  /** A save is in flight, or the person cannot edit: every button of the list is disabled. */
  readonly pending: boolean;
  readonly onToggle: (moduleId: number, actionKey: ActionKey, checked: boolean) => void;
  readonly onToggleAll: (moduleId: number, checked: boolean) => void;
}

/**
 * The permissions of a role as a list, one item per module with a toggle button per action
 * (FR-001, FR-002). The modules are never hardcoded, so the list works the same with 0 items as
 * with many (edge case of spec.md); each item only has the actions its module has in the catalog.
 * The helper text is shown above the list and describes it (FR-014).
 */
export function PermissionsList({
  matrix,
  label,
  pending,
  onToggle,
  onToggleAll,
}: PermissionsListProps) {
  const helperId = useId();

  if (matrix.length === 0) {
    return <EmptyState message={text.emptyModules} />;
  }

  // FR-004/FR-005 of 015-clinic-roles-system-modules: a Clínica role's matrix groups its rows by
  // module type (Sistema modules joined in); a single-type matrix (every role before that
  // feature, and a role de Sistema always) shows no group header at all.
  const groupedByType = new Set(matrix.map((row) => row.module.type.id)).size > 1;

  return (
    <>
      <Typography id={helperId} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {text.matrixHelper}
      </Typography>
      <List aria-label={label} aria-describedby={helperId}>
        {matrix.map((row, index) => {
          const startsNewGroup =
            groupedByType && matrix[index - 1]?.module.type.id !== row.module.type.id;
          return (
            <Fragment key={row.module.id}>
              {startsNewGroup && (
                <ListSubheader disableSticky sx={{ px: { xs: 0, sm: 2 } }}>
                  {text.moduleGroupHeader(row.module.type.name)}
                </ListSubheader>
              )}
              <PermissionsListItem
                row={row}
                pending={pending}
                onToggle={(actionKey, checked) => {
                  onToggle(row.module.id, actionKey, checked);
                }}
                onToggleAll={(checked) => {
                  onToggleAll(row.module.id, checked);
                }}
              />
            </Fragment>
          );
        })}
      </List>
    </>
  );
}
