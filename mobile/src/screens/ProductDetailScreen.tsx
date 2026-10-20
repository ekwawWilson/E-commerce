import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useCartStore } from '../stores/cart';
import { RootStackParamList, ProductImage } from '../types';
import { colors, spacing, fontSize, formatPrice, FREE_DELIVERY_THRESHOLD } from '../theme';

const { width } = Dimensions.get('window');

type RouteProps = RouteProp<RootStackParamList, 'ProductDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ProductDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { slug } = route.params;
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const { addItem } = useCartStore();

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.getProduct(slug),
  });

  const product = productData?.data;

  const handleAddToCart = async () => {
    if (!product) return;

    setIsAdding(true);
    try {
      await addItem(product.id, quantity);
      Alert.alert(
        'Added to Cart',
        `${product.name} has been added to your cart.`,
        [
          { text: 'Continue Shopping', style: 'cancel' },
          {
            text: 'View Cart',
            onPress: () => navigation.navigate('MainTabs'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(q => q + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = product.images || [];
  const primaryImage = images.find((img: ProductImage) => img.isPrimary) || images[0];
  const hasDiscount = product.comparePrice && Number(product.comparePrice) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
    : 0;
  const isOutOfStock = product.stock <= 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {images.length > 0 ? (
            <Image
              source={{ uri: images[selectedImageIndex]?.url || primaryImage?.url }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.mainImage, styles.placeholder]} />
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
                <Text style={[styles.badgeText, styles.saleBadgeText]}>
                  -{discountPercent}%
                </Text>
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

        {/* Image Thumbnails */}
        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailContainer}
          >
            {images.map((image: ProductImage, index: number) => (
              <TouchableOpacity
                key={image.id}
                onPress={() => setSelectedImageIndex(index)}
                style={[
                  styles.thumbnail,
                  selectedImageIndex === index && styles.thumbnailActive,
                ]}
              >
                <Image
                  source={{ uri: image.url }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Product Info */}
        <View style={styles.infoContainer}>
          {/* Category */}
          {product.categories && product.categories.length > 0 && (
            <Text style={styles.category}>
              {product.categories[0]?.category?.name || 'Fashion'}
            </Text>
          )}

          {/* Name */}
          <Text style={styles.name}>{product.name}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>
                {formatPrice(product.comparePrice!)}
              </Text>
            )}
          </View>

          {/* Stock Info */}
          {!isOutOfStock && product.stock <= 5 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>
                Only {product.stock} left in stock
              </Text>
            </View>
          )}

          {/* Delivery Info */}
          <View style={styles.deliveryInfo}>
            <Ionicons name="car-outline" size={20} color={colors.gray500} />
            <Text style={styles.deliveryText}>
              Free delivery on orders over {formatPrice(FREE_DELIVERY_THRESHOLD)}
            </Text>
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DESCRIPTION</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Specifications */}
          {product.specifications && product.specifications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DETAILS</Text>
              {product.specifications.map((spec) => (
                <View key={spec.id} style={styles.specRow}>
                  <Text style={styles.specKey}>{spec.key}</Text>
                  <Text style={styles.specValue}>{spec.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Supplier Info */}
          {product.supplier && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SELLER</Text>
              <Text style={styles.supplierName}>{product.supplier.businessName}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        {!isOutOfStock ? (
          <>
            {/* Quantity Selector */}
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={quantity <= 1 ? colors.gray300 : colors.black}
                />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={incrementQuantity}
                disabled={quantity >= product.stock}
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={quantity >= product.stock ? colors.gray300 : colors.black}
                />
              </TouchableOpacity>
            </View>

            {/* Add to Cart Button */}
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={handleAddToCart}
              disabled={isAdding}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.addToCartText}>ADD TO BAG</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.soldOutBar}>
            <Text style={styles.soldOutText}>SOLD OUT</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.gray500,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.black,
  },
  backButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 2,
  },
  imageContainer: {
    width: width,
    aspectRatio: 3 / 4,
    backgroundColor: colors.gray100,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.gray200,
  },
  badgeContainer: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  badge: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  saleBadge: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.black,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 1,
  },
  saleBadgeText: {
    color: colors.black,
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: fontSize.lg,
    letterSpacing: 4,
    color: colors.gray500,
  },
  thumbnailContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  thumbnail: {
    width: 60,
    height: 80,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  thumbnailActive: {
    borderColor: colors.black,
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    padding: spacing.lg,
  },
  category: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.gray400,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '300',
    color: colors.black,
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  price: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.black,
  },
  comparePrice: {
    fontSize: fontSize.md,
    color: colors.gray400,
    textDecorationLine: 'line-through',
  },
  lowStockBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  lowStockText: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.lg,
  },
  deliveryText: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  section: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.gray400,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    lineHeight: 22,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  specKey: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  specValue: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  supplierName: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  actionBar: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  quantityButton: {
    width: 44,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    width: 40,
    textAlign: 'center',
    fontSize: fontSize.md,
    color: colors.black,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  addToCartText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    fontWeight: '500',
  },
  soldOutBar: {
    flex: 1,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  soldOutText: {
    color: colors.gray500,
    fontSize: fontSize.xs,
    letterSpacing: 3,
  },
});
