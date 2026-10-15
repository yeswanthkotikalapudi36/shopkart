/**
 * Comprehensive Automated Verification Script for ShopKart
 * Tests Lab-01, Lab-03, and Lab-04 APIs against acceptance criteria
 */

const { connectDB, disconnectDB } = require("./backend/utils/db");
const app = require("./backend/index");
const Customer = require("./backend/models/customer.model");
const Product = require("./backend/models/product.model");
const http = require("http");

let server;
let baseUrl;
let cookie = "";
let createdProductId = "";

async function makeRequest(path, options = {}) {
  const url = new URL(path, baseUrl);
  const headers = { ...options.headers };

  if (cookie) {
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

  // Extract set-cookie if present
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
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
  console.log("==================================================");
  console.log("       STARTING SHOPKART API VERIFICATION         ");
  console.log("==================================================");

  await connectDB();
  
  // Clean test data
  await Customer.deleteMany({ email: "testuser@shopkart.com" });
  await Product.deleteMany({ name: "Automated Test Keyboard" });

  // Start HTTP server on dynamic port
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server active on ${baseUrl}`);

  try {
    // -------------------------------------------------------------------------
    // LAB-01: CUSTOMER AUTHENTICATION
    // -------------------------------------------------------------------------
    console.log("\n--- Testing Lab-01: Customer Authentication ---");

    // 1. Missing fields in registration (Expect 400)
    let res = await makeRequest("/customers/register", {
      method: "POST",
      body: { email: "testuser@shopkart.com", password: "password123" },
    });
    assert(res.status === 400, "Registration rejected with 400 for missing fullName & phone");

    // 2. Password too short in registration (Expect 400)
    res = await makeRequest("/customers/register", {
      method: "POST",
      body: {
        fullName: "Test User",
        email: "testuser@shopkart.com",
        password: "123",
        phone: "9876543210",
      },
    });
    assert(res.status === 400, "Registration rejected with 400 for password < 6 chars");

    // 3. Valid Registration (Expect 201)
    res = await makeRequest("/customers/register", {
      method: "POST",
      body: {
        fullName: "Test User",
        email: "testuser@shopkart.com",
        password: "securePassword123",
        phone: "9876543210",
      },
    });
    assert(res.status === 201 && res.data.success === true, "Customer registered successfully (201)");
    assert(!res.data.customer.password, "Password is NEVER returned in response");

    // 4. Duplicate Registration (Expect 409)
    res = await makeRequest("/customers/register", {
      method: "POST",
      body: {
        fullName: "Duplicate User",
        email: "testuser@shopkart.com",
        password: "anotherPassword",
        phone: "9876543210",
      },
    });
    assert(res.status === 409, "Duplicate email rejected with 409 Conflict");

    // 5. Login with invalid password (Expect 401)
    res = await makeRequest("/customers/login", {
      method: "POST",
      body: { email: "testuser@shopkart.com", password: "wrongPassword" },
    });
    assert(res.status === 401 && res.data.message === "Invalid credentials", "Invalid password rejected with 401 generic error");

    // 6. Login with correct credentials (Expect 200 + HttpOnly Cookie)
    res = await makeRequest("/customers/login", {
      method: "POST",
      body: { email: "testuser@shopkart.com", password: "securePassword123" },
    });
    assert(res.status === 200 && res.data.success === true, "Login successful with 200");
    assert(cookie.includes("token="), "HttpOnly cookie 'token' set successfully");

    // 7. Protected Profile Route /customers/me (Expect 200)
    res = await makeRequest("/customers/me");
    assert(res.status === 200, "Access /customers/me with cookie succeeds (200)");
    assert(res.data.email === "testuser@shopkart.com", "Profile data matches logged-in user");
    assert(!res.data.password, "Profile data does NOT expose password");

    // 8. Protected Profile Route without cookie (Expect 401)
    const savedCookie = cookie;
    cookie = ""; // clear temporarily
    res = await makeRequest("/customers/me");
    assert(res.status === 401, "Access /customers/me without cookie rejected with 401");
    cookie = savedCookie; // restore

    // -------------------------------------------------------------------------
    // LAB-03: PRODUCT CATALOG & DISCOVERY
    // -------------------------------------------------------------------------
    console.log("\n--- Testing Lab-03: Product Catalog & Discovery ---");

    // 9. Create Product with missing fields (Expect 400)
    res = await makeRequest("/products", {
      method: "POST",
      body: { name: "Incomplete Product" },
    });
    assert(res.status === 400, "Create product rejected with 400 for missing fields");

    // 10. Create Product with invalid price (Expect 400)
    res = await makeRequest("/products", {
      method: "POST",
      body: {
        name: "Test",
        description: "Desc",
        price: -10,
        category: "Electronics",
        image: "http://example.com/img.jpg",
        stock: 5,
      },
    });
    assert(res.status === 400, "Create product rejected with 400 for negative price");

    // 11. Create Valid Product (Expect 201)
    res = await makeRequest("/products", {
      method: "POST",
      body: {
        name: "Automated Test Keyboard",
        description: "Premium mechanical keyboard for test suites",
        price: 2499,
        category: "Electronics",
        image: "https://images.unsplash.com/photo-1595225476474-87563907a212",
        stock: 10,
      },
    });
    assert(res.status === 201 && res.data.success === true, "Product created successfully with 201");
    createdProductId = res.data.product._id;

    // 12. Get All Products (Expect 200)
    res = await makeRequest("/products");
    assert(res.status === 200 && Array.isArray(res.data.products), "GET /products returns array of products");

    // 13. Search Products by keyword (Expect 200)
    res = await makeRequest("/products?search=Keyboard");
    assert(res.status === 200 && res.data.products.some((p) => p.name.includes("Keyboard")), "GET /products?search=Keyboard filters results");

    // 14. Filter by Category (Expect 200)
    res = await makeRequest("/products?category=Electronics");
    assert(res.status === 200 && res.data.products.every((p) => p.category.toLowerCase() === "electronics"), "GET /products?category=Electronics filters category");

    // 15. Get Product By ID (Expect 200)
    res = await makeRequest(`/products/${createdProductId}`);
    assert(res.status === 200 && res.data.product._id === createdProductId, "GET /products/:id returns correct product details");

    // 16. Get Product with invalid ID format (Expect 400)
    res = await makeRequest("/products/invalid-id-123");
    assert(res.status === 400, "GET /products/invalid-id returns 400 for malformed ObjectId");

    // 17. Get Non-existent Product ID (Expect 404)
    res = await makeRequest("/products/66d000000000000000000000");
    assert(res.status === 404, "GET /products/:id returns 404 for unknown product");

    // -------------------------------------------------------------------------
    // LAB-04: WISHLIST SYSTEM
    // -------------------------------------------------------------------------
    console.log("\n--- Testing Lab-04: Wishlist System ---");

    // 18. Add Product to Wishlist (Expect 201)
    res = await makeRequest(`/wishlist/${createdProductId}`, { method: "POST" });
    assert(res.status === 201 && res.data.success === true, "POST /wishlist/:productId adds product (201)");

    // 19. Duplicate addition to Wishlist (Expect 409)
    res = await makeRequest(`/wishlist/${createdProductId}`, { method: "POST" });
    assert(res.status === 409, "POST /wishlist/:productId prevents duplicate with 409 Conflict");

    // 20. Add to Wishlist without authentication (Expect 401)
    cookie = "";
    res = await makeRequest(`/wishlist/${createdProductId}`, { method: "POST" });
    assert(res.status === 401, "POST /wishlist/:productId unauthenticated returns 401");
    cookie = savedCookie;

    // 21. Get User's Wishlist with populated details (Expect 200)
    res = await makeRequest("/wishlist");
    assert(res.status === 200 && res.data.wishlist.length > 0, "GET /wishlist returns user's populated items");
    assert(res.data.wishlist[0].name === "Automated Test Keyboard", "Wishlist item contains populated Product details (name, price, etc.)");

    // 22. Toggle Wishlist Bonus (Expect 200 with saved=false when removing)
    res = await makeRequest(`/wishlist/${createdProductId}/toggle`, { method: "PATCH" });
    assert(res.status === 200 && res.data.saved === false, "PATCH /wishlist/:id/toggle toggles out (saved = false)");

    // 23. Toggle Wishlist Bonus (Expect 200 with saved=true when adding back)
    res = await makeRequest(`/wishlist/${createdProductId}/toggle`, { method: "PATCH" });
    assert(res.status === 200 && res.data.saved === true, "PATCH /wishlist/:id/toggle toggles in (saved = true)");

    // 24. Remove Product from Wishlist (Expect 200)
    res = await makeRequest(`/wishlist/${createdProductId}`, { method: "DELETE" });
    assert(res.status === 200 && res.data.success === true, "DELETE /wishlist/:productId removes product (200)");

    // 25. Remove Non-existent item from Wishlist (Expect 404)
    res = await makeRequest(`/wishlist/${createdProductId}`, { method: "DELETE" });
    assert(res.status === 404, "DELETE /wishlist/:productId when not in wishlist returns 404");

    // -------------------------------------------------------------------------
    // LAB-05: SHOPPING CART SYSTEM
    // -------------------------------------------------------------------------
    console.log("\n--- Testing Lab-05: Shopping Cart System ---");

    // 26. Add Product to Cart without authentication (Expect 401)
    cookie = "";
    res = await makeRequest(`/cart/${createdProductId}`, { method: "POST" });
    assert(res.status === 401, "POST /cart/:productId unauthenticated returns 401");
    cookie = savedCookie;

    // 27. Add Product with invalid ID format (Expect 400)
    res = await makeRequest("/cart/invalid-id-xyz", { method: "POST" });
    assert(res.status === 400, "POST /cart/invalid-id returns 400 for malformed ObjectId");

    // 28. Add Non-existent Product ID (Expect 404)
    res = await makeRequest("/cart/66d000000000000000000000", { method: "POST" });
    assert(res.status === 404, "POST /cart/:id returns 404 for unknown product");

    // 29. Add Product to Cart - First time (Expect 200 with quantity = 1)
    res = await makeRequest(`/cart/${createdProductId}`, { method: "POST" });
    assert(res.status === 200 && res.data.success === true, "POST /cart/:productId adds new item (200)");
    assert(Array.isArray(res.data.cart) && res.data.cart.length === 1, "Cart contains 1 item");
    assert(res.data.cart[0].quantity === 1, "Initial cart item quantity is 1");
    assert(res.data.cart[0].product.name === "Automated Test Keyboard", "Cart item has populated product details");

    // 30. Add same Product to Cart again (Expect 200 with quantity = 2)
    res = await makeRequest(`/cart/${createdProductId}`, { method: "POST" });
    assert(res.status === 200, "POST /cart/:productId on existing item succeeds (200)");
    assert(res.data.cart.length === 1, "Cart does NOT create duplicate row for same product");
    assert(res.data.cart[0].quantity === 2, "Cart item quantity incremented to 2");

    // 31. Get Current User Cart (Expect 200 with populated product)
    res = await makeRequest("/cart");
    assert(res.status === 200 && res.data.success === true, "GET /cart returns current user cart (200)");
    assert(res.data.cart.length === 1 && res.data.cart[0].quantity === 2, "GET /cart reflects quantity = 2");
    assert(res.data.cart[0].product.price === 2499, "Populated product price is accurate");

    // 32. Update Cart Quantity to 4 (Expect 200)
    res = await makeRequest(`/cart/${createdProductId}`, {
      method: "PATCH",
      body: { quantity: 4 },
    });
    assert(res.status === 200 && res.data.success === true, "PATCH /cart/:productId updates quantity to 4 (200)");
    assert(res.data.cart[0].quantity === 4, "Cart item quantity updated to 4");

    // 33. Update Cart Quantity to 0 or negative (Expect 400)
    res = await makeRequest(`/cart/${createdProductId}`, {
      method: "PATCH",
      body: { quantity: 0 },
    });
    assert(res.status === 400, "PATCH /cart/:productId rejected with 400 for quantity < 1");

    // 34. Update Cart Quantity exceeding stock (stock is 10, request 15) (Expect 400)
    res = await makeRequest(`/cart/${createdProductId}`, {
      method: "PATCH",
      body: { quantity: 15 },
    });
    assert(res.status === 400, "PATCH /cart/:productId rejected with 400 when quantity > stock");

    // 35. Update Quantity for product not in cart (Expect 404)
    res = await makeRequest("/cart/66d000000000000000000000", {
      method: "PATCH",
      body: { quantity: 2 },
    });
    assert(res.status === 404, "PATCH /cart/:id for product not in cart returns 404");

    // 36. Remove Product from Cart (Expect 200 with empty cart)
    res = await makeRequest(`/cart/${createdProductId}`, { method: "DELETE" });
    assert(res.status === 200 && res.data.success === true, "DELETE /cart/:productId removes item (200)");
    assert(res.data.cart.length === 0, "Cart is now empty after removal");

    // 37. Remove Product not in cart (Expect 404)
    res = await makeRequest(`/cart/${createdProductId}`, { method: "DELETE" });
    assert(res.status === 404, "DELETE /cart/:productId when not in cart returns 404");

    // -------------------------------------------------------------------------
    // BONUS / CLEANUP: Change Password & Logout
    // -------------------------------------------------------------------------
    console.log("\n--- Testing Bonus: Change Password & Logout ---");

    // 38. Change Password (Expect 200)
    res = await makeRequest("/customers/change-password", {
      method: "PATCH",
      body: { oldPassword: "securePassword123", newPassword: "brandNewPassword123" },
    });
    assert(res.status === 200, "PATCH /customers/change-password updates password (200)");

    // 39. Logout (Expect 200 & cookie cleared)
    res = await makeRequest("/customers/logout", { method: "POST" });
    assert(res.status === 200, "POST /customers/logout succeeds (200)");

    console.log("\n==================================================");
    console.log("  🎉 ALL 39 BACKEND TESTS PASSED SUCCESSFULLY!    ");
    console.log("==================================================");
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
