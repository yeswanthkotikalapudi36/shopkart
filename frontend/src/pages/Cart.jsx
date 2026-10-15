import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Loader2,
  AlertCircle,
  Truck,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function Cart() {
  const navigate = useNavigate();
  const {
    cartItems,
    loading,
    error,
    cartCount,
    subtotal,
    itemCount,
    updateQuantity,
    removeFromCart,
    fetchCart,
  } = useCart();

  const [busyItemId, setBusyItemId] = useState(null);
  const [checkoutFeedback, setCheckoutFeedback] = useState("");
  const [actionError, setActionError] = useState("");

  const handleQuantityChange = async (productId, currentQuantity, change, maxStock) => {
    const nextQty = currentQuantity + change;
    if (nextQty < 1) return;
    if (nextQty > maxStock) {
      setActionError(`Cannot exceed available stock of ${maxStock} units.`);
      setTimeout(() => setActionError(""), 3500);
      return;
    }

    try {
      setBusyItemId(productId);
      setActionError("");
      await updateQuantity(productId, nextQty);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update quantity");
      setTimeout(() => setActionError(""), 3500);
    } finally {
      setBusyItemId(null);
    }
  };

  const handleRemove = async (productId) => {
    try {
      setBusyItemId(productId);
      setActionError("");
      await removeFromCart(productId);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to remove item from cart");
      setTimeout(() => setActionError(""), 3500);
    } finally {
      setBusyItemId(null);
    }
  };

  const handleCheckout = () => {
    navigate("/checkout");
  };

  // 17. Loading State (Lab-05 Task 17)
  if (loading && cartItems.length === 0) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper loading">
          <Loader2 size={36} className="spinner" />
        </div>
        <h2 className="state-title">Loading your cart...</h2>
        <p className="state-desc">Retrieving your saved bag from ShopKart</p>
      </div>
    );
  }

  // 17. Error State (Lab-05 Task 17)
  if (error && cartItems.length === 0) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper error">
          <AlertCircle size={36} />
        </div>
        <h2 className="state-title">Unable to load your cart.</h2>
        <p className="state-desc">{error}</p>
        <button onClick={fetchCart} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  // 17. Empty State (Lab-05 Task 17)
  if (cartItems.length === 0) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper empty">
          <ShoppingCart size={36} />
        </div>
        <h2 className="state-title">Your cart is empty 🛒</h2>
        <p className="state-desc">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/products" className="btn-primary">
          <ShoppingBag size={18} />
          <span>Browse Products</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.1rem",
              fontWeight: 700,
            }}
          >
            My Shopping Cart
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
            {itemCount} {itemCount === 1 ? "product" : "products"} ({cartCount} total units)
          </p>
        </div>

        <Link to="/products" className="btn-secondary">
          <span>Continue Shopping</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {actionError && (
        <div className="alert-box alert-error" style={{ marginBottom: "1.5rem" }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {checkoutFeedback && (
        <div className="alert-box alert-success" style={{ marginBottom: "1.5rem" }}>
          <CheckCircle2 size={18} />
          <span>{checkoutFeedback}</span>
        </div>
      )}

      {/* Cart Layout: Items + Order Summary */}
      <div className="cart-layout">
        {/* Left Column: Cart Items List */}
        <div className="cart-items-list">
          {cartItems.map((item) => {
            const product = item.product || {};
            const isBusy = busyItemId === product._id;
            const isAtMaxStock = item.quantity >= product.stock;

            return (
              <div key={product._id} className="cart-item-card">
                {/* Thumbnail */}
                <div className="cart-item-img-wrap">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="cart-item-img"
                    loading="lazy"
                  />
                </div>

                {/* Details */}
                <div className="cart-item-details">
                  <Link
                    to={`/products/${product._id}`}
                    className="cart-item-title"
                    title={product.name}
                  >
                    {product.name}
                  </Link>

                  <div className="cart-item-unit-price">
                    ₹{product.price?.toLocaleString("en-IN")} per unit
                  </div>

                  {isAtMaxStock && (
                    <div className="cart-item-stock-warning">
                      Maximum available quantity reached ({product.stock})
                    </div>
                  )}

                  {/* Controls: Quantity + Remove */}
                  <div className="cart-item-controls" style={{ marginTop: "0.6rem" }}>
                    {/* Quantity Selector: [-] 2 [+] */}
                    <div className="qty-controller">
                      <button
                        onClick={() =>
                          handleQuantityChange(product._id, item.quantity, -1, product.stock)
                        }
                        disabled={item.quantity <= 1 || isBusy}
                        className="qty-btn"
                        title="Decrease quantity"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="qty-display">
                        {isBusy ? <Loader2 size={14} className="spinner" /> : item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          handleQuantityChange(product._id, item.quantity, 1, product.stock)
                        }
                        disabled={isAtMaxStock || isBusy}
                        className="qty-btn"
                        title={
                          isAtMaxStock
                            ? `Maximum available stock is ${product.stock}`
                            : "Increase quantity"
                        }
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Remove Action */}
                    <button
                      onClick={() => handleRemove(product._id)}
                      disabled={isBusy}
                      className="cart-item-remove-btn"
                      title="Remove product from cart"
                    >
                      {isBusy ? (
                        <Loader2 size={14} className="spinner" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Item Total (Price * Quantity) */}
                <div className="cart-item-subtotal">
                  ₹{((product.price || 0) * item.quantity).toLocaleString("en-IN")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary Box */}
        <aside className="order-summary-box">
          <h2 className="summary-title">Order Summary</h2>

          <div className="summary-row">
            <span>Distinct Items</span>
            <span>{itemCount}</span>
          </div>

          <div className="summary-row">
            <span>Total Units</span>
            <span>{cartCount} units</span>
          </div>

          <div className="summary-row">
            <span>Shipping</span>
            <span className="free-shipping-tag">FREE</span>
          </div>

          <div className="summary-row total">
            <span>Subtotal</span>
            <span>₹{subtotal.toLocaleString("en-IN")}</span>
          </div>

          <button
            onClick={handleCheckout}
            className="btn-primary"
            style={{ width: "100%", marginTop: "1.5rem", padding: "0.85rem 1rem" }}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={18} />
          </button>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-color)",
              fontSize: "0.82rem",
              color: "var(--text-faint)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Truck size={16} style={{ color: "var(--primary-accent)" }} />
              <span>Complimentary Express Shipping on all orders</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={16} style={{ color: "var(--primary-accent)" }} />
              <span>100% Authentic Products & Secure Checkout</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
