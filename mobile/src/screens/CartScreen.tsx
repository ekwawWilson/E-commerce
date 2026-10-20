import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../stores/cart';
import { CartItem, RootStackParamList } from '../types';
import { colors, spacing, fontSize, formatPrice, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function CartScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { items, subtotal, itemCount, isLoading, fetchCart, updateQuantity, removeItem } = useCartStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      await updateQuantity(itemId, newQuantity);
    } catch (error) {
      Alert.alert('Error', 'Failed to update quantity. Please try again.');
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove ${item.name} from your bag?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeItem(item.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = freeDelivery ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const imageUrl = item.product?.images?.find(img => img.isPrimary)?.url || item.product?.images?.[0]?.url;

    return (
      <View style={styles.cartItem}>
        {/* Product Image */}
        <View style={styles.itemImageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.itemImage, styles.placeholder]} />
          )}
        </View>

        {/* Item Details */}
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
            <TouchableOpacity
              onPress={() => handleRemoveItem(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.gray400} />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>

          {/* Quantity Controls */}
          <View style={styles.quantityRow}>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
              >
                <Ionicons name="remove" size={16} color={colors.black} />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                disabled={item.product && item.quantity >= item.product.stock}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={item.product && item.quantity >= item.product.stock ? colors.gray300 : colors.black}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.itemTotal}>{formatPrice(item.total)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SHOPPING BAG</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="bag-outline" size={64} color={colors.gray300} />
          <Text style={styles.emptyTitle}>Your bag is empty</Text>
          <Text style={styles.emptyText}>
            Discover our collection and add items to your bag
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.shopButtonText}>CONTINUE SHOPPING</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SHOPPING BAG</Text>
        <Text style={styles.itemCountText}>{itemCount} items</Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Summary */}
      <View style={styles.summaryContainer}>
        {/* Free Delivery Progress */}
        {!freeDelivery && (
          <View style={styles.deliveryProgressContainer}>
            <Text style={styles.deliveryProgressText}>
              Add {formatPrice(FREE_DELIVERY_THRESHOLD - subtotal)} more for free delivery
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((subtotal / FREE_DELIVERY_THRESHOLD) * 100, 100)}%` },
                ]}
              />
            </View>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery</Text>
          <Text style={[styles.summaryValue, freeDelivery && styles.freeDelivery]}>
            {freeDelivery ? 'FREE' : formatPrice(deliveryFee)}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutButtonText}>PROCEED TO CHECKOUT</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerTitle: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.black,
  },
  itemCountText: {
    fontSize: fontSize.xs,
    color: colors.gray400,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  cartItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  itemImageContainer: {
    width: 100,
    height: 130,
    backgroundColor: colors.gray100,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.gray200,
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  itemName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.black,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  itemPrice: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginBottom: spacing.md,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    width: 32,
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.black,
  },
  itemTotal: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    color: colors.black,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  shopButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  shopButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 2,
  },
  summaryContainer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  deliveryProgressContainer: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.gray100,
  },
  deliveryProgressText: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray200,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.black,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  freeDelivery: {
    color: colors.gray500,
  },
  totalRow: {
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.black,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.black,
  },
  checkoutButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    fontWeight: '500',
  },
});
