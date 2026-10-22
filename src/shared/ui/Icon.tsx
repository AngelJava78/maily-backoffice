import { colorTokens } from '@/shared/theme/tokens';

import { iconRegistry, type IconName } from './iconRegistry';

const SIZES = { sm: 16, md: 20, lg: 24 } as const;

interface IconBaseProps {
  readonly name: IconName;
  readonly size?: keyof typeof SIZES;
  readonly color?: keyof typeof colorTokens;
}

/** Icons that only repeat an adjacent label are `decorative` and carry no name of their own. */
interface DecorativeIconProps extends IconBaseProps {
  readonly decorative: true;
  readonly accessibleName?: undefined;
}

/** Icons with meaning of their own (FR-007) need a name a screen reader can announce. */
interface InformativeIconProps extends IconBaseProps {
  readonly decorative?: false;
  readonly accessibleName: string;
}

export type IconProps = DecorativeIconProps | InformativeIconProps;

/** Common icon component (FR-007/FR-008): the only way the rest of the app renders an icon. */
export function Icon({ name, size = 'md', color, decorative, accessibleName }: IconProps) {
  const LucideIcon = iconRegistry[name];
  const px = SIZES[size];

  return (
    <LucideIcon
      size={px}
      color={color ? colorTokens[color] : 'currentColor'}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : accessibleName}
    />
  );
}
