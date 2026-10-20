import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { Order } from '../types';
import { colors, spacing, fontSize, formatPrice } from '../theme';

const ORDER_STATUSES = [
  { key: 'PENDING', label: 'Order Placed', icon: 'receipt-outline' },
  { key: 'PICKED_UP', label: 'Picked Up', icon: 'cube-outline' },
  { key: 'IN_TRANSIT', label: 'In Transit', icon: 'car-outline' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'checkmark-circle-outline' },
];

export function TrackOrderScreen() {
  const [orderNumber, setOrderNumber] = useState('');
  // Phone or email used at checkout; required so others can't look orders up
  const [contact, setContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async () => {
    if (!orderNumber.trim() || !contact.trim()) {
      Alert.alert('Error', 'Please enter your order number and the phone number or email used at checkout');
      return;
    }

    setIsLoading(true);
    setNotFound(false);

    try {
      const response = await api.trackOrder(orderNumber.trim(), contact.trim());

      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        setNotFound(true);
        setOrder(null);
      }
    } catch (error) {
      setNotFound(true);
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIndex = (status: string) => {
    return ORDER_STATUSES.findIndex(s => s.key === status);
  };

  const currentStatusIndex = order ? getStatusIndex(order.deliveryStatus) : -1;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TRACK ORDER</Text>
          <Text style={styles.headerSubtitle}>
            Enter your order number and the phone or email used at checkout
          </Text>
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="search-outline" size={20} color={colors.gray400} />
            <TextInput
              style={styles.input}
              placeholder="Enter order number (e.g., ORD-XXXXXX)"
              placeholderTextColor={colors.gray400}
              value={orderNumber}
              onChangeText={setOrderNumber}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color={colors.gray400} />
            <TextInput
              style={styles.input}
              placeholder="Phone number or email"
              placeholderTextColor={colors.gray400}
              value={contact}
              onChangeText={setContact}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <TouchableOpacity
            style={[styles.trackButton, isLoading && styles.trackButtonDisabled]}
            onPress={handleTrack}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.trackButtonText}>TRACK</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Not Found */}
        {notFound && (
          <View style={styles.notFoundContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray300} />
            <Text style={styles.notFoundTitle}>Order Not Found</Text>
            <Text style={styles.notFoundText}>
              Please check your order number and try again
            </Text>
          </View>
        )}

        {/* Order Details */}
        {order && (
          <View style={styles.orderContainer}>
            {/* Order Header */}
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderNumberLabel}>ORDER NUMBER</Text>
                <Text style={styles.orderNumberValue}>{order.orderNumber}</Text>
              </View>
              <View style={styles.orderDateContainer}>
                <Text style={styles.orderDateLabel}>PLACED ON</Text>
                <Text style={styles.orderDateValue}>{formatDate(order.createdAt)}</Text>
              </View>
            </View>

            {/* Status Timeline */}
            <View style={styles.timelineContainer}>
              <Text style={styles.sectionTitle}>DELIVERY STATUS</Text>

              {order.deliveryStatus === 'CANCELLED' ? (
                <View style={styles.cancelledContainer}>
                  <Ionicons name="close-circle" size={48} color={colors.gray400} />
                  <Text style={styles.cancelledText}>ORDER CANCELLED</Text>
                </View>
              ) : (
                <View style={styles.timeline}>
                  {ORDER_STATUSES.map((status, index) => {
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const isLast = index === ORDER_STATUSES.length - 1;

                    return (
                      <View key={status.key} style={styles.timelineItem}>
                        <View style={styles.timelineLeft}>
                          <View
                            style={[
                              styles.timelineIcon,
                              isCompleted && styles.timelineIconCompleted,
                              isCurrent && styles.timelineIconCurrent,
                            ]}
                          >
                            <Ionicons
                              name={status.icon as any}
                              size={20}
                              color={isCompleted ? colors.white : colors.gray400}
                            />
                          </View>
                          {!isLast && (
                            <View
                              style={[
                                styles.timelineLine,
                                isCompleted && index < currentStatusIndex && styles.timelineLineCompleted,
                              ]}
                            />
                          )}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text
                            style={[
                              styles.timelineLabel,
                              isCompleted && styles.timelineLabelCompleted,
                            ]}
                          >
                            {status.label}
                          </Text>
                          {isCurrent && (
                            <Text style={styles.currentStatus}>Current status</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Payment Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PAYMENT</Text>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Method</Text>
                <Text style={styles.paymentValue}>
                  {order.paymentMethod === 'MOMO' ? 'Mobile Money' : 'Cash on Delivery'}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Status</Text>
                <View
                  style={[
                    styles.paymentBadge,
                    order.paymentStatus === 'PAID' && styles.paymentBadgePaid,
                    order.paymentStatus === 'FAILED' && styles.paymentBadgeFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentBadgeText,
                      order.paymentStatus === 'PAID' && styles.paymentBadgeTextPaid,
                    ]}
                  >
                    {order.paymentStatus}
                  </Text>
                </View>
              </View>
            </View>

            {/* Delivery Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
              <Text style={styles.addressText}>{order.customerName}</Text>
              <Text style={styles.addressText}>{order.customerPhone}</Text>
              <Text style={styles.addressText}>{order.deliveryAddress}</Text>
              {order.deliveryNotes && (
                <Text style={styles.notesText}>Note: {order.deliveryNotes}</Text>
              )}
            </View>

            {/* Order Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
              {order.itemsSnapshot.map((item, index) => (
                <View key={index} style={styles.orderItem}>
                  <Text style={styles.orderItemName} numberOfLines={1}>
                    {item.name} × {item.quantity}
                  </Text>
                  <Text style={styles.orderItemPrice}>
                    {formatPrice(item.price * item.quantity)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalSection}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatPrice(order.subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Delivery</Text>
                  <Text style={styles.totalValue}>{formatPrice(order.deliveryFee)}</Text>
                </View>
                {order.discount > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Discount</Text>
                    <Text style={styles.totalValue}>-{formatPrice(order.discount)}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total</Text>
                  <Text style={styles.grandTotalValue}>{formatPrice(order.total)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Empty State */}
        {!order && !notFound && !isLoading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.gray200} />
            <Text style={styles.emptyText}>
              Enter your order number above to track your delivery
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerTitle: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  searchContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.black,
  },
  trackButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  trackButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  trackButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    fontWeight: '500',
  },
  notFoundContainer: {
    alignItems: 'center',
    padding: spacing.xl * 2,
  },
  notFoundTitle: {
    fontSize: fontSize.lg,
    color: colors.black,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  notFoundText: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl * 2,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  orderContainer: {
    paddingBottom: spacing.xl,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.gray100,
  },
  orderNumberLabel: {
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.gray500,
    marginBottom: spacing.xs,
  },
  orderNumberValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.black,
  },
  orderDateContainer: {
    alignItems: 'flex-end',
  },
  orderDateLabel: {
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.gray500,
    marginBottom: spacing.xs,
  },
  orderDateValue: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  timelineContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.gray400,
    marginBottom: spacing.lg,
  },
  cancelledContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  cancelledText: {
    fontSize: fontSize.md,
    letterSpacing: 2,
    color: colors.gray500,
    marginTop: spacing.md,
  },
  timeline: {
    paddingLeft: spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 40,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  timelineIconCompleted: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  timelineIconCurrent: {
    borderWidth: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.xs,
  },
  timelineLineCompleted: {
    backgroundColor: colors.black,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingTop: spacing.sm,
  },
  timelineLabel: {
    fontSize: fontSize.sm,
    color: colors.gray400,
  },
  timelineLabelCompleted: {
    color: colors.black,
    fontWeight: '500',
  },
  currentStatus: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginTop: 2,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  paymentLabel: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  paymentValue: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  paymentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.gray200,
  },
  paymentBadgePaid: {
    backgroundColor: colors.black,
  },
  paymentBadgeFailed: {
    backgroundColor: colors.gray400,
  },
  paymentBadgeText: {
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.gray600,
  },
  paymentBadgeTextPaid: {
    color: colors.white,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  orderItemName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.black,
    marginRight: spacing.md,
  },
  orderItemPrice: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  totalSection: {
    marginTop: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  totalValue: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  grandTotalRow: {
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  grandTotalLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.black,
  },
  grandTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.black,
  },
});
