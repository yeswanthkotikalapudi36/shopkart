import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getOrderById } from "../services/api";
import {
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await getOrderById(id);
        setOrder(data.order);
      } catch (err) {
        console.error("Order fetch error:", err);
        setError(err.response?.data?.message || "Failed to load order confirmation details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper loading">
          <Loader2 size={36} className="spinner" />
        </div>
        <h2 className="state-title">Loading order confirmation...</h2>
        <p className="state-desc">Retrieving your confirmed purchase details from ShopKart</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper error">
          <AlertCircle size={36} />
        </div>
        <h2 className="state-title">Order not found</h2>
        <p className="state-desc">{error || "Could not retrieve the requested order."}</p>
        <Link to="/orders" className="btn-primary" style={{ marginTop: "1rem" }}>
          View My Orders
        </Link>
      </div>
    );
  }

  const { shippingAddress, items, totalAmount, status, paymentStatus, razorpayPaymentId, createdAt } = order;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Confirmation Hero Card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "var(--radius-lg)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
          backdropFilter: "blur(12px)",
          marginBottom: "2rem",
          boxShadow: "0 10px 30px rgba(16, 185, 129, 0.15)",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "var(--radius-full)",
            background: "rgba(16, 185, 129, 0.15)",
            color: "var(--accent-emerald)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <h1 style={{ fontSize: "1.9rem", fontWeight: "700", color: "var(--text-main)", marginBottom: "0.5rem" }}>
          Order Placed Successfully! 🎉
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "520px", margin: "0 auto 1.5rem" }}>
          Your payment has been verified and your order has been saved successfully in ShopKart.
        </p>

        {/* Quick Order Info Tags */}
        <div
          style={{
            display: "inline-flex",
            flexWrap: "wrap",
            gap: "1rem",
            justifyContent: "center",
            background: "rgba(0,0,0,0.25)",
            padding: "0.85rem 1.5rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", display: "block" }}>ORDER ID</span>
            <span style={{ fontFamily: "monospace", fontWeight: "600", color: "var(--primary)" }}>{order._id}</span>
          </div>
          <div style={{ width: "1px", background: "var(--border-color)" }} />
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", display: "block" }}>TOTAL AMOUNT</span>
            <span style={{ fontWeight: "700", color: "var(--text-main)" }}>₹{totalAmount?.toLocaleString("en-IN")}</span>
          </div>
          <div style={{ width: "1px", background: "var(--border-color)" }} />
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", display: "block" }}>STATUS</span>
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "var(--accent-emerald)",
                background: "rgba(16, 185, 129, 0.15)",
                padding: "0.15rem 0.55rem",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "2rem", flexWrap: "wrap" }}>
          <Link
            to="/orders"
            className="btn-primary"
            style={{ padding: "0.75rem 1.5rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Package size={18} />
            <span>View My Orders</span>
          </Link>
          <Link
            to="/products"
            style={{
              padding: "0.75rem 1.5rem",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border-color)",
              color: "var(--text-main)",
              borderRadius: "var(--radius-sm)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: "500",
            }}
          >
            <ShoppingBag size={18} />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Purchased Items Snapshot */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package size={18} style={{ color: "var(--primary)" }} />
            <span>Purchased Items ({items?.length})</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {items?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "var(--radius-sm)",
                      objectFit: "cover",
                      border: "1px solid var(--border-color)",
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: "500", color: "var(--text-main)" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
                    Qty: {item.quantity} × ₹{item.price?.toLocaleString("en-IN")}
                  </div>
                </div>
                <div style={{ fontWeight: "600", fontSize: "0.92rem", color: "var(--text-main)" }}>
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery & Payment Summary */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MapPin size={18} style={{ color: "var(--accent-emerald)" }} />
              <span>Delivery Address</span>
            </h2>
            <div style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
              <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{shippingAddress?.fullName}</div>
              <div>{shippingAddress?.addressLine1}</div>
              <div>
                {shippingAddress?.city}, {shippingAddress?.state} - {shippingAddress?.pincode}
              </div>
              <div style={{ marginTop: "0.3rem", color: "var(--text-faint)" }}>Phone: {shippingAddress?.phone}</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CreditCard size={18} style={{ color: "var(--primary)" }} />
              <span>Payment Details</span>
            </h2>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <div>Method: <strong>Razorpay Test Mode</strong></div>
              <div>Payment Status: <span style={{ color: "var(--accent-emerald)", fontWeight: "600" }}>{paymentStatus}</span></div>
              {razorpayPaymentId && <div>Payment ID: <code style={{ color: "var(--text-main)" }}>{razorpayPaymentId}</code></div>}
              <div>Date: {new Date(createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
