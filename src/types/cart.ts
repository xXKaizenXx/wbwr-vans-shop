export interface CartItem {
  id: string;
  title: string;
  price: string;
  image: string;
  quantity: number;
  variant?: string;
}

export interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalPrice: number;
} 