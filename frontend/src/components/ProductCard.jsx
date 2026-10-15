import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Eye, Loader2, ShoppingCart, Check } from "lucide-react";
import { toggleWishlist } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function ProductCard({
  product,
  isWishlisted: initialIsWishlisted = false,
  onWishlistChange,
}) {
  const { user, updateWishlistCount } = useAuth();
  const { addToCart, cartItems } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(initialIsWishlisted);
  const [saving, setSaving] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const cartItem = (cartItems || []).find(
    (item) => (item.product?._id || item.product).toString() === product._id.toString()
  );
  const isInCart = Boolean(cartItem);
  const cartQty = cartItem?.quantity || 0;

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("Please login first to add items to your wishlist.");
      return;
    }

    if (saving) return; // Prevent duplicate clicks while request is running

    try {
      setSaving(true);
      setErrorMsg("");
      const res = await toggleWishlist(product._id);
      setIsWishlisted(res.saved);
      if (updateWishlistCount) {
        await updateWishlistCount();
      }
      if (onWishlistChange) {
        onWishlistChange(product._id, res.saved);
      }
    } catch (err) {
      console.error("Wishlist toggle error:", err);
      const msg = err.response?.data?.message || "Failed to update wishlist";
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("Please login first to add items to your cart.");
      return;
    }

    if (product.stock <= 0) return;

    if (cartQty >= product.stock) {
      setErrorMsg(`Maximum stock available (${product.stock}) already in cart`);
      setTimeout(() => setErrorMsg(""), 3000);
      return;
    }

    try {
      setAddingToCart(true);
      setErrorMsg("");
      await addToCart(product._id);
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 2000);
    } catch (err) {
      console.error("Add to cart error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to add to cart");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setAddingToCart(false);
    }
  };

  const getStockBadge = (stock) => {
    if (stock <= 0) {
      return <span className="stock-badge stock-out">Out of Stock</span>;
    }
    if (stock <= 10) {
      return <span className="stock-badge stock-low">{stock} units left</span>;
    }
    return <span className="stock-badge stock-in">In Stock ({stock})</span>;
  };

  return (
    <div className="product-card">
      <div className="card-image-wrap">
        <img
          src={product.image}
          alt={product.name}
          className="card-img"
          loading="lazy"
        />
        <span className="card-category-tag">{product.category}</span>
        
        {/* Quick heart toggle on card image */}
        <button
          onClick={handleWishlistToggle}
          disabled={saving}
          className={`card-heart-btn ${isWishlisted ? "active" : ""}`}
          title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          aria-label="Wishlist toggle"
        >
          {saving ? (
            <Loader2 size={16} className="spinner" />
          ) : (
            <Heart
              size={18}
              fill={isWishlisted ? "currentColor" : "none"}
            />
          )}
        </button>
      </div>

      <div className="card-body">
        <h3 className="card-title" title={product.name}>
          {product.name}
        </h3>

        <div className="card-meta">
          <span className="card-price">₹{product.price.toLocaleString("en-IN")}</span>
          {getStockBadge(product.stock)}
        </div>

        {errorMsg && (
          <p style={{ color: "#f87171", fontSize: "0.78rem", marginBottom: "0.5rem" }}>
            {errorMsg}
          </p>
        )}

        <div className="card-actions">
          <Link
            to={`/products/${product._id}`}
            className="btn-card-details"
          >
            <Eye size={15} />
            <span>Details</span>
          </Link>

          <button
            onClick={handleAddToCart}
            disabled={addingToCart || product.stock <= 0}
            className={`btn-card-cart ${isInCart ? "in-cart" : ""}`}
            title={isInCart ? `Already in cart (${cartQty}) - click to add another` : "Add to Cart"}
          >
            {addingToCart ? (
              <>
                <Loader2 size={14} className="spinner" />
                <span>Adding...</span>
              </>
            ) : cartSuccess ? (
              <>
                <Check size={14} />
                <span>Added!</span>
              </>
            ) : product.stock <= 0 ? (
              <span>Out of Stock</span>
            ) : isInCart ? (
              <>
                <ShoppingCart size={14} />
                <span>Add Another ({cartQty})</span>
              </>
            ) : (
              <>
                <ShoppingCart size={14} />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
