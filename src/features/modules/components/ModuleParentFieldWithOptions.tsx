import type { Control } from 'react-hook-form';

import { messages } from '@/shared/messages/es';

import { useParentModuleOptions } from '../hooks/useParentModuleOptions';
import type { ModuleTypeId } from '../schemas/moduleActionCatalog';
import type { ModuleFormValues } from '../schemas/moduleForm';
import {
  isProtectedModule,
  type ParentModuleRef,
  type SystemModule,
} from '../schemas/systemModule';
import { ModuleParentField } from './ModuleParentField';

/**
 * Why the "Módulo padre" of a module being edited cannot be changed (FR-012, research D9): a base
 * module has no parent, and a module with submodules (in the list shown) cannot become a submodule.
 * `undefined` when it can. A submodule is never locked: it can change or lose its parent.
 */
export function parentLockedReason(
  module: SystemModule,
  submoduleCount: number,
): string | undefined {
  const text = messages.modules.form.fields;
  if (isProtectedModule(module.key)) {
    return text.parentLockedBase;
  }
  return module.parentModule === null && submoduleCount > 0
    ? text.parentLockedWithChildren
    : undefined;
}

interface ModuleParentFieldWithOptionsProps {
  readonly control: Control<ModuleFormValues>;
  /** The type of the module: the parents offered are of its same type. */
  readonly typeId: ModuleTypeId;
  /** The module being edited, which is never its own parent; `null` while creating. */
  readonly excludeModuleId: number | null;
  readonly currentParent: ParentModuleRef | null;
  readonly lockedReason?: string;
  readonly error?: string;
}

/** The "Módulo padre" field with the options of the Active catalog already wired (research D7). */
export function ModuleParentFieldWithOptions({
  typeId,
  excludeModuleId,
  ...field
}: ModuleParentFieldWithOptionsProps) {
  const { options, isLoading, isError } = useParentModuleOptions({ typeId, excludeModuleId });

  return (
    <ModuleParentField
      {...field}
      options={options}
      status={isLoading ? 'loading' : isError ? 'error' : 'ready'}
    />
  );
}
