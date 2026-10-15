import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getProductById, toggleWishlist, getWishlist } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Heart, ShoppingCart, ArrowLeft, Loader2, AlertCircle, CheckCircle2, ShieldCheck, Truck } from "lucide-react";

export default function ProductDetails() {
  const { id } = useParams();
  const { user, updateWishlistCount } = useAuth();
  const { addToCart, cartItems } = useCart();
  
  const [product, setProduct] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState("");
  const [cartFeedback, setCartFeedback] = useState("");

  const cartItem = (cartItems || []).find(
    (item) => (item.product?._id || item.product).toString() === id.toString()
  );
  const cartQty = cartItem?.quantity || 0;

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getProductById(id);
        setProduct(data.product);

        // Check if item is in user's wishlist
        if (user) {
          try {
            const wl = await getWishlist();
            if (wl.wishlist) {
              const inWishlist = wl.wishlist.some(
                (item) => (item._id || item).toString() === id.toString()
              );
              setIsWishlisted(inWishlist);
            }
          } catch {
            // ignore wishlist check error
          }
        }
      } catch (err) {
        console.error("Error loading product details:", err);
        setError(err.response?.data?.message || "Failed to load product details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id, user]);

  const handleWishlistToggle = async () => {
    if (!user) {
      alert("Please login first to manage your wishlist.");
      return;
    }

    if (savingWishlist) return;

    try {
      setSavingWishlist(true);
      const res = await toggleWishlist(product._id);
      setIsWishlisted(res.saved);
      if (updateWishlistCount) {
        await updateWishlistCount();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update wishlist");
    } finally {
      setSavingWishlist(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      alert("Please login first to add items to your cart.");
      return;
    }
    if (product.stock <= 0) return;
    if (cartQty >= product.stock) {
      setCartFeedback(`Cannot add more: you already have all available units (${product.stock}) in your cart.`);
      setTimeout(() => setCartFeedback(""), 4000);
      return;
    }

    try {
      setAddingToCart(true);
      await addToCart(product._id);
      setCartFeedback("Successfully added to your shopping cart!");
      setTimeout(() => setCartFeedback(""), 4000);
    } catch (err) {
      setCartFeedback(err.response?.data?.message || "Failed to add to cart");
      setTimeout(() => setCartFeedback(""), 4000);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper loading">
          <Loader2 size={36} className="spinner" />
        </div>
        <h2 className="state-title">Loading Product Details</h2>
        <p className="state-desc">Fetching specifications and inventory...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper error">
          <AlertCircle size={36} />
        </div>
        <h2 className="state-title">Product Not Found</h2>
        <p className="state-desc">{error || "The requested item does not exist in ShopKart."}</p>
        <Link to="/products" className="btn-primary">
          <ArrowLeft size={16} />
          <span>Back to Products</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link to="/products" className="btn-secondary" style={{ display: "inline-flex" }}>
          <ArrowLeft size={16} />
          <span>Back to Catalog</span>
        </Link>
      </div>

      <div className="details-page-grid">
        {/* Product Image */}
        <div className="details-image-wrap">
          <img
            src={product.image}
            alt={product.name}
            className="details-image"
          />
        </div>

        {/* Details & Actions */}
        <div className="details-content">
          <div>
            <span className="card-category-tag" style={{ position: "static", display: "inline-block", marginBottom: "0.75rem" }}>
              {product.category}
            </span>
            <h1 className="details-title">{product.name}</h1>
          </div>

          <div className="details-price-row">
            <span className="details-price">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
            {product.stock > 0 ? (
              <span className="stock-badge stock-in" style={{ fontSize: "0.9rem", padding: "0.3rem 0.8rem" }}>
                {product.stock} units available
              </span>
            ) : (
              <span className="stock-badge stock-out" style={{ fontSize: "0.9rem", padding: "0.3rem 0.8rem" }}>
                Out of Stock
              </span>
            )}
          </div>

          <p className="details-desc">{product.description}</p>

          {cartFeedback && (
            <div className="alert-box alert-success" style={{ margin: "0.5rem 0" }}>
              <CheckCircle2 size={18} />
              <span>{cartFeedback}</span>
            </div>
          )}

          <div className="details-actions">
            {/* Add to Cart Button (Lab-05 Task 7 integration) */}
            <button
              onClick={handleAddToCart}
              className="btn-primary"
              style={{ flex: 1 }}
              disabled={product.stock <= 0 || addingToCart}
            >
              {addingToCart ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Adding to Cart...</span>
                </>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  <span>
                    {product.stock > 0
                      ? cartQty > 0
                        ? `Add Another (${cartQty} in cart)`
                        : "Add to Cart"
                      : "Out of Stock"}
                  </span>
                </>
              )}
            </button>

            {/* Wishlist Button (Lab-04 integration) */}
            <button
              onClick={handleWishlistToggle}
              disabled={savingWishlist}
              className={`btn-card-wishlist ${isWishlisted ? "active" : ""}`}
              style={{ padding: "0.75rem 1.4rem", fontSize: "0.95rem" }}
            >
              {savingWishlist ? (
                <>
                  <Loader2 size={18} className="spinner" />
                  <span>Saving...</span>
                </>
              ) : isWishlisted ? (
                <>
                  <Heart size={18} fill="currentColor" />
                  <span>Saved to Wishlist</span>
                </>
              ) : (
                <>
                  <Heart size={18} />
                  <span>Add to Wishlist</span>
                </>
              )}
            </button>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", fontSize: "0.85rem", color: "var(--text-faint)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Truck size={16} /> Free Express Delivery
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <ShieldCheck size={16} /> 1-Year Official Warranty
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
