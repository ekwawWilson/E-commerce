import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerStore } from '../stores/customer';
import { RootStackParamList } from '../types';
import { colors, spacing, fontSize } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { customer, updateProfile, isLoading, needsPhoneUpdate } = useCustomerStore();

  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [phone, setPhone] = useState(
    customer?.phone?.startsWith('google_') ? '' : customer?.phone || ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\s]{9,}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      Alert.alert('Success', 'Profile updated successfully');
      setHasChanges(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Update Failed',
        error instanceof Error ? error.message : 'An error occurred'
      );
    }
  };

  const updateField = (field: string, value: string) => {
    setHasChanges(true);
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'phone':
        setPhone(value);
        break;
    }
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Image */}
          <View style={styles.imageSection}>
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
            <TouchableOpacity style={styles.changePhotoButton}>
              <Ionicons name="camera" size={16} color={colors.black} />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Phone Update Alert */}
          {needsPhoneUpdate && (
            <View style={styles.alertBox}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.alertBoxText}>
                Please add your phone number to enable order notifications and delivery updates.
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Enter your name"
                placeholderTextColor={colors.gray400}
                value={name}
                onChangeText={(text) => updateField('name', text)}
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="Enter your email"
                placeholderTextColor={colors.gray400}
                value={email}
                onChangeText={(text) => updateField('email', text)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {customer?.emailVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Phone Number {needsPhoneUpdate && <Text style={styles.required}>*Required</Text>}
              </Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.gray400}
                value={phone}
                onChangeText={(text) => updateField('phone', text)}
                keyboardType="phone-pad"
              />
              {customer?.phoneVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>
          </View>

          {/* Preferred Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PREFERRED PAYMENT</Text>
            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  customer?.preferredPaymentMethod === 'MOMO' && styles.paymentOptionActive,
                ]}
              >
                <Ionicons name="phone-portrait" size={20} color={colors.black} />
                <Text style={styles.paymentOptionText}>Mobile Money</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  customer?.preferredPaymentMethod === 'COD' && styles.paymentOptionActive,
                ]}
              >
                <Ionicons name="cash" size={20} color={colors.black} />
                <Text style={styles.paymentOptionText}>Cash on Delivery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!hasChanges || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.gray50,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.white,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  changePhotoText: {
    fontSize: fontSize.sm,
    color: colors.black,
    fontWeight: '500',
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight || '#E8F4FD',
    padding: spacing.md,
    margin: spacing.lg,
    borderRadius: 8,
    gap: spacing.sm,
  },
  alertBoxText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.black,
    lineHeight: 20,
  },
  formSection: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
    fontWeight: '400',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.black,
    borderRadius: 4,
  },
  inputError: {
    borderColor: colors.error,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  verifiedText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray400,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  paymentOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingVertical: spacing.md,
    borderRadius: 4,
  },
  paymentOptionActive: {
    borderColor: colors.black,
    backgroundColor: colors.gray50,
  },
  paymentOptionText: {
    fontSize: fontSize.sm,
    color: colors.black,
    fontWeight: '500',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  saveButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.gray300,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
