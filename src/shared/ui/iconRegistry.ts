import {
  ArrowLeft,
  Ban,
  Blocks,
  Building2,
  Camera,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  Unlock,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Single registry of icons (FR-007/FR-008): the only place that imports `lucide-react` (or, in
 * the future, one of web-soft's own organ SVGs). Everything else goes through `Icon`
 * (`iconRegistry.ts` + `Icon.tsx`, contracts/icon-component.md).
 */
export const iconRegistry = {
  dashboard: LayoutDashboard,
  modules: Blocks,
  users: Users,
  subscriptions: CreditCard,
  clinics: Building2,
  token: KeyRound,
  roles: ShieldCheck,
  add: Plus,
  delete: Trash2,
  'arrow-back': ArrowLeft,
  edit: Pencil,
  'arrow-drop-down': ChevronDown,
  visibility: Eye,
  'visibility-off': EyeOff,
  block: Ban,
  'lock-open': Unlock,
  restore: RotateCcw,
  loading: Loader2,
  'theme-light': Sun,
  'theme-dark': Moon,
  'change-photo': Camera,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconRegistry;
