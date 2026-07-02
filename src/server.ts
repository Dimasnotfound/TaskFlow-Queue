import { env } from './config/env.js';
import { buildApp } from './app.js';

const app = await buildApp();
await app.listen({ host: env.HOST, port: env.PORT });
