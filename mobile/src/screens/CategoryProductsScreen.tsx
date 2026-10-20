import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useCartStore } from '../stores/cart';
import { Product, RootStackParamList } from '../types';
import { colors, spacing, fontSize, formatPrice } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'CategoryProducts'>;

export function CategoryProductsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { categorySlug } = route.params;
  const [refreshing, setRefreshing] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const { addItem } = useCartStore();

  const {
    data: productsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['products', categorySlug],
    queryFn: () => api.getProducts({ category: categorySlug }),
  });

  // API returns data directly as array
  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : (productsData?.data?.products || []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { slug: product.slug });
  };

  const handleAddToCart = async (product: Product) => {
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock.');
      return;
    }

    try {
      setAddingToCart(product.id);
      await addItem(product.id, 1);
      Alert.alert('Added to Cart', `${product.name} has been added to your cart.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart. Please try again.');
    } finally {
      setAddingToCart(null);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const primaryImage = item.images?.find((img) => img.isPrimary) || item.images?.[0];
    const hasDiscount = item.comparePrice && Number(item.comparePrice) > Number(item.price);
    const discountPercent = hasDiscount
      ? Math.round((1 - Number(item.price) / Number(item.comparePrice)) * 100)
      : 0;
    const isOutOfStock = item.stock <= 0;
    const isAdding = addingToCart === item.id;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {primaryImage ? (
            <Image
              source={{ uri: primaryImage.url }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="cube-outline" size={40} color={colors.gray400} />
            </View>
          )}
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discountPercent}%</Text>
            </View>
          )}
          {isOutOfStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        {/* Product Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Price Section */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatPrice(item.price)}</Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>{formatPrice(item.comparePrice!)}</Text>
            )}
          </View>

          {/* Stock Status */}
          {!isOutOfStock && item.stock <= 5 ? (
            <Text style={styles.lowStock}>Only {item.stock} left in stock</Text>
          ) : !isOutOfStock ? (
            <Text style={styles.inStock}>In Stock</Text>
          ) : null}

          {/* Delivery Info */}
          <View style={styles.deliveryInfo}>
            <Ionicons name="car-outline" size={14} color={colors.gray500} />
            <Text style={styles.deliveryText}>Free delivery available</Text>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            style={[
              styles.addToCartButton,
              isOutOfStock && styles.addToCartButtonDisabled,
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={isOutOfStock || isAdding}
            activeOpacity={0.8}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons
                  name="cart-outline"
                  size={16}
                  color={isOutOfStock ? colors.gray400 : colors.white}
                />
                <Text
                  style={[
                    styles.addToCartText,
                    isOutOfStock && styles.addToCartTextDisabled,
                  ]}
                >
                  {isOutOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.resultsText}>
              {products.length} {products.length === 1 ? 'result' : 'results'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.gray300} />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              There are no products in this category yet
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  resultsText: {
    fontSize: fontSize.sm,
    color: colors.gray600,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
  },
  imageContainer: {
    width: 120,
    height: 120,
    backgroundColor: colors.gray50,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  discountBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.blueBlack,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 2,
  },
  discountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  outOfStockBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 1,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.black,
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  price: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.black,
  },
  comparePrice: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    textDecorationLine: 'line-through',
    marginLeft: spacing.sm,
  },
  lowStock: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  inStock: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginTop: spacing.xs,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  deliveryText: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginLeft: spacing.xs,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blueBlack,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 4,
    marginTop: spacing.sm,
  },
  addToCartButtonDisabled: {
    backgroundColor: colors.gray200,
  },
  addToCartText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.white,
    marginLeft: spacing.xs,
    letterSpacing: 0.5,
  },
  addToCartTextDisabled: {
    color: colors.gray500,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
