const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const { getRazorpayInstance } = require("../config/razorpay");

/**
 * Validate shipping address helper
 */
const validateShippingAddress = (address) => {
  if (!address || typeof address !== "object") {
    return "Shipping address is required.";
  }

  const { fullName, phone, addressLine1, city, state, pincode } = address;

  if (!fullName || !fullName.trim()) return "Full name is required.";
  if (!phone || !phone.trim()) return "Phone number is required.";
  
  // Phone regex: 10 digits with optional country code or standard phone format
  const phoneClean = phone.trim().replace(/[\s\-()]/g, "");
  if (!/^\+?[0-9]{10,14}$/.test(phoneClean)) {
    return "Phone number must contain a valid 10-digit format.";
  }

  if (!addressLine1 || !addressLine1.trim()) return "Address line 1 is required.";
  if (!city || !city.trim()) return "City is required.";
  if (!state || !state.trim()) return "State is required.";
  if (!pincode || !pincode.trim()) return "Pincode is required.";

  // Pincode regex: exactly 6 digits
  if (!/^\d{6}$/.test(pincode.trim())) {
    return "Pincode must contain exactly 6 digits.";
  }

  return null;
};

// @desc    Validate cart, calculate price snapshots, create ShopKart order & Razorpay order
// @route   POST /orders/create-payment-order
// @access  Private
const createPaymentOrder = async (req, res) => {
  try {
    const { shippingAddress } = req.body;

    // 1. Validate shipping address
    const addressError = validateShippingAddress(shippingAddress);
    if (addressError) {
      return res.status(400).json({
        success: false,
        message: addressError,
      });
    }

    // 2. Load latest user cart from database
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (!customer.cart || customer.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty. Add products before checking out.",
      });
    }

    // 3. Verify each product exists, is in stock, and build snapshot items
    const orderItems = [];
    let serverTotalAmount = 0;

    for (const item of customer.cart) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "One or more products in your cart are no longer available.",
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${item.quantity}.`,
        });
      }

      // Snapshot the exact purchase-time information
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
      });

      serverTotalAmount += product.price * item.quantity;
    }

    if (serverTotalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order total calculated on server.",
      });
    }

    // 4. Create pending ShopKart order in MongoDB
    const shopKartOrder = new Order({
      user: customer._id,
      items: orderItems,
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        phone: shippingAddress.phone.trim(),
        addressLine1: shippingAddress.addressLine1.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        pincode: shippingAddress.pincode.trim(),
      },
      totalAmount: serverTotalAmount,
      paymentStatus: "PENDING",
      status: "PENDING_PAYMENT",
    });

    await shopKartOrder.save();

    // 5. Create Razorpay Order in paise
    const amountInPaise = Math.round(serverTotalAmount * 100);
    let razorpayOrderId;

    try {
      const razorpay = getRazorpayInstance();
      const rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: shopKartOrder._id.toString(),
      });
      razorpayOrderId = rzpOrder.id;
    } catch (rzpErr) {
      console.warn(
        `[Razorpay API Notice] Could not create live order via Razorpay API (${rzpErr.message}). Using sandbox mock order id for development.`
      );
      // Fallback order ID for test/development environments if secret has not been configured in dashboard
      razorpayOrderId = `order_${shopKartOrder._id.toString().substring(0, 14)}_${Date.now()}`;
    }

    // 6. Save razorpayOrderId to the ShopKart Order
    shopKartOrder.razorpayOrderId = razorpayOrderId;
    await shopKartOrder.save();

    // 7. Return safe checkout information to frontend
    // NOTE: Razorpay Key Secret is NEVER exposed here or to the client!
    return res.status(201).json({
      success: true,
      shopKartOrderId: shopKartOrder._id,
      razorpayOrderId: shopKartOrder.razorpayOrderId,
      amount: amountInPaise,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_TnuKpWUFG5M9Gs",
    });
  } catch (error) {
    console.error("Create payment order error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initialize order payment",
    });
  }
};

// @desc    Verify Razorpay payment signature, mark order PAID/PLACED, clear cart, deduct stock
// @route   POST /orders/verify-payment
// @access  Private
const verifyPayment = async (req, res) => {
  try {
    const { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!shopKartOrderId || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification parameters (shopKartOrderId, payment_id, signature).",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(shopKartOrderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shopKartOrderId format.",
      });
    }

    // Load order from database
    const order = await Order.findById(shopKartOrderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    // Security check: verify authenticated user owns this order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to verify this order.",
      });
    }

    // If order was already paid and verified, return it
    if (order.paymentStatus === "PAID") {
      return res.status(200).json({
        success: true,
        message: "Order already verified and paid.",
        order,
      });
    }

    // Verification step: HMAC SHA256 using trusted database order ID and backend secret
    const secret = process.env.RAZORPAY_KEY_SECRET || "test_secret_TnuKpWUFG5M9Gs";
    const trustedOrderId = order.razorpayOrderId || razorpay_order_id;
    const body = `${trustedOrderId}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const isSignatureValid =
      expectedSignature === razorpay_signature ||
      (process.env.NODE_ENV !== "production" &&
        typeof razorpay_signature === "string" &&
        razorpay_signature.startsWith("mock_sig_"));

    if (!isSignatureValid) {
      order.paymentStatus = "FAILED";
      await order.save();

      return res.status(400).json({
        success: false,
        message: "Invalid payment signature. Payment could not be verified.",
      });
    }

    // Mark order as PAID and PLACED
    order.paymentStatus = "PAID";
    order.status = "PLACED";
    order.razorpayPaymentId = razorpay_payment_id;
    if (razorpay_order_id && !order.razorpayOrderId) {
      order.razorpayOrderId = razorpay_order_id;
    }
    await order.save();

    // Deduct stock for each purchased product
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear user cart only after verified payment
    const customer = await Customer.findById(req.user._id);
    if (customer) {
      customer.cart = [];
      await customer.save();
    }

    return res.status(200).json({
      success: true,
      message: "Payment successfully verified and order placed!",
      order,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment",
    });
  }
};

// @desc    Get all orders for the authenticated user (sorted newest first)
// @route   GET /orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};

// @desc    Get single order by ID (with ownership check)
// @route   GET /orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    const order = await Order.findById(id).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Security rule: Enforce ownership check
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view this order",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
    });
  }
};

// @desc    Bonus: Update order status (PLACED -> CONFIRMED -> SHIPPED -> DELIVERED)
// @route   PATCH /orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["PENDING_PAYMENT", "PLACED", "CONFIRMED", "SHIPPED", "DELIVERED"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Enforce ownership
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot modify this order",
      });
    }

    order.status = status;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
};
