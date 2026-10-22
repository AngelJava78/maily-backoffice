import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useRef } from 'react';
import {
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';

import { messages } from '@/shared/messages/es';
import { Icon } from '@/shared/ui/Icon';

import { MAX_FEATURES, type SubscriptionFormValues } from '../schemas/subscriptionForm';

const text = messages.subscriptions.form;

/** Where the focus goes once an element was removed: an element (by its key) or "Agregar". */
const ADD = Symbol('add');
type FocusTarget = string | typeof ADD;

interface FeaturesFieldProps {
  readonly control: Control<SubscriptionFormValues>;
  readonly register: UseFormRegister<SubscriptionFormValues>;
  /** The errors of the list: its own (`message`, or `root` from the schema) and each element's. */
  readonly errors?: FieldErrors<SubscriptionFormValues>['features'];
}

/**
 * What a subscription includes: from 0 to 20 texts, in the order in which they are written
 * (decision 4 of the spec). They can be added, edited and removed, but not reordered. Adding moves
 * the focus to the new element and removing one moves it to the next, to the one before or, when
 * none is left, to "Agregar elemento", so the keyboard never loses its place.
 */
export function FeaturesField({ control, register, errors }: FeaturesFieldProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'features' });
  const ids = { help: useId(), error: useId(), max: useId() };
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  const atMax = fields.length >= MAX_FEATURES;
  const listError = errors?.message ?? errors?.root?.message;

  // After the render that removed an element, the focus goes where `removeAt` said.
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) {
      return;
    }
    pendingFocus.current = null;
    (target === ADD ? addButton.current : inputs.current.get(target))?.focus();
  });

  function removeAt(index: number) {
    pendingFocus.current = (fields[index + 1] ?? fields[index - 1])?.id ?? ADD;
    remove(index);
  }

  return (
    <Box
      component="fieldset"
      aria-describedby={listError === undefined ? ids.help : `${ids.error} ${ids.help}`}
      sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
    >
      <Typography component="legend" variant="subtitle1" sx={{ fontWeight: 'bold', p: 0 }}>
        {text.fields.features}
      </Typography>
      <Typography id={ids.help} variant="body2" color="text.secondary">
        {text.featuresHelper}
      </Typography>
      {listError !== undefined && (
        <FormHelperText id={ids.error} error sx={{ mx: 0 }}>
          {listError}
        </FormHelperText>
      )}
      <Stack spacing={2} sx={{ mt: 2 }}>
        {fields.map((item, index) => {
          const { ref, ...registration } = register(`features.${index}.value`);
          const error = errors?.[index]?.value?.message;
          return (
            <Stack key={item.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <TextField
                {...registration}
                inputRef={(element: HTMLInputElement | null) => {
                  ref(element);
                  if (element === null) {
                    inputs.current.delete(item.id);
                  } else {
                    inputs.current.set(item.id, element);
                  }
                }}
                label={text.featureLabel(index + 1)}
                fullWidth
                autoComplete="off"
                error={error !== undefined}
                helperText={error}
              />
              <IconButton
                aria-label={text.removeFeature(index + 1)}
                onClick={() => {
                  removeAt(index);
                }}
                sx={{ mt: 1 }}
              >
                <Icon name="delete" decorative />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>
      <Stack
        direction="row"
        useFlexGap
        sx={{ mt: 2, gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <Button
          ref={addButton}
          startIcon={<Icon name="add" decorative />}
          disabled={atMax}
          aria-describedby={atMax ? ids.max : undefined}
          onClick={() => {
            append({ value: '' });
          }}
        >
          {text.addFeature}
        </Button>
        <Typography variant="body2" color="text.secondary">
          {text.featuresCount(fields.length)}
        </Typography>
      </Stack>
      {/* Always in the page, so reaching the limit is announced when it happens. */}
      <Typography id={ids.max} role="status" variant="body2" sx={{ mt: 1 }}>
        {atMax ? text.featuresMax : ''}
      </Typography>
    </Box>
  );
}
