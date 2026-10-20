import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';

import { TokenExpiry } from './TokenExpiry';

const text = messages.token;
const EXPIRES_AT = '2030-03-17T17:46:40.000Z';

/** The value shown next to the label: the definition that follows its term. */
function valueOf(label: string): HTMLElement {
  const term = screen.getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;
  if (!(value instanceof HTMLElement)) {
    throw new Error(`No value follows the label ${label}`);
  }
  return value;
}

describe('TokenExpiry', () => {
  it('without a token shows the label and a dash (FR-009)', () => {
    render(<TokenExpiry expiresAt={null} expired={false} />);

    expect(valueOf(text.fields.expiresAt)).toHaveTextContent(text.emptyExpiry);
  });

  it('shows the date and time of the expiration in the zone of the browser (FR-012)', () => {
    render(<TokenExpiry expiresAt={EXPIRES_AT} expired={false} />);

    expect(formatDateTime(EXPIRES_AT)).toBe('17 mar 2030, 17:46');
    expect(valueOf(text.fields.expiresAt)).toHaveTextContent(formatDateTime(EXPIRES_AT));
  });

  it('ties the label to its value in a definition list', () => {
    const { container } = render(<TokenExpiry expiresAt={EXPIRES_AT} expired={false} />);

    expect(container.querySelector('dl')).not.toBeNull();
    expect(screen.getByText(text.fields.expiresAt, { selector: 'dt' })).toBeInTheDocument();
  });

  describe('validity (FR-012, SC-007)', () => {
    it('says "Vigente" while the token has not expired, in text and not only in colour', () => {
      render(<TokenExpiry expiresAt={EXPIRES_AT} expired={false} />);

      expect(valueOf(text.fields.expiresAt)).toHaveTextContent(text.validity.valid);
      expect(screen.queryByText(text.validity.expired)).not.toBeInTheDocument();
    });

    it('says "Expirado" once it has', () => {
      render(<TokenExpiry expiresAt={EXPIRES_AT} expired />);

      expect(valueOf(text.fields.expiresAt)).toHaveTextContent(text.validity.expired);
      expect(screen.queryByText(text.validity.valid)).not.toBeInTheDocument();
    });

    it('says nothing about validity when there is no token', () => {
      render(<TokenExpiry expiresAt={null} expired={false} />);

      expect(screen.queryByText(text.validity.valid)).not.toBeInTheDocument();
      expect(screen.queryByText(text.validity.expired)).not.toBeInTheDocument();
    });
  });
});
