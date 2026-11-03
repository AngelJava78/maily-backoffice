import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { messages } from '@/shared/messages/es';

import { flattenModuleTree, type ModuleTreeGroup } from '../policy/buildModuleTree';
import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { ModulesStatusFilter } from '../schemas/modulesLocation';
import { ModuleTreeRows } from './ModuleTreeRows';

const text = messages.modules;
const COLUMN_COUNT = 5;

interface ModulesTableProps {
  /** The tree already built by `buildModuleTree`: Sistema first, then Clínica, each with its rows. */
  readonly groups: readonly ModuleTreeGroup[];
  readonly canEdit: boolean;
  readonly onEdit: (moduleId: number) => void;
  /** The parents whose submodules the person collapsed. */
  readonly collapsed: ReadonlySet<number>;
  readonly onToggle: (moduleId: number) => void;
  /** While a search is active the tree shows fully expanded (FR-004). */
  readonly searching: boolean;
  /** The view being shown, to say where the parent of a context row is. */
  readonly status: ModulesStatusFilter;
}

/**
 * The catalog of modules as a hierarchical tree, grouped Sistema first and Clínica after (FR-001,
 * FR-002), each group with its own count of modules and submodules (FR-007); a group with no rows
 * does not render (the caller already filtered by type). Uses `Table`, not `DataGrid` (013 research
 * D7, and this feature's D5): the grouped layout does not fit the Data Grid's row model, and its
 * tree data is a paid feature.
 */
export function ModulesTable({
  groups,
  canEdit,
  onEdit,
  collapsed,
  onToggle,
  searching,
  status,
}: ModulesTableProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small" aria-label={text.title}>
        <TableHead>
          <TableRow>
            <TableCell>{text.columns.order}</TableCell>
            <TableCell>{text.columns.module}</TableCell>
            <TableCell>{text.columns.type}</TableCell>
            <TableCell>{text.columns.permissions}</TableCell>
            <TableCell>{text.columns.action}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((group) => (
            <GroupRows
              key={group.typeId}
              group={group}
              canEdit={canEdit}
              onEdit={onEdit}
              collapsed={collapsed}
              onToggle={onToggle}
              searching={searching}
              status={status}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/** The heading of one group and the rows of its tree. */
function GroupRows({
  group,
  ...rowProps
}: Omit<ModulesTableProps, 'groups'> & { readonly group: ModuleTreeGroup }) {
  const heading =
    group.typeId === MODULE_TYPE.SYSTEM
      ? text.groups.system(group.moduleCount, group.submoduleCount)
      : text.groups.clinic(group.moduleCount, group.submoduleCount);

  return (
    <>
      <TableRow>
        <TableCell component="th" scope="row" colSpan={COLUMN_COUNT} sx={{ fontWeight: 600 }}>
          {heading}
        </TableCell>
      </TableRow>
      <ModuleTreeRows
        rows={flattenModuleTree(group.nodes, {
          collapsed: rowProps.collapsed,
          searching: rowProps.searching,
        })}
        canEdit={rowProps.canEdit}
        onEdit={rowProps.onEdit}
        collapsed={rowProps.collapsed}
        onToggle={rowProps.onToggle}
        searching={rowProps.searching}
        status={rowProps.status}
      />
    </>
  );
}
