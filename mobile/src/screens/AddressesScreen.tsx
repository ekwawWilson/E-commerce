import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerStore } from '../stores/customer';
import { RootStackParamList, CustomerAddress } from '../types';
import { colors, spacing, fontSize } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function AddressesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { customer, refreshProfile, deleteAddress, updateAddress, isLoading } = useCustomerStore();

  useEffect(() => {
    refreshProfile();
  }, []);

  const addresses = customer?.addresses || [];

  const handleSetDefault = async (addressId: string) => {
    try {
      await updateAddress(addressId, { isDefault: true });
    } catch (error) {
      Alert.alert('Error', 'Failed to set default address');
    }
  };

  const handleDelete = (address: CustomerAddress) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${address.label || address.address}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(address.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const renderAddress = ({ item }: { item: CustomerAddress }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressLabelContainer}>
          {item.label && (
            <View style={styles.labelBadge}>
              <Ionicons
                name={item.label === 'Home' ? 'home' : item.label === 'Work' ? 'business' : 'location'}
                size={12}
                color={colors.white}
              />
              <Text style={styles.labelBadgeText}>{item.label}</Text>
            </View>
          )}
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>
        <View style={styles.addressActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddAddress', { addressId: item.id })}
          >
            <Ionicons name="pencil" size={16} color={colors.gray500} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.addressBody}>
        <Text style={styles.recipientName}>{item.name}</Text>
        <Text style={styles.addressText}>{item.address}</Text>
        <Text style={styles.addressText}>
          {item.city}{item.region ? `, ${item.region}` : ''}
        </Text>
        {item.landmark && (
          <Text style={styles.landmarkText}>Landmark: {item.landmark}</Text>
        )}
        <Text style={styles.phoneText}>{item.phone}</Text>
      </View>

      {!item.isDefault && (
        <TouchableOpacity
          style={styles.setDefaultButton}
          onPress={() => handleSetDefault(item.id)}
        >
          <Text style={styles.setDefaultText}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="location-outline" size={60} color={colors.gray300} />
      <Text style={styles.emptyTitle}>No Addresses Yet</Text>
      <Text style={styles.emptySubtitle}>
        Add delivery addresses for faster checkout
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => navigation.navigate('AddAddress', {})}
      >
        <Text style={styles.addFirstButtonText}>ADD YOUR FIRST ADDRESS</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isLoading && addresses.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
        </View>
      ) : (
        <FlatList
          data={addresses}
          renderItem={renderAddress}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            addresses.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {addresses.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddAddress', {})}
          >
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={styles.addButtonText}>ADD NEW ADDRESS</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  addressCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  addressLabelContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  labelBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  addressActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  addressBody: {
    gap: 4,
  },
  recipientName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    lineHeight: 20,
  },
  landmarkText: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    fontStyle: 'italic',
  },
  phoneText: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  setDefaultButton: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  setDefaultText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
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
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  addFirstButton: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 4,
    marginTop: spacing.xl,
  },
  addFirstButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  addButton: {
    backgroundColor: colors.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 4,
  },
  addButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
