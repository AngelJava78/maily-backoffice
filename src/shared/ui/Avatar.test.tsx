import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar, getAvatarTone, getInitials } from './Avatar';

describe('getInitials', () => {
  it('takes the first letter of the first two words, in upper case', () => {
    expect(getInitials('Ana Pérez')).toBe('AP');
    expect(getInitials('maría del carmen lópez')).toBe('MD');
  });

  it('takes a single initial when there is only one word', () => {
    expect(getInitials('Ana')).toBe('A');
  });

  it('falls back to "?" for a name without letters', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });
});

describe('getAvatarTone', () => {
  it('is deterministic: the same id always gives the same tone', () => {
    expect(getAvatarTone('user-42')).toBe(getAvatarTone('user-42'));
  });

  it('always returns one of the four tones already defined as tokens', () => {
    const tones = ['user-1', 'user-2', 'user-3', 'another-id', ''].map(getAvatarTone);
    for (const tone of tones) {
      expect(['accion', 'exito', 'aviso', 'peligro']).toContain(tone);
    }
  });

  it('spreads ids across more than one tone (not the same one for everybody)', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `user-${i}`);
    const tones = new Set(ids.map(getAvatarTone));
    expect(tones.size).toBeGreaterThan(1);
  });
});

describe('Avatar', () => {
  it('shows the photo when there is one', () => {
    render(<Avatar name="Ana Pérez" id="user-1" photoUrl="https://example.com/ana.jpg" />);

    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toHaveAttribute(
      'src',
      'https://example.com/ana.jpg',
    );
  });

  it('shows the initials when there is no photo', () => {
    render(<Avatar name="Ana Pérez" id="user-1" />);

    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('hides itself from assistive tech when decorative, with or without a photo', () => {
    render(<Avatar name="Ana Pérez" id="user-1" decorative />);
    expect(screen.getByText('AP').closest('[aria-hidden="true"]')).not.toBeNull();

    render(
      <Avatar name="Ana Pérez" id="user-1" photoUrl="https://example.com/ana.jpg" decorative />,
    );
    expect(
      screen.getByRole('img', { hidden: true }).closest('[aria-hidden="true"]'),
    ).not.toBeNull();
  });
});
