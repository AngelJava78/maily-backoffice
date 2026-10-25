import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { healthComponentDto, healthResultDto } from '@/test/factories';

import { healthResultSchema, type HealthComponent } from '../schemas/healthResult';
import { OverallStatus } from './OverallStatus';

/** `total` components, the first `up` of them up and the rest down. */
function componentsWith(up: number, total: number): HealthComponent[] {
  const dto = healthResultDto({
    components: Array.from({ length: total }, (_, index) =>
      healthComponentDto({
        code: `component-${String(index)}`,
        name: `Componente ${String(index)}`,
        status: index < up ? 'up' : 'down',
      }),
    ),
  });
  return healthResultSchema.parse(dto).components;
}

describe('OverallStatus', () => {
  it.each([
    ['ok', 'Todo operativo', 'MuiChip-colorSuccess'],
    ['degraded', 'Degradado', 'MuiChip-colorWarning'],
    ['down', 'Con componentes caídos', 'MuiChip-colorError'],
    ['unknown', 'Desconocido', 'MuiChip-colorDefault'],
  ] as const)(
    'shows the overall status %s as «%s», with its icon and tone',
    (status, label, tone) => {
      render(<OverallStatus status={status} components={componentsWith(2, 2)} />);

      const chip = screen.getByText(label).closest('.MuiChip-root');
      expect(chip).toHaveClass(tone);
      expect(chip?.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    },
  );

  it('counts the components that are up of every component received (FR-010)', () => {
    render(<OverallStatus status="down" components={componentsWith(4, 6)} />);

    expect(screen.getByText('4 de 6 operativos')).toBeInTheDocument();
  });

  it('counts none when every component is down', () => {
    render(<OverallStatus status="down" components={componentsWith(0, 3)} />);

    expect(screen.getByText('0 de 3 operativos')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <OverallStatus status="degraded" components={componentsWith(5, 6)} />,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
