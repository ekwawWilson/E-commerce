import { Request, Response, NextFunction } from 'express';
import { customerAuthService } from './customer-auth.service';
import { successResponse, paginatedResponse } from '../../utils/response';

// Extended request type with customer
export interface CustomerRequest extends Request {
  customer?: {
    id: string;
    email: string;
    phone: string;
    name: string;
  };
}

/**
 * Register new customer
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.register(req.body);
    return successResponse(res, result, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Customer login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.login(req.body);

    // If guest cart ID provided, link it to customer
    const guestCartId = req.headers['x-cart-id'] as string;
    if (guestCartId) {
      await customerAuthService.linkCartToCustomer(result.customer.id, guestCartId);
    }

    return successResponse(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
}

/**
 * Google OAuth login/signup
 */
export async function googleAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Only the ID token is used; any email/name/googleId in the body is ignored
    const result = await customerAuthService.googleAuth(req.body.idToken);

    // If guest cart ID provided, link it to customer
    const guestCartId = req.headers['x-cart-id'] as string;
    if (guestCartId) {
      await customerAuthService.linkCartToCustomer(result.customer.id, guestCartId);
    }

    return successResponse(res, result, 'Google authentication successful');
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer profile
 */
export async function getProfile(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const customer = await customerAuthService.getProfile(req.customer!.id);
    return successResponse(res, customer);
  } catch (error) {
    next(error);
  }
}

/**
 * Update customer profile
 */
export async function updateProfile(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const customer = await customerAuthService.updateProfile(req.customer!.id, req.body);
    return successResponse(res, customer, 'Profile updated');
  } catch (error) {
    next(error);
  }
}

/**
 * Change password
 */
export async function changePassword(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.body;
    // Other sessions are signed out; the returned token keeps this one going
    const result = await customerAuthService.changePassword(req.customer!.id, currentPassword, newPassword);
    return successResponse(res, { token: result.token }, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer addresses
 */
export async function getAddresses(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const addresses = await customerAuthService.getAddresses(req.customer!.id);
    return successResponse(res, addresses);
  } catch (error) {
    next(error);
  }
}

/**
 * Add new address
 */
export async function addAddress(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const address = await customerAuthService.addAddress(req.customer!.id, req.body);
    return successResponse(res, address, 'Address added', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update address
 */
export async function updateAddress(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const address = await customerAuthService.updateAddress(
      req.customer!.id,
      req.params.addressId,
      req.body
    );
    return successResponse(res, address, 'Address updated');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete address
 */
export async function deleteAddress(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    await customerAuthService.deleteAddress(req.customer!.id, req.params.addressId);
    return successResponse(res, null, 'Address deleted');
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer orders
 */
export async function getOrders(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await customerAuthService.getOrders(req.customer!.id, page, limit);
    return paginatedResponse(res, result.orders, result.page, result.limit, result.total);
  } catch (error) {
    next(error);
  }
}

/**
 * Get single order
 */
export async function getOrder(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const order = await customerAuthService.getOrder(req.customer!.id, req.params.orderId);
    return successResponse(res, order);
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel one of the customer's orders
 */
export async function cancelOrder(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.cancelOrder(req.customer!.id, req.params.orderId, req.body.reason);
    return successResponse(res, result, 'Order cancelled');
  } catch (error) {
    next(error);
  }
}

/**
 * Wishlist
 */
export async function getWishlist(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    return successResponse(res, await customerAuthService.getWishlist(req.customer!.id));
  } catch (error) {
    next(error);
  }
}

export async function addToWishlist(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.addToWishlist(req.customer!.id, req.body.productId);
    return successResponse(res, result, 'Added to wishlist', 201);
  } catch (error) {
    next(error);
  }
}

export async function removeFromWishlist(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.removeFromWishlist(req.customer!.id, req.params.productId);
    return successResponse(res, result, 'Removed from wishlist');
  } catch (error) {
    next(error);
  }
}

/**
 * Email & phone verification
 */
export async function requestEmailVerification(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.requestEmailVerification(req.customer!.id);
    return successResponse(res, result, 'Verification email sent');
  } catch (error) {
    next(error);
  }
}

export async function confirmEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.confirmEmail(req.body.token);
    return successResponse(res, result, 'Email verified');
  } catch (error) {
    next(error);
  }
}

export async function requestPhoneVerification(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.requestPhoneVerification(req.customer!.id);
    return successResponse(res, result, 'Verification code sent');
  } catch (error) {
    next(error);
  }
}

export async function confirmPhone(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const result = await customerAuthService.confirmPhone(req.customer!.id, req.body.code);
    return successResponse(res, result, 'Phone number verified');
  } catch (error) {
    next(error);
  }
}
