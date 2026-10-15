import React, { useState, useEffect, useCallback } from "react";
import { getProducts, getWishlist } from "../services/api";
import ProductCard from "../components/ProductCard";
import { Search, SlidersHorizontal, Loader2, AlertCircle, ShoppingBag, RotateCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["All Categories", "Electronics", "Fashion", "Books", "Home"];

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter State (Lab-03 Task 7)
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (search.trim()) params.search = search.trim();
      if (category && category !== "All Categories") params.category = category;

      // Parallel fetch products and user's wishlist if authenticated
      const promises = [getProducts(params)];
      if (user) {
        promises.push(getWishlist().catch(() => ({ wishlist: [] })));
      }

      const [prodData, wlData] = await Promise.all(promises);

      setProducts(prodData.products || []);

      if (wlData && wlData.wishlist) {
        const ids = new Set(wlData.wishlist.map((item) => (item._id ? item._id : item)));
        setWishlistIds(ids);
      }
    } catch (err) {
      console.error("Failed to load catalog products:", err);
      setError("Something went wrong while loading products.");
    } finally {
      setLoading(false);
    }
  }, [search, category, user]);

  useEffect(() => {
    // Debounce search slightly to avoid excessive calls on rapid keystrokes
    const timer = setTimeout(() => {
      loadData();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadData]);

  const handleWishlistChange = (productId, isSaved) => {
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (isSaved) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  const handleResetFilters = () => {
    setSearch("");
    setCategory("All Categories");
  };

  return (
    <div>
      {/* Header Banner */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.1rem", fontWeight: 700 }}>
          Explore Products
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "0.25rem" }}>
          Discover curated gear, tech essentials, fashion, and books on ShopKart.
        </p>
      </div>

      {/* Toolbar: Search Bar + Category Dropdown (Lab-03 Task 7) */}
      <div className="catalog-toolbar">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-select-wrapper">
          <SlidersHorizontal size={17} style={{ color: "var(--text-muted)" }} />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="category-select"
            aria-label="Category Filter"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State (Lab-03 line 422) */}
      {loading && (
        <div className="state-container">
          <div className="state-icon-wrapper loading">
            <Loader2 size={36} className="spinner" />
          </div>
          <h2 className="state-title">Loading products...</h2>
          <p className="state-desc">Fetching the latest inventory from ShopKart servers</p>
        </div>
      )}

      {/* Error State (Lab-03 line 432) */}
      {!loading && error && (
        <div className="state-container">
          <div className="state-icon-wrapper error">
            <AlertCircle size={36} />
          </div>
          <h2 className="state-title">Something went wrong</h2>
          <p className="state-desc">{error}</p>
          <button onClick={loadData} className="btn-primary">
            Try Again
          </button>
        </div>
      )}

      {/* Empty State (Lab-03 line 440) */}
      {!loading && !error && products.length === 0 && (
        <div className="state-container">
          <div className="state-icon-wrapper empty">
            <ShoppingBag size={36} />
          </div>
          <h2 className="state-title">No products found</h2>
          <p className="state-desc">
            No items matched "{search}" in {category}. Try adjusting your keywords or clearing filters.
          </p>
          <button onClick={handleResetFilters} className="btn-secondary">
            <RotateCcw size={16} />
            <span>Reset Filters</span>
          </button>
        </div>
      )}

      {/* Products Grid (Lab-03 Task 6) */}
      {!loading && !error && products.length > 0 && (
        <div className="products-grid">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              isWishlisted={wishlistIds.has(product._id)}
              onWishlistChange={handleWishlistChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
