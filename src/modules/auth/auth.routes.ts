import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema.js';
import { requireAuth } from '../../shared/auth.js';
import { ok } from '../../shared/response.js';

const service = new AuthService();

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', { schema:{ tags:['Auth'], description:'Register a new user.', body:{ type:'object', required:['name','email','password'], properties:{ name:{type:'string',example:'Dimas'}, email:{type:'string',format:'email',example:'dimas@example.com'}, password:{type:'string',example:'password123'} } } } }, async (req) => ok('User registered successfully', await service.register(registerSchema.parse(req.body))));
  app.post('/login', { schema:{ tags:['Auth'], description:'Login and receive access/refresh token.', body:{ type:'object', required:['email','password'], properties:{ email:{type:'string',format:'email',example:'admin@example.com'}, password:{type:'string',example:'password123'} } } } }, async (req) => ok('Login successful', await service.login(app.jwt, loginSchema.parse(req.body))));
  app.post('/refresh', { schema:{ tags:['Auth'], description:'Refresh access token using stored refresh token.' } }, async (req) => ok('Token refreshed successfully', await service.refresh(app.jwt, refreshSchema.parse(req.body).refreshToken)));
  app.post('/logout', { preHandler: requireAuth, schema:{ tags:['Auth'], description:'Revoke refresh token.' } }, async (req) => { await service.logout(refreshSchema.parse(req.body).refreshToken); return ok('Logout successful', null); });
  app.get('/me', { preHandler: requireAuth, schema:{ tags:['Auth'], description:'Get current authenticated user.' } }, async (req:any) => ok('User retrieved successfully', await service.me(req.user.id)));
}
