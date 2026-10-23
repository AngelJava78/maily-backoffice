import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { formatMxn } from '@/shared/lib/formatCurrency';
import { messages } from '@/shared/messages/es';

import { computeAnnualSavings } from '../schemas/price';

const text = messages.subscriptions.price;

interface SubscriptionPriceDisplayProps {
  readonly cycle: 'monthly' | 'annual';
  readonly monthlyPrice: string;
  readonly annualPrice: string;
}

/**
 * The price of the period chosen by a `PriceCycleToggle` (FR-005), with the saving badge and
 * caption when the annual price is less than 12 monthly payments. Reused in the detail, the
 * preview panel of the form, and the Comparativo (research D5).
 */
export function SubscriptionPriceDisplay({
  cycle,
  monthlyPrice,
  annualPrice,
}: SubscriptionPriceDisplayProps) {
  if (cycle === 'monthly') {
    return <Typography>{text.perMonth(formatMxn(monthlyPrice))}</Typography>;
  }

  const savings = computeAnnualSavings(monthlyPrice, annualPrice);
  return (
    <Box>
      <Typography component="span">{text.perYear(formatMxn(annualPrice))}</Typography>
      {savings !== null && (
        <>
          {' '}
          <Chip
            size="small"
            color="success"
            label={text.savingsBadge(savings.percent)}
            sx={{ verticalAlign: 'middle' }}
          />
          <Typography variant="body2" color="text.secondary">
            {text.savingsCaption(
              formatMxn((savings.monthlyEquivalentCents / 100).toFixed(2)),
              formatMxn((savings.amountCents / 100).toFixed(2)),
            )}
          </Typography>
        </>
      )}
    </Box>
  );
}
