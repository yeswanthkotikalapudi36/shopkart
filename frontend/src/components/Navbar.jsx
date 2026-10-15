import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingBag, Heart, Home, LogOut, User, Sparkles, ShoppingCart, Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout, wishlistCount } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link to={user ? "/products" : "/login"} className="navbar-logo">
          <div className="logo-badge">
            <ShoppingBag size={18} />
          </div>
          <span>ShopKart</span>
        </Link>

        {/* Navigation Links */}
        <nav className="navbar-nav">
          {user ? (
            <>
              <NavLink
                to="/home"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <Home size={17} />
                <span>Home</span>
              </NavLink>

              <NavLink
                to="/products"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <Sparkles size={17} />
                <span>Products</span>
              </NavLink>

              <NavLink
                to="/wishlist"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <Heart size={17} />
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="wishlist-pill">{wishlistCount}</span>
                )}
              </NavLink>

              <NavLink
                to="/cart"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <ShoppingCart size={17} />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="cart-pill">{cartCount}</span>
                )}
              </NavLink>

              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <Package size={17} />
                <span>Orders</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                Register
              </NavLink>
            </>
          )}
        </nav>

        {/* User Info & Actions */}
        <div className="navbar-actions">
          {user ? (
            <>
              <div className="user-badge" title={user.email}>
                <div className="user-avatar">
                  {user.fullName ? user.fullName[0].toUpperCase() : "U"}
                </div>
                <span>{user.fullName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-logout"
                title="Log out of ShopKart"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary" style={{ padding: "0.45rem 1rem", fontSize: "0.85rem" }}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
