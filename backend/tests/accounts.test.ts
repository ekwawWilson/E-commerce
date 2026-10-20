import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { AccountType, AuthTokenPurpose } from '@prisma/client';

const prismaMock = vi.hoisted(() => {
  const mock: any = {
    authToken: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    customer: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    supplierAdmin: { findFirst: vi.fn(), update: vi.fn() },
    admin: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((arg: any) => (typeof arg === 'function' ? arg(mock) : Promise.all(arg)));
  return mock;
});

const emailMock = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  sendEmailVerificationEmail: vi.fn().mockResolvedValue(true),
  sendWelcomeEmail: vi.fn().mockResolvedValue(true),
  sendOrderConfirmationEmail: vi.fn(),
}));

vi.mock('../src/config/database', () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock('../src/config/queue', () => ({}));
vi.mock('../src/modules/notifications/email.service', () => emailMock);
vi.mock('../src/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import config from '../src/config';
import { verifyGoogleIdToken } from '../src/modules/customer-auth/google-verify';
import { accountTokenService, hashToken } from '../src/modules/account-tokens/account-token.service';
import { passwordResetService } from '../src/modules/account-tokens/password-reset.service';
import { customerAuthService } from '../src/modules/customer-auth/customer-auth.service';
import { authenticateCustomer } from '../src/middleware/auth';
import { AppError, UnauthorizedError } from '../src/middleware/errorHandler';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Google sign-in verification', () => {
  const originalIds = { ...config.google };

  beforeEach(() => {
    config.google.clientId = 'our-client-id';
    config.google.webClientId = '';
    config.google.extraClientIds = [];
  });

  afterEach(() => {
    Object.assign(config.google, originalIds);
    vi.unstubAllGlobals();
  });

  const googleSays = (info: Record<string, unknown>, ok = true) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => info }));

  const valid = {
    aud: 'our-client-id',
    iss: 'https://accounts.google.com',
    sub: 'google-123',
    email: 'Ama@Example.com',
    email_verified: 'true',
    exp: String(Math.floor(Date.now() / 1000) + 600),
    name: 'Ama',
  };

  it('returns the identity from a valid token', async () => {
    googleSays(valid);
    await expect(verifyGoogleIdToken('tok')).resolves.toEqual({
      googleId: 'google-123',
      email: 'ama@example.com',
      name: 'Ama',
      picture: undefined,
    });
  });

  it('rejects a token Google refuses', async () => {
    googleSays({}, false);
    await expect(verifyGoogleIdToken('forged')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a token issued to another app', async () => {
    googleSays({ ...valid, aud: 'someone-elses-app' });
    await expect(verifyGoogleIdToken('tok')).rejects.toThrow(/not issued for this app/);
  });

  it('rejects an unverified Google email', async () => {
    googleSays({ ...valid, email_verified: 'false' });
    await expect(verifyGoogleIdToken('tok')).rejects.toThrow(/not verified/);
  });

  it('refuses to run when no client ID is configured', async () => {
    config.google.clientId = '';
    await expect(verifyGoogleIdToken('tok')).rejects.toThrow(/not configured/);
  });

  it('never trusts the email in the request body', async () => {
    googleSays(valid);
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.findFirst.mockResolvedValue(null);
    prismaMock.customer.create.mockImplementation(async ({ data }: any) => ({ id: 'cus_new', ...data, active: true }));

    // googleAuth only takes the token; there is nowhere to pass a victim's email
    await customerAuthService.googleAuth('tok');

    expect(prismaMock.customer.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'ama@example.com', mode: 'insensitive' } },
    });
  });

  it("won't link an email that belongs to a different Google account", async () => {
    googleSays(valid);
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'cus_1', googleId: 'google-999', active: true });
    await expect(customerAuthService.googleAuth('tok')).rejects.toThrow(/different Google account/);
  });
});

