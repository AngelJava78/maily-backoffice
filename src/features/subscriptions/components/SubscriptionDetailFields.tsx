import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { ErrorState } from '@/shared/ui/ErrorState';

import type { ClinicModule } from '../schemas/clinicModule';
import type { Subscription } from '../schemas/subscription';
import { SubscriptionPriceDisplay } from './SubscriptionPriceDisplay';
import { SubscriptionStatusChip } from './SubscriptionStatusChip';

const text = messages.subscriptions;

/**
 * The name of the subscription type, from this backoffice's own catalog (research D2 of 018), not
 * the `name` the API sends: that is catalog data an administrator can edit by hand, and the type
 * is recognized by its id, not its name (data-model.md, `SubscriptionTypeCatalog`). An id outside
 * today's two falls back to the API's own name, the same treatment FR-020 of the 003 gives an
 * unknown status, built once from `Object.entries` (no `as`, same idiom as `checkNameLabel`).
 */
const SUBSCRIPTION_TYPE_NAMES: ReadonlyMap<number, string> = new Map(
  Object.entries(text.types.catalog).map(([id, { name }]) => [Number(id), name]),
);

function subscriptionTypeName(subscriptionType: {
  readonly id: number;
  readonly name: string;
}): string {
  return SUBSCRIPTION_TYPE_NAMES.get(subscriptionType.id) ?? subscriptionType.name;
}

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

/** A list (`ul`) of texts, in the order received, or a placeholder when it is empty. */
function TextList({ items, empty }: { readonly items: readonly string[]; readonly empty: string }) {
  if (items.length === 0) {
    return empty;
  }
  return (
    <Box component="ul" sx={{ m: 0, pl: 3 }}>
      {items.map((item, index) => (
        // The texts can repeat and have no id: their place in the saved order is what they are.
        <li key={index}>{item}</li>
      ))}
    </Box>
  );
}

/**
 * The modules a plan includes, by name, and a line naming what is missing (FR-003, FR-004), fed by
 * the vigente catalog of active clinic modules instead of a fixed list (022, research D2): a saved
 * `key` absent from that catalog still shows, at the end of the included ones, as "(no disponible)"
 * (FR-006), and never counts toward "No incluye".
 */
function Modules({
  moduleKeys,
  modules,
  loading,
  loadFailed,
  onRetry,
}: {
  readonly moduleKeys: readonly string[];
  readonly modules: readonly ClinicModule[];
  readonly loading: boolean;
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
}) {
  if (loadFailed) {
    return (
      <ErrorState
        title={text.modules.loadError.title}
        message={text.modules.loadError.message}
        onRetry={onRetry}
      />
    );
  }
  if (loading) {
    return <CircularProgress aria-label={messages.common.loading} />;
  }

  const catalogKeys = new Set(modules.map((module) => module.key));
  const selected = new Set(moduleKeys);
  const included: string[] = [];
  const excluded: string[] = [];
  for (const module of modules) {
    (selected.has(module.key) ? included : excluded).push(module.name);
  }
  const unavailable = moduleKeys
    .filter((key) => !catalogKeys.has(key))
    .map((key) => text.detail.moduleUnavailable(key));

  return (
    <>
      <TextList items={[...included, ...unavailable]} empty={text.detail.emptyValue} />
      {excluded.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          {text.detail.notIncluded(excluded.join(', '))}
        </Typography>
      )}
    </>
  );
}

/** Everything the platform keeps about a subscription (FR-002, FR-003, FR-004). */
export function SubscriptionDetailFields({
  subscription,
  modules,
  loading,
  loadFailed,
  onRetry,
}: {
  readonly subscription: Subscription;
  /** The vigente catalog of active clinic modules (022, FR-001/FR-002), fetched by the page. */
  readonly modules: readonly ClinicModule[];
  readonly loading: boolean;
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
}) {
  const { fields } = text.detail;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
        <Chip
          size="small"
          label={subscription.selfService ? text.badge.selfService : text.badge.custom}
        />
      </Stack>
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
        <Field label={fields.type}>{subscriptionTypeName(subscription.subscriptionType)}</Field>
        <Field label={fields.clinicsLimit}>
          {subscription.clinicsLimit ?? text.clinics.notAvailable}
        </Field>
        <Field label={fields.description} keepLines>
          {subscription.description ?? text.detail.emptyValue}
        </Field>
        <Field label={fields.monthlyPrice}>
          <SubscriptionPriceDisplay
            cycle="monthly"
            monthlyPrice={subscription.monthlyPrice}
            annualPrice={subscription.annualPrice}
          />
        </Field>
        <Field label={fields.annualPrice}>
          <SubscriptionPriceDisplay
            cycle="annual"
            monthlyPrice={subscription.monthlyPrice}
            annualPrice={subscription.annualPrice}
          />
        </Field>
        {subscription.trialDays > 0 && (
          <Field label={fields.trialDays}>{text.price.trialDays(subscription.trialDays)}</Field>
        )}
        <Field label={fields.status}>
          <SubscriptionStatusChip status={subscription.status} />
        </Field>
        <Field label={fields.clinics}>
          {subscription.clinicsCount ?? text.clinics.notAvailable}
        </Field>
        <Field label={fields.modules}>
          <Modules
            moduleKeys={subscription.moduleKeys}
            modules={modules}
            loading={loading}
            loadFailed={loadFailed}
            onRetry={onRetry}
          />
        </Field>
        <Field label={fields.consultingRoomsLimit}>{subscription.consultingRoomsLimit}</Field>
        <Field label={fields.doctorsLimit}>{subscription.doctorsLimit}</Field>
        <Field label={fields.assistantsLimit}>{subscription.assistantsLimit}</Field>
        <Field label={fields.newPatientsPerYearLimit}>{subscription.newPatientsPerYearLimit}</Field>
        <Field label={fields.otherFeatures}>
          <TextList items={subscription.otherFeatures} empty={text.detail.noOtherFeatures} />
        </Field>
        <Field label={fields.createdAt}>{formatDateTime(subscription.createdAt)}</Field>
        <Field label={fields.updatedAt}>{formatDateTime(subscription.updatedAt)}</Field>
      </Box>
    </Paper>
  );
}
