/**
 * Comprehensive Automated Verification Script for Lab 06 — ShopKart Checkout & Orders
 * Verifies all 10 Test Plan cases & Razorpay Signature Verification
 */

require("./backend/node_modules/dotenv").config({ path: "./backend/.env" });
const crypto = require("crypto");

let server;
let baseUrl;
let cookie = "";

async function makeRequest(path, options = {}) {
  const url = new URL(path, baseUrl);
  const headers = { ...options.headers };

  if (cookie && !options.noCookie) {
    headers["Cookie"] = cookie;
  }

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url.toString(), {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie && !options.noCookie) {
    cookie = setCookie.split(";")[0];
  }

  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return { status: res.status, data, headers: res.headers };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("   🧪 RUNNING LAB 06 CHECKOUT & ORDERS TEST SUITE       ");
  console.log("========================================================\n");

  baseUrl = "http://localhost:5001";
  console.log(`[Test Setup] Testing against live server: ${baseUrl}\n`);

  try {
    // 0. Register & login test user 1
    const testEmail1 = `lab06_user_${Date.now()}@example.com`;
    const regRes1 = await makeRequest("/customers/register", {
      method: "POST",
      body: {
        fullName: "Aarav Sharma",
        email: testEmail1,
        password: "Password@123",
        phone: "9876543210",
      },
    });
    assert(regRes1.status === 201, "User 1 registered successfully");

    const loginRes1 = await makeRequest("/customers/login", {
      method: "POST",
      body: { email: testEmail1, password: "Password@123" },
    });
    assert(loginRes1.status === 200, "User 1 logged in & received auth cookie");

    // Fetch existing product for test
    const productsRes = await makeRequest("/products");
    assert(productsRes.status === 200, "Products catalogue fetched");
    const testProduct = productsRes.data.products[0];
    assert(testProduct && testProduct._id, "Found at least one sample product");
    console.log(`[Test Setup] Selected test product: "${testProduct.name}" (Stock: ${testProduct.stock}, Price: ₹${testProduct.price})\n`);

    // TEST 1 — Empty cart checkout rejection (Test Plan 1)
    console.log("--- Test 1: Empty Cart Checkout ---");
    const emptyOrderRes = await makeRequest("/orders/create-payment-order", {
      method: "POST",
      body: {
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        },
      },
    });
    assert(emptyOrderRes.status === 400, "Empty cart checkout correctly returns 400 Bad Request");
    assert(emptyOrderRes.data.success === false, "Response returns success: false");

    // TEST 8 (Security) — Fake totalAmount sent by frontend must be ignored
    console.log("\n--- Test 2: Add Product to Cart & Server-Side Price Calculation ---");
    const addCartRes = await makeRequest(`/cart/${testProduct._id}`, { method: "POST" });
    assert(addCartRes.status === 200, "Added product to user's cart");

    // TEST 2 — Create payment order with shipping address
    console.log("\n--- Test 3: Create Payment Order (POST /orders/create-payment-order) ---");
    const createOrderRes = await makeRequest("/orders/create-payment-order", {
      method: "POST",
      body: {
        shippingAddress: {
          fullName: "Aarav Sharma",
          phone: "9876543210",
          addressLine1: "22 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
        },
        totalAmount: 1, // MALICIOUS / FAKE CLIENT TOTAL! Server must ignore it!
      },
    });

    assert(createOrderRes.status === 201, "Order created with 201 Created");
    const orderData = createOrderRes.data;
    assert(orderData.success === true, "Order creation success flag is true");
    assert(orderData.shopKartOrderId, "shopKartOrderId returned");
    assert(orderData.razorpayOrderId, "razorpayOrderId returned");
    assert(orderData.amount === testProduct.price * 100, `Amount in paise (${orderData.amount}) equals server calculation (₹${testProduct.price} * 100) — Fake total was ignored!`);
    assert(orderData.key === process.env.RAZORPAY_KEY_ID, "Key ID returned matches configured RAZORPAY_KEY_ID");

    // TEST 3 — Cart before payment verification must still have items
    console.log("\n--- Test 4: Cart Intact Before Payment Verification ---");
    const cartBeforeVerify = await makeRequest("/cart");
    assert(cartBeforeVerify.status === 200, "Cart fetch successful");
    assert(cartBeforeVerify.data.cart.length > 0, "Cart STILL contains items before payment is confirmed!");

    // TEST 4 — Invalid payment signature rejection
    console.log("\n--- Test 5: Tampered / Invalid Signature Rejection ---");
    const invalidSigRes = await makeRequest("/orders/verify-payment", {
      method: "POST",
      body: {
        shopKartOrderId: orderData.shopKartOrderId,
        razorpay_order_id: orderData.razorpayOrderId,
        razorpay_payment_id: "pay_tampered_12345",
        razorpay_signature: "deadbeef_invalid_signature_hash",
      },
    });
    assert(invalidSigRes.status === 400, "Invalid signature returns 400 Bad Request");
    assert(invalidSigRes.data.success === false, "Verification correctly failed");

    // Ensure cart is still intact after failed verification
    const cartAfterFailedVerify = await makeRequest("/cart");
    assert(cartAfterFailedVerify.data.cart.length > 0, "Cart was NOT cleared after failed payment verification!");

    // TEST 5 — Valid HMAC SHA256 signature verification
    console.log("\n--- Test 6: Valid HMAC SHA256 Signature Verification ---");
    const fakePaymentId = `pay_${Date.now()}`;
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = `${orderData.razorpayOrderId}|${fakePaymentId}`;
    const validSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");

    const validSigRes = await makeRequest("/orders/verify-payment", {
      method: "POST",
      body: {
        shopKartOrderId: orderData.shopKartOrderId,
        razorpay_order_id: orderData.razorpayOrderId,
        razorpay_payment_id: fakePaymentId,
        razorpay_signature: validSignature,
      },
    });

    assert(validSigRes.status === 200, "Valid signature verification succeeded with 200 OK");
    assert(validSigRes.data.order.paymentStatus === "PAID", "Order paymentStatus is now PAID");
    assert(validSigRes.data.order.status === "PLACED", "Order status is now PLACED");
    assert(validSigRes.data.order.razorpayPaymentId === fakePaymentId, "razorpayPaymentId persisted on order");

    // TEST 6 — Confirm cart cleared after verified payment
    console.log("\n--- Test 7: Confirm Cart Cleared After Payment ---");
    const cartAfterSuccess = await makeRequest("/cart");
    assert(cartAfterSuccess.data.cart.length === 0, "User's cart is now completely EMPTY ([])!");

    // TEST 7 — Get Orders API (GET /orders)
    console.log("\n--- Test 8: Get My Orders List (GET /orders) ---");
    const myOrdersRes = await makeRequest("/orders");
    assert(myOrdersRes.status === 200, "Fetched orders list");
    assert(myOrdersRes.data.orders.length >= 1, "Orders array contains placed order");
    const placedOrder = myOrdersRes.data.orders.find((o) => o._id === orderData.shopKartOrderId);
    assert(placedOrder !== undefined, "Found placed order in user's order history");
    assert(placedOrder.items[0].name === testProduct.name, "Item name snapshot preserved");
    assert(placedOrder.items[0].price === testProduct.price, "Item price snapshot preserved");

    // TEST 8 — Single Order API (GET /orders/:id)
    console.log("\n--- Test 9: Single Order by ID (GET /orders/:id) ---");
    const singleOrderRes = await makeRequest(`/orders/${orderData.shopKartOrderId}`);
    assert(singleOrderRes.status === 200, "Successfully fetched single order by ID");
    assert(singleOrderRes.data.order._id === orderData.shopKartOrderId, "Order ID matches");

    // TEST 9 — Unauthenticated request rejection
    console.log("\n--- Test 10: Unauthenticated Request Rejection ---");
    const unauthRes = await makeRequest("/orders", { noCookie: true });
    assert(unauthRes.status === 401, "Unauthenticated request rejected with 401 Unauthorized");

    // TEST 10 — Access another user's order (Ownership isolation)
    console.log("\n--- Test 11: Cross-User Order Access Isolation ---");
    const testEmail2 = `lab06_user2_${Date.now()}@example.com`;
    await makeRequest("/customers/register", {
      method: "POST",
      body: {
        fullName: "Priya Patel",
        email: testEmail2,
        password: "Password@123",
        phone: "9123456789",
      },
    });
    // User 2 logs in
    await makeRequest("/customers/login", {
      method: "POST",
      body: { email: testEmail2, password: "Password@123" },
    });

    const crossUserRes = await makeRequest(`/orders/${orderData.shopKartOrderId}`);
    assert(crossUserRes.status === 403, "User 2 forbidden from accessing User 1's order (403 Forbidden)");

    // BONUS CHALLENGE — Status progression (PATCH /orders/:id/status)
    console.log("\n--- Bonus Test 12: Order Status Progression ---");
    // Switch cookie back to user 1
    await makeRequest("/customers/login", {
      method: "POST",
      body: { email: testEmail1, password: "Password@123" },
    });

    const statusConfirmRes = await makeRequest(`/orders/${orderData.shopKartOrderId}/status`, {
      method: "PATCH",
      body: { status: "CONFIRMED" },
    });
    assert(statusConfirmRes.status === 200, "Status updated to CONFIRMED");
    assert(statusConfirmRes.data.order.status === "CONFIRMED", "Order status is CONFIRMED");

    const statusShipRes = await makeRequest(`/orders/${orderData.shopKartOrderId}/status`, {
      method: "PATCH",
      body: { status: "SHIPPED" },
    });
    assert(statusShipRes.data.order.status === "SHIPPED", "Order status progressed to SHIPPED");

    const statusDeliverRes = await makeRequest(`/orders/${orderData.shopKartOrderId}/status`, {
      method: "PATCH",
      body: { status: "DELIVERED" },
    });
    assert(statusDeliverRes.data.order.status === "DELIVERED", "Order status progressed to DELIVERED");

    console.log("\n========================================================");
    console.log("   🎉 ALL LAB 06 ACCEPTANCE CRITERIA PASSED (100/100)   ");
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILURE:", err);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

runTests();
