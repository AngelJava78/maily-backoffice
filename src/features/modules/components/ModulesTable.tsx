import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import { MODULE_ACTION_ORDER, MODULE_TYPE } from '../schemas/moduleActionCatalog';
import { isProtectedModule, type SystemModule } from '../schemas/systemModule';

const text = messages.modules;
const COLUMN_COUNT = 5;

interface ModulesTableProps {
  readonly modules: readonly SystemModule[];
  readonly canEdit: boolean;
  readonly onEdit: (moduleId: number) => void;
}

/** `typeId` is a plain `number` at the schema boundary (constitution II): the API is the source of
 * truth for which values exist, so an unexpected one is shown as-is rather than rejected outright. */
function typeLabel(typeId: number): string {
  return typeId === MODULE_TYPE.SYSTEM ? text.type.system : text.type.clinic;
}

/** One group of the table (Sistema or Clínica), skipped entirely when it has no modules. */
function ModuleGroup({
  heading,
  modules,
  canEdit,
  onEdit,
}: {
  readonly heading: string;
  readonly modules: readonly SystemModule[];
  readonly canEdit: boolean;
  readonly onEdit: (moduleId: number) => void;
}) {
  if (modules.length === 0) {
    return null;
  }
  return (
    <>
      <TableRow>
        <TableCell component="th" scope="row" colSpan={COLUMN_COUNT} sx={{ fontWeight: 600 }}>
          {heading}
        </TableCell>
      </TableRow>
      {modules.map((module) => (
        <TableRow key={module.id}>
          <TableCell>{module.sortOrder}</TableCell>
          <TableCell>
            <Stack spacing={0.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                  {module.name}
                </Typography>
                {isProtectedModule(module.key) && <Chip size="small" label={text.baseBadge} />}
              </Stack>
              <Typography component="span" variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {module.key}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell>{typeLabel(module.typeId)}</TableCell>
          <TableCell>
            <Stack direction="row" useFlexGap sx={{ gap: 0.5, flexWrap: 'wrap' }}>
              {MODULE_ACTION_ORDER.filter((action) => module.actions.has(action)).map((action) => (
                <Chip key={action} size="small" variant="outlined" label={text.actions[action]} />
              ))}
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
      ))}
    </>
  );
}

/**
 * The catalog of modules, grouped Sistema first and Clínica after (FR-001), each with its own
 * count; a group with no modules in the given list does not render (research D6: the caller already
 * filtered by type). Uses `Table`, not `DataGrid` (research D7): the grouped, sectioned layout does
 * not fit the Data Grid's row model.
 */
export function ModulesTable({ modules, canEdit, onEdit }: ModulesTableProps) {
  if (modules.length === 0) {
    return null;
  }
  const system = modules.filter((module) => module.typeId === MODULE_TYPE.SYSTEM);
  const clinic = modules.filter((module) => module.typeId === MODULE_TYPE.CLINIC);

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
          <ModuleGroup
            heading={text.groups.system(system.length)}
            modules={system}
            canEdit={canEdit}
            onEdit={onEdit}
          />
          <ModuleGroup
            heading={text.groups.clinic(clinic.length)}
            modules={clinic}
            canEdit={canEdit}
            onEdit={onEdit}
          />
        </TableBody>
      </Table>
    </TableContainer>
  );
}
