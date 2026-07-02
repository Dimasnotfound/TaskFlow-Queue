import { createHash } from 'node:crypto';
export function stableHash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function tokenHash(value: string) { return createHash('sha256').update(value).digest('hex'); }
