import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerStore } from '../stores/customer';
import { RootStackParamList } from '../types';
import { colors, spacing, fontSize } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeText?: string;
}

function MenuItem({ icon, title, subtitle, onPress, showBadge, badgeText }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Ionicons name={icon} size={22} color={colors.black} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showBadge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
    </TouchableOpacity>
  );
}

export function AccountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { customer, isAuthenticated, logout, loadAuth, needsPhoneUpdate } = useCustomerStore();

  useEffect(() => {
    loadAuth();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.guestContent}>
          <View style={styles.guestHeader}>
            <Ionicons name="person-circle-outline" size={80} color={colors.gray300} />
            <Text style={styles.guestTitle}>Welcome</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to access your orders, addresses, and personalized recommendations
            </Text>
          </View>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('Login', {})}
          >
            <Text style={styles.signInButtonText}>SIGN IN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.createAccountButtonText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>

          {/* Quick Links for Guests */}
          <View style={styles.guestLinks}>
            <Text style={styles.sectionTitle}>QUICK LINKS</Text>
            <MenuItem
              icon="locate-outline"
              title="Track Order"
              subtitle="Check your order status"
              onPress={() => navigation.navigate('Orders')}
            />
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              subtitle="Get help with your questions"
              onPress={() => {}}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            {customer?.profileImage ? (
              <Image
                source={{ uri: customer.profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileInitials}>
                  {customer?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>{customer?.name}</Text>
              <Text style={styles.profileEmail}>{customer?.email}</Text>
              {customer?.phone && !customer.phone.startsWith('google_') && (
                <Text style={styles.profilePhone}>{customer.phone}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="pencil" size={16} color={colors.black} />
          </TouchableOpacity>
        </View>

        {/* Complete Profile Alert */}
        {needsPhoneUpdate && (
          <TouchableOpacity
            style={styles.alertBanner}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Ionicons name="alert-circle" size={20} color={colors.white} />
            <Text style={styles.alertText}>
              Add your phone number to complete your profile
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.white} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('Orders')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="cube-outline" size={24} color={colors.black} />
            </View>
            <Text style={styles.quickActionText}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('Addresses')}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name="location-outline" size={24} color={colors.black} />
            </View>
            <Text style={styles.quickActionText}>Addresses</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => {}}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="heart-outline" size={24} color={colors.black} />
            </View>
            <Text style={styles.quickActionText}>Wishlist</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => {}}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="gift-outline" size={24} color={colors.black} />
            </View>
            <Text style={styles.quickActionText}>Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Account Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>YOUR ACCOUNT</Text>

          <MenuItem
            icon="person-outline"
            title="Personal Information"
            subtitle="Manage your name, email, phone"
            onPress={() => navigation.navigate('EditProfile')}
          />

          <MenuItem
            icon="location-outline"
            title="Delivery Addresses"
            subtitle={`${customer?.addresses?.length || 0} saved addresses`}
            onPress={() => navigation.navigate('Addresses')}
          />

          <MenuItem
            icon="cube-outline"
            title="Your Orders"
            subtitle="Track, return, or buy things again"
            onPress={() => navigation.navigate('Orders')}
          />

          <MenuItem
            icon="card-outline"
            title="Payment Methods"
            subtitle="Manage payment options"
            onPress={() => navigation.navigate('PaymentMethods')}
          />

          <MenuItem
            icon="shield-checkmark-outline"
            title="Login & Security"
            subtitle="Change password, manage devices"
            onPress={() => navigation.navigate('Security')}
          />
        </View>

        {/* Settings Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>

          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => {}}
          />

          <MenuItem
            icon="language-outline"
            title="Language"
            subtitle="English"
            onPress={() => {}}
          />

          <MenuItem
            icon="moon-outline"
            title="Appearance"
            subtitle="Light mode"
            onPress={() => {}}
          />
        </View>

        {/* Support Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>HELP & SUPPORT</Text>

          <MenuItem
            icon="help-circle-outline"
            title="Help Center"
            subtitle="Get help with your account"
            onPress={() => {}}
          />

          <MenuItem
            icon="chatbubble-outline"
            title="Contact Us"
            subtitle="Chat, call, or email support"
            onPress={() => {}}
          />

          <MenuItem
            icon="document-text-outline"
            title="Terms & Conditions"
            onPress={() => {}}
          />

          <MenuItem
            icon="shield-outline"
            title="Privacy Policy"
            onPress={() => {}}
          />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  guestContent: {
    padding: spacing.xl,
  },
  guestHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.xxl,
  },
  guestTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.black,
    marginTop: spacing.md,
  },
  guestSubtitle: {
    fontSize: fontSize.md,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  signInButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  signInButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
  createAccountButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  createAccountButtonText: {
    color: colors.black,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
  guestLinks: {
    marginTop: spacing.xxl,
  },
  profileHeader: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
  },
  profileDetails: {
    marginLeft: spacing.md,
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.black,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  profilePhone: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  editProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBanner: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertText: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionText: {
    fontSize: fontSize.xs,
    color: colors.black,
    fontWeight: '500',
  },
  menuSection: {
    backgroundColor: colors.white,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray400,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: fontSize.md,
    color: colors.black,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  signOutText: {
    fontSize: fontSize.md,
    color: colors.error,
    fontWeight: '500',
  },
  versionText: {
    fontSize: fontSize.xs,
    color: colors.gray400,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
