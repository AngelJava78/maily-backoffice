import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { messages } from '@/shared/messages/es';

const text = messages.subscriptions.comparison.priceToggle;

export type PriceCycle = 'monthly' | 'annual';

interface PriceCycleToggleProps {
  readonly value: PriceCycle;
  readonly onChange: (cycle: PriceCycle) => void;
}

/**
 * The Mensual/Anual control of the Comparativo and of the form's preview panel (research D8):
 * purely a display choice, kept as local state by whoever renders it, always starting at Mensual.
 */
export function PriceCycleToggle({ value, onChange }: PriceCycleToggleProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_event, next: PriceCycle | null) => {
        if (next !== null) {
          onChange(next);
        }
      }}
    >
      <ToggleButton value="monthly">{text.monthly}</ToggleButton>
      <ToggleButton value="annual">{text.annual}</ToggleButton>
    </ToggleButtonGroup>
  );
}
