import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5001",
  withCredentials: true, // Crucial for HttpOnly cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Authentication APIs (Lab-01 & Lab-02)
export const registerUser = async (userData) => {
  const response = await API.post("/customers/register", userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await API.post("/customers/login", credentials);
  return response.data;
};

export const getProfile = async () => {
  const response = await API.get("/customers/me");
  return response.data;
};

export const logoutUser = async () => {
  const response = await API.post("/customers/logout");
  return response.data;
};

export const changePassword = async (data) => {
  const response = await API.patch("/customers/change-password", data);
  return response.data;
};

// Product APIs (Lab-03)
export const getProducts = async (params = {}) => {
  const response = await API.get("/products", { params });
  return response.data;
};

export const getProductById = async (id) => {
  const response = await API.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await API.post("/products", productData);
  return response.data;
};

// Wishlist APIs (Lab-04)
export const getWishlist = async () => {
  const response = await API.get("/wishlist");
  return response.data;
};

export const addToWishlist = async (productId) => {
  const response = await API.post(`/wishlist/${productId}`);
  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await API.delete(`/wishlist/${productId}`);
  return response.data;
};

export const toggleWishlist = async (productId) => {
  const response = await API.patch(`/wishlist/${productId}/toggle`);
  return response.data;
};

// Cart APIs (Lab-05)
export const getCart = async () => {
  const response = await API.get("/cart");
  return response.data;
};

export const addToCart = async (productId) => {
  const response = await API.post(`/cart/${productId}`);
  return response.data;
};

export const updateCartQuantity = async (productId, quantity) => {
  const response = await API.patch(`/cart/${productId}`, { quantity });
  return response.data;
};

export const removeFromCart = async (productId) => {
  const response = await API.delete(`/cart/${productId}`);
  return response.data;
};

// Order APIs (Lab-06)
export const createPaymentOrder = async (shippingAddress) => {
  const response = await API.post("/orders/create-payment-order", { shippingAddress });
  return response.data;
};

export const verifyPayment = async (paymentDetails) => {
  const response = await API.post("/orders/verify-payment", paymentDetails);
  return response.data;
};

export const getMyOrders = async () => {
  const response = await API.get("/orders");
  return response.data;
};

export const getOrderById = async (orderId) => {
  const response = await API.get(`/orders/${orderId}`);
  return response.data;
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await API.patch(`/orders/${orderId}/status`, { status });
  return response.data;
};

export default API;
