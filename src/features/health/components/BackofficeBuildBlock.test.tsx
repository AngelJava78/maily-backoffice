import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import { BackofficeBuildBlock } from './BackofficeBuildBlock';

const text = messages.health.backoffice;

function valueOf(label: string): HTMLElement {
  const value = screen.getByText(label, { selector: 'dt' }).nextElementSibling;
  if (!(value instanceof HTMLElement)) {
    throw new Error(`Expected a value for ${label}`);
  }
  return value;
}

describe('BackofficeBuildBlock', () => {
  it('shows the version, the short commit and the date of the build (FR-044)', async () => {
    const { container } = render(
      <BackofficeBuildBlock
        build={{
          version: '1.0.0',
          commit: '9fceb02d0ae598e95dc970b74767f19372d61af8',
          buildDate: '2026-10-24T16:05:00Z',
        }}
      />,
    );

    expect(screen.getByRole('heading', { level: 2, name: text.title })).toBeInTheDocument();
    expect(valueOf(text.version)).toHaveTextContent('1.0.0');
    expect(valueOf(text.commit)).toHaveTextContent(/^9fceb02$/);
    expect(valueOf(text.buildDate)).toHaveTextContent(formatDateTime('2026-10-24T16:05:00Z'));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('says «No disponible» for what the build was not given (FR-045)', () => {
    render(<BackofficeBuildBlock build={{ version: '1.0.0', commit: null, buildDate: null }} />);

    expect(valueOf(text.commit)).toHaveTextContent(messages.health.notAvailable);
    expect(valueOf(text.buildDate)).toHaveTextContent(messages.health.notAvailable);
  });
});
