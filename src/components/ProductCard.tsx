import React, { useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '@navigation/AppNavigator';
import { StackNavigationProp } from '@react-navigation/stack';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ProductCollection'>;

interface ProductCardProps {
  id: string;
  title: string;
  price: string;
  imageUrl: string;
  onPress?: () => void;
}

const DEFAULT_IMAGE = 'https://via.placeholder.com/300x300?text=No+Image';

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  price,
  imageUrl,
  onPress,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('ProductDetail', { productId: id });
    }
  }, [onPress, navigation, id]);

  const formatPrice = useCallback((price: string) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(parseFloat(price)),
    []
  );

  const validImageUrl = imageUrl && imageUrl.trim() !== '' ? imageUrl : DEFAULT_IMAGE;

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.imageContainer}>
        {(!imageLoaded || imageError) && (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>Loading...</Text>
          </View>
        )}
        <Image
          source={{ uri: validImageUrl }}
          style={[styles.image, (!imageLoaded || imageError) && styles.hidden]}
          resizeMode="contain"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.price}>{formatPrice(price)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    width: '100%',
    height: cardWidth,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hidden: {
    opacity: 0,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
  cardContent: {
    padding: 12,
  },
  title: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  price: {
    color: '#2ecc71',
    fontWeight: '600',
    fontSize: 16,
  },
}); 