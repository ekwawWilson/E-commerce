import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { useCustomerStore } from '../stores/customer';
import { Product, Category, RootStackParamList } from '../types';
import { colors, spacing, fontSize } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CATEGORY_CARD_SIZE = (width - spacing.lg * 2 - spacing.sm) / 2;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const { customer, isAuthenticated } = useCustomerStore();

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  });

  const {
    data: featuredData,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.getFeaturedProducts(),
  });

  const categories: Category[] = categoriesData?.data || [];
  const featuredProducts: Product[] = featuredData?.data || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCategories(), refetchFeatured()]);
    setRefreshing(false);
  }, [refetchCategories, refetchFeatured]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetail', { slug: product.slug });
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate('CategoryProducts', {
      categorySlug: category.slug,
      categoryName: category.name,
    });
  };

  // Render category card in Amazon style
  const renderCategoryCard = (category: Category, index: number) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryCard,
        index % 2 === 0 ? styles.categoryCardLeft : styles.categoryCardRight,
      ]}
      onPress={() => handleCategoryPress(category)}
      activeOpacity={0.8}
    >
      <View style={styles.categoryImageContainer}>
        {category.image ? (
          <Image
            source={{ uri: category.image }}
            style={styles.categoryImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.categoryPlaceholder}>
            <Ionicons name="grid-outline" size={40} color={colors.gray400} />
          </View>
        )}
      </View>
      <View style={styles.categoryNameContainer}>
        <Text style={styles.categoryName} numberOfLines={2}>
          {category.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Group categories into rows of 2
  const categoryRows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    categoryRows.push(categories.slice(i, i + 2));
  }

  if ((categoriesLoading || featuredLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Search and User Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Search' } as any)}
          activeOpacity={0.9}
        >
          <Ionicons name="search" size={18} color={colors.gray500} />
          <Text style={styles.searchPlaceholder}>Search products...</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.userButton}
          onPress={() => {
            if (isAuthenticated) {
              navigation.navigate('Account');
            } else {
              navigation.navigate('Login', {});
            }
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isAuthenticated ? 'person' : 'person-outline'}
            size={20}
            color={colors.black}
          />
          {isAuthenticated && customer?.email && (
            <Text style={styles.userEmail} numberOfLines={1}>
              {customer.email}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* Featured Products Section - Above Categories */}
        {featuredProducts.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScroll}
            >
              {featuredProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.featuredCard}
                  onPress={() => handleProductPress(product)}
                  activeOpacity={0.8}
                >
                  <View style={styles.featuredImageContainer}>
                    {product.images?.[0]?.url ? (
                      <Image
                        source={{ uri: product.images[0].url }}
                        style={styles.featuredImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.featuredPlaceholder} />
                    )}
                    {product.comparePrice && Number(product.comparePrice) > Number(product.price) && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>
                          {Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)}% off
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.featuredName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.featuredPrice}>
                    {Number(product.price).toLocaleString()} FCFA
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories Grid - Amazon Style */}
        {categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeader}>
              
            </View>
            <View style={styles.categoriesGrid}>
              {categoryRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.categoryRow}>
                  {row.map((category, index) => renderCategoryCard(category, index))}
                  {/* Add empty placeholder if odd number of categories */}
                  {row.length === 1 && <View style={styles.categoryCardPlaceholder} />}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.blueBlack,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  // Header with Search and User Button
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray300,
    height: 40,
  },
  searchPlaceholder: {
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray300,
    height: 40,
    maxWidth: 150,
  },
  userEmail: {
    marginLeft: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.black,
    fontWeight: '500',
    flex: 1,
  },
  // Section Common
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.black,
  },
  // Featured Products Section
  featuredSection: {
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  featuredScroll: {
    paddingHorizontal: spacing.lg,
  },
  featuredCard: {
    width: 150,
    marginRight: spacing.md,
  },
  featuredImageContainer: {
    width: 150,
    height: 150,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.sm,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredPlaceholder: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: 4,
  },
  discountBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.blueBlack,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 2,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  featuredName: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    color: colors.black,
    marginTop: spacing.sm,
    lineHeight: 18,
    height: 36,
  },
  featuredPrice: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.black,
    marginTop: spacing.xs,
  },
  // Categories Section
  categoriesSection: {
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
  },
  categoriesGrid: {
    paddingHorizontal: spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  categoryCard: {
    width: CATEGORY_CARD_SIZE,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
  },
  categoryCardLeft: {
    marginRight: spacing.sm / 2,
  },
  categoryCardRight: {
    marginLeft: spacing.sm / 2,
  },
  categoryCardPlaceholder: {
    width: CATEGORY_CARD_SIZE,
  },
  categoryImageContainer: {
    width: '100%',
    height: CATEGORY_CARD_SIZE - 40,
    backgroundColor: colors.gray50,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  categoryNameContainer: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
  },
  categoryName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.black,
    textAlign: 'center',
  },
});
