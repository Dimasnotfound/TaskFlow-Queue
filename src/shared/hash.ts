import { createHash } from 'node:crypto';

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

export function stableHash(value: unknown) { return createHash('sha256').update(canonicalJson(value)).digest('hex'); }
export function tokenHash(value: string) { return createHash('sha256').update(value).digest('hex'); }
