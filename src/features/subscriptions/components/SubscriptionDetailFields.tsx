import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatMxn } from '@/shared/lib/formatCurrency';
import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import type { Subscription } from '../schemas/subscription';
import { SubscriptionStatusChip } from './SubscriptionStatusChip';

const text = messages.subscriptions;

/**
 * A label and its value; they reflow to one column on narrow screens, and long texts wrap.
 * `keepLines` keeps the line breaks that were written, as in the description.
 */
function Field({
  label,
  keepLines = false,
  children,
}: {
  readonly label: string;
  readonly keepLines?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <>
      <Typography component="dt" sx={{ fontWeight: 'bold' }}>
        {label}
      </Typography>
      <Typography
        component="dd"
        sx={{ m: 0, overflowWrap: 'anywhere', whiteSpace: keepLines ? 'pre-line' : undefined }}
      >
        {children}
      </Typography>
    </>
  );
}

/** What it includes, in the order it was saved, as a list (`ul`) a screen reader counts. */
function Features({ features }: { readonly features: readonly string[] }) {
  if (features.length === 0) {
    return text.detail.noFeatures;
  }
  return (
    <Box component="ul" sx={{ m: 0, pl: 3 }}>
      {features.map((feature, index) => (
        // The texts can repeat and have no id: their place in the saved order is what they are.
        <li key={index}>{feature}</li>
      ))}
    </Box>
  );
}

/** Everything the platform keeps about a subscription (FR-003). */
export function SubscriptionDetailFields({
  subscription,
}: {
  readonly subscription: Subscription;
}) {
  const { fields } = text.detail;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
          columnGap: 4,
          rowGap: 1,
        }}
      >
        <Field label={fields.name}>{subscription.name}</Field>
        <Field label={fields.description} keepLines>
          {subscription.description ?? text.detail.emptyValue}
        </Field>
        <Field label={fields.monthlyPrice}>
          {text.price.perMonth(formatMxn(subscription.monthlyPrice))}
        </Field>
        <Field label={fields.status}>
          <SubscriptionStatusChip status={subscription.status} />
        </Field>
        <Field label={fields.clinics}>
          {subscription.clinicsCount ?? text.clinics.notAvailable}
        </Field>
        <Field label={fields.features}>
          <Features features={subscription.features} />
        </Field>
        <Field label={fields.createdAt}>{formatDateTime(subscription.createdAt)}</Field>
        <Field label={fields.updatedAt}>{formatDateTime(subscription.updatedAt)}</Field>
      </Box>
    </Paper>
  );
}
