import MuiAvatar from '@mui/material/Avatar';

import { colorTokens } from '@/shared/theme/tokens';

export type AvatarTone = 'accion' | 'exito' | 'aviso' | 'peligro';

const TONES: readonly AvatarTone[] = ['accion', 'exito', 'aviso', 'peligro'];

const TONE_COLORS: Record<AvatarTone, { readonly bg: string; readonly fg: string }> = {
  accion: { bg: colorTokens.accionTinte, fg: colorTokens.accion },
  exito: { bg: colorTokens.exitoTinte, fg: colorTokens.exito },
  aviso: { bg: colorTokens.avisoTinte, fg: colorTokens.avisoIcono },
  peligro: { bg: colorTokens.peligroTinte, fg: colorTokens.peligro },
};

/** First letter of the first two words, in upper case; `'?'` for a name without letters. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  return words
    .slice(0, 2)
    .map((word) => (word[0] ?? '').toUpperCase())
    .join('');
}

/**
 * Deterministic tone for a person's id, among the four web-soft does not resolve itself
 * (research.md §11) — web-soft's own avatar uses one fixed colour for everybody.
 */
export function getAvatarTone(id: string): AvatarTone {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return TONES[hash % TONES.length] ?? 'accion';
}

interface AvatarProps {
  readonly name: string;
  readonly id: string;
  readonly photoUrl?: string;
}

/** With a photo, shows it; without one, the initials over a deterministic tint (FR-010). */
export function Avatar({ name, id, photoUrl }: AvatarProps) {
  if (photoUrl !== undefined) {
    return <MuiAvatar src={photoUrl} alt={name} />;
  }
  const { bg, fg } = TONE_COLORS[getAvatarTone(id)];
  return <MuiAvatar sx={{ bgcolor: bg, color: fg }}>{getInitials(name)}</MuiAvatar>;
}
