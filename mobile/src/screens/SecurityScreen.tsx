import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerStore } from '../stores/customer';
import { colors, spacing, fontSize } from '../theme';

export function SecurityScreen() {
  const { customer, changePassword, isLoading } = useCustomerStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to change password'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const isGoogleUser = customer?.phone?.startsWith('google_');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={colors.gray500} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{customer?.email}</Text>
            </View>
            {customer?.emailVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.gray500} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {customer?.phone && !customer.phone.startsWith('google_')
                  ? customer.phone
                  : 'Not added'}
              </Text>
            </View>
            {customer?.phoneVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sign-in Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SIGN-IN METHOD</Text>
          <View style={styles.methodCard}>
            <View style={styles.methodIcon}>
              <Ionicons
                name={isGoogleUser ? 'logo-google' : 'mail-outline'}
                size={24}
                color={colors.black}
              />
            </View>
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>
                {isGoogleUser ? 'Google Account' : 'Email & Password'}
              </Text>
              <Text style={styles.methodDescription}>
                {isGoogleUser
                  ? 'You signed in with your Google account'
                  : 'You signed in with email and password'}
              </Text>
            </View>
          </View>
        </View>

        {/* Change Password - Only for non-Google users */}
        {!isGoogleUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CHANGE PASSWORD</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.gray400}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Ionicons
                    name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.gray500}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.gray400}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.gray500}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>At least 8 characters</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.gray400}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.gray500}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.changeButton, isChangingPassword && styles.changeButtonDisabled]}
              onPress={handleChangePassword}
              disabled={isChangingPassword || isLoading}
            >
              {isChangingPassword ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.changeButtonText}>CHANGE PASSWORD</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Security Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY TIPS</Text>
          <View style={styles.tipItem}>
            <Ionicons name="key-outline" size={18} color={colors.blueBlack} />
            <Text style={styles.tipText}>
              Use a strong, unique password that you don't use elsewhere
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="refresh-outline" size={18} color={colors.blueBlack} />
            <Text style={styles.tipText}>
              Change your password regularly for better security
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.blueBlack} />
            <Text style={styles.tipText}>
              Never share your password with anyone
            </Text>
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
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.black,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginLeft: 4,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: 8,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  methodTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
  },
  methodDescription: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.black,
  },
  eyeButton: {
    padding: spacing.md,
  },
  inputHint: {
    fontSize: fontSize.xs,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  changeButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  changeButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  changeButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  tipText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: fontSize.sm,
    color: colors.gray600,
    lineHeight: 20,
  },
});
