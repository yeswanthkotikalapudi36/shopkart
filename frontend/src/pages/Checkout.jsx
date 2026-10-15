import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { createPaymentOrder, verifyPayment } from "../services/api";
import {
  CreditCard,
  Truck,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Lock,
  ShoppingBag,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, cartCount, subtotal, clearCart, initialLoaded } = useCart();

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || "",
    addressLine1: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [testModalData, setTestModalData] = useState(null);

  // Sync with user data if loaded late
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        fullName: prev.fullName || user.fullName || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user]);

  // Load Razorpay Checkout Script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Validate Form Fields (Task 3 & 8)
  const validate = () => {
    const newErrors = {};

    if (!form.fullName || !form.fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }

    if (!form.phone || !form.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else {
      const cleanPhone = form.phone.trim().replace(/[\s\-()]/g, "");
      if (!/^\+?[0-9]{10,14}$/.test(cleanPhone)) {
        newErrors.phone = "Phone must contain a valid 10-digit number format.";
      }
    }

    if (!form.addressLine1 || !form.addressLine1.trim()) {
      newErrors.addressLine1 = "Address line is required.";
    }

    if (!form.city || !form.city.trim()) {
      newErrors.city = "City is required.";
    }

    if (!form.state || !form.state.trim()) {
      newErrors.state = "State is required.";
    }

    if (!form.pincode || !form.pincode.trim()) {
      newErrors.pincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(form.pincode.trim())) {
      newErrors.pincode = "Pincode must contain 6 digits.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (checkoutError) setCheckoutError("");
  };

  // Handle Complete Order Placement via Razorpay
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    // 1. Client-side Form Validation
    if (!validate()) {
      return;
    }

    // 2. Prevent empty cart checkout
    if (cartItems.length === 0) {
      setCheckoutError("Your cart is empty. Please add items before checking out.");
      return;
    }

    setLoading(true);
    setCheckoutError("");

    try {
      // 3. Request backend to validate stock, snapshot prices and create Razorpay order
      const orderPayload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        addressLine1: form.addressLine1.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      };

      const orderData = await createPaymentOrder(orderPayload);

      // 4. Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();

      // Check if Razorpay SDK loaded and is supported
      if (!isScriptLoaded || typeof window.Razorpay !== "function") {
        console.warn("Razorpay script not available. Showing test sandbox modal.");
        setTestModalData(orderData);
        setLoading(false);
        return;
      }

      // 5. Open Razorpay Checkout modal
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "ShopKart",
        description: `Order #${orderData.shopKartOrderId}`,
        image: "https://cdn-icons-png.flaticon.com/512/3081/3081840.png",
        order_id: orderData.razorpayOrderId,
        handler: async function (response) {
          // Do NOT trust payment on client. Send to backend for HMAC SHA256 verification
          await completeVerification({
            shopKartOrderId: orderData.shopKartOrderId,
            razorpay_order_id: response.razorpay_order_id || orderData.razorpayOrderId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: form.fullName,
          contact: form.phone,
          email: user?.email || "",
        },
        notes: {
          shopKartOrderId: orderData.shopKartOrderId,
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      try {
        const rzp = new window.Razorpay(options);

        rzp.on("payment.failed", function (response) {
          console.error("Payment failed event:", response.error);
          setLoading(false);
          setCheckoutError(
            `Payment failed: ${response.error?.description || "Transaction cancelled"}. Your cart has not been cleared. Please try again.`
          );
        });

        rzp.open();
      } catch (openErr) {
        console.warn("Razorpay window open fallback:", openErr.message);
        setTestModalData(orderData);
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout submission error:", err);
      const msg =
        err.response?.data?.message ||
        "Failed to initiate order. Please check your cart or try again.";
      setCheckoutError(msg);
      setLoading(false);
    }
  };

  // Backend Payment Verification Handler
  const completeVerification = async (verifyPayload) => {
    setLoading(true);
    setVerifying(true);
    try {
      const response = await verifyPayment(verifyPayload);

      if (response.success) {
        // Clear global cart state immediately
        clearCart();
        // Navigate to confirmation screen
        navigate(`/order-success/${verifyPayload.shopKartOrderId}`);
      } else {
        setCheckoutError(response.message || "Payment verification failed.");
      }
    } catch (err) {
      console.error("Payment verification failed:", err);
      const msg =
        err.response?.data?.message ||
        "Payment verification failed. Cart retained. Please contact support.";
      setCheckoutError(msg);
    } finally {
      setLoading(false);
      setVerifying(false);
      setTestModalData(null);
    }
  };

  // If user opens /checkout with an empty cart
  if (initialLoaded && cartItems.length === 0) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper empty">
          <ShoppingBag size={36} />
        </div>
        <h2 className="state-title">Your cart is empty</h2>
        <p className="state-desc">
          You cannot proceed to checkout without any products in your cart.
        </p>
        <Link to="/products" className="btn-primary" style={{ marginTop: "1rem" }}>
          Explore Products
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-page" style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Back button & Page Title */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          to="/cart"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            textDecoration: "none",
            marginBottom: "0.75rem",
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Cart</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: "700", color: "var(--text-main)" }}>
              Checkout & Payment
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
              Provide your delivery address to complete your order via Razorpay Test Mode
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              padding: "0.45rem 0.85rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.82rem",
              color: "var(--primary)",
            }}
          >
            <Lock size={14} />
            <span>256-Bit Encrypted Razorpay Sandbox</span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {checkoutError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            color: "#fda4af",
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-md)",
            marginBottom: "1.5rem",
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: "0.9rem" }}>{checkoutError}</div>
          <button
            onClick={() => setCheckoutError("")}
            style={{ background: "none", border: "none", color: "#fda4af", cursor: "pointer", fontSize: "1.2rem" }}
          >
            ×
          </button>
        </div>
      )}

      {/* 2-Column Checkout Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* Left Column: Shipping Address Form (Task 2 & 3) */}
        <section
          className="checkout-form-card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "1.75rem",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <div
              style={{
                background: "rgba(99, 102, 241, 0.15)",
                color: "var(--primary)",
                padding: "0.5rem",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Truck size={20} />
            </div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-main)" }}>
              Shipping Details
            </h2>
          </div>

          <form onSubmit={handlePlaceOrder} id="checkout-shipping-form">
            {/* Full Name */}
            <div style={{ marginBottom: "1.1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  color: "var(--text-muted)",
                  marginBottom: "0.4rem",
                }}
              >
                Full Name <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="e.g. Aarav Sharma"
                className={`input-field ${errors.fullName ? "error" : ""}`}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(0,0,0,0.25)",
                  border: errors.fullName ? "1px solid var(--accent-rose)" : "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-main)",
                  outline: "none",
                }}
              />
              {errors.fullName && (
                <div style={{ color: "var(--accent-rose)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  {errors.fullName}
                </div>
              )}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: "1.1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  color: "var(--text-muted)",
                  marginBottom: "0.4rem",
                }}
              >
                Phone Number <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className={`input-field ${errors.phone ? "error" : ""}`}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(0,0,0,0.25)",
                  border: errors.phone ? "1px solid var(--accent-rose)" : "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-main)",
                  outline: "none",
                }}
              />
              {errors.phone && (
                <div style={{ color: "var(--accent-rose)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  {errors.phone}
                </div>
              )}
            </div>

            {/* Address Line 1 */}
            <div style={{ marginBottom: "1.1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  color: "var(--text-muted)",
                  marginBottom: "0.4rem",
                }}
              >
                Street Address <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="text"
                name="addressLine1"
                value={form.addressLine1}
                onChange={handleChange}
                placeholder="e.g. 22 MG Road, Koramangala"
                className={`input-field ${errors.addressLine1 ? "error" : ""}`}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(0,0,0,0.25)",
                  border: errors.addressLine1 ? "1px solid var(--accent-rose)" : "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-main)",
                  outline: "none",
                }}
              />
              {errors.addressLine1 && (
                <div style={{ color: "var(--accent-rose)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  {errors.addressLine1}
                </div>
              )}
            </div>

            {/* City & State Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.1rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: "500",
                    color: "var(--text-muted)",
                    marginBottom: "0.4rem",
                  }}
                >
                  City <span style={{ color: "var(--accent-rose)" }}>*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="e.g. Bengaluru"
                  className={`input-field ${errors.city ? "error" : ""}`}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: "rgba(0,0,0,0.25)",
                    border: errors.city ? "1px solid var(--accent-rose)" : "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    outline: "none",
                  }}
                />
                {errors.city && (
                  <div style={{ color: "var(--accent-rose)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                    {errors.city}
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    fontWeight: "500",
                    color: "var(--text-muted)",
                    marginBottom: "0.4rem",
                  }}
                >
                  State <span style={{ color: "var(--accent-rose)" }}>*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="e.g. Karnataka"
                  className={`input-field ${errors.state ? "error" : ""}`}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: "rgba(0,0,0,0.25)",
                    border: errors.state ? "1px solid var(--accent-rose)" : "1px solid var(--border-color)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-main)",
                    outline: "none",
                  }}
                />
                {errors.state && (
                  <div style={{ color: "var(--accent-rose)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                    {errors.state}
                  </div>
                )}
              </div>
            </div>

            {/* Pincode */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  color: "var(--text-muted)",
                  marginBottom: "0.4rem",
                }}
              >
                Pincode <span style={{ color: "var(--accent-rose)" }}>*</span>
              </label>
              <input
                type="text"
                name="pincode"
                maxLength="6"
                value={form.pincode}
                onChange={handleChange}
                placeholder="e.g. 560001"
                className={`input-field ${errors.pincode ? "error" : ""}`}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "rgba(0,0,0,0.25)",
                  border: errors.pincode ? "1px solid var(--accent-rose)" : "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-main)",
                  outline: "none",
                }}
              />
              {errors.pincode && (
                <div style={{ color: "var(--accent-rose)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  {errors.pincode}
                </div>
              )}
            </div>

            {/* Submit Button on Mobile or Form */}
            <button
              type="submit"
              disabled={loading || verifying}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "0.85rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
              }}
            >
              {loading || verifying ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>{verifying ? "Verifying Payment..." : "Processing Order..."}</span>
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Place Order • ₹{subtotal.toLocaleString("en-IN")}</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right Column: Order Summary (Task 2) */}
        <section
          className="checkout-summary-card"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "1.75rem",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-main)" }}>
              Order Summary
            </h2>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {cartCount} {cartCount === 1 ? "unit" : "units"}
            </span>
          </div>

          {/* Cart Items Snapshot Preview */}
          <div
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              marginBottom: "1.5rem",
              paddingRight: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            {cartItems.map((item) => {
              const p = item.product || {};
              return (
                <div
                  key={p._id || item._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    paddingBottom: "0.75rem",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{
                      width: "48px",
                      height: "48px",
                      objectFit: "cover",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.2)",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: "500",
                        color: "var(--text-main)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={p.name}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-faint)", marginTop: "0.15rem" }}>
                      Qty: {item.quantity} × ₹{(p.price || 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.92rem", fontWeight: "600", color: "var(--text-main)" }}>
                    ₹{((p.price || 0) * item.quantity).toLocaleString("en-IN")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calculation Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>Items Subtotal</span>
              <span>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>Shipping & Delivery</span>
              <span style={{ color: "var(--accent-emerald)", fontWeight: "600" }}>FREE</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
              <span>Payment Gateway Fee</span>
              <span style={{ color: "var(--accent-emerald)", fontWeight: "600" }}>₹0 (Waived)</span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--text-main)",
                fontSize: "1.15rem",
                fontWeight: "700",
                marginTop: "0.75rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <span>Total Payable</span>
              <span style={{ color: "var(--primary)" }}>₹{subtotal.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "0.65rem",
              fontSize: "0.82rem",
              color: "var(--text-faint)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={16} style={{ color: "var(--accent-emerald)" }} />
              <span>Razorpay Test Mode (No real charges will be made)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={16} style={{ color: "var(--primary)" }} />
              <span>Order snapshot captures current price and guarantees item stock</span>
            </div>
          </div>
        </section>
      </div>

      {/* Test Sandbox Simulator Modal (For TA Testing / Fallback) */}
      {testModalData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-lg)",
              maxWidth: "500px",
              width: "100%",
              padding: "2rem",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <CreditCard size={24} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-main)" }}>
                Razorpay Test Sandbox
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
              Razorpay Order created: <code>{testModalData.razorpayOrderId}</code>
              <br />
              Amount: ₹{(testModalData.amount / 100).toLocaleString("en-IN")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                onClick={() =>
                  completeVerification({
                    shopKartOrderId: testModalData.shopKartOrderId,
                    razorpay_order_id: testModalData.razorpayOrderId,
                    razorpay_payment_id: `pay_test_${Date.now()}`,
                    razorpay_signature: `mock_sig_${Date.now()}`,
                  })
                }
                className="btn-primary"
                style={{ padding: "0.75rem 1rem", width: "100%", justifyContent: "center" }}
              >
                Simulate Successful Test Payment
              </button>

              <button
                onClick={() =>
                  completeVerification({
                    shopKartOrderId: testModalData.shopKartOrderId,
                    razorpay_order_id: testModalData.razorpayOrderId,
                    razorpay_payment_id: `pay_fail_${Date.now()}`,
                    razorpay_signature: "invalid_tampered_signature_12345",
                  })
                }
                style={{
                  padding: "0.75rem 1rem",
                  width: "100%",
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#fda4af",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Simulate Invalid Signature (Should Reject & Keep Cart)
              </button>

              <button
                onClick={() => {
                  setTestModalData(null);
                  setCheckoutError("Payment cancelled. Cart preserved.");
                }}
                style={{
                  padding: "0.6rem 1rem",
                  width: "100%",
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
