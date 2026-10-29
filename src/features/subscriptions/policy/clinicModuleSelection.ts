import { REQUIRED_MODULE_KEY, type ClinicModule } from '../schemas/clinicModule';

/**
 * The modules actually usable for a subscription (021, research D4): only keys present in the
 * vigente catalog (FR-005, FR-009), always including `REQUIRED_MODULE_KEY` when the catalog offers
 * it (FR-007, Clarifications), regardless of whether `selected` already had it. Used both to decide
 * what appears marked (`ModulesField`, `SubscriptionPreviewPanel`) and, right before saving, what is
 * sent, so neither ever shows something different from what would be saved at that moment. Pure: it
 * never mutates `selected`.
 */
export function resolveModuleSelection(
  selected: ReadonlySet<string>,
  catalog: readonly ClinicModule[],
): ReadonlySet<string> {
  const catalogKeys = new Set(catalog.map((module) => module.key));
  const kept = new Set([...selected].filter((key) => catalogKeys.has(key)));
  if (catalogKeys.has(REQUIRED_MODULE_KEY)) {
    kept.add(REQUIRED_MODULE_KEY);
  }
  return kept;
}
