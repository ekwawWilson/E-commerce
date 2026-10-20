import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerStore } from '../stores/customer';
import { colors, spacing, fontSize } from '../theme';

type PaymentMethod = 'MOMO' | 'COD';

export function PaymentMethodsScreen() {
  const { customer, updateProfile, isLoading } = useCustomerStore();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    customer?.preferredPaymentMethod || 'MOMO'
  );

  const handleSelectMethod = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    try {
      await updateProfile({ preferredPaymentMethod: method });
      Alert.alert('Success', 'Payment preference updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment preference');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Preferred Payment Method</Text>
          <Text style={styles.headerSubtitle}>
            Select your default payment method for checkout
          </Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedMethod === 'MOMO' && styles.paymentOptionSelected,
            ]}
            onPress={() => handleSelectMethod('MOMO')}
            disabled={isLoading}
          >
            <View style={styles.paymentIconContainer}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.black} />
            </View>
            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Mobile Money (MoMo)</Text>
              <Text style={styles.paymentDescription}>
                Pay securely using your mobile money account
              </Text>
            </View>
            <View style={[
              styles.radioButton,
              selectedMethod === 'MOMO' && styles.radioButtonSelected,
            ]}>
              {selectedMethod === 'MOMO' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              selectedMethod === 'COD' && styles.paymentOptionSelected,
            ]}
            onPress={() => handleSelectMethod('COD')}
            disabled={isLoading}
          >
            <View style={styles.paymentIconContainer}>
              <Ionicons name="cash-outline" size={24} color={colors.black} />
            </View>
            <View style={styles.paymentContent}>
              <Text style={styles.paymentTitle}>Cash on Delivery</Text>
              <Text style={styles.paymentDescription}>
                Pay with cash when your order is delivered
              </Text>
            </View>
            <View style={[
              styles.radioButton,
              selectedMethod === 'COD' && styles.radioButtonSelected,
            ]}>
              {selectedMethod === 'COD' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={colors.gray500} />
          <Text style={styles.infoText}>
            Your preferred payment method will be pre-selected at checkout. You can always change it during checkout.
          </Text>
        </View>

        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>PAYMENT SECURITY</Text>
          <View style={styles.securityItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.success} />
            <Text style={styles.securityText}>All transactions are encrypted</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.success} />
            <Text style={styles.securityText}>We never store your payment details</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="eye-off-outline" size={20} color={colors.success} />
            <Text style={styles.securityText}>Your data is private and secure</Text>
          </View>
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
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  section: {
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.sm,
  },
  paymentOptionSelected: {
    borderColor: colors.blueBlack,
    backgroundColor: colors.gray50,
  },
  paymentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  paymentTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  paymentDescription: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.blueBlack,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.blueBlack,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.gray500,
    lineHeight: 20,
  },
  securitySection: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray400,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  securityText: {
    marginLeft: spacing.md,
    fontSize: fontSize.sm,
    color: colors.gray600,
  },
});
