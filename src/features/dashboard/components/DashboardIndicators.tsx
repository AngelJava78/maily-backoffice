import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { formatCount } from '@/shared/lib/formatCount';
import { messages } from '@/shared/messages/es';

import type { DashboardSummary } from '../schemas/dashboardSummary';

const { indicators, notAvailable } = messages.dashboard;

/** The six counts, in the order of FR-004, with their labels. */
const INDICATORS = [
  'totalClinics',
  'activeClinics',
  'trialClinics',
  'totalDoctors',
  'totalPatients',
  'totalUsers',
] as const;

/**
 * The indicators of the platform as a list of definitions: each label (`dt`) is read with its value
 * (`dd`), «No disponible» included (FR-032). Three columns from 600 px on, one below; a long number
 * wraps instead of overflowing.
 */
export function DashboardIndicators({ summary }: { readonly summary: DashboardSummary }) {
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 2,
      }}
    >
      {INDICATORS.map((indicator) => {
        const count = summary[indicator];
        return (
          <Box
            key={indicator}
            sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, minWidth: 0 }}
          >
            <Typography component="dt" variant="body2" color="text.secondary">
              {indicators[indicator]}
            </Typography>
            {/* `null` is «not available»: it is never written as 0 (FR-007). */}
            <Typography
              component="dd"
              variant={count === null ? 'body1' : 'h5'}
              sx={{ m: 0, overflowWrap: 'anywhere' }}
            >
              {count === null ? notAvailable : formatCount(count)}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
