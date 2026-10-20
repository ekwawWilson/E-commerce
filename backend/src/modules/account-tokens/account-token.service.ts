import { createHash, randomBytes, randomInt } from 'crypto';
import { AccountType, AuthTokenPurpose } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const MAX_CODE_ATTEMPTS = 5;

export const TOKEN_TTL_MINUTES: Record<AuthTokenPurpose, number> = {
  [AuthTokenPurpose.PASSWORD_RESET]: 60,
  [AuthTokenPurpose.EMAIL_VERIFICATION]: 24 * 60,
  [AuthTokenPurpose.PHONE_VERIFICATION]: 10,
};

export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// Six-digit codes are short, so they're hashed with the account ID: that keeps
// two accounts' codes from colliding on the unique hash and ties a code to
// the account it was sent to.
const codeHash = (accountId: string, code: string) => hashToken(`${accountId}:${code}`);

export class AccountTokenService {
  /**
   * Issue a single-use link token (password reset, email verification).
   * Earlier unused tokens for the same purpose stop working.
   */
  async issueLinkToken(accountType: AccountType, accountId: string, purpose: AuthTokenPurpose) {
    const token = randomBytes(32).toString('base64url');
    await this.replace(accountType, accountId, purpose, hashToken(token));
    return token;
  }

  /**
   * Issue a six-digit code (phone verification).
   */
  async issueCode(accountType: AccountType, accountId: string, purpose: AuthTokenPurpose) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.replace(accountType, accountId, purpose, codeHash(accountId, code));
    return code;
  }

  /**
   * Use a link token. Returns the account it belongs to; throws if it's
   * unknown, used or expired. Marking it used is conditional, so a token can
   * only ever be used once.
   */
  async consumeLinkToken(token: string, purpose: AuthTokenPurpose) {
    const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });

    if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError('This link is invalid or has expired. Please request a new one.', 400);
    }

    const { count } = await prisma.authToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) {
      throw new AppError('This link has already been used', 400);
    }

    return { accountType: record.accountType, accountId: record.accountId };
  }

  /**
   * Check a six-digit code. Five wrong guesses lock the code.
   */
  async consumeCode(accountType: AccountType, accountId: string, purpose: AuthTokenPurpose, code: string) {
    const record = await prisma.authToken.findFirst({
      where: { accountType, accountId, purpose, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date() || record.attempts >= MAX_CODE_ATTEMPTS) {
      throw new AppError('This code has expired. Please request a new one.', 400);
    }

    if (record.tokenHash !== codeHash(accountId, code)) {
      await prisma.authToken.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new AppError('That code is not correct', 400);
    }

    const { count } = await prisma.authToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (count === 0) {
      throw new AppError('This code has already been used', 400);
    }
  }

  private async replace(accountType: AccountType, accountId: string, purpose: AuthTokenPurpose, tokenHash: string) {
    await prisma.$transaction([
      prisma.authToken.deleteMany({ where: { accountType, accountId, purpose, usedAt: null } }),
      prisma.authToken.create({
        data: {
          accountType,
          accountId,
          purpose,
          tokenHash,
          expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES[purpose] * 60 * 1000),
        },
      }),
    ]);
  }
}

export const accountTokenService = new AccountTokenService();
