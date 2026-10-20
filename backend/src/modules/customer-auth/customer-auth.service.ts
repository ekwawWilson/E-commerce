import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../../config';
import { PaymentMethod } from '@prisma/client';
import { NotFoundError, AppError, UnauthorizedError } from '../../middleware/errorHandler';
import { sendWelcomeEmail } from '../notifications/email.service';

export interface CustomerRegisterData {
  email: string;
  phone: string;
  password: string;
  name: string;
}

export interface CustomerLoginData {
  email?: string;
  phone?: string;
  password: string;
}

export interface GoogleAuthData {
  idToken: string;
  email: string;
  name: string;
  profileImage?: string;
  googleId: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  preferredPaymentMethod?: PaymentMethod;
}

export interface AddAddressData {
  label?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  region?: string;
  landmark?: string;
  isDefault?: boolean;
}

export class CustomerAuthService {
  /**
   * Register a new customer
   */
  async register(data: CustomerRegisterData) {
    // Check if email already exists
    const existingByEmail = await prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (existingByEmail) {
      throw new AppError('An account with this email already exists', 409);
    }

    // Check if phone already exists
    const existingByPhone = await prisma.customer.findUnique({
      where: { phone: data.phone },
    });

    if (existingByPhone) {
      throw new AppError('An account with this phone number already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const customer = await prisma.customer.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        profileImage: true,
        preferredPaymentMethod: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    // Send welcome email (async, don't wait for it)
    sendWelcomeEmail({
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
    }).catch((error) => {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    });

    // Generate token
    const token = this.generateToken(customer);

    return {
      token,
      customer,
    };
  }

  /**
   * Customer login (by email or phone)
   */
  async login(data: CustomerLoginData) {
    let customer;

    if (data.email) {
      customer = await prisma.customer.findUnique({
        where: { email: data.email },
      });
    } else if (data.phone) {
      customer = await prisma.customer.findUnique({
        where: { phone: data.phone },
      });
    } else {
      throw new AppError('Email or phone is required', 400);
    }

    if (!customer) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!customer.active) {
      throw new UnauthorizedError('Account is disabled');
    }

    const isValidPassword = await bcrypt.compare(data.password, customer.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = this.generateToken(customer);

    return {
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        phone: customer.phone,
        name: customer.name,
        profileImage: customer.profileImage,
        preferredPaymentMethod: customer.preferredPaymentMethod,
        emailVerified: customer.emailVerified,
        phoneVerified: customer.phoneVerified,
      },
    };
  }

  /**
   * Google OAuth sign-in/sign-up
   * Creates account if doesn't exist, or logs in if exists
   */
  async googleAuth(data: GoogleAuthData) {
    // Check if customer exists with this email
    let customer = await prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (customer) {
      // Customer exists - update Google ID if not set and log in
      if (!customer.googleId) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            googleId: data.googleId,
            profileImage: customer.profileImage || data.profileImage,
            emailVerified: true, // Google email is verified
            lastLoginAt: new Date(),
          },
        });
      } else {
        // Just update last login
        await prisma.customer.update({
          where: { id: customer.id },
          data: { lastLoginAt: new Date() },
        });
      }

      if (!customer.active) {
        throw new UnauthorizedError('Account is disabled');
      }
    } else {
      // Create new customer with Google account
      // Generate a random password hash (user can set password later if needed)
      const randomPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // Generate a placeholder phone (user must update this later)
      const placeholderPhone = `google_${data.googleId}`;

      customer = await prisma.customer.create({
        data: {
          email: data.email,
          phone: placeholderPhone,
          passwordHash,
          name: data.name,
          profileImage: data.profileImage,
          googleId: data.googleId,
          emailVerified: true, // Google email is verified
          phoneVerified: false,
        },
      });

      // Send welcome email to new Google sign-up (async, don't wait)
      sendWelcomeEmail({
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: null, // No real phone yet for Google sign-ups
      }).catch((error) => {
        console.error('Failed to send welcome email:', error);
        // Don't fail sign-up if email fails
      });
    }

    // Generate token
    const token = this.generateToken(customer);

    // Check if phone needs to be updated (placeholder phone)
    const needsPhoneUpdate = customer.phone.startsWith('google_');

    return {
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        phone: needsPhoneUpdate ? null : customer.phone,
        name: customer.name,
        profileImage: customer.profileImage,
        preferredPaymentMethod: customer.preferredPaymentMethod,
        emailVerified: customer.emailVerified,
        phoneVerified: customer.phoneVerified,
      },
      needsPhoneUpdate,
    };
  }

  /**
   * Get customer profile
   */
  async getProfile(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        profileImage: true,
        preferredPaymentMethod: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    return customer;
  }

  /**
   * Update customer profile
   */
  async updateProfile(customerId: string, data: UpdateProfileData) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Check email uniqueness if updating
    if (data.email && data.email !== customer.email) {
      const existing = await prisma.customer.findUnique({
        where: { email: data.email },
      });
      if (existing) {
        throw new AppError('Email is already in use', 409);
      }
    }

    // Check phone uniqueness if updating
    if (data.phone && data.phone !== customer.phone) {
      const existing = await prisma.customer.findUnique({
        where: { phone: data.phone },
      });
      if (existing) {
        throw new AppError('Phone number is already in use', 409);
      }
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        ...data,
        // Reset verification if email/phone changed
        emailVerified: data.email && data.email !== customer.email ? false : undefined,
        phoneVerified: data.phone && data.phone !== customer.phone ? false : undefined,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        profileImage: true,
        preferredPaymentMethod: true,
        emailVerified: true,
        phoneVerified: true,
        updatedAt: true,
      },
    });

    return updatedCustomer;
  }

  /**
   * Change password
   */
  async changePassword(customerId: string, currentPassword: string, newPassword: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, customer.passwordHash);

    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash },
    });

    return { success: true };
  }

  /**
   * Get customer addresses
   */
  async getAddresses(customerId: string) {
    return prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Add new address
   */
  async addAddress(customerId: string, data: AddAddressData) {
    // If this is the default address, unset other defaults
    if (data.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first address, make it default
    const addressCount = await prisma.customerAddress.count({
      where: { customerId },
    });

    const address = await prisma.customerAddress.create({
      data: {
        customerId,
        ...data,
        isDefault: data.isDefault || addressCount === 0,
      },
    });

    return address;
  }

  /**
   * Update address
   */
  async updateAddress(customerId: string, addressId: string, data: Partial<AddAddressData>) {
    const address = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundError('Address');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.customerAddress.update({
      where: { id: addressId },
      data,
    });

    return updatedAddress;
  }

  /**
   * Delete address
   */
  async deleteAddress(customerId: string, addressId: string) {
    const address = await prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundError('Address');
    }

    await prisma.customerAddress.delete({
      where: { id: addressId },
    });

    // If deleted address was default, make another one default
    if (address.isDefault) {
      const firstAddress = await prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstAddress) {
        await prisma.customerAddress.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  }

  /**
   * Get customer order history
   */
  async getOrders(customerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        include: {
          payment: true,
          delivery: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { customerId } }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single order (must belong to customer)
   */
  async getOrder(customerId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        payment: true,
        delivery: {
          include: { courier: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    return order;
  }

  /**
   * Link guest cart to customer
   */
  async linkCartToCustomer(customerId: string, cartId: string) {
    // Check if customer already has an active cart
    const existingCart = await prisma.cart.findFirst({
      where: { customerId },
      include: { items: true },
    });

    const guestCart = await prisma.cart.findUnique({
      where: { cartId },
      include: { items: true },
    });

    if (!guestCart) {
      // No guest cart to link
      return existingCart;
    }

    if (existingCart && existingCart.items.length > 0) {
      // Merge guest cart items into existing customer cart.
      // Matching is by VARIANT, not product — two storage tiers of the same
      // phone are different lines and must not be merged into one.
      for (const item of guestCart.items) {
        const existingItem = existingCart.items.find((i) => i.variantId === item.variantId);

        if (existingItem) {
          // Update quantity
          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + item.quantity },
          });
        } else {
          // Add new item
          await prisma.cartItem.create({
            data: {
              cartId: existingCart.id,
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              snapshotPrice: item.snapshotPrice,
              snapshotName: item.snapshotName,
              snapshotVariantName: item.snapshotVariantName,
              currency: item.currency,
            },
          });
        }
      }

      // Delete guest cart
      await prisma.cart.delete({ where: { id: guestCart.id } });

      return prisma.cart.findUnique({
        where: { id: existingCart.id },
        include: { items: { include: { product: true } } },
      });
    } else {
      // No existing cart, just assign guest cart to customer
      return prisma.cart.update({
        where: { id: guestCart.id },
        data: { customerId },
        include: { items: { include: { product: true } } },
      });
    }
  }

  /**
   * Generate JWT token for customer
   */
  private generateToken(customer: { id: string; email: string; phone: string }) {
    return jwt.sign(
      {
        type: 'customer',
        customerId: customer.id,
        email: customer.email,
        phone: customer.phone,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );
  }

  /**
   * Verify JWT token and get customer
   */
  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        type: string;
        customerId: string;
        email: string;
        phone: string;
      };

      if (decoded.type !== 'customer') {
        throw new UnauthorizedError('Invalid token type');
      }

      const customer = await prisma.customer.findUnique({
        where: { id: decoded.customerId },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          active: true,
        },
      });

      if (!customer || !customer.active) {
        throw new UnauthorizedError('Customer not found or inactive');
      }

      return customer;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}

export const customerAuthService = new CustomerAuthService();