describe('account tokens', () => {
  it('stores only a hash of link tokens', async () => {
    const token = await accountTokenService.issueLinkToken(AccountType.CUSTOMER, 'cus_1', AuthTokenPurpose.PASSWORD_RESET);
    const created = prismaMock.authToken.create.mock.calls[0][0].data;
    expect(created.tokenHash).toBe(hashToken(token));
    expect(created.tokenHash).not.toContain(token);
  });

  it('rejects expired and used link tokens', async () => {
    prismaMock.authToken.findUnique.mockResolvedValueOnce({
      id: 't1', purpose: AuthTokenPurpose.PASSWORD_RESET, usedAt: null, expiresAt: new Date(Date.now() - 1000),
    });
    await expect(accountTokenService.consumeLinkToken('x', AuthTokenPurpose.PASSWORD_RESET)).rejects.toBeInstanceOf(AppError);

    prismaMock.authToken.findUnique.mockResolvedValueOnce({
      id: 't1', purpose: AuthTokenPurpose.PASSWORD_RESET, usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(accountTokenService.consumeLinkToken('x', AuthTokenPurpose.PASSWORD_RESET)).rejects.toBeInstanceOf(AppError);
  });

  it("won't use a token meant for something else", async () => {
    prismaMock.authToken.findUnique.mockResolvedValue({
      id: 't1', purpose: AuthTokenPurpose.EMAIL_VERIFICATION, usedAt: null, expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(accountTokenService.consumeLinkToken('x', AuthTokenPurpose.PASSWORD_RESET)).rejects.toBeInstanceOf(AppError);
  });

  it('counts wrong phone codes and locks after five', async () => {
    const code = await accountTokenService.issueCode(AccountType.CUSTOMER, 'cus_1', AuthTokenPurpose.PHONE_VERIFICATION);
    const stored = prismaMock.authToken.create.mock.calls[0][0].data;
    const wrong = code === '000000' ? '111111' : '000000';

    prismaMock.authToken.findFirst.mockResolvedValueOnce({ ...stored, id: 't1', attempts: 0, usedAt: null });
    await expect(
      accountTokenService.consumeCode(AccountType.CUSTOMER, 'cus_1', AuthTokenPurpose.PHONE_VERIFICATION, wrong)
    ).rejects.toThrow(/not correct/);
    expect(prismaMock.authToken.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { attempts: { increment: 1 } } });

    prismaMock.authToken.findFirst.mockResolvedValueOnce({ ...stored, id: 't1', attempts: 5, usedAt: null });
    await expect(
      accountTokenService.consumeCode(AccountType.CUSTOMER, 'cus_1', AuthTokenPurpose.PHONE_VERIFICATION, code)
    ).rejects.toThrow(/expired/);
  });
});

describe('password reset', () => {
  it('gives the same answer whether or not the account exists', async () => {
    prismaMock.customer.findFirst.mockResolvedValueOnce(null);
    const missing = await passwordResetService.requestReset(AccountType.CUSTOMER, 'nobody@example.com');

    prismaMock.customer.findFirst.mockResolvedValueOnce({ id: 'cus_1', name: 'Ama', email: 'ama@example.com', active: true });
    const found = await passwordResetService.requestReset(AccountType.CUSTOMER, 'ama@example.com');

    expect(missing).toEqual(found);
    expect(emailMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('records when the password changed, which ends old sessions', async () => {
    prismaMock.authToken.findUnique.mockResolvedValue({
      id: 't1', accountType: AccountType.SUPPLIER, accountId: 'sa_1',
      purpose: AuthTokenPurpose.PASSWORD_RESET, usedAt: null, expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.authToken.updateMany.mockResolvedValue({ count: 1 });

    await passwordResetService.resetPassword('tok', 'a-new-password');

    expect(prismaMock.supplierAdmin.update).toHaveBeenCalledWith({
      where: { id: 'sa_1' },
      data: expect.objectContaining({ passwordChangedAt: expect.any(Date) }),
    });
  });
});

describe('customer sessions after a password change', () => {
  it('rejects a token issued before the change', async () => {
    const token = jwt.sign(
      { type: 'customer', customerId: 'cus_1', email: 'a@b.c', phone: '1', iat: Math.floor(Date.now() / 1000) - 3600 },
      config.jwtSecret
    );
    prismaMock.customer.findUnique.mockResolvedValue({
      id: 'cus_1', email: 'a@b.c', phone: '1', name: 'A', active: true, passwordChangedAt: new Date(),
    });
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await authenticateCustomer({ headers: { authorization: `Bearer ${token}` } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
