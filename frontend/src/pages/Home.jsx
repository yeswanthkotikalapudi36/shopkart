import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProfile, changePassword } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Phone, Calendar, Sparkles, Heart, KeyRound, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function Home() {
  const { user: authUser, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Change Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: "", newPassword: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdError, setPwdError] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProfile();
      setProfile(data);
      if (setUser) setUser(data);
    } catch (err) {
      console.error("Profile load error:", err);
      setError("Failed to load customer profile. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      setPwdError("Both old and new passwords are required");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters long");
      return;
    }

    try {
      setPwdLoading(true);
      setPwdError("");
      setPwdSuccess("");
      await changePassword(passwordData);
      setPwdSuccess("Password changed successfully!");
      setPasswordData({ oldPassword: "", newPassword: "" });
      setTimeout(() => setPwdSuccess(""), 4000);
    } catch (err) {
      setPwdError(err.response?.data?.message || "Failed to update password");
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper loading">
          <Loader2 className="spinner" size={32} />
        </div>
        <h2 className="state-title">Loading Customer Profile</h2>
        <p className="state-desc">Fetching your account details from ShopKart...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper error">
          <AlertCircle size={32} />
        </div>
        <h2 className="state-title">Profile Unavailable</h2>
        <p className="state-desc">{error || "Could not retrieve account details."}</p>
        <button onClick={fetchProfile} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Profile Header */}
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {profile.fullName ? profile.fullName[0].toUpperCase() : "U"}
          </div>
          <div>
            <h1 style={{ fontSize: "1.85rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>
              Welcome back, {profile.fullName}!
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: "0.2rem" }}>
              ShopKart Verified Customer Account
            </p>
          </div>
        </div>

        {/* Customer Information Grid (Lab-02 Task 3 requirements) */}
        <div className="profile-info-grid">
          <div className="info-item">
            <span className="info-label">Customer Name</span>
            <span className="info-value">{profile.fullName}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email Address</span>
            <span className="info-value">{profile.email}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Phone Number</span>
            <span className="info-value">{profile.phone}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Saved Wishlist Items</span>
            <span className="info-value">{profile.wishlist ? profile.wishlist.length : 0} Products</span>
          </div>
        </div>

        {/* Quick Shortcut CTAs */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
          <Link to="/products" className="btn-primary">
            <Sparkles size={18} />
            <span>Browse Product Catalog</span>
          </Link>

          <Link to="/wishlist" className="btn-secondary">
            <Heart size={18} />
            <span>View Saved Wishlist</span>
          </Link>

          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="btn-secondary"
          >
            <KeyRound size={18} />
            <span>{showPasswordForm ? "Hide Password Settings" : "Change Password"}</span>
          </button>
        </div>

        {/* Bonus: Change Password Form */}
        {showPasswordForm && (
          <div className="password-box">
            <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", fontWeight: 600 }}>
              Update Security Credentials
            </h3>

            {pwdError && (
              <div className="alert-box alert-error">
                <AlertCircle size={18} />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="alert-box alert-success">
                <CheckCircle2 size={18} />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ maxWidth: "420px" }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, oldPassword: e.target.value })
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="form-input"
                />
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="btn-primary"
                style={{ marginTop: "0.5rem" }}
              >
                {pwdLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
