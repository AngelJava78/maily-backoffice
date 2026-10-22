import Chip from '@mui/material/Chip';

import { Icon } from './Icon';
import type { IconName } from './iconRegistry';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONE_TO_MUI_COLOR = {
  success: 'success',
  warning: 'warning',
  danger: 'error',
  neutral: 'default',
} as const;

interface BadgeProps {
  readonly tone: BadgeTone;
  readonly label: string;
  /** Optional: the text already carries the status without the colour (WCAG 1.4.1). */
  readonly icon?: IconName;
  readonly variant?: 'filled' | 'outlined';
}

/** A status, in text with a reinforcing colour (FR-010). Still a MUI `Chip` underneath. */
export function Badge({ tone, label, icon, variant = 'filled' }: BadgeProps) {
  return (
    <Chip
      size="small"
      label={label}
      color={TONE_TO_MUI_COLOR[tone]}
      variant={variant}
      icon={icon === undefined ? undefined : <Icon name={icon} decorative />}
    />
  );
}
