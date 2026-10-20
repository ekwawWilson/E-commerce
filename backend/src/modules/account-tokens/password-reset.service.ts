import bcrypt from 'bcryptjs';
import { AccountType, AuthTokenPurpose } from '@prisma/client';
import prisma from '../../config/database';
import config from '../../config';
import logger from '../../utils/logger';
import { sendPasswordResetEmail } from '../notifications/email.service';
import { accountTokenService } from './account-token.service';

interface ResettableAccount {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

const insensitive = (email: string) => ({ equals: email, mode: 'insensitive' as const });

async function findAccount(accountType: AccountType, email: string): Promise<ResettableAccount | null> {
  const select = { id: true, name: true, email: true, active: true };
  switch (accountType) {
    case AccountType.CUSTOMER:
      return prisma.customer.findFirst({ where: { email: insensitive(email) }, select });
    case AccountType.SUPPLIER:
      return prisma.supplierAdmin.findFirst({ where: { email: insensitive(email) }, select });
    case AccountType.ADMIN:
      return prisma.admin.findFirst({ where: { email: insensitive(email) }, select });
  }
}

async function setPassword(accountType: AccountType, accountId: string, passwordHash: string) {
  // passwordChangedAt invalidates every session issued before the reset
  const data = { passwordHash, passwordChangedAt: new Date() };
  switch (accountType) {
    case AccountType.CUSTOMER:
      return prisma.customer.update({ where: { id: accountId }, data });
    case AccountType.SUPPLIER:
      return prisma.supplierAdmin.update({ where: { id: accountId }, data });
    case AccountType.ADMIN:
      return prisma.admin.update({ where: { id: accountId }, data });
  }
}

export class PasswordResetService {
  /**
   * Email a reset link if the account exists. The caller always gets the same
   * answer, so this can't be used to find out which emails have accounts.
   */
  async requestReset(accountType: AccountType, email: string) {
    const account = await findAccount(accountType, email);

    if (account?.active) {
      const token = await accountTokenService.issueLinkToken(
        accountType,
        account.id,
        AuthTokenPurpose.PASSWORD_RESET
      );
      const link = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

      const sent = await sendPasswordResetEmail(account.email, account.name, link);
      if (!sent) {
        logger.error(`Password reset email could not be sent (${accountType} ${account.id})`);
      }
    }

    return {
      message: 'If an account exists for that email, we have sent a link to reset the password.',
    };
  }

  /**
   * Set a new password using a reset link token.
   */
  async resetPassword(token: string, newPassword: string) {
    const { accountType, accountId } = await accountTokenService.consumeLinkToken(
      token,
      AuthTokenPurpose.PASSWORD_RESET
    );

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await setPassword(accountType, accountId, passwordHash);

    return { accountType, message: 'Your password has been reset. Please sign in.' };
  }
}

export const passwordResetService = new PasswordResetService();
