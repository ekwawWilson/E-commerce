import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../../config/database';
import config from '../../config';
import { SupplierRole } from '@prisma/client';
import { NotFoundError, UnauthorizedError } from '../../middleware/errorHandler';
import { slugify } from '../../utils/helpers';

export interface SupplierLoginData {
  email: string;
  password: string;
}

export interface SupplierRegisterData {
  // Supplier info
  supplierName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  description?: string;
  businessName?: string;
  businessAddress: string;
  city: string;
  region: string;
  taxId?: string;

  // Owner account
  ownerName: string;
  ownerPassword: string;
  ownerPhone?: string;
}

export interface SupplierTokenPayload {
  type: 'supplier';
  supplierAdminId: string;
  supplierId: string;
  email: string;
  role: SupplierRole;
}

export class SupplierAuthService {
  /**
   * Login supplier admin
   */
  async login(data: SupplierLoginData) {
    const supplierAdmin = await prisma.supplierAdmin.findUnique({
      where: { email: data.email },
      include: {
        supplier: true,
      },
    });

    if (!supplierAdmin) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!supplierAdmin.active) {
      throw new UnauthorizedError('Your account has been deactivated');
    }

    if (supplierAdmin.supplier.status !== 'ACTIVE') {
      throw new UnauthorizedError('Your supplier account is not active');
    }

    const isPasswordValid = await bcrypt.compare(data.password, supplierAdmin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.supplierAdmin.update({
      where: { id: supplierAdmin.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const tokenPayload: SupplierTokenPayload = {
      type: 'supplier',
      supplierAdminId: supplierAdmin.id,
      supplierId: supplierAdmin.supplierId,
      email: supplierAdmin.email,
      role: supplierAdmin.role,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as SignOptions);

    return {
      token,
      supplierAdmin: {
        id: supplierAdmin.id,
        email: supplierAdmin.email,
        name: supplierAdmin.name,
        phone: supplierAdmin.phone,
        role: supplierAdmin.role,
      },
      supplier: {
        id: supplierAdmin.supplier.id,
        name: supplierAdmin.supplier.name,
        businessName: supplierAdmin.supplier.businessName,
        slug: supplierAdmin.supplier.slug,
        logo: supplierAdmin.supplier.logo,
        status: supplierAdmin.supplier.status,
        verified: supplierAdmin.supplier.verified,
      },
    };
  }

  /**
   * Register new supplier with owner account
   */
  async register(data: SupplierRegisterData) {
    const slug = slugify(data.supplierName);

    // Check if supplier email or slug exists
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        OR: [{ email: data.email }, { slug }],
      },
    });

    if (existingSupplier) {
      if (existingSupplier.email === data.email) {
        throw new Error('A supplier with this email already exists');
      }
      throw new Error('A supplier with this name already exists');
    }

    // Check if admin email exists
    const existingAdmin = await prisma.supplierAdmin.findUnique({
      where: { email: data.email },
    });

    if (existingAdmin) {
      throw new Error('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.ownerPassword, 12);

    // Create supplier and owner in transaction
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.create({
        data: {
          name: data.supplierName,
          slug,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          description: data.description,
          businessName: data.businessName,
          businessAddress: data.businessAddress,
          city: data.city,
          region: data.region,
          taxId: data.taxId,
          status: 'PENDING',
          commissionRate: 10, // Default commission
        },
      });

      const supplierAdmin = await tx.supplierAdmin.create({
        data: {
          supplierId: supplier.id,
          email: data.email,
          passwordHash,
          name: data.ownerName,
          phone: data.ownerPhone,
          role: 'OWNER',
        },
      });

      return { supplier, supplierAdmin };
    });

    return {
      message: 'Registration successful. Your account is pending approval.',
      supplier: {
        id: result.supplier.id,
        name: result.supplier.name,
        slug: result.supplier.slug,
        status: result.supplier.status,
      },
      supplierAdmin: {
        id: result.supplierAdmin.id,
        email: result.supplierAdmin.email,
        name: result.supplierAdmin.name,
        role: result.supplierAdmin.role,
      },
    };
  }

  /**
   * Get current supplier admin info
   */
  async getMe(supplierAdminId: string) {
    const supplierAdmin = await prisma.supplierAdmin.findUnique({
      where: { id: supplierAdminId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            banner: true,
            email: true,
            phone: true,
            description: true,
            businessName: true,
            businessAddress: true,
            city: true,
            region: true,
            status: true,
            verified: true,
            commissionRate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!supplierAdmin) {
      throw new NotFoundError('Supplier admin');
    }

    return {
      id: supplierAdmin.id,
      email: supplierAdmin.email,
      name: supplierAdmin.name,
      phone: supplierAdmin.phone,
      role: supplierAdmin.role,
      supplier: supplierAdmin.supplier,
    };
  }

  /**
   * Change password
   */
  async changePassword(supplierAdminId: string, currentPassword: string, newPassword: string) {
    const supplierAdmin = await prisma.supplierAdmin.findUnique({
      where: { id: supplierAdminId },
    });

    if (!supplierAdmin) {
      throw new NotFoundError('Supplier admin');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, supplierAdmin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.supplierAdmin.update({
      where: { id: supplierAdminId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Create supplier staff (OWNER only)
   */
  async createStaff(supplierId: string, data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: SupplierRole;
  }) {
    // Check if email exists
    const existingAdmin = await prisma.supplierAdmin.findUnique({
      where: { email: data.email },
    });

    if (existingAdmin) {
      throw new Error('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const supplierAdmin = await prisma.supplierAdmin.create({
      data: {
        supplierId,
        email: data.email,
        passwordHash,
        name: data.name,
        phone: data.phone,
        role: data.role === 'OWNER' ? 'MANAGER' : data.role, // Can't create another owner
      },
    });

    return {
      id: supplierAdmin.id,
      email: supplierAdmin.email,
      name: supplierAdmin.name,
      phone: supplierAdmin.phone,
      role: supplierAdmin.role,
      createdAt: supplierAdmin.createdAt,
    };
  }

  /**
   * List supplier staff
   */
  async getStaff(supplierId: string) {
    const staff = await prisma.supplierAdmin.findMany({
      where: { supplierId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return staff;
  }

  /**
   * Update staff status
   */
  async updateStaffStatus(supplierId: string, staffId: string, active: boolean) {
    const staff = await prisma.supplierAdmin.findFirst({
      where: { id: staffId, supplierId },
    });

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    if (staff.role === 'OWNER') {
      throw new Error('Cannot deactivate owner account');
    }

    await prisma.supplierAdmin.update({
      where: { id: staffId },
      data: { active },
    });

    return { message: `Staff ${active ? 'activated' : 'deactivated'} successfully` };
  }

  /**
   * Delete staff
   */
  async deleteStaff(supplierId: string, staffId: string) {
    const staff = await prisma.supplierAdmin.findFirst({
      where: { id: staffId, supplierId },
    });

    if (!staff) {
      throw new NotFoundError('Staff member');
    }

    if (staff.role === 'OWNER') {
      throw new Error('Cannot delete owner account');
    }

    await prisma.supplierAdmin.delete({
      where: { id: staffId },
    });

    return { message: 'Staff deleted successfully' };
  }
}

export const supplierAuthService = new SupplierAuthService();
