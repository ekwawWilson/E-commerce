import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../../config';
import { AdminRole } from '@prisma/client';
import { NotFoundError, AppError, UnauthorizedError } from '../../middleware/errorHandler';

export interface LoginData {
  email: string;
  password: string;
}

export interface CreateAdminData {
  email: string;
  password: string;
  name: string;
  role?: AdminRole;
}

export class AuthService {
  /**
   * Admin login
   */
  async login(data: LoginData) {
    const admin = await prisma.admin.findUnique({
      where: { email: data.email },
    });

    if (!admin) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!admin.active) {
      throw new UnauthorizedError('Account is disabled');
    }

    const isValidPassword = await bcrypt.compare(data.password, admin.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = this.generateToken(admin);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'LOGIN',
        entity: 'Admin',
        entityId: admin.id,
      },
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  /**
   * Create a new admin
   */
  async createAdmin(data: CreateAdminData, createdBy?: string) {
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: data.email },
    });

    if (existingAdmin) {
      throw new AppError('An admin with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const admin = await prisma.admin.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role || AdminRole.ADMIN,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    // Create audit log
    if (createdBy) {
      await prisma.auditLog.create({
        data: {
          adminId: createdBy,
          action: 'CREATE',
          entity: 'Admin',
          entityId: admin.id,
          newValues: { email: admin.email, name: admin.name, role: admin.role },
        },
      });
    }

    return admin;
  }

  /**
   * Get admin by ID
   */
  async getAdminById(id: string) {
    const admin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundError('Admin');
    }

    return admin;
  }

  /**
   * Get all admins
   */
  async getAdmins() {
    return prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update admin
   */
  async updateAdmin(
    id: string,
    data: { email?: string; name?: string; role?: AdminRole; active?: boolean },
    updatedBy: string
  ) {
    const admin = await prisma.admin.findUnique({ where: { id } });

    if (!admin) {
      throw new NotFoundError('Admin');
    }

    // Check email uniqueness if updating email
    if (data.email && data.email !== admin.email) {
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: data.email },
      });
      if (existingAdmin) {
        throw new AppError('An admin with this email already exists', 409);
      }
    }

    const oldValues = { email: admin.email, name: admin.name, role: admin.role, active: admin.active };

    const updatedAdmin = await prisma.admin.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: updatedBy,
        action: 'UPDATE',
        entity: 'Admin',
        entityId: id,
        oldValues,
        newValues: data,
      },
    });

    return updatedAdmin;
  }

  /**
   * Change password
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });

    if (!admin) {
      throw new NotFoundError('Admin');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, admin.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId,
        action: 'PASSWORD_CHANGE',
        entity: 'Admin',
        entityId: adminId,
      },
    });

    return { success: true };
  }

  /**
   * Delete admin
   */
  async deleteAdmin(id: string, deletedBy: string) {
    const admin = await prisma.admin.findUnique({ where: { id } });

    if (!admin) {
      throw new NotFoundError('Admin');
    }

    if (admin.role === AdminRole.SUPER_ADMIN) {
      // Check if this is the last super admin
      const superAdminCount = await prisma.admin.count({
        where: { role: AdminRole.SUPER_ADMIN, active: true },
      });

      if (superAdminCount <= 1) {
        throw new AppError('Cannot delete the last super admin', 400);
      }
    }

    await prisma.admin.delete({ where: { id } });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: deletedBy,
        action: 'DELETE',
        entity: 'Admin',
        entityId: id,
        oldValues: { email: admin.email, name: admin.name },
      },
    });

    return { success: true };
  }

  /**
   * Get current admin profile
   */
  async getProfile(adminId: string) {
    return this.getAdminById(adminId);
  }

  /**
   * Generate JWT token
   */
  private generateToken(admin: { id: string; email: string; role: AdminRole }) {
    return jwt.sign(
      {
        type: 'admin',
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );
  }
}

export const authService = new AuthService();
