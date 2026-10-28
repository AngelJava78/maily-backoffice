import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { messages } from '@/shared/messages/es';

import { SUBSCRIPTION_TYPE, type SubscriptionTypeId } from '../schemas/subscriptionTypeCatalog';

const text = messages.subscriptions.types.catalog;

interface ComparisonTypeFilterProps {
  readonly value: SubscriptionTypeId;
  readonly onChange: (type: SubscriptionTypeId) => void;
}

/**
 * The Individual/Empresarial filter of the Comparativo (020, FR-007), before the Mensual/Anual
 * control: same pattern as `PriceCycleToggle` (research D3), kept as state by whoever renders it.
 */
export function ComparisonTypeFilter({ value, onChange }: ComparisonTypeFilterProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_event, next: SubscriptionTypeId | null) => {
        if (next !== null) {
          onChange(next);
        }
      }}
    >
      <ToggleButton value={SUBSCRIPTION_TYPE.INDIVIDUAL}>{text[1].name}</ToggleButton>
      <ToggleButton value={SUBSCRIPTION_TYPE.ENTERPRISE}>{text[2].name}</ToggleButton>
    </ToggleButtonGroup>
  );
}
