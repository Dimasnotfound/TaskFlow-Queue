import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../config/prisma.js';
import { conflict, notFound, unauthorized } from '../../shared/errors.js';
import { tokenHash } from '../../shared/hash.js';

export class AuthService {
  async register(input:{name:string;email:string;password:string}) {
    if (await prisma.user.findUnique({ where:{ email:input.email } })) throw conflict('CONFLICT','Email already registered');
    const user = await prisma.user.create({ data:{ name:input.name, email:input.email, passwordHash:await argon2.hash(input.password) } });
    return { id:user.id, name:user.name, email:user.email, role:user.role };
  }
  async login(jwt:any, input:{email:string;password:string}) {
    const user = await prisma.user.findUnique({ where:{ email:input.email } });
    if (!user || !(await argon2.verify(user.passwordHash, input.password))) throw unauthorized();
    const accessToken = jwt.sign({ id:user.id, role:user.role }, { expiresIn: '15m' });
    const refreshToken = randomUUID();
    await prisma.refreshToken.create({ data:{ tokenHash:tokenHash(refreshToken), userId:user.id, expiresAt:new Date(Date.now()+7*864e5) } });
    return { accessToken, refreshToken, user:{ id:user.id, name:user.name, email:user.email, role:user.role } };
  }
  async refresh(jwt:any, refreshToken:string) {
    const row = await prisma.refreshToken.findFirst({ where:{ tokenHash:tokenHash(refreshToken), revokedAt:null, expiresAt:{ gt:new Date() } }, include:{ user:true } });
    if (!row) throw unauthorized();
    return { accessToken: jwt.sign({ id:row.user.id, role:row.user.role }, { expiresIn:'15m' }) };
  }
  async logout(refreshToken:string) { await prisma.refreshToken.updateMany({ where:{ tokenHash:tokenHash(refreshToken) }, data:{ revokedAt:new Date() } }); }
  async me(userId:string) {
    const user = await prisma.user.findUnique({ where:{ id:userId }, select:{ id:true, name:true, email:true, role:true, createdAt:true, updatedAt:true } });
    if (!user) throw notFound('NOT_FOUND','User not found');
    return user;
  }
}
