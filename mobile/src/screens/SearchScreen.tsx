import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Product, RootStackParamList } from '../types';
import { colors, spacing, fontSize, formatPrice } from '../theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: productsResponse, isLoading, error } = useQuery({
    queryKey: ['all-products-search'],
    queryFn: () => api.getProducts({ limit: 100 }),
  });

  // Extract products array from response - API returns data directly as array
  const allProducts = Array.isArray(productsResponse?.data) ? productsResponse.data : (productsResponse?.data?.products || []);

  const filteredProducts = useMemo(() => {
    if (!allProducts.length) return [];
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    return allProducts.filter((product: Product) => {
      const nameMatch = product.name?.toLowerCase().includes(query);
      const descMatch = product.description?.toLowerCase().includes(query);
      const categoryMatch = product.categories?.[0]?.category?.name?.toLowerCase().includes(query);
      return nameMatch || descMatch || categoryMatch;
    });
  }, [allProducts, searchQuery]);

  // Get primary image URL from product
  const getProductImage = (product: Product): string | undefined => {
    const primaryImage = product.images?.find((img) => img.isPrimary);
    return primaryImage?.url || product.images?.[0]?.url;
  };

  // Get category name from product
  const getCategoryName = (product: Product): string => {
    return product.categories?.[0]?.category?.name || 'Uncategorized';
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: getProductImage(item) || 'https://via.placeholder.com/100' }}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productCategory}>{getCategoryName(item)}</Text>
        <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
    </TouchableOpacity>
  );

  const renderRecentProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.recentProductCard}
      onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
      activeOpacity={0.7}
    >
      <View style={styles.recentProductImage}>
        <Image
          source={{ uri: getProductImage(item) || 'https://via.placeholder.com/100' }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.recentProductName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.recentProductPrice}>{formatPrice(item.price)}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Products</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.gray500} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for products..."
          placeholderTextColor={colors.gray400}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
          <Text style={styles.emptyText}>Failed to load products</Text>
          <Text style={styles.emptySubtext}>Please check your connection</Text>
        </View>
      ) : searchQuery.trim() === '' ? (
        <View style={styles.browseContainer}>
          <View style={styles.centerContent}>
            <Ionicons name="search" size={64} color={colors.gray300} />
            <Text style={styles.emptyText}>Start typing to search</Text>
            <Text style={styles.emptySubtext}>Find products by name, description, or category</Text>
          </View>

          {allProducts.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.sectionTitle}>BROWSE PRODUCTS</Text>
              <FlatList
                data={allProducts.slice(0, 6)}
                keyExtractor={(item) => item.id}
                renderItem={renderRecentProduct}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentList}
              />
            </View>
          )}
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="sad-outline" size={64} color={colors.gray300} />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} found
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '600',
    color: colors.foreground,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    height: 50,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.foreground,
    paddingVertical: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  browseContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.gray500,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray600,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.gray500,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  suggestionsSection: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray600,
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  recentList: {
    paddingHorizontal: spacing.lg,
  },
  recentProductCard: {
    width: 150,
    height: 220,
    marginRight: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  recentProductImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.white,
    padding: spacing.sm,
  },
  recentProductName: {
    fontSize: fontSize.sm,
    fontWeight: '400',
    color: '#0F1111',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    lineHeight: 18,
    height: 40,
  },
  recentProductPrice: {
    fontSize: fontSize.md,
    fontWeight: '400',
    color: '#0F1111',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    marginTop: 'auto',
  },
  resultsCount: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.foreground,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray200,
  },
});
