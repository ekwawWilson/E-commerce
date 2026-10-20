import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerStore } from '../stores/customer';
import { RootStackParamList, Order } from '../types';
import { colors, spacing, fontSize, formatPrice } from '../theme';

type RouteType = RouteProp<RootStackParamList, 'OrderDetail'>;

const API_BASE_URL = 'http://192.168.0.8:4000/api';

export function OrderDetailScreen() {
  const route = useRoute<RouteType>();
  const { orderId } = route.params;
  const { token } = useCustomerStore();

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/customers/orders/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      return data;
    },
    enabled: !!token && !!orderId,
  });

  const order: Order | null = orderData?.data || null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return colors.success;
      case 'IN_TRANSIT':
      case 'PICKED_UP':
        return colors.info;
      case 'CANCELLED':
        return colors.error;
      default:
        return colors.gray500;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.gray300} />
          <Text style={styles.emptyTitle}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <View style={styles.statusSection}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(order.deliveryStatus) }]} />
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>
              {order.deliveryStatus.replace('_', ' ')}
            </Text>
            <Text style={styles.statusDate}>
              {order.deliveredAt
                ? `Delivered on ${formatDate(order.deliveredAt)}`
                : `Ordered on ${formatDate(order.createdAt)}`}
            </Text>
          </View>
        </View>

        {/* Order Number */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ORDER DETAILS</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Number</Text>
            <Text style={styles.infoValue}>{order.orderNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}>
              {order.paymentMethod === 'MOMO' ? 'Mobile Money' : 'Cash on Delivery'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status</Text>
            <Text style={[
              styles.infoValue,
              { color: order.paymentStatus === 'PAID' ? colors.success : colors.warning }
            ]}>
              {order.paymentStatus}
            </Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
          <View style={styles.addressCard}>
            <Ionicons name="location-outline" size={20} color={colors.black} />
            <View style={styles.addressContent}>
              <Text style={styles.addressName}>{order.customerName}</Text>
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
              {order.deliveryCity && (
                <Text style={styles.addressText}>
                  {order.deliveryCity}{order.deliveryRegion ? `, ${order.deliveryRegion}` : ''}
                </Text>
              )}
              <Text style={styles.addressText}>{order.customerPhone}</Text>
              {order.deliveryNotes && (
                <Text style={styles.addressNotes}>Note: {order.deliveryNotes}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ITEMS ({order.itemsSnapshot?.length || 0})</Text>
          {order.itemsSnapshot?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemImageContainer}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemPlaceholder}>
                    <Ionicons name="cube-outline" size={24} color={colors.gray400} />
                  </View>
                )}
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>
              {order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'FREE'}
            </Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                -{formatPrice(order.discount)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.supportSection}>
          <Ionicons name="help-circle-outline" size={24} color={colors.gray500} />
          <Text style={styles.supportText}>
            Need help with this order? Contact our support team.
          </Text>
        </View>
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
    marginTop: spacing.lg,
  },
  statusSection: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
    textTransform: 'capitalize',
  },
  statusDate: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 4,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray400,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
  },
  addressCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: 8,
  },
  addressContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  addressName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
    marginBottom: 4,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    lineHeight: 20,
  },
  addressNotes: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.gray50,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
  },
  itemQuantity: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 4,
  },
  itemPrice: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.black,
    alignSelf: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.black,
  },
  supportSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  supportText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
});
