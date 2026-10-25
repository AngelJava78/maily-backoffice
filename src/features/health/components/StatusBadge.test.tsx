import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { Icon } from '@/shared/ui/Icon';
import type { IconName } from '@/shared/ui/iconRegistry';

import {
  componentStatusPresentation,
  overallStatusPresentation,
} from '../policy/statusPresentation';
import { COMPONENT_STATUSES, OVERALL_STATUSES } from '../policy/statusValues';
import { StatusBadge } from './StatusBadge';

const TONE_CLASS = {
  success: 'MuiChip-colorSuccess',
  warning: 'MuiChip-colorWarning',
  danger: 'MuiChip-colorError',
  neutral: 'MuiChip-colorDefault',
} as const;

/** The drawing of an icon of the registry, to tell which one a badge carries. */
function drawingOf(name: IconName): string {
  const { container, unmount } = render(<Icon name={name} decorative />);
  const drawing = container.querySelector('svg')?.innerHTML ?? '';
  unmount();
  return drawing;
}

const presentations = [
  ...COMPONENT_STATUSES.map((status) => componentStatusPresentation(status)),
  ...OVERALL_STATUSES.map((status) => overallStatusPresentation(status)),
];

describe('StatusBadge', () => {
  it.each(presentations)('shows «$label» with its icon and the $tone tone', (presentation) => {
    const drawing = drawingOf(presentation.icon);
    render(<StatusBadge presentation={presentation} />);

    const chip = screen.getByText(presentation.label).closest('.MuiChip-root');
    expect(chip).toHaveClass(TONE_CLASS[presentation.tone]);
    // Decorative: the text already says the status.
    const icon = chip?.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.innerHTML).toBe(drawing);
  });

  it('never tells a status by its color alone: «Detenida por horario» and «Desconocido» share a tone, not a text or an icon', () => {
    render(
      <>
        <StatusBadge presentation={componentStatusPresentation('stopped')} />
        <StatusBadge presentation={componentStatusPresentation('unknown')} />
      </>,
    );

    const stopped = screen.getByText('Detenida por horario').closest('.MuiChip-root');
    const unknown = screen.getByText('Desconocido').closest('.MuiChip-root');
    expect(stopped).toHaveClass(TONE_CLASS.neutral);
    expect(unknown).toHaveClass(TONE_CLASS.neutral);
    expect(stopped?.querySelector('svg')?.innerHTML).not.toBe(
      unknown?.querySelector('svg')?.innerHTML,
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <>
        {/* «Degradado» and «Desconocido» are both a component and an overall status. */}
        {presentations.map((presentation, index) => (
          <StatusBadge key={index} presentation={presentation} />
        ))}
      </>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
