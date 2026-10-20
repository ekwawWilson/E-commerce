import { describe, it, expect } from 'vitest';
import { assertProductionConfig } from '../src/config';

const strongSecret = 'k3J9xQ2vT7mL4pR8wZ1nB6cY0dF5hG2sA9eU3iO7';

function productionConfig(overrides: { simulate?: boolean } = {}) {
  return {
    nodeEnv: 'production',
    jwtSecret: strongSecret,
    momo: { simulate: false, ...overrides } as any,
  };
}

describe('assertProductionConfig', () => {
  it('accepts a secure production configuration', () => {
    expect(() => assertProductionConfig(productionConfig(), strongSecret)).not.toThrow();
  });

  it.each([
    ['missing', undefined],
    ['the dev fallback', 'your-secret-key'],
    ['the .env.example placeholder', 'your-super-secret-jwt-key-change-in-production'],
    ['the .env.production.example placeholder', 'CHANGE_ME_MINIMUM_64_CHARACTERS_LONG_RANDOM_STRING'],
    ['too short', 'short-secret'],
  ])('rejects a JWT secret that is %s', (_label, secret) => {
    expect(() => assertProductionConfig(productionConfig(), secret)).toThrow(/JWT_SECRET/);
  });

  it('rejects simulated MoMo payments', () => {
    expect(() => assertProductionConfig(productionConfig({ simulate: true }), strongSecret)).toThrow(
      /MOMO_SIMULATE/
    );
  });

  it('does nothing outside production', () => {
    expect(() =>
      assertProductionConfig({ ...productionConfig({ simulate: true }), nodeEnv: 'development' }, undefined)
    ).not.toThrow();
  });
});
