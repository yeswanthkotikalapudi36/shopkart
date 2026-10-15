import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartQuantity as apiUpdateCartQuantity,
  removeFromCart as apiRemoveFromCart,
} from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState(null);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCartItems([]);
      setLoading(false);
      setInitialLoaded(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getCart();
      setCartItems(data.cart || []);
    } catch (err) {
      console.error("Cart fetch error:", err);
      setError(err.response?.data?.message || "Failed to load cart.");
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId) => {
    try {
      setError(null);
      const data = await apiAddToCart(productId);
      setCartItems(data.cart || []);
      return { success: true, cart: data.cart };
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add to cart";
      setError(msg);
      throw err;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      setError(null);
      const data = await apiUpdateCartQuantity(productId, quantity);
      setCartItems(data.cart || []);
      return { success: true, cart: data.cart };
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update quantity";
      setError(msg);
      throw err;
    }
  };

  const removeFromCart = async (productId) => {
    try {
      setError(null);
      const data = await apiRemoveFromCart(productId);
      setCartItems(data.cart || []);
      return { success: true, cart: data.cart };
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to remove from cart";
      setError(msg);
      throw err;
    }
  };

  // Derived values (computed dynamically, never stored separately)
  const cartCount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const price = item.product?.price || 0;
      const quantity = item.quantity || 0;
      return acc + price * quantity;
    }, 0);
  }, [cartItems]);

  const itemCount = cartItems.length;

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        initialLoaded,
        error,
        cartCount,
        subtotal,
        itemCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        fetchCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
