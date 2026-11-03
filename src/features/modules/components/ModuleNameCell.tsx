import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';

import {
  isProtectedModule,
  type ParentModuleRef,
  type SystemModule,
} from '../schemas/systemModule';

const text = messages.modules;

/** Said by screen readers, never seen (same technique as `LiveStatus`; strings, not a bare 1). */
const visuallyHidden: SxProps<Theme> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  margin: '-1px',
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

interface ModuleNameCellProps {
  readonly module: SystemModule;
  /** How deep the row is: 0 for a top-level module; one level of indentation per step. */
  readonly depth: number;
  /** The parent of a submodule, so that a screen reader can say whose it is (FR-017). */
  readonly parent?: ParentModuleRef;
  readonly childCount: number;
  readonly expanded: boolean;
  /** While a search is active everything shows and there is nothing to collapse (research D6). */
  readonly searching: boolean;
  readonly onToggle: () => void;
}

/**
 * The "Módulo" cell of a row of the tree: the indentation of its level, the name with the "Base"
 * mark, the key and, if it has submodules, the control that collapses and expands them (FR-003,
 * FR-017; research D5). The control is a native button, named "{n} submódulos de {Módulo}" (it
 * contains its visible text, WCAG 2.5.3) and with `aria-expanded`.
 */
export function ModuleNameCell({
  module,
  depth,
  parent,
  childCount,
  expanded,
  searching,
  onToggle,
}: ModuleNameCellProps) {
  return (
    // One level is half as wide on a phone, so that the deepest row still fits (FR-017).
    <Stack spacing={0.5} sx={{ pl: { xs: depth * 1.5, sm: depth * 3 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {parent !== undefined && (
          <Box component="span" sx={visuallyHidden}>
            {text.tree.submoduleOf(parent.name)}
          </Box>
        )}
        <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
          {module.name}
        </Typography>
        {isProtectedModule(module.key) && <Chip size="small" label={text.baseBadge} />}
      </Stack>
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{ fontFamily: 'monospace' }}
      >
        {module.key}
      </Typography>
      {childCount > 0 &&
        (searching ? (
          <Typography component="span" variant="caption" color="text.secondary">
            {text.tree.submodulesButton(childCount)}
          </Typography>
        ) : (
          <Button
            size="small"
            color="inherit"
            aria-expanded={expanded}
            aria-label={text.tree.submodulesOf(childCount, module.name)}
            startIcon={
              <Box
                component="span"
                sx={{ display: 'inline-flex', transform: expanded ? 'none' : 'rotate(-90deg)' }}
              >
                <Icon name="arrow-drop-down" size="sm" decorative />
              </Box>
            }
            onClick={onToggle}
            sx={{ alignSelf: 'flex-start', ml: -1 }}
          >
            {text.tree.submodulesButton(childCount)}
          </Button>
        ))}
    </Stack>
  );
}
