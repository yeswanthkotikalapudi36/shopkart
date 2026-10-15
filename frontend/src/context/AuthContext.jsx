import React, { createContext, useContext, useState, useEffect } from "react";
import { getProfile, logoutUser as apiLogout, getWishlist } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlistCount, setWishlistCount] = useState(0);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const profile = await getProfile();
      if (profile && profile._id) {
        setUser(profile);
        // Refresh wishlist count from backend
        try {
          const wl = await getWishlist();
          setWishlistCount(wl.count || (wl.wishlist ? wl.wishlist.length : 0));
        } catch {
          setWishlistCount(profile.wishlist ? profile.wishlist.length : 0);
        }
      } else {
        setUser(null);
        setWishlistCount(0);
      }
    } catch (err) {
      setUser(null);
      setWishlistCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateWishlistCount = async () => {
    try {
      const wl = await getWishlist();
      setWishlistCount(wl.count !== undefined ? wl.count : wl.wishlist.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setWishlistCount(0);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        checkAuth,
        logout,
        wishlistCount,
        setWishlistCount,
        updateWishlistCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
