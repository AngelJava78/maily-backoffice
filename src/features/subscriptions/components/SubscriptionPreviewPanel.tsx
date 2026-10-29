import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { messages } from '@/shared/messages/es';

import { resolveModuleSelection } from '../policy/clinicModuleSelection';
import type { ClinicModule } from '../schemas/clinicModule';
import type { SubscriptionFormValues } from '../schemas/subscriptionForm';
import { PriceCycleToggle, type PriceCycle } from './PriceCycleToggle';
import { SubscriptionPriceDisplay } from './SubscriptionPriceDisplay';

const text = messages.subscriptions;

interface SubscriptionPreviewPanelProps {
  readonly values: SubscriptionFormValues;
  /** The vigente catalog of active clinic modules (021): the same one the form offers. */
  readonly modules: readonly ClinicModule[];
}

/** A label and the items below it, or nothing when there are none to show. */
function Section({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <Box>
      {/* `component="div"`: a preview label, not a document heading. */}
      <Typography variant="subtitle2" component="div" sx={{ fontWeight: 'bold' }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

/**
 * How the clinic will see the plan while it is still being captured (FR-014): it reflects the form
 * values with no request of its own, with its own Mensual/Anual toggle, always starting at Mensual
 * (research D8).
 */
export function SubscriptionPreviewPanel({ values, modules }: SubscriptionPreviewPanelProps) {
  const [cycle, setCycle] = useState<PriceCycle>('monthly');
  const effective = resolveModuleSelection(values.moduleKeys, modules);
  const included: ClinicModule[] = [];
  const excluded: ClinicModule[] = [];
  for (const module of modules) {
    (effective.has(module.key) ? included : excluded).push(module);
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }} component="section" aria-label={text.preview.title}>
      {/* `component="div"`: the panel's accessible name already comes from the section's
          aria-label; a document heading here would depend on where the panel is placed. */}
      <Typography variant="h6" component="div">
        {text.preview.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {text.preview.subtitle}
      </Typography>
      <PriceCycleToggle value={cycle} onChange={setCycle} />
      <Stack spacing={2} sx={{ mt: 2 }}>
        <Box>
          {/* `component="div"`: a preview of the name, not a document heading. */}
          <Typography variant="h6" component="div">
            {values.name === '' ? text.preview.namePlaceholder : values.name}
          </Typography>
          <Chip
            size="small"
            label={values.selfService ? text.badge.selfService : text.badge.custom}
            sx={{ my: 0.5 }}
          />
          {values.description !== '' && (
            <Typography variant="body2" color="text.secondary">
              {values.description}
            </Typography>
          )}
        </Box>
        <SubscriptionPriceDisplay
          cycle={cycle}
          monthlyPrice={values.monthlyPrice}
          annualPrice={values.annualPrice}
        />
        {Number(values.trialDays) > 0 && (
          <Typography>{text.price.trialDays(Number(values.trialDays))}</Typography>
        )}
        <Section label={text.detail.fields.modules}>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {included.map((module) => (
              <li key={module.key}>{module.name}</li>
            ))}
          </Box>
          {excluded.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {text.detail.notIncluded(excluded.map((module) => module.name).join(', '))}
            </Typography>
          )}
        </Section>
        <Section label={text.preview.limitsTitle}>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            <li>{values.consultingRoomsLimit}</li>
            <li>{values.doctorsLimit}</li>
            <li>{values.assistantsLimit}</li>
            <li>{values.newPatientsPerYearLimit}</li>
          </Box>
        </Section>
        {values.otherFeatures.length > 0 && (
          <Section label={text.detail.fields.otherFeatures}>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {values.otherFeatures.map((feature, index) => (
                <li key={index}>{feature.value}</li>
              ))}
            </Box>
          </Section>
        )}
      </Stack>
    </Paper>
  );
}
