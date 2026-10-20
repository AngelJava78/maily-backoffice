import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { messages } from '@/shared/messages/es';

import type { IssuedToken } from '../schemas/accessToken';

interface TokenValueProps {
  /** The token on screen, or `null` before the first one arrives. */
  readonly token: IssuedToken | null;
  /** Whether the whole token is visible instead of the mask. */
  readonly revealed: boolean;
  /** Whether "Copiar" is offered (not once the token has expired, FR-013). */
  readonly canCopy: boolean;
  readonly onToggleReveal: () => void;
  readonly onCopy: () => void;
}

/**
 * What the field holds: nothing, a mask that has nothing to do with the token, or the token. While
 * it is hidden the text of the token is not in the page at all (FR-010, research D9).
 */
function shownText(token: IssuedToken | null, revealed: boolean): string {
  if (token === null) {
    return '';
  }
  return revealed ? token.value : messages.token.mask;
}

/**
 * The space of the token (contracts/app-routes.md, "Controles"): a read-only field that wraps a very
 * long token instead of cutting it, and the buttons to show or hide it and to copy it.
 */
export function TokenValue({ token, revealed, canCopy, onToggleReveal, onCopy }: TokenValueProps) {
  const text = messages.token;

  return (
    <Stack spacing={1}>
      <TextField
        label={text.fields.token}
        value={shownText(token, revealed)}
        helperText={token === null ? text.emptyToken : undefined}
        multiline
        fullWidth
        slotProps={{
          input: { readOnly: true },
          htmlInput: { autoComplete: 'off', spellCheck: false },
        }}
        sx={{ '& textarea': { overflowWrap: 'anywhere' } }}
      />
      {token !== null && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button onClick={onToggleReveal}>
            {revealed ? text.actions.hide : text.actions.show}
          </Button>
          {canCopy && <Button onClick={onCopy}>{text.actions.copy}</Button>}
        </Stack>
      )}
    </Stack>
  );
}
