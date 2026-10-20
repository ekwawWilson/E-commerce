import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Product } from '../types';
import { colors, spacing, fontSize, formatPrice } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;
// Fixed card height for consistent Amazon-style grid layout
const CARD_HEIGHT = 280;
const IMAGE_HEIGHT = 150;
const INFO_HEIGHT = CARD_HEIGHT - IMAGE_HEIGHT;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
    : 0;
  const isOutOfStock = product.stock <= 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Image Container - Fixed height like Amazon */}
      <View style={styles.imageContainer}>
        {primaryImage ? (
          <Image
            source={{ uri: primaryImage.url }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}

        {/* Badges */}
        <View style={styles.badgeContainer}>
          {product.featured && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NEW</Text>
            </View>
          )}
          {hasDiscount && (
            <View style={[styles.badge, styles.saleBadge]}>
              <Text style={[styles.badgeText, styles.saleBadgeText]}>-{discountPercent}%</Text>
            </View>
          )}
        </View>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>SOLD OUT</Text>
          </View>
        )}
      </View>

      {/* Product Info - Fixed height section */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price section pinned to bottom */}
        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>
                {formatPrice(product.comparePrice!)}
              </Text>
            )}
          </View>

          {!isOutOfStock && product.stock <= 5 ? (
            <Text style={styles.lowStock}>Only {product.stock} left</Text>
          ) : (
            <Text style={styles.inStock}>In Stock</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: colors.white,
    position: 'relative',
    padding: spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.gray100,
  },
  badgeContainer: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  badge: {
    backgroundColor: colors.blueBlack,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  saleBadge: {
    backgroundColor: colors.black,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  saleBadgeText: {
    color: colors.white,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: fontSize.sm,
    letterSpacing: 2,
    color: colors.gray600,
    fontWeight: '600',
  },
  info: {
    height: INFO_HEIGHT,
    padding: spacing.sm,
    paddingTop: spacing.xs,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: fontSize.sm,
    color: colors.black,
    lineHeight: 18,
    fontWeight: '400',
  },
  priceSection: {
    marginTop: 'auto',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  price: {
    fontSize: fontSize.lg,
    fontWeight: '400',
    color: colors.black,
  },
  comparePrice: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    textDecorationLine: 'line-through',
    marginLeft: spacing.sm,
  },
  lowStock: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '400',
    marginTop: 2,
  },
  inStock: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '400',
    marginTop: 2,
  },
});
