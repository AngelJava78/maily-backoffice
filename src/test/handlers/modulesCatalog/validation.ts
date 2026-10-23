import type { PathParams } from 'msw';

import { MODULE_TYPE } from '@/features/modules/schemas/moduleActionCatalog';

import type { CatalogFieldError, ModuleChanges, ModuleInput, PermissionInput } from './model';
import { validationError } from './model';

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const PERMISSION_NAME_PATTERN = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;
const ID_MESSAGE = 'El identificador debe ser un número entero positivo.';

export function keyError(key: unknown): CatalogFieldError | null {
  return typeof key !== 'string' || !KEY_PATTERN.test(key) || key.length > 50
    ? {
        field: 'key',
        message:
          'La clave debe empezar con una letra minúscula y contener solo minúsculas, números y guion bajo (hasta 50 caracteres).',
      }
    : null;
}

export function nameError(name: unknown): CatalogFieldError | null {
  return typeof name !== 'string' || name.trim() === '' || name.length > 100
    ? { field: 'name', message: 'El nombre debe tener de 1 a 100 caracteres.' }
    : null;
}

export function typeIdError(typeId: unknown): CatalogFieldError | null {
  return typeId !== MODULE_TYPE.SYSTEM && typeId !== MODULE_TYPE.CLINIC
    ? { field: 'type_id', message: 'El tipo de módulo no es válido.' }
    : null;
}

export function descriptionError(description: unknown): CatalogFieldError | null {
  return typeof description === 'string' && description.length > 500
    ? { field: 'description', message: 'La descripción admite hasta 500 caracteres.' }
    : null;
}

export function permissionNameError(name: unknown): CatalogFieldError | null {
  return typeof name !== 'string' || !PERMISSION_NAME_PATTERN.test(name) || name.length > 100
    ? { field: 'name', message: 'El nombre debe tener el formato recurso:acción, en minúsculas.' }
    : null;
}

function objectBody(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw validationError([{ field: 'body', message: 'El cuerpo de la solicitud no es válido.' }]);
  }
  return body as Record<string, unknown>;
}

function rejectUnknownFields(data: Record<string, unknown>, allowed: readonly string[]): void {
  const extra = Object.keys(data).filter((field) => !allowed.includes(field));
  if (extra.length > 0) {
    throw validationError(
      extra.map((field) => ({ field, message: `El campo «${field}» no se reconoce.` })),
    );
  }
}

function readId(value: unknown, field: string): number {
  const raw = typeof value === 'string' ? value : '';
  if (!/^\d+$/.test(raw) || Number(raw) === 0) {
    throw validationError([{ field, message: ID_MESSAGE }]);
  }
  return Number(raw);
}

export function readModuleId(params: PathParams): number {
  return readId(params.moduleId, 'module_id');
}

export function readPermissionId(params: PathParams): number {
  return readId(params.permissionId, 'permission_id');
}

const MODULE_CREATE_FIELDS = ['key', 'name', 'type_id', 'description', 'sort_order'] as const;

export function moduleInputFromBody(body: unknown): ModuleInput {
  const data = objectBody(body);
  rejectUnknownFields(data, MODULE_CREATE_FIELDS);
  return {
    key: typeof data.key === 'string' ? data.key : '',
    name: typeof data.name === 'string' ? data.name : '',
    type_id: typeof data.type_id === 'number' ? data.type_id : -1,
    ...(data.description === undefined ? {} : { description: data.description as string | null }),
    ...(typeof data.sort_order === 'number' ? { sort_order: data.sort_order } : {}),
  };
}

const MODULE_UPDATE_FIELDS = ['name', 'description', 'sort_order'] as const;

export function moduleChangesFromBody(body: unknown): ModuleChanges {
  const data = objectBody(body);
  rejectUnknownFields(data, MODULE_UPDATE_FIELDS);
  if (Object.keys(data).length === 0) {
    throw validationError([{ field: 'body', message: 'Debe enviar al menos un dato a modificar.' }]);
  }
  return {
    ...(typeof data.name === 'string' ? { name: data.name } : {}),
    ...(data.description === undefined ? {} : { description: data.description as string | null }),
    ...(typeof data.sort_order === 'number' ? { sort_order: data.sort_order } : {}),
  };
}

const PERMISSION_CREATE_FIELDS = ['name', 'description'] as const;

export function permissionInputFromBody(body: unknown): PermissionInput {
  const data = objectBody(body);
  rejectUnknownFields(data, PERMISSION_CREATE_FIELDS);
  return {
    name: typeof data.name === 'string' ? data.name : '',
    ...(data.description === undefined ? {} : { description: data.description as string | null }),
  };
}
