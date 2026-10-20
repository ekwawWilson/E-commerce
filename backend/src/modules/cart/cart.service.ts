import prisma from '../../config/database';
import { generateCartId } from '../../utils/helpers';
import { NotFoundError, AppError } from '../../middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';

export interface CartWithItems {
  id: string;
  cartId: string;
  items: Array<{
    id: string;
    productId: string;
    variantId: string;
    quantity: number;
    snapshotPrice: Decimal;
    snapshotName: string;
    snapshotVariantName: string | null;
    currency: string;
    // Availability and pricing come from the variant, not the product.
    variant: {
      id: string;
      name: string;
      sku: string | null;
      price: Decimal;
      stock: number;
      active: boolean;
      isPreorder: boolean;
    };
    product: {
      id: string;
      name: string;
      slug: string;
      price: Decimal;
      stock: number;
      active: boolean;
      supplierId: string | null;
      images: Array<{ url: string; isPrimary: boolean }>;
      supplier?: {
        id: string;
        businessName: string;
        slug: string;
      } | null;
    };
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/** A variant can be ordered if it has stock, or if it's flagged for preorder. */
function canOrder(variant: { stock: number; isPreorder: boolean }, quantity: number): boolean {
  return variant.isPreorder || variant.stock >= quantity;
}

export class CartService {
  /**
   * Create a new cart
   */
  async createCart(): Promise<{ id: string; cartId: string }> {
    const cart = await prisma.cart.create({
      data: {
        cartId: generateCartId(),
      },
      select: {
        id: true,
        cartId: true,
      },
    });

    return cart;
  }

  /**
   * Get cart by cartId (public UUID)
   */
  async getCart(cartId: string): Promise<CartWithItems> {
    const cart = await prisma.cart.findUnique({
      where: { cartId },
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true,
                active: true,
                isPreorder: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                stock: true,
                active: true,
                supplierId: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { url: true, isPrimary: true },
                },
                supplier: {
                  select: {
                    id: true,
                    businessName: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    return cart as CartWithItems;
  }

  /**
   * Get or create cart
   */
  async getOrCreateCart(cartId?: string): Promise<CartWithItems> {
    if (cartId) {
      try {
        return await this.getCart(cartId);
      } catch {
        // Cart not found, create new one
      }
    }

    const newCart = await this.createCart();
    return this.getCart(newCart.cartId);
  }

  /**
   * Add item to cart
   */
  async addItem(cartId: string, productId: string, quantity: number, variantId?: string) {
    // Get the cart
    const cart = await prisma.cart.findUnique({
      where: { cartId },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    // Get the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    if (!product.active) {
      throw new AppError('Product is not available', 400);
    }

    // Resolve the variant. Callers that don't specify one (simple products,
    // or older clients) get the product's default.
    const variant = variantId
      ? await prisma.productVariant.findFirst({ where: { id: variantId, productId } })
      : await prisma.productVariant.findFirst({
          where: { productId, active: true },
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
        });

    if (!variant) {
      throw new NotFoundError('Product variant');
    }

    if (!variant.active) {
      throw new AppError('This option is not available', 400);
    }

    if (!canOrder(variant, quantity)) {
      throw new AppError(`Only ${variant.stock} items available in stock`, 400);
    }

    // Check if this variant is already in the cart
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: variant.id,
        },
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;

      if (!canOrder(variant, newQuantity)) {
        throw new AppError(`Only ${variant.stock} items available in stock`, 400);
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          snapshotPrice: variant.price,
          snapshotName: product.name,
          snapshotVariantName: variant.name,
        },
      });
    } else {
      // Create new item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          variantId: variant.id,
          quantity,
          snapshotPrice: variant.price,
          snapshotName: product.name,
          snapshotVariantName: variant.name,
          currency: product.currency,
        },
      });
    }

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    return this.getCart(cartId);
  }

  /**
   * Update cart item quantity
   */
  async updateItem(cartId: string, itemId: string, quantity: number) {
    const cart = await prisma.cart.findUnique({
      where: { cartId },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: { product: true, variant: true },
    });

    if (!item) {
      throw new NotFoundError('Cart item');
    }

    if (!canOrder(item.variant, quantity)) {
      throw new AppError(`Only ${item.variant.stock} items available in stock`, 400);
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity,
        snapshotPrice: item.variant.price,
        snapshotName: item.product.name,
        snapshotVariantName: item.variant.name,
      },
    });

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    return this.getCart(cartId);
  }

  /**
   * Remove item from cart
   */
  async removeItem(cartId: string, itemId: string) {
    const cart = await prisma.cart.findUnique({
      where: { cartId },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    const item = await prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new NotFoundError('Cart item');
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    return this.getCart(cartId);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(cartId: string) {
    const cart = await prisma.cart.findUnique({
      where: { cartId },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Update cart timestamp
    await prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    return this.getCart(cartId);
  }

  /**
   * Delete cart entirely
   */
  async deleteCart(cartId: string) {
    const cart = await prisma.cart.findUnique({
      where: { cartId },
    });

    if (!cart) {
      throw new NotFoundError('Cart');
    }

    await prisma.cart.delete({
      where: { id: cart.id },
    });

    return { success: true };
  }

  /**
   * Calculate cart totals
   */
  calculateCartTotals(cart: CartWithItems, deliveryFee = 0) {
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.snapshotPrice) * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // Group items by supplier
    const itemsBySupplier = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const supplierId = item.product.supplierId || 'platform';
      const existing = itemsBySupplier.get(supplierId) || [];
      existing.push(item);
      itemsBySupplier.set(supplierId, existing);
    }

    const supplierGroups = Array.from(itemsBySupplier.entries()).map(([supplierId, items]) => {
      const firstItem = items[0];
      const supplier = supplierId === 'platform'
        ? { id: 'platform', businessName: 'Platform', slug: 'platform' }
        : firstItem.product.supplier;

      return {
        supplierId,
        supplier,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.snapshotName,
          variantName: item.snapshotVariantName,
          price: Number(item.snapshotPrice),
          quantity: item.quantity,
          total: Number(item.snapshotPrice) * item.quantity,
          currency: item.currency,
          variant: item.variant,
          product: item.product,
        })),
        subtotal: items.reduce((sum, item) => sum + Number(item.snapshotPrice) * item.quantity, 0),
      };
    });

    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      itemCount,
      supplierCount: itemsBySupplier.size,
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        name: item.snapshotName,
        variantName: item.snapshotVariantName,
        price: Number(item.snapshotPrice),
        quantity: item.quantity,
        total: Number(item.snapshotPrice) * item.quantity,
        currency: item.currency,
        variant: item.variant,
        product: item.product,
      })),
      supplierGroups,
    };
  }

  /**
   * Validate cart for checkout
   */
  async validateCartForCheckout(cartId: string) {
    const cart = await this.getCart(cartId);

    if (cart.items.length === 0) {
      throw new AppError('Cart is empty', 400);
    }

    const errors: string[] = [];

    for (const item of cart.items) {
      const label = item.snapshotVariantName
        ? `${item.snapshotName} (${item.snapshotVariantName})`
        : item.snapshotName;

      if (!item.product.active || !item.variant.active) {
        errors.push(`${label} is no longer available`);
      }

      // Preorder variants intentionally bypass the stock check.
      if (!canOrder(item.variant, item.quantity)) {
        errors.push(
          `${label}: only ${item.variant.stock} available (requested ${item.quantity})`
        );
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Cart validation failed: ${errors.join('; ')}`, 400);
    }

    return cart;
  }
}

export const cartService = new CartService();
