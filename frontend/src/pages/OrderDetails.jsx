import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getOrderById } from "../services/api";
import {
  Package,
  Calendar,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getOrderById(id);
        setOrder(data.order);
      } catch (err) {
        console.error("Order details fetch error:", err);
        setError(err.response?.data?.message || "Failed to load order details");
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
        <h2 className="state-title">Loading order details...</h2>
        <p className="state-desc">Retrieving verified snapshot data from ShopKart</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="state-container">
        <div className="state-icon-wrapper error">
          <AlertCircle size={36} />
        </div>
        <h2 className="state-title">Unable to view order</h2>
        <p className="state-desc">{error || "This order does not exist or you do not have permission to view it."}</p>
        <Link to="/orders" className="btn-primary" style={{ marginTop: "1rem" }}>
          Back to My Orders
        </Link>
      </div>
    );
  }

  const { shippingAddress, items, totalAmount, status, paymentStatus, razorpayOrderId, razorpayPaymentId, createdAt } = order;

  return (
    <div style={{ maxWidth: "850px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Back button */}
      <Link
        to="/orders"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--text-muted)",
          fontSize: "0.9rem",
          textDecoration: "none",
          marginBottom: "1.5rem",
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to My Orders</span>
      </Link>

      {/* Header Banner */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem",
          backdropFilter: "blur(12px)",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-faint)" }}>ORDER REFERENCE</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-main)", marginTop: "0.2rem" }}>
            Order #{order._id}
          </h1>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Calendar size={14} />
            <span>
              Placed on {new Date(createdAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: "600",
              background: paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: paymentStatus === "PAID" ? "var(--accent-emerald)" : "var(--accent-amber)",
            }}
          >
            ● {paymentStatus}
          </span>
          <span
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              fontWeight: "600",
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--primary)",
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Grid: Items Snapshot & Delivery/Payment */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Items Snapshot */}
        <section
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package size={18} style={{ color: "var(--primary)" }} />
            <span>Items Snapshot ({items?.length})</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {items?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "var(--radius-sm)",
                      objectFit: "cover",
                      border: "1px solid var(--border-color)",
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.92rem", fontWeight: "600", color: "var(--text-main)" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-faint)", marginTop: "0.2rem" }}>
                    Qty: {item.quantity} × ₹{item.price?.toLocaleString("en-IN")}
                  </div>
                </div>
                <div style={{ fontWeight: "700", fontSize: "0.98rem", color: "var(--text-main)" }}>
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "1.25rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "1.1rem",
              fontWeight: "700",
            }}
          >
            <span>Total Paid</span>
            <span style={{ color: "var(--primary)" }}>₹{totalAmount?.toLocaleString("en-IN")}</span>
          </div>
        </section>

        {/* Shipping & Payment Meta */}
        <section
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {/* Address */}
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MapPin size={18} style={{ color: "var(--accent-emerald)" }} />
              <span>Shipping Address</span>
            </h2>
            <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
              <div style={{ fontWeight: "600", color: "var(--text-main)" }}>{shippingAddress?.fullName}</div>
              <div>{shippingAddress?.addressLine1}</div>
              <div>
                {shippingAddress?.city}, {shippingAddress?.state} - {shippingAddress?.pincode}
              </div>
              <div style={{ marginTop: "0.3rem", color: "var(--text-faint)" }}>
                Phone: {shippingAddress?.phone}
              </div>
            </div>
          </div>

          {/* Payment Identifiers */}
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CreditCard size={18} style={{ color: "var(--primary)" }} />
              <span>Razorpay Transaction Data</span>
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
              <div>
                <span style={{ color: "var(--text-faint)", display: "block" }}>RAZORPAY ORDER ID</span>
                <code style={{ color: "var(--text-main)" }}>{razorpayOrderId || "N/A"}</code>
              </div>
              {razorpayPaymentId && (
                <div>
                  <span style={{ color: "var(--text-faint)", display: "block" }}>RAZORPAY PAYMENT ID</span>
                  <code style={{ color: "var(--accent-emerald)" }}>{razorpayPaymentId}</code>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
