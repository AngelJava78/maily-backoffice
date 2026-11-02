import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { Fragment } from 'react';

import { messages } from '@/shared/messages/es';
import { EmptyState } from '@/shared/ui/EmptyState';

import {
  ACTION_KEYS,
  type ActionKey,
  type PermissionMatrix as Matrix,
} from '../schemas/permissionMatrix';
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
export function PermissionsMatrix({
  matrix,
  pending,
  onToggle,
  onToggleAll,
}: PermissionsMatrixProps) {
  if (matrix.length === 0) {
    return <EmptyState message={text.emptyModules} />;
  }

  const columns = ACTION_KEYS.filter((key) => matrix.some((row) => row.cells[key] !== undefined));
  // FR-004/FR-005: a Clínica role's matrix groups its rows by module type (Sistema modules joined
  // in, spec 015-clinic-roles-system-modules); a single-type matrix (every role before this
  // feature, and a role de Sistema always) shows no group header at all.
  const groupedByType = new Set(matrix.map((row) => row.module.type.id)).size > 1;

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
          {matrix.map((row, index) => {
            const startsNewGroup =
              groupedByType && matrix[index - 1]?.module.type.id !== row.module.type.id;
            return (
              <Fragment key={row.module.id}>
                {startsNewGroup && (
                  <TableRow>
                    <TableCell component="th" scope="rowgroup" colSpan={columns.length + 2}>
                      {text.moduleGroupHeader(row.module.type.name)}
                    </TableCell>
                  </TableRow>
                )}
                <PermissionsMatrixRow
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
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
