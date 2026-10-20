import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { colors, spacing, fontSize } from '../theme';

type RouteProps = RouteProp<RootStackParamList, 'OrderConfirmation'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function OrderConfirmationScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { orderNumber } = route.params;

  const handleContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleTrackOrder = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
    // Navigate to Orders screen after reset
    setTimeout(() => {
      navigation.navigate('Orders');
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={48} color={colors.white} />
        </View>

        <Text style={styles.title}>ORDER CONFIRMED</Text>
        <Text style={styles.subtitle}>Thank you for your order!</Text>

        <View style={styles.orderNumberContainer}>
          <Text style={styles.orderNumberLabel}>Order Number</Text>
          <Text style={styles.orderNumber}>{orderNumber}</Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={24} color={colors.gray500} />
            <Text style={styles.infoText}>
              We've sent a confirmation to your email/phone
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={24} color={colors.gray500} />
            <Text style={styles.infoText}>
              Your order will be processed within 24 hours
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="car-outline" size={24} color={colors.gray500} />
            <Text style={styles.infoText}>
              You'll receive updates on your delivery status
            </Text>
          </View>
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.noteTitle}>WHAT'S NEXT?</Text>
          <Text style={styles.noteText}>
            You can track your order using the order number above. We'll update you via SMS when your order is shipped.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleTrackOrder}
        >
          <Text style={styles.primaryButtonText}>TRACK ORDER</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleContinueShopping}
        >
          <Text style={styles.secondaryButtonText}>CONTINUE SHOPPING</Text>
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
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    letterSpacing: 4,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.gray500,
    marginBottom: spacing.xl,
  },
  orderNumberContainer: {
    backgroundColor: colors.gray100,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  orderNumberLabel: {
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.gray500,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  orderNumber: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.black,
    letterSpacing: 2,
  },
  infoContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.sm,
    color: colors.gray600,
    lineHeight: 20,
  },
  noteContainer: {
    backgroundColor: colors.gray100,
    padding: spacing.lg,
    width: '100%',
  },
  noteTitle: {
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.gray500,
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.gray600,
    lineHeight: 22,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  primaryButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    fontWeight: '500',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.black,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.black,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    fontWeight: '500',
  },
});
