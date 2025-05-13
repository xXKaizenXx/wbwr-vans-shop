import React from 'react';
import { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { shopifyClient } from '@api/shopifyClient';
import { gql } from 'graphql-request';
import { RootStackParamList } from '@navigation/AppNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCart } from '@context/CartContext';
import { ProductCard } from '../components/ProductCard';
import { BannerCarousel } from '../components/BannerCarousel';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ProductCollection'>;

interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  tags: string[];
  availableForSale: boolean;
  images: {
    edges: { node: { url: string } }[];
  };
  variants: {
    edges: { 
      node: { 
        price: { amount: string }; 
        title: string;
        availableForSale: boolean;
      } 
    }[];
  };
}

interface ShopifyResponse {
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}

const PRODUCTS_PER_PAGE = 20;

const PRODUCTS_QUERY = gql`
  query GetProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        node {
          id
          title
          tags
          images(first: 1) {
            edges {
              node {
                url
              }
            }
          }
          variants(first: 1) {
            edges {
              node {
                price {
                  amount
                }
                availableForSale
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const BANNERS = [
  {
    imageUrl: 'https://pokk.hu/shop_ordered/40937/pic/vans-banner.png',
    title: 'Welcome WBWR Vans!',
    subtitle: 'Enjoy exclusive deals and new arrivals',
  },
  {
    imageUrl: 'https://www.mimanerashop.com/cdn/shop/collections/banner-brand-pc-vans.1400x560.14575_2_83143d8d-1b17-4c08-a161-0317f317c0ca.webp?v=1739561946',
    title: 'Cleaning Kits',
    subtitle: 'For a Spotless Clean',
  },
  {
    imageUrl: 'https://www.buyandship.ph/contents/uploads/2020/08/How-to-Buy-From-Vans-Banner.png',
    title: 'Collabs',
    subtitle: 'Customised to your liking',
  },
];

export default function ProductCollectionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { totalItems } = useCart();
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery<ShopifyResponse>({
    queryKey: ['products', endCursor],
    queryFn: async (): Promise<ShopifyResponse> => {
      try {
        // First try with the tag filter
        const response = await shopifyClient.request(PRODUCTS_QUERY, {
          first: PRODUCTS_PER_PAGE,
          after: endCursor,
          query: 'tag:online_stock:available'
        }) as ShopifyResponse;

        // If no products are found, try without the filter
        if (response.products.edges.length === 0) {
          return await shopifyClient.request(PRODUCTS_QUERY, {
            first: PRODUCTS_PER_PAGE,
            after: endCursor
          }) as ShopifyResponse;
        }

        return response;
      } catch (error) {
        // If there's an error with the tag filter, try without it
        try {
          return await shopifyClient.request(PRODUCTS_QUERY, {
            first: PRODUCTS_PER_PAGE,
            after: endCursor
          }) as ShopifyResponse;
        } catch (fallbackError) {
          throw new Error('Failed to load products. Please try again.');
        }
      }
    },
    retry: 2,
    enabled: hasMore,
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
    if (data) {
      const newProducts = data.products.edges.map((edge: { node: ShopifyProduct }) => edge.node);
      
      // Separate complete and incomplete products
      const completeProducts = newProducts.filter((product: ShopifyProduct) => 
        product.images.edges.length > 0 && 
        product.variants.edges.length > 0 && 
        product.variants.edges[0]?.node.price.amount
      ).sort((a: ShopifyProduct, b: ShopifyProduct) => {
        const priceA = parseFloat(a.variants.edges[0]?.node.price.amount || '0');
        const priceB = parseFloat(b.variants.edges[0]?.node.price.amount || '0');
        return priceB - priceA;
      });
      
      const incompleteProducts = newProducts.filter((product: ShopifyProduct) => 
        !(product.images.edges.length > 0 && 
          product.variants.edges.length > 0 && 
          product.variants.edges[0]?.node.price.amount)
      ).sort((a: ShopifyProduct, b: ShopifyProduct) => {
        const priceA = parseFloat(a.variants.edges[0]?.node.price.amount || '0');
        const priceB = parseFloat(b.variants.edges[0]?.node.price.amount || '0');
        return priceB - priceA;
      });

      // Combine products with complete ones first
      const sortedProducts = [...completeProducts, ...incompleteProducts];

      // Filter out any duplicate products by ID
      setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNewProducts = sortedProducts.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNewProducts];
      });
      
      setHasMore(data.products.pageInfo.hasNextPage);
      setEndCursor(data.products.pageInfo.endCursor);
      setIsLoadingMore(false);
    }
  }, [data]);

  const loadMore = () => {
    if (!isLoading && hasMore && !isRefreshing && !isLoadingMore) {
      setIsLoadingMore(true);
      setEndCursor(data?.products.pageInfo.endCursor || null);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setProducts([]);
      setEndCursor(null);
      setHasMore(true);
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartButtonText}>🛒</Text>
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, totalItems]);

  const renderItem = ({ item }: { item: ShopifyProduct }) => (
    <ProductCard
      id={item.id}
      title={item.title}
      price={item.variants.edges[0]?.node.price.amount || '0'}
      imageUrl={item.images.edges[0]?.node.url || ''}
    />
  );

  const renderFooter = () => {
    if (!isLoading || isRefreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  };

  if (isError && products.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorMessage}>{error?.message || 'Failed to load products'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (products.length === 0 && isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafd' }}>
      <FlatList
        ListHeaderComponent={
          <>
            <BannerCarousel banners={BANNERS} />
            <Text style={styles.sectionHeader}>Featured Products</Text>
          </>
        }
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        initialNumToRender={10}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
            colors={['#0000ff']}
            tintColor="#0000ff"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 24,
    paddingHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cartButton: {
    marginRight: 16,
    position: 'relative',
  },
  cartButtonText: {
    fontSize: 24,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    color: '#222',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sectionDivider: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 16,
  },
  sectionDividerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
  },
});
