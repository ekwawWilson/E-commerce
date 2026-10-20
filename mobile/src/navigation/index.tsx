import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HomeScreen,
  ProductDetailScreen,
  CategoryProductsScreen,
  CartScreen,
  CheckoutScreen,
  PaymentScreen,
  OrderConfirmationScreen,
  SearchScreen,
  // Customer screens
  LoginScreen,
  RegisterScreen,
  AccountScreen,
  EditProfileScreen,
  AddressesScreen,
  AddAddressScreen,
  OrdersScreen,
  OrderDetailScreen,
  PaymentMethodsScreen,
  SecurityScreen,
} from '../screens';
import { useCartStore } from '../stores/cart';
import { useCustomerStore } from '../stores/customer';
import { RootStackParamList, MainTabParamList } from '../types';
import { colors, spacing, fontSize } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function CartTabIcon({ focused }: { focused: boolean }) {
  const { itemCount } = useCartStore();

  return (
    <View>
      <Ionicons
        name={focused ? 'bag' : 'bag-outline'}
        size={24}
        color={focused ? colors.black : colors.gray500}
      />
      {itemCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: [
          styles.tabBar,
          {
            height: 65 + insets.bottom,
            paddingBottom: insets.bottom + spacing.xs,
          }
        ],
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray500,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={focused ? colors.black : colors.gray500}
            />
          ),
          tabBarLabel: '',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={focused ? colors.black : colors.gray500}
            />
          ),
          tabBarLabel: '',
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ focused }) => <CartTabIcon focused={focused} />,
          tabBarLabel: '',
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={focused ? colors.black : colors.gray500}
            />
          ),
          tabBarLabel: '',
        }}
      />
    </Tab.Navigator>
  );
}

export function Navigation() {
  const { loadAuth } = useCustomerStore();

  useEffect(() => {
    loadAuth();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.blueBlack },
          headerTitleStyle: {
            fontSize: fontSize.md,
            color: colors.white,
            fontWeight: '600',
          },
          headerTitleAlign: 'center',
          headerTintColor: colors.white,
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{
            headerTitle: '',
          }}
        />
        <Stack.Screen
          name="CategoryProducts"
          component={CategoryProductsScreen}
          options={({ route }) => ({
            headerTitle: route.params.categoryName.toUpperCase(),
          })}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={{
            headerTitle: 'CHECKOUT',
          }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{
            headerTitle: 'PAYMENT',
            headerLeft: () => null,
          }}
        />
        <Stack.Screen
          name="OrderConfirmation"
          component={OrderConfirmationScreen}
          options={{
            headerShown: false,
          }}
        />

        {/* Customer Auth Screens */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerTitle: 'SIGN IN',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            headerTitle: 'CREATE ACCOUNT',
          }}
        />

        {/* Customer Account Screens */}
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{
            headerTitle: 'EDIT PROFILE',
          }}
        />
        <Stack.Screen
          name="Addresses"
          component={AddressesScreen}
          options={{
            headerTitle: 'MY ADDRESSES',
          }}
        />
        <Stack.Screen
          name="AddAddress"
          component={AddAddressScreen}
          options={({ route }) => ({
            headerTitle: route.params?.addressId ? 'EDIT ADDRESS' : 'ADD ADDRESS',
          })}
        />
        <Stack.Screen
          name="Orders"
          component={OrdersScreen}
          options={{
            headerTitle: 'MY ORDERS',
          }}
        />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{
            headerTitle: 'ORDER DETAILS',
          }}
        />
        <Stack.Screen
          name="PaymentMethods"
          component={PaymentMethodsScreen}
          options={{
            headerTitle: 'PAYMENT METHODS',
          }}
        />
        <Stack.Screen
          name="Security"
          component={SecurityScreen}
          options={{
            headerTitle: 'LOGIN & SECURITY',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
    paddingTop: spacing.sm,
    elevation: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    right: -10,
    top: -4,
    backgroundColor: colors.blueBlack,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
