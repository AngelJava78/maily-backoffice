import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';

import { PageLoader } from './PageLoader';

describe('PageLoader', () => {
  it('announces that something is loading', () => {
    render(<PageLoader />);

    expect(screen.getByRole('status', { name: messages.common.loading })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PageLoader />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
