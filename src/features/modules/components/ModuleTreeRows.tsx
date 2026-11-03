import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import type { ModuleTreeFlatRow } from '../policy/buildModuleTree';
import { MODULE_ACTION_ORDER, MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { ModulesStatusFilter } from '../schemas/modulesLocation';
import { ModuleNameCell } from './ModuleNameCell';

const text = messages.modules;

interface ModuleTreeRowsProps {
  readonly rows: readonly ModuleTreeFlatRow[];
  readonly canEdit: boolean;
  readonly onEdit: (moduleId: number) => void;
  readonly collapsed: ReadonlySet<number>;
  readonly onToggle: (moduleId: number) => void;
  /** While a search is active the tree is fully expanded and has no collapse controls. */
  readonly searching: boolean;
  /** The view being shown: it tells where the parent of a context row is. */
  readonly status: ModulesStatusFilter;
}

/** `typeId` is a plain `number` at the schema boundary (constitution II): an unexpected one is shown as-is. */
function typeLabel(typeId: number): string {
  return typeId === MODULE_TYPE.SYSTEM ? text.type.system : text.type.clinic;
}

/**
 * The rows of one group of the tree (contracts/modules-tree-ui.md §2): a module or a submodule
 * with everything a module shows and allows, or the dimmed context row of a parent that is not part
 * of the view. A context row has no actions and does not take the keyboard: it only places the
 * submodules below it.
 */
export function ModuleTreeRows({
  rows,
  canEdit,
  onEdit,
  collapsed,
  onToggle,
  searching,
  status,
}: ModuleTreeRowsProps) {
  return (
    <>
      {rows.map(({ row, depth }) => {
        if (row.kind === 'context') {
          return (
            <TableRow key={`context-${row.parent.id}`}>
              <TableCell />
              <TableCell sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                <Stack spacing={0.5} sx={{ pl: { xs: depth * 1.5, sm: depth * 3 } }}>
                  <Typography component="span" variant="body2" color="inherit">
                    {row.parent.name}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    color="inherit"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {row.parent.key}
                  </Typography>
                  <Typography component="span" variant="caption" color="inherit">
                    {row.reason === 'otherView'
                      ? text.tree.contextOtherView(status)
                      : text.tree.contextSearch}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
            </TableRow>
          );
        }
        const { module } = row;
        return (
          <TableRow key={module.id}>
            <TableCell>{module.sortOrder}</TableCell>
            <TableCell>
              <ModuleNameCell
                module={module}
                depth={depth}
                parent={row.kind === 'submodule' ? row.parent : undefined}
                childCount={row.childCount}
                expanded={!collapsed.has(module.id)}
                searching={searching}
                onToggle={() => {
                  onToggle(module.id);
                }}
              />
            </TableCell>
            <TableCell>{typeLabel(module.typeId)}</TableCell>
            <TableCell>
              <Stack direction="row" useFlexGap sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                {MODULE_ACTION_ORDER.filter((action) => module.actions.has(action)).map(
                  (action) => (
                    <Chip
                      key={action}
                      size="small"
                      variant="outlined"
                      label={text.actions[action]}
                    />
                  ),
                )}
              </Stack>
            </TableCell>
            <TableCell>
              {canEdit && (
                <Button
                  size="small"
                  onClick={() => {
                    onEdit(module.id);
                  }}
                >
                  {text.editAction}
                </Button>
              )}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
