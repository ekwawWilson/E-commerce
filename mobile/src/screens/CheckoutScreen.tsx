import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore } from '../stores/cart';
import { useCustomerStore } from '../stores/customer';
import { api, ApiError } from '../lib/api';
import { RootStackParamList, CheckoutData, CustomerAddress } from '../types';
import { colors, spacing, fontSize, formatPrice, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from '../theme';

const CART_ID_KEY = 'cart_id';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type PaymentMethod = 'MOMO' | 'COD';

export function CheckoutScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { items, subtotal, clearCart } = useCartStore();
  const { customer, isAuthenticated, loadAuth } = useCustomerStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOMO');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    deliveryAddress: '',
    deliveryCity: '',
    deliveryNotes: '',
    momoPhoneNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = freeDelivery ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  const savedAddresses = customer?.addresses || [];
  const defaultAddress = savedAddresses.find(a => a.isDefault);

  // Load customer auth on mount and set defaults
  useEffect(() => {
    loadAuth();
  }, []);

  // Pre-fill form with customer data when authenticated
  useEffect(() => {
    if (isAuthenticated && customer) {
      setFormData(prev => ({
        ...prev,
        customerName: customer.name || prev.customerName,
        customerPhone: customer.phone && !customer.phone.startsWith('google_') ? customer.phone : prev.customerPhone,
        customerEmail: customer.email || prev.customerEmail,
        momoPhoneNumber: customer.phone && !customer.phone.startsWith('google_') ? customer.phone : prev.momoPhoneNumber,
      }));

      // Set default address if available
      if (defaultAddress && !useNewAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (savedAddresses.length > 0 && !useNewAddress) {
        setSelectedAddressId(savedAddresses[0].id);
      }

      // Set preferred payment method
      if (customer.preferredPaymentMethod) {
        setPaymentMethod(customer.preferredPaymentMethod);
      }
    }
  }, [isAuthenticated, customer]);

  const getSelectedAddress = (): CustomerAddress | undefined => {
    if (!selectedAddressId) return undefined;
    return savedAddresses.find(a => a.id === selectedAddressId);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const selectedAddress = getSelectedAddress();

    // For logged-in users with saved address selected
    if (isAuthenticated && selectedAddressId && !useNewAddress && selectedAddress) {
      // Use the address data from selected address
    } else {
      // Validate manual form input
      if (!formData.customerName.trim()) {
        newErrors.customerName = 'Full name is required';
      }

      if (!formData.customerPhone.trim()) {
        newErrors.customerPhone = 'Phone number is required';
      } else if (!/^[0-9]{9,}$/.test(formData.customerPhone.replace(/\s/g, ''))) {
        newErrors.customerPhone = 'Enter a valid phone number';
      }

      if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
        newErrors.customerEmail = 'Enter a valid email address';
      }

      if (!formData.deliveryAddress.trim()) {
        newErrors.deliveryAddress = 'Delivery address is required';
      }

      if (!formData.deliveryCity.trim()) {
        newErrors.deliveryCity = 'City is required';
      }
    }

    if (paymentMethod === 'MOMO' && !formData.momoPhoneNumber.trim()) {
      newErrors.momoPhoneNumber = 'Mobile money phone number is required';
    } else if (paymentMethod === 'MOMO' && !/^[0-9]{9,}$/.test(formData.momoPhoneNumber.replace(/\s/g, ''))) {
      newErrors.momoPhoneNumber = 'Enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const cartId = await AsyncStorage.getItem(CART_ID_KEY);

      if (!cartId) {
        Alert.alert('Error', 'Your cart is empty. Please add items before checkout.');
        setIsSubmitting(false);
        return;
      }

      const selectedAddress = getSelectedAddress();
      const usingSavedAddress = isAuthenticated && selectedAddressId && !useNewAddress && selectedAddress;

      const checkoutData: CheckoutData = {
        cartId,
        customerId: isAuthenticated && customer?.id ? customer.id : undefined, // Link order to customer
        customer: usingSavedAddress ? {
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          email: customer?.email || undefined,
          address: selectedAddress.address + (selectedAddress.landmark ? ` (${selectedAddress.landmark})` : ''),
          city: selectedAddress.city,
          region: selectedAddress.region,
          deliveryNotes: formData.deliveryNotes.trim() || undefined,
        } : {
          name: formData.customerName.trim(),
          phone: formData.customerPhone.trim(),
          email: formData.customerEmail.trim() || undefined,
          address: formData.deliveryAddress.trim(),
          city: formData.deliveryCity.trim(),
          deliveryNotes: formData.deliveryNotes.trim() || undefined,
        },
        paymentMethod,
        momoPhoneNumber: paymentMethod === 'MOMO' ? formData.momoPhoneNumber.trim() : undefined,
      };

      const response = await api.checkout(checkoutData);

      if (response.success && response.data) {
        await clearCart();

        if (paymentMethod === 'MOMO') {
          navigation.replace('Payment', { orderId: response.data.id, orderNumber: response.data.orderNumber });
        } else {
          navigation.replace('OrderConfirmation', { orderNumber: response.data.orderNumber });
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      if (error instanceof ApiError) {
        const errorMsg = error.errors?.length
          ? error.errors.join('\n')
          : error.message || 'Failed to place order. Please try again.';
        Alert.alert('Checkout Failed', errorMsg);
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSelectAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    setUseNewAddress(false);
  };

  const handleUseNewAddress = () => {
    setSelectedAddressId(null);
    setUseNewAddress(true);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
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
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Login Prompt for Guests */}
          {!isAuthenticated && (
            <TouchableOpacity
              style={styles.loginPrompt}
              onPress={() => navigation.navigate('Login', { returnTo: 'Checkout' })}
            >
              <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
              <View style={styles.loginPromptText}>
                <Text style={styles.loginPromptTitle}>Sign in for faster checkout</Text>
                <Text style={styles.loginPromptSubtitle}>Access saved addresses and order history</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          )}

          {/* Saved Addresses Section - For Authenticated Users */}
          {isAuthenticated && savedAddresses.length > 0 && !useNewAddress && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Addresses')}>
                  <Text style={styles.manageLink}>Manage</Text>
                </TouchableOpacity>
              </View>

              {savedAddresses.map((address) => (
                <TouchableOpacity
                  key={address.id}
                  style={[
                    styles.addressCard,
                    selectedAddressId === address.id && styles.addressCardSelected,
                  ]}
                  onPress={() => handleSelectAddress(address.id)}
                >
                  <View style={styles.addressRadio}>
                    <View style={styles.radioOuter}>
                      {selectedAddressId === address.id && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <View style={styles.addressContent}>
                    <View style={styles.addressHeader}>
                      <Text style={styles.addressName}>{address.name}</Text>
                      {address.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                      {address.label && (
                        <View style={styles.labelBadge}>
                          <Text style={styles.labelBadgeText}>{address.label}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addressPhone}>{address.phone}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {address.address}
                      {address.landmark && ` (${address.landmark})`}
                    </Text>
                    <Text style={styles.addressCity}>
                      {address.city}{address.region && `, ${address.region}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.addNewAddressButton}
                onPress={handleUseNewAddress}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.addNewAddressText}>Use a different address</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Manual Address Entry - For Guests or New Address */}
          {(!isAuthenticated || useNewAddress || savedAddresses.length === 0) && (
            <>
              {/* Contact Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={[styles.input, errors.customerName && styles.inputError]}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.gray400}
                    value={formData.customerName}
                    onChangeText={(value) => updateField('customerName', value)}
                    autoCapitalize="words"
                  />
                  {errors.customerName && (
                    <Text style={styles.errorText}>{errors.customerName}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={[styles.input, errors.customerPhone && styles.inputError]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={colors.gray400}
                    value={formData.customerPhone}
                    onChangeText={(value) => updateField('customerPhone', value)}
                    keyboardType="phone-pad"
                  />
                  {errors.customerPhone && (
                    <Text style={styles.errorText}>{errors.customerPhone}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email (Optional)</Text>
                  <TextInput
                    style={[styles.input, errors.customerEmail && styles.inputError]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.gray400}
                    value={formData.customerEmail}
                    onChangeText={(value) => updateField('customerEmail', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.customerEmail && (
                    <Text style={styles.errorText}>{errors.customerEmail}</Text>
                  )}
                </View>
              </View>

              {/* Delivery Address */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
                  {isAuthenticated && savedAddresses.length > 0 && (
                    <TouchableOpacity onPress={() => {
                      setUseNewAddress(false);
                      if (defaultAddress) {
                        setSelectedAddressId(defaultAddress.id);
                      } else if (savedAddresses.length > 0) {
                        setSelectedAddressId(savedAddresses[0].id);
                      }
                    }}>
                      <Text style={styles.manageLink}>Use saved</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, errors.deliveryAddress && styles.inputError]}
                    placeholder="Enter your delivery address"
                    placeholderTextColor={colors.gray400}
                    value={formData.deliveryAddress}
                    onChangeText={(value) => updateField('deliveryAddress', value)}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {errors.deliveryAddress && (
                    <Text style={styles.errorText}>{errors.deliveryAddress}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={[styles.input, errors.deliveryCity && styles.inputError]}
                    placeholder="Enter your city"
                    placeholderTextColor={colors.gray400}
                    value={formData.deliveryCity}
                    onChangeText={(value) => updateField('deliveryCity', value)}
                  />
                  {errors.deliveryCity && (
                    <Text style={styles.errorText}>{errors.deliveryCity}</Text>
                  )}
                </View>
              </View>
            </>
          )}

          {/* Delivery Notes - Always show */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DELIVERY NOTES</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special instructions for delivery"
                placeholderTextColor={colors.gray400}
                value={formData.deliveryNotes}
                onChangeText={(value) => updateField('deliveryNotes', value)}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'MOMO' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('MOMO')}
            >
              <View style={styles.paymentOptionContent}>
                <View style={styles.radioOuter}>
                  {paymentMethod === 'MOMO' && <View style={styles.radioInner} />}
                </View>
                <View>
                  <Text style={styles.paymentOptionTitle}>Mobile Money</Text>
                  <Text style={styles.paymentOptionDescription}>
                    Pay with MTN or Orange Mobile Money
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {paymentMethod === 'MOMO' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Money Phone Number *</Text>
                <TextInput
                  style={[styles.input, errors.momoPhoneNumber && styles.inputError]}
                  placeholder="Enter your mobile money number"
                  placeholderTextColor={colors.gray400}
                  value={formData.momoPhoneNumber}
                  onChangeText={(value) => updateField('momoPhoneNumber', value)}
                  keyboardType="phone-pad"
                />
                {errors.momoPhoneNumber && (
                  <Text style={styles.errorText}>{errors.momoPhoneNumber}</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'COD' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('COD')}
            >
              <View style={styles.paymentOptionContent}>
                <View style={styles.radioOuter}>
                  {paymentMethod === 'COD' && <View style={styles.radioInner} />}
                </View>
                <View>
                  <Text style={styles.paymentOptionTitle}>Cash on Delivery</Text>
                  <Text style={styles.paymentOptionDescription}>
                    Pay when you receive your order
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ORDER SUMMARY</Text>

            {items.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <Text style={styles.summaryItemName} numberOfLines={1}>
                  {item.name} × {item.quantity}
                </Text>
                <Text style={styles.summaryItemPrice}>{formatPrice(item.total)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

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
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                {paymentMethod === 'MOMO' ? 'PROCEED TO PAYMENT' : 'PLACE ORDER'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  loginPromptText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  loginPromptTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.black,
  },
  loginPromptSubtitle: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginTop: 2,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.gray400,
  },
  manageLink: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  addressCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  addressCardSelected: {
    borderColor: colors.black,
    backgroundColor: colors.gray50,
  },
  addressRadio: {
    marginRight: spacing.md,
    paddingTop: 2,
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 4,
  },
  addressName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  defaultBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: colors.gray600,
    fontWeight: '500',
  },
  labelBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 2,
  },
  labelBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '500',
  },
  addressPhone: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    marginBottom: 4,
  },
  addressText: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    lineHeight: 20,
  },
  addressCity: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  addNewAddressText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.black,
  },
  inputError: {
    borderColor: colors.black,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentOptionActive: {
    borderColor: colors.black,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.gray300,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.black,
  },
  paymentOptionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
    marginBottom: 2,
  },
  paymentOptionDescription: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryItemName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.gray600,
    marginRight: spacing.md,
  },
  summaryItemPrice: {
    fontSize: fontSize.sm,
    color: colors.black,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.md,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.gray400,
    marginBottom: spacing.lg,
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
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  submitButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    fontWeight: '500',
  },
});
