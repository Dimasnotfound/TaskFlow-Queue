import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../src/modules/auth/auth.schema.js';

describe('auth schemas', () => {
  it('accepts valid register and login payloads', () => {
    expect(registerSchema.parse({ name:'Dimas', email:'dimas@example.com', password:'password123' }).email).toBe('dimas@example.com');
    expect(loginSchema.parse({ email:'admin@example.com', password:'password123' }).email).toBe('admin@example.com');
  });

  it('rejects invalid email', () => {
    expect(() => loginSchema.parse({ email:'bad-email', password:'password123' })).toThrow();
  });
});
