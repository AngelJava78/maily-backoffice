import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { messages } from '@/shared/messages/es';

import { MODULE_TYPE } from '../schemas/moduleActionCatalog';
import type { SystemModule } from '../schemas/systemModule';

const text = messages.modules;

/** The Clave and the Tipo of a module being edited: fixed information, never an input (FR-015). */
export function ModuleFixedInfo({ module }: { readonly module: SystemModule }) {
  return (
    <Stack spacing={1}>
      <Stack direction="row" useFlexGap sx={{ gap: 3, flexWrap: 'wrap' }}>
        <Stack>
          <Typography variant="caption" color="text.secondary">
            {text.form.fields.key}
          </Typography>
          <Typography sx={{ fontFamily: 'monospace' }}>{module.key}</Typography>
        </Stack>
        <Stack>
          <Typography variant="caption" color="text.secondary">
            {text.form.fields.type}
          </Typography>
          <Typography>
            {module.typeId === MODULE_TYPE.SYSTEM ? text.type.system : text.type.clinic}
          </Typography>
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {text.form.fields.keyAndTypeFixed}
      </Typography>
    </Stack>
  );
}
