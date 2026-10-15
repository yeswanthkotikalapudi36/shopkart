import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getWishlist, removeFromWishlist } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Heart, Trash2, Eye, ShoppingBag, Loader2, AlertCircle, ArrowRight } from "lucide-react";

export default function Wishlist() {
  const { updateWishlistCount } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getWishlist();
      setWishlist(data.wishlist || []);
      if (updateWishlistCount) {
        updateWishlistCount();
      }
    } catch (err) {
      console.error("Wishlist load error:", err);
      setError("Unable to load wishlist. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId) => {
    try {
      setRemovingId(productId);
      await removeFromWishlist(productId);
      setWishlist((prev) => prev.filter((item) => item._id !== productId));
      if (updateWishlistCount) {
        updateWishlistCount();
      }
    } catch (err) {
      console.error("Failed to remove item from wishlist:", err);
      alert(err.response?.data?.message || "Failed to remove item.");
    } finally {
      setRemovingId(null);
    }
  };

  const getStockBadge = (stock) => {
    if (stock <= 0) {
      return <span className="stock-badge stock-out">Out of Stock</span>;
    }
    if (stock <= 10) {
      return <span className="stock-badge stock-low">{stock} units left</span>;
    }
    return <span className="stock-badge stock-in">In Stock</span>;
  };

  // 10. Loading State (Lab-04 lines 313-326)
  if (loading) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper loading">
          <Loader2 size={36} className="spinner" />
        </div>
        <h2 className="state-title">Loading your wishlist...</h2>
        <p className="state-desc">Retrieving your saved favorites from ShopKart</p>
      </div>
    );
  }

  // 11. Error State (Lab-04 lines 329-342)
  if (error) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper error">
          <AlertCircle size={36} />
        </div>
        <h2 className="state-title">Something went wrong</h2>
        <p className="state-desc">{error}</p>
        <button onClick={fetchWishlist} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  // 9. Empty Wishlist State (Lab-04 lines 286-311)
  if (wishlist.length === 0) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper empty">
          <Heart size={36} />
        </div>
        <h2 className="state-title">Your wishlist is empty ❤️</h2>
        <p className="state-desc">
          Save products you love while exploring the catalog and find them here later.
        </p>
        <Link to="/products" className="btn-primary">
          <ShoppingBag size={18} />
          <span>Browse Products</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header (Lab-04 Section 6) */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.1rem", fontWeight: 700 }}>
            My Wishlist
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
            {wishlist.length} {wishlist.length === 1 ? "product" : "products"} saved
          </p>
        </div>

        <Link to="/products" className="btn-secondary">
          <span>Continue Shopping</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Grid of Wishlist Cards (Lab-04 Section 7) */}
      <div className="products-grid">
        {wishlist.map((item) => (
          <div key={item._id} className="product-card">
            <div className="card-image-wrap">
              <img
                src={item.image}
                alt={item.name}
                className="card-img"
                loading="lazy"
              />
              <span className="card-category-tag">{item.category}</span>
            </div>

            <div className="card-body">
              <h3 className="card-title" title={item.name}>
                {item.name}
              </h3>

              <div className="card-meta">
                <span className="card-price">₹{item.price.toLocaleString("en-IN")}</span>
                {getStockBadge(item.stock)}
              </div>

              <div className="card-actions">
                <Link
                  to={`/products/${item._id}`}
                  className="btn-card-details"
                >
                  <Eye size={15} />
                  <span>View Details</span>
                </Link>

                <button
                  onClick={() => handleRemove(item._id)}
                  disabled={removingId === item._id}
                  className="btn-logout"
                  style={{ borderRadius: "var(--radius-md)" }}
                  title="Remove from wishlist"
                >
                  {removingId === item._id ? (
                    <Loader2 size={15} className="spinner" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
