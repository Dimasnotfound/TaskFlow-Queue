import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema.js';
import { ok } from '../../shared/response.js';

const service = new AuthService();

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req) => ok('User registered successfully', await service.register(registerSchema.parse(req.body))));
  app.post('/login', async (req) => ok('Login successful', await service.login(app.jwt, loginSchema.parse(req.body))));
  app.post('/refresh', async (req) => ok('Token refreshed successfully', await service.refresh(app.jwt, refreshSchema.parse(req.body).refreshToken)));
  app.post('/logout', async (req) => { await service.logout(refreshSchema.parse(req.body).refreshToken); return ok('Logout successful', null); });
}
