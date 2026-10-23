import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { messages } from '@/shared/messages/es';

import { CLINIC_MODULE_ORDER } from '../schemas/clinicModuleCatalog';
import type { Subscription } from '../schemas/subscription';
import { SubscriptionPriceDisplay } from './SubscriptionPriceDisplay';
import { SubscriptionStatusChip } from './SubscriptionStatusChip';

const text = messages.subscriptions;
const comparison = messages.subscriptions.comparison;

interface SubscriptionsComparisonTableProps {
  /** Vigente subscriptions, already in the fixed order of the list (FR-018). */
  readonly subscriptions: readonly Subscription[];
  readonly cycle: 'monthly' | 'annual';
  /** Whether "Editar" is offered at the end of each column (FR-021). */
  readonly canEdit: boolean;
  /** The search of the list, carried to the edit screen to come back to the same page. */
  readonly listSearch: string;
}

/** A row whose first cell names what it shows, and one cell per subscription after it. */
function MetricRow({
  label,
  subscriptions,
  cell,
}: {
  readonly label: string;
  readonly subscriptions: readonly Subscription[];
  readonly cell: (subscription: Subscription) => ReactNode;
}) {
  return (
    <TableRow aria-label={label}>
      <TableCell component="th" scope="row">
        {label}
      </TableCell>
      {subscriptions.map((subscription) => (
        <TableCell key={subscription.id}>{cell(subscription)}</TableCell>
      ))}
    </TableRow>
  );
}

/** A full-width row that titles the section below it. */
function SectionRow({ label, columns }: { readonly label: string; readonly columns: number }) {
  return (
    <TableRow>
      <TableCell
        colSpan={columns + 1}
        sx={{ fontWeight: 'bold', bgcolor: 'action.hover' }}
        aria-label={label}
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

const LIMIT_FIELDS = [
  ['consultingRoomsLimit', text.form.fields.consultingRoomsLimit] as const,
  ['doctorsLimit', text.form.fields.doctorsLimit] as const,
  ['assistantsLimit', text.form.fields.assistantsLimit] as const,
  ['newPatientsPerYearLimit', text.form.fields.newPatientsPerYearLimit] as const,
];

/**
 * The Comparativo (research D6, D7): a matrix with one column per subscription and one row per
 * module, limit, and so on, built with plain MUI `Table` (not Data Grid: it is not a listing of
 * rows of the same kind). Reuses the catalog the list already loaded; `cycle` only changes how the
 * price row is drawn, with no request of its own.
 */
export function SubscriptionsComparisonTable({
  subscriptions,
  cycle,
  canEdit,
  listSearch,
}: SubscriptionsComparisonTableProps) {
  const columns = subscriptions.length;
  const anyTrialDays = subscriptions.some((subscription) => subscription.trialDays > 0);

  return (
    <Box>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table aria-label={comparison.tabLabel} size="small">
          <TableHead>
            <TableRow>
              {/* The corner cell has no column of its own: a plain cell, not an empty header. */}
              <TableCell component="td" variant="body" scope={undefined} />
              {subscriptions.map((subscription) => (
                <TableCell key={subscription.id}>
                  {/* `component="div"`: this is a table column header, not a document heading. */}
                  <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
                    {subscription.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={subscription.selfService ? text.badge.selfService : text.badge.custom}
                    sx={{ my: 0.5 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    {subscription.description}
                  </Typography>
                  <SubscriptionPriceDisplay
                    cycle={cycle}
                    monthlyPrice={subscription.monthlyPrice}
                    annualPrice={subscription.annualPrice}
                  />
                  <SubscriptionStatusChip status={subscription.status} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <SectionRow label={comparison.sections.modules} columns={columns} />
            {CLINIC_MODULE_ORDER.map((key) => (
              <MetricRow
                key={key}
                label={text.modules.catalog[key].name}
                subscriptions={subscriptions}
                cell={(subscription) =>
                  subscription.moduleKeys.includes(key)
                    ? comparison.moduleIncluded
                    : comparison.moduleNotIncluded
                }
              />
            ))}

            <SectionRow label={comparison.sections.limits} columns={columns} />
            {LIMIT_FIELDS.map(([field, label]) => (
              <MetricRow
                key={field}
                label={label}
                subscriptions={subscriptions}
                cell={(subscription) => subscription[field]}
              />
            ))}

            <SectionRow label={comparison.sections.otherFeatures} columns={columns} />
            <MetricRow
              label={comparison.sections.includes}
              subscriptions={subscriptions}
              cell={(subscription) =>
                subscription.otherFeatures.length > 0 && (
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {subscription.otherFeatures.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </Box>
                )
              }
            />

            <SectionRow label={comparison.sections.other} columns={columns} />
            {anyTrialDays && (
              <MetricRow
                label={comparison.sections.trialDays}
                subscriptions={subscriptions}
                cell={(subscription) =>
                  subscription.trialDays > 0 ? text.price.trialDays(subscription.trialDays) : ''
                }
              />
            )}
            <MetricRow
              label={comparison.sections.clinics}
              subscriptions={subscriptions}
              cell={(subscription) => subscription.clinicsCount ?? text.clinics.notAvailable}
            />

            {canEdit && (
              <>
                <SectionRow label={comparison.sections.actions} columns={columns} />
                <MetricRow
                  label={comparison.sections.actions}
                  subscriptions={subscriptions}
                  cell={(subscription) => (
                    <Link
                      component={RouterLink}
                      to={`/subscriptions/${subscription.id}/edit`}
                      state={{ listSearch }}
                    >
                      {comparison.editAction}
                    </Link>
                  )}
                />
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {comparison.footerNote}
      </Typography>
    </Box>
  );
}
