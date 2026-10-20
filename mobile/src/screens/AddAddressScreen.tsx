import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerStore } from '../stores/customer';
import { RootStackParamList, CustomerAddress } from '../types';
import { colors, spacing, fontSize } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'AddAddress'>;

const ADDRESS_LABELS = ['Home', 'Work', 'Other'];

export function AddAddressScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { customer, addAddress, updateAddress, isLoading } = useCustomerStore();

  const addressId = route.params?.addressId;
  const existingAddress = addressId
    ? customer?.addresses?.find((a) => a.id === addressId)
    : null;
  const isEditing = !!existingAddress;

  const [label, setLabel] = useState(existingAddress?.label || '');
  const [name, setName] = useState(existingAddress?.name || customer?.name || '');
  const [phone, setPhone] = useState(
    existingAddress?.phone ||
    (customer?.phone?.startsWith('google_') ? '' : customer?.phone || '')
  );
  const [address, setAddress] = useState(existingAddress?.address || '');
  const [city, setCity] = useState(existingAddress?.city || '');
  const [region, setRegion] = useState(existingAddress?.region || '');
  const [landmark, setLandmark] = useState(existingAddress?.landmark || '');
  const [isDefault, setIsDefault] = useState(existingAddress?.isDefault || false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Recipient name is required';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9+\s]{9,}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter a valid phone number';
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const addressData = {
      label: label || undefined,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      city: city.trim(),
      region: region.trim() || undefined,
      landmark: landmark.trim() || undefined,
      isDefault,
    };

    try {
      if (isEditing && addressId) {
        await updateAddress(addressId, addressData);
        Alert.alert('Success', 'Address updated successfully');
      } else {
        await addAddress(addressData);
        Alert.alert('Success', 'Address added successfully');
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save address'
      );
    }
  };

  const updateField = (field: string, value: string) => {
    switch (field) {
      case 'name':
        setName(value);
        break;
      case 'phone':
        setPhone(value);
        break;
      case 'address':
        setAddress(value);
        break;
      case 'city':
        setCity(value);
        break;
      case 'region':
        setRegion(value);
        break;
      case 'landmark':
        setLandmark(value);
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
          {/* Address Label */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADDRESS LABEL (Optional)</Text>
            <View style={styles.labelOptions}>
              {ADDRESS_LABELS.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[
                    styles.labelOption,
                    label === l && styles.labelOptionActive,
                  ]}
                  onPress={() => setLabel(label === l ? '' : l)}
                >
                  <Ionicons
                    name={
                      l === 'Home'
                        ? 'home-outline'
                        : l === 'Work'
                        ? 'business-outline'
                        : 'location-outline'
                    }
                    size={18}
                    color={label === l ? colors.white : colors.black}
                  />
                  <Text
                    style={[
                      styles.labelOptionText,
                      label === l && styles.labelOptionTextActive,
                    ]}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Recipient Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Who will receive the delivery?"
                placeholderTextColor={colors.gray400}
                value={name}
                onChangeText={(text) => updateField('name', text)}
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Contact number for delivery"
                placeholderTextColor={colors.gray400}
                value={phone}
                onChangeText={(text) => updateField('phone', text)}
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>
          </View>

          {/* Address Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea, errors.address && styles.inputError]}
                placeholder="House number, street name, area"
                placeholderTextColor={colors.gray400}
                value={address}
                onChangeText={(text) => updateField('address', text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={[styles.input, errors.city && styles.inputError]}
                  placeholder="City"
                  placeholderTextColor={colors.gray400}
                  value={city}
                  onChangeText={(text) => updateField('city', text)}
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Region</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State/Region"
                  placeholderTextColor={colors.gray400}
                  value={region}
                  onChangeText={(text) => updateField('region', text)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Landmark (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nearby landmark for easier delivery"
                placeholderTextColor={colors.gray400}
                value={landmark}
                onChangeText={(text) => updateField('landmark', text)}
              />
            </View>
          </View>

          {/* Set as Default */}
          <TouchableOpacity
            style={styles.defaultOption}
            onPress={() => setIsDefault(!isDefault)}
          >
            <View
              style={[styles.checkbox, isDefault && styles.checkboxActive]}
            >
              {isDefault && (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              )}
            </View>
            <Text style={styles.defaultOptionText}>
              Set as default delivery address
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditing ? 'UPDATE ADDRESS' : 'SAVE ADDRESS'}
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray400,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  labelOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  labelOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 4,
  },
  labelOptionActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  labelOptionText: {
    fontSize: fontSize.sm,
    color: colors.black,
    fontWeight: '500',
  },
  labelOptionTextActive: {
    color: colors.white,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
    marginBottom: spacing.xs,
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
  textArea: {
    minHeight: 80,
    paddingTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  defaultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  defaultOptionText: {
    fontSize: fontSize.md,
    color: colors.black,
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
    backgroundColor: colors.gray400,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
