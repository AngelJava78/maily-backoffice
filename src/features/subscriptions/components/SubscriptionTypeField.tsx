import Box from '@mui/material/Box';
import FormHelperText from '@mui/material/FormHelperText';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useId } from 'react';
import { useController, type Control, type FieldErrors } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import type { SubscriptionFormValues } from '../schemas/subscriptionForm';
import {
  SUBSCRIPTION_TYPE_ORDER,
  type SubscriptionTypeId,
} from '../schemas/subscriptionTypeCatalog';

const text = messages.subscriptions.form;
const catalog = messages.subscriptions.types.catalog;

interface SubscriptionTypeFieldProps {
  readonly control: Control<SubscriptionFormValues>;
  readonly errors: FieldErrors<SubscriptionFormValues>;
  /** Only at creation (FR-001); fixed forever once the subscription exists (FR-004). */
  readonly disabled?: boolean;
}

/**
 * Individual or Empresarial (FR-001, FR-002): an exclusive toggle that always keeps one of the two
 * marked — deselecting the pressed option is ignored, so the control can never be left empty
 * (Clarifications: Individual by default, saving never blocked for lack of a selection).
 */
export function SubscriptionTypeField({
  control,
  errors,
  disabled = false,
}: SubscriptionTypeFieldProps) {
  const helpId = useId();
  const errorId = useId();
  const {
    field: { value, onChange },
  } = useController({ control, name: 'subscriptionTypeId' });
  const error = errors.subscriptionTypeId?.message;

  return (
    <Box
      component="fieldset"
      aria-describedby={disabled ? helpId : undefined}
      sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
    >
      <Typography component="legend" variant="subtitle1" sx={{ fontWeight: 'bold', p: 0 }}>
        {text.fields.subscriptionType}
      </Typography>
      {disabled && (
        <Typography id={helpId} variant="body2" color="text.secondary">
          {text.subscriptionTypeImmutableHelper}
        </Typography>
      )}
      {error !== undefined && (
        <FormHelperText id={errorId} error sx={{ mx: 0 }}>
          {error}
        </FormHelperText>
      )}
      <ToggleButtonGroup
        value={value}
        exclusive
        disabled={disabled}
        onChange={(_event, next: SubscriptionTypeId | null) => {
          // An exclusive group reports `null` when the only pressed option is clicked again; kept
          // as the value it already had, so the control never ends up with nothing marked.
          if (next !== null) {
            onChange(next);
          }
        }}
        sx={{ mt: 1, flexWrap: 'wrap' }}
      >
        {SUBSCRIPTION_TYPE_ORDER.map((id) => (
          <ToggleButton
            key={id}
            value={id}
            sx={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              textAlign: 'left',
              textTransform: 'none',
            }}
          >
            <Typography component="span" sx={{ fontWeight: 'bold' }}>
              {catalog[id].name}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              {catalog[id].description}
            </Typography>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
