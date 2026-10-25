import { z } from 'zod';

// 8-4-4-4-12 hexadecimal digits, as the service accepts it; lower case, as the service returns it.
const componentIdSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  .transform((value) => value.toLowerCase());

/**
 * The id of a registered component in the address (`/health/components/:componentId`), or `null`
 * when it is not one: such an address is titled «Página no encontrada» and asks nothing.
 */
export function parseComponentId(value: string | undefined): string | null {
  const parsed = componentIdSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
