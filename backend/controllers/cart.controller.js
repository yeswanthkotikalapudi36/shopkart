const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

// Helper to fetch and populate customer's cart
const getPopulatedCart = async (customerId) => {
  const customer = await Customer.findById(customerId).populate({
    path: "cart.product",
    select: "name price image stock description category",
  });
  if (!customer) return [];
  return (customer.cart || []).filter((item) => item.product != null);
};

// @desc    Add product to cart (or increment quantity if already present)
// @route   POST /cart/:productId
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // Find product to check existence and stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check if product is in stock
    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: "Product is out of stock",
      });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if product already exists in cart
    const existingItem = (customer.cart || []).find(
      (item) => item.product.toString() === productId.toString()
    );

    if (existingItem) {
      const nextQuantity = existingItem.quantity + 1;
      if (nextQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Cannot add more. Requested quantity (${nextQuantity}) exceeds available stock (${product.stock})`,
        });
      }
      existingItem.quantity = nextQuantity;
    } else {
      if (1 > product.stock) {
        return res.status(400).json({
          success: false,
          message: "Product is out of stock",
        });
      }
      customer.cart.push({
        product: productId,
        quantity: 1,
      });
    }

    await customer.save();

    const populatedCart = await getPopulatedCart(customer._id);

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      cart: populatedCart,
    });
  } catch (error) {
    console.error("Add to Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
      error: error.message,
    });
  }
};

// @desc    Get current user's cart with populated product details
// @route   GET /cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).populate({
      path: "cart.product",
      select: "name price image stock description category",
    });

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Filter out items whose product might have been deleted from DB
    const activeCart = (customer.cart || []).filter((item) => item.product != null);

    return res.status(200).json({
      success: true,
      cart: activeCart,
    });
  } catch (error) {
    console.error("Get Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve cart",
      error: error.message,
    });
  }
};

// @desc    Update quantity of a product in cart
// @route   PATCH /cart/:productId
// @access  Private
const updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    // Validate quantity is a number and >= 1
    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || !Number.isInteger(numericQuantity) || numericQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be an integer of at least 1",
      });
    }

    // Find product to check existence and stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Validate quantity does not exceed stock
    if (numericQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Quantity (${numericQuantity}) exceeds available stock (${product.stock})`,
      });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if product is in cart
    const cartItem = (customer.cart || []).find(
      (item) => item.product.toString() === productId.toString()
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    cartItem.quantity = numericQuantity;
    await customer.save();

    const populatedCart = await getPopulatedCart(customer._id);

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated",
      cart: populatedCart,
    });
  } catch (error) {
    console.error("Update Cart Quantity Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update cart quantity",
      error: error.message,
    });
  }
};

// @desc    Remove product from cart
// @route   DELETE /cart/:productId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate productId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const itemIndex = (customer.cart || []).findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not in cart",
      });
    }

    customer.cart.splice(itemIndex, 1);
    await customer.save();

    const populatedCart = await getPopulatedCart(customer._id);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart: populatedCart,
    });
  } catch (error) {
    console.error("Remove from Cart Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove product from cart",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
};
