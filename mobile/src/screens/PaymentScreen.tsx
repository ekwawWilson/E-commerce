import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { RootStackParamList } from '../types';
import { colors, spacing, fontSize, formatPrice } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'Payment'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function PaymentScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { orderId, orderNumber } = route.params;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const handleInitiatePayment = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your mobile money phone number');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await api.initiatePayment(orderId, phoneNumber);

      if (response.success && response.data?.transactionId) {
        setTransactionId(response.data.transactionId);
        setPaymentInitiated(true);
        Alert.alert(
          'Payment Request Sent',
          'Please check your phone and approve the payment request.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to initiate payment');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!transactionId) return;
    setCheckingStatus(true);

    try {
      const response = await api.verifyPayment(transactionId);

      if (response.success && response.data) {
        if (response.data.status === 'PAID') {
          navigation.replace('OrderConfirmation', { orderNumber });
        } else if (response.data.status === 'FAILED') {
          Alert.alert(
            'Payment Failed',
            'Your payment was not successful. Please try again.',
            [{ text: 'OK' }]
          );
          setPaymentInitiated(false);
        } else {
          Alert.alert(
            'Payment Pending',
            'Your payment is still being processed. Please wait and try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check payment status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handlePayLater = () => {
    Alert.alert(
      'Pay Later',
      'Your order has been placed. You can complete the payment later from the order tracking page.',
      [
        {
          text: 'OK',
          onPress: () => navigation.replace('OrderConfirmation', { orderNumber }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="phone-portrait-outline" size={48} color={colors.black} />
        </View>

        <Text style={styles.title}>MOBILE MONEY PAYMENT</Text>
        <Text style={styles.subtitle}>Order #{orderNumber}</Text>

        {!paymentInitiated ? (
          <>
            <Text style={styles.instruction}>
              Enter your MTN or Orange Mobile Money phone number to receive a payment prompt.
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number (e.g., 6XXXXXXXX)"
                placeholderTextColor={colors.gray400}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={12}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isProcessing && styles.buttonDisabled]}
              onPress={handleInitiatePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>SEND PAYMENT REQUEST</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePayLater}
            >
              <Text style={styles.secondaryButtonText}>PAY LATER</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.waitingContainer}>
              <ActivityIndicator size="large" color={colors.black} />
              <Text style={styles.waitingText}>Waiting for payment confirmation...</Text>
              <Text style={styles.waitingSubtext}>
                Check your phone and approve the payment request
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, checkingStatus && styles.buttonDisabled]}
              onPress={handleCheckStatus}
              disabled={checkingStatus}
            >
              {checkingStatus ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>I'VE PAID - CHECK STATUS</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setPaymentInitiated(false)}
            >
              <Text style={styles.secondaryButtonText}>TRY DIFFERENT NUMBER</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handlePayLater}
            >
              <Text style={styles.linkButtonText}>Complete payment later</Text>
            </TouchableOpacity>
          </>
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
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.lg,
    letterSpacing: 3,
    color: colors.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginBottom: spacing.xl,
  },
  instruction: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.black,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    backgroundColor: colors.gray400,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    fontWeight: '500',
  },
  secondaryButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.black,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  secondaryButtonText: {
    color: colors.black,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    fontWeight: '500',
  },
  linkButton: {
    padding: spacing.md,
  },
  linkButtonText: {
    color: colors.gray500,
    fontSize: fontSize.sm,
    textDecorationLine: 'underline',
  },
  waitingContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  waitingText: {
    fontSize: fontSize.md,
    color: colors.black,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  waitingSubtext: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    textAlign: 'center',
  },
});
