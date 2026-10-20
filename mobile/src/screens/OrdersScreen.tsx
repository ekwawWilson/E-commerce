import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerStore } from '../stores/customer';
import { RootStackParamList, Order } from '../types';
import { colors, spacing, fontSize, formatPrice } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const API_BASE_URL = 'http://192.168.0.8:4000/api';

export function OrdersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { token, isAuthenticated } = useCustomerStore();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: ordersData,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ['orders', token],
    queryFn: async () => {
      console.log('====== ORDERS API DEBUG ======');
      console.log('Token (first 20 chars):', token?.substring(0, 20) + '...');
      console.log('isAuthenticated:', isAuthenticated);
      console.log('Fetching from:', `${API_BASE_URL}/customers/orders`);

      const response = await fetch(`${API_BASE_URL}/customers/orders`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Full API response:', JSON.stringify(data, null, 2));
      console.log('====== END ORDERS DEBUG ======');
      return data;
    },
    enabled: isAuthenticated && !!token,
  });

  // Handle paginated response - data is the array of orders
  const orders: Order[] = ordersData?.data || [];

  // Log for debugging
  console.log('Orders array:', orders);
  console.log('Orders count:', orders.length);

  if (error) {
    console.error('Orders fetch error:', error);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'DELIVERED':
        return 'checkmark-circle';
      case 'IN_TRANSIT':
        return 'car';
      case 'PICKED_UP':
        return 'cube';
      case 'CANCELLED':
        return 'close-circle';
      default:
        return 'time';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.deliveryStatus) + '15' }]}>
          <Ionicons
            name={getStatusIcon(item.deliveryStatus)}
            size={14}
            color={getStatusColor(item.deliveryStatus)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.deliveryStatus) }]}>
            {item.deliveryStatus.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        {item.itemsSnapshot?.slice(0, 2).map((orderItem, index) => (
          <Text key={index} style={styles.itemText} numberOfLines={1}>
            {orderItem.quantity}x {orderItem.name}
          </Text>
        ))}
        {item.itemsSnapshot && item.itemsSnapshot.length > 2 && (
          <Text style={styles.moreItems}>
            +{item.itemsSnapshot.length - 2} more items
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatPrice(item.total)}</Text>
      </View>

      <View style={styles.viewDetails}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.blueBlack} />
      </View>
    </TouchableOpacity>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.gray300} />
          <Text style={styles.emptyTitle}>Sign in to view orders</Text>
          <Text style={styles.emptySubtitle}>
            Please sign in to see your order history
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login', {})}
          >
            <Text style={styles.signInButtonText}>SIGN IN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.gray300} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              When you place orders, they will appear here
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate('MainTabs')}
            >
              <Text style={styles.shopButtonText}>START SHOPPING</Text>
            </TouchableOpacity>
          </View>
        }
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
    padding: spacing.md,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderNumber: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  orderDate: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    gap: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderItems: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  itemText: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    marginBottom: 4,
  },
  moreItems: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  totalAmount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  viewDetailsText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.blueBlack,
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
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  shopButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 4,
    marginTop: spacing.lg,
  },
  shopButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
  signInButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 4,
    marginTop: spacing.lg,
  },
  signInButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
