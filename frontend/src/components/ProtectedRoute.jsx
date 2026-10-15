import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="state-container" style={{ minHeight: "50vh" }}>
        <div className="state-icon-wrapper loading">
          <Loader2 className="spinner" size={32} />
        </div>
        <h2 className="state-title">Authenticating Session</h2>
        <p className="state-desc">Verifying your login status...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
