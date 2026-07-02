import { forbidden, unauthorized } from './errors.js';
export async function requireAuth(req:any) { try { await req.jwtVerify(); } catch { throw unauthorized(); } }
export function requireRoles(user:any, roles:string[]) { if (!roles.includes(user.role)) throw forbidden(); }
