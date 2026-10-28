import {
  Activity,
  ArrowLeft,
  Ban,
  Blocks,
  Building2,
  Camera,
  Check,
  ChevronDown,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sun,
  Trash2,
  TriangleAlert,
  Unlock,
  Unplug,
  Users,
  X,
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
  // «Salud de servicios» (feature 016, research D12): every status has an icon of its own, so a
  // status is never told by its color alone.
  health: Activity,
  refresh: RefreshCw,
  'status-up': CircleCheck,
  'status-degraded': TriangleAlert,
  'status-down': CircleX,
  'status-stopped': Clock,
  'status-unknown': CircleHelp,
  'status-unreachable': Unplug,
  // Whether a module is part of a plan, in the Comparativo (020, FR-011): its own pair, distinct
  // from the status icons above (research D6).
  included: Check,
  'not-included': X,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconRegistry;
