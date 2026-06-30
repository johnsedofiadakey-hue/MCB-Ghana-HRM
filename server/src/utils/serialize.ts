import { Decimal } from '@prisma/client/runtime/library';

/**
 * Recursively converts Prisma Decimal objects to JS numbers in any response shape.
 * Use before res.json() on any object returned from Prisma that contains Decimal fields.
 *
 * Example: res.json(serialize(payrollItem))
 */
export function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Decimal) return value.toNumber() as unknown as T;
  if (Array.isArray(value)) return value.map(serialize) as unknown as T;
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) {
      result[k] = serialize(v);
    }
    return result as T;
  }
  return value;
}
