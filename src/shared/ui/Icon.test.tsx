import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon } from './Icon';
import type { IconName } from './iconRegistry';

describe('Icon', () => {
  it('announces its accessible name when it carries meaning of its own', () => {
    render(<Icon name="delete" accessibleName="Eliminar" />);

    expect(screen.getByRole('img', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('hides from the accessibility tree when it only repeats an adjacent label', () => {
    render(<Icon name="delete" decorative />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  // The icons of «Salud de servicios» (feature 016, research D12): each status has its own.
  describe.each<IconName>([
    'health',
    'refresh',
    'status-up',
    'status-degraded',
    'status-down',
    'status-stopped',
    'status-unknown',
    'status-unreachable',
  ])('%s', (name) => {
    it('draws an svg hidden from the accessibility tree when it is decorative', () => {
      const { container } = render(<Icon name={name} decorative />);

      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('draws an svg with its name when it carries meaning of its own', () => {
      render(<Icon name={name} accessibleName="Estado" />);

      expect(screen.getByRole('img', { name: 'Estado' }).tagName.toLowerCase()).toBe('svg');
    });
  });
});
