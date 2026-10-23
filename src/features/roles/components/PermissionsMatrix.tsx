import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { messages } from '@/shared/messages/es';
import { EmptyState } from '@/shared/ui/EmptyState';

import { ACTION_KEYS, type ActionKey, type PermissionMatrix as Matrix } from '../schemas/permissionMatrix';
import { PermissionsMatrixRow } from './PermissionsMatrixRow';

const text = messages.roles.detail;

interface PermissionsMatrixProps {
  readonly matrix: Matrix;
  readonly pending: boolean;
  readonly onToggle: (moduleId: number, actionKey: ActionKey, checked: boolean) => void;
  readonly onToggleAll: (moduleId: number, checked: boolean) => void;
}

/**
 * Módulo × Ver/Crear/Modificar/Eliminar (FR-006, FR-007): the modules are never hardcoded, so the
 * table works the same with 0 rows as with many (edge case of spec.md). A column only exists if at
 * least one module of this matrix actually has that action in the catalog.
 */
export function PermissionsMatrix({ matrix, pending, onToggle, onToggleAll }: PermissionsMatrixProps) {
  if (matrix.length === 0) {
    return <EmptyState message={text.emptyModules} />;
  }

  const columns = ACTION_KEYS.filter((key) => matrix.some((row) => row.cells[key] !== undefined));

  return (
    <TableContainer sx={{ maxWidth: '100%' }}>
      <Table size="small" aria-label={text.matrixHelper}>
        <TableHead>
          <TableRow>
            <TableCell>{text.columns.module}</TableCell>
            {columns.map((key) => (
              <TableCell key={key} component="th" scope="col" align="center">
                {text.columns[key]}
              </TableCell>
            ))}
            <TableCell component="th" scope="col" align="center">
              {text.columns.allModule}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matrix.map((row) => (
            <PermissionsMatrixRow
              key={row.module.id}
              row={row}
              columns={columns}
              pending={pending}
              onToggle={(actionKey, checked) => {
                onToggle(row.module.id, actionKey, checked);
              }}
              onToggleAll={(checked) => {
                onToggleAll(row.module.id, checked);
              }}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
