import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LiveStatus } from './LiveStatus';

describe('LiveStatus', () => {
  it('is a status region that is already in the page while it has nothing to say', () => {
    render(<LiveStatus />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('announces what is written into it afterwards, in the same region', () => {
    const { rerender } = render(<LiveStatus />);
    const region = screen.getByRole('status');

    rerender(<LiveStatus>Mostrando 11 a 20 de 34 usuarios.</LiveStatus>);

    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Mostrando 11 a 20 de 34 usuarios.');
  });

  it('takes no room on the screen: it is clipped to a pixel', () => {
    render(<LiveStatus>Texto</LiveStatus>);

    expect(screen.getByRole('status')).toHaveStyle({ width: '1px', height: '1px' });
  });
});
