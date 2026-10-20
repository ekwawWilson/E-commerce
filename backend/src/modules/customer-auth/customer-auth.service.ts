import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../../config';
import { AccountType, AuthTokenPurpose, PaymentMethod } from '@prisma/client';
import { NotFoundError, AppError, UnauthorizedError } from '../../middleware/errorHandler';
import { sendWelcomeEmail, sendEmailVerificationEmail } from '../notifications/email.service';
import { sendSmsNow } from '../notifications/sms.providers';
import { accountTokenService } from '../account-tokens/account-token.service';
import { orderService } from '../orders/order.service';
import logger from '../../utils/logger';
import { verifyGoogleIdToken } from './google-verify';

const emailMatches = (email: string) => ({ equals: email, mode: 'insensitive' as const });

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
    const existingByEmail = await prisma.customer.findFirst({
      where: { email: emailMatches(data.email) },
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

    this.requestEmailVerification(customer.id).catch((error) =>
      logger.error('Failed to send verification email:', error)
    );

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
      customer = await prisma.customer.findFirst({
        where: { email: emailMatches(data.email) },
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
  async googleAuth(idToken: string) {
    // Identity comes only from the verified token, never the request body
    const google = await verifyGoogleIdToken(idToken);

    let customer =
      (await prisma.customer.findUnique({ where: { googleId: google.googleId } })) ??
      (await prisma.customer.findFirst({
        where: { email: { equals: google.email, mode: 'insensitive' } },
      }));

    if (customer) {
      if (customer.googleId && customer.googleId !== google.googleId) {
        throw new UnauthorizedError('This email is linked to a different Google account');
      }

      if (!customer.active) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Link Google on first sign-in. Safe because Google has verified the email.
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          googleId: google.googleId,
          profileImage: customer.profileImage || google.picture,
          emailVerified: true,
          emailVerifiedAt: customer.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Unusable random password; the customer can set one via password reset
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

      // Generate a placeholder phone (user must update this later)
      const placeholderPhone = `google_${google.googleId}`;

      customer = await prisma.customer.create({
        data: {
          email: google.email,
          phone: placeholderPhone,
          passwordHash,
          name: google.name,
          profileImage: google.picture,
          googleId: google.googleId,
          emailVerified: true, // Google email is verified
          emailVerifiedAt: new Date(),
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
      const existing = await prisma.customer.findFirst({
        where: { email: emailMatches(data.email), id: { not: customerId } },
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

    // A pending verification belongs to the old address/number
    const changedPurposes: AuthTokenPurpose[] = [];
    if (data.email && data.email !== customer.email) changedPurposes.push(AuthTokenPurpose.EMAIL_VERIFICATION);
    if (data.phone && data.phone !== customer.phone) changedPurposes.push(AuthTokenPurpose.PHONE_VERIFICATION);
    if (changedPurposes.length > 0) {
      await prisma.authToken.deleteMany({
        where: { accountType: AccountType.CUSTOMER, accountId: customerId, purpose: { in: changedPurposes }, usedAt: null },
      });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        // Listed explicitly so no other column can be written from the request
        name: data.name,
        email: data.email,
        phone: data.phone,
        profileImage: data.profileImage,
        preferredPaymentMethod: data.preferredPaymentMethod,
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

    // passwordChangedAt logs out other sessions; this one gets a fresh token
    await prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    return { success: true, token: this.generateToken(customer) };
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
        ...data,
        customerId,
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
   * Cancel one of the customer's own orders, while it hasn't been prepared yet
   */
  async cancelOrder(customerId: string, orderId: string, reason: string) {
    return orderService.cancelOrder(orderId, { type: 'customer', customerId }, reason);
  }

  // ============================================
  // WISHLIST
  // ============================================

  async getWishlist(customerId: string) {
    const items = await prisma.wishlistItem.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    // WishlistItem has no foreign key to Product, so skip products that have
    // since been removed or deactivated.
    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map((i) => i.productId) },
        active: true,
        OR: [{ supplierId: null }, { supplier: { status: 'ACTIVE' } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        currency: true,
        stock: true,
        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    return items
      .filter((i) => byId.has(i.productId))
      .map((i) => ({ productId: i.productId, addedAt: i.createdAt, product: byId.get(i.productId)! }));
  }

  async addToWishlist(customerId: string, productId: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, active: true }, select: { id: true } });
    if (!product) {
      throw new NotFoundError('Product');
    }

    await prisma.wishlistItem.upsert({
      where: { customerId_productId: { customerId, productId } },
      create: { customerId, productId },
      update: {},
    });

    return { productId };
  }

  async removeFromWishlist(customerId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({ where: { customerId, productId } });
    return { productId };
  }

  // ============================================
  // EMAIL & PHONE VERIFICATION
  // ============================================

  async requestEmailVerification(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer');
    }
    if (customer.emailVerified) {
      return { alreadyVerified: true };
    }

    const token = await accountTokenService.issueLinkToken(
      AccountType.CUSTOMER,
      customer.id,
      AuthTokenPurpose.EMAIL_VERIFICATION
    );
    const link = `${config.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const sent = await sendEmailVerificationEmail(customer.email, customer.name, link);
    if (!sent) {
      throw new AppError('We could not send the verification email. Please try again later.', 503);
    }

    return { sent: true };
  }

  async confirmEmail(token: string) {
    const { accountType, accountId } = await accountTokenService.consumeLinkToken(
      token,
      AuthTokenPurpose.EMAIL_VERIFICATION
    );
    if (accountType !== AccountType.CUSTOMER) {
      throw new AppError('This link is invalid or has expired. Please request a new one.', 400);
    }

    await prisma.customer.update({
      where: { id: accountId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });

    return { verified: true };
  }

  async requestPhoneVerification(customerId: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer');
    }
    if (customer.phone.startsWith('google_')) {
      throw new AppError('Add your phone number to your profile first', 400);
    }
    if (customer.phoneVerified) {
      return { alreadyVerified: true };
    }

    const code = await accountTokenService.issueCode(
      AccountType.CUSTOMER,
      customer.id,
      AuthTokenPurpose.PHONE_VERIFICATION
    );

    try {
      await sendSmsNow(customer.phone, `Your verification code is ${code}. It expires in 10 minutes.`);
    } catch (error) {
      logger.error('Failed to send phone verification SMS:', error);
      throw new AppError('We could not send the SMS. Please try again later.', 503);
    }

    return { sent: true };
  }

  async confirmPhone(customerId: string, code: string) {
    await accountTokenService.consumeCode(
      AccountType.CUSTOMER,
      customerId,
      AuthTokenPurpose.PHONE_VERIFICATION,
      code
    );

    await prisma.customer.update({
      where: { id: customerId },
      data: { phoneVerified: true, phoneVerifiedAt: new Date() },
    });

    return { verified: true };
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
