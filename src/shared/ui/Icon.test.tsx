import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon } from './Icon';

describe('Icon', () => {
  it('announces its accessible name when it carries meaning of its own', () => {
    render(<Icon name="delete" accessibleName="Eliminar" />);

    expect(screen.getByRole('img', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('hides from the accessibility tree when it only repeats an adjacent label', () => {
    render(<Icon name="delete" decorative />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
