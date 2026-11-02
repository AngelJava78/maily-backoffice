import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import { messages } from '@/shared/messages/es';

import {
  ACTION_KEYS,
  type ActionKey,
  type PermissionMatrixRow as Row,
} from '../schemas/permissionMatrix';

const columns = messages.roles.detail.columns;

interface PermissionsMatrixRowProps {
  readonly row: Row;
  /** The action columns of the whole table (research: only actions at least one module has);
   * not necessarily every column this particular row has a cell for. */
  readonly columns: readonly ActionKey[];
  /** A save is in flight: every checkbox of the table is disabled, not only this row's. */
  readonly pending: boolean;
  readonly onToggle: (actionKey: ActionKey, checked: boolean) => void;
  readonly onToggleAll: (checked: boolean) => void;
}

/** One row of the permission matrix: a module and the actions it actually has (FR-007, FR-008, FR-009). */
export function PermissionsMatrixRow({
  row,
  columns: tableColumns,
  pending,
  onToggle,
  onToggleAll,
}: PermissionsMatrixRowProps) {
  const presentKeys = ACTION_KEYS.filter((key) => row.cells[key] !== undefined);
  const allGranted =
    presentKeys.length > 0 && presentKeys.every((key) => row.cells[key]?.granted === true);

  return (
    <TableRow>
      <TableCell component="th" scope="row">
        {row.module.name}
      </TableCell>
      {tableColumns.map((key) => {
        const cell = row.cells[key];
        return (
          <TableCell key={key} align="center">
            {cell === undefined ? null : (
              <Checkbox
                checked={cell.granted}
                disabled={pending}
                onChange={(event) => {
                  onToggle(key, event.target.checked);
                }}
                slotProps={{ input: { 'aria-label': `${columns[key]} de ${row.module.name}` } }}
              />
            )}
          </TableCell>
        );
      })}
      <TableCell align="center">
        {presentKeys.length === 0 ? null : (
          <Checkbox
            checked={allGranted}
            disabled={pending}
            onChange={(event) => {
              onToggleAll(event.target.checked);
            }}
            slotProps={{ input: { 'aria-label': `${columns.allModule} de ${row.module.name}` } }}
          />
        )}
      </TableCell>
    </TableRow>
  );
}
