# 🛒 Engineering Lab 05 — ShopKart Shopping Cart

> **Build a complete Shopping Cart experience for ShopKart using frontend state management and persistent backend data.**
>
> This lab extends the Wishlist system from Lab-04 and introduces the core engineering problem of keeping **UI state, cart calculations and server data in sync**.

---

## 📋 Lab Overview

| | |
|---|---|
| **Application** | ShopKart |
| **Lab** | 05 |
| **Duration** | 2–2.5 Hours |
| **Mode** | Individual |
| **Total Marks** | **100** |
| **Primary Theme** | Cart State + Derived Data + Persistent APIs |
| **Frontend** | React |
| **Backend** | Node.js + Express |
| **Database** | MongoDB |
| **Authentication** | JWT |
| **State Management** | Context API (`CartContext.jsx`) |

---

# 1. 🎯 Product Brief

## The Problem

A customer has decided that they may actually purchase a product.

A wishlist only answers:
> “What do I want to save for later?”

A cart must answer much more:
- What am I buying right now?
- How many units do I want?
- Is the requested quantity still available?
- What is my subtotal?
- What happens if I refresh the page?
- What happens if the same product is added again?
- What happens if product price or stock changes?

### Desired experience

```text
Browse Products
       ↓
Add to Cart
       ↓
Cart state updates instantly
       ↓
Open Cart
       ↓
Change Quantity / Remove Items
       ↓
See Order Summary
       ↓
Proceed to Checkout
```

---

# 2. 🧩 Cart Data Model

Customer model contains:

```js
cart: [
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  }
]
```

---

# 3. 🔌 API Contract

| Method | Endpoint | Auth | Purpose |
|---|---|:---:|---|
| POST | `/cart/:productId` | ✅ | Add product to cart (or increment quantity) |
| GET | `/cart` | ✅ | Get current user's populated cart |
| PATCH | `/cart/:productId` | ✅ | Update quantity (body: `{ quantity: N }`) |
| DELETE | `/cart/:productId` | ✅ | Remove product from cart |

---

# 4. 🧮 Derived Cart Values

Computed dynamically in `CartContext.jsx` and never stored in MongoDB:
- `subtotal = Σ(product.price × quantity)`
- `cartCount = Σ(quantity)` (Total units across all items)
- `itemCount = cartItems.length` (Distinct product lines)

---

# 5. 🎤 TA Viva Voce Q&A Cheat Sheet

1. **Why does cart state need to be shared globally?**
   - Because cart information is simultaneously consumed by multiple detached components: `ProductCard`, `ProductDetails`, `Navbar` badge, and `/cart` page. Global state (`CartContext`) prevents prop drilling and ensures a single source of truth.
2. **Why should subtotal NOT be stored in MongoDB?**
   - Subtotal is derived data. If product prices change or discounts apply, a stored subtotal would become stale or desynchronized. Calculating it on-the-fly guarantees real-time accuracy.
3. **How do you prevent duplicate cart rows for the same product?**
   - When `POST /cart/:productId` is called, the controller searches `customer.cart` for an existing item matching `item.product.toString() === productId`. If found, it increments `quantity` by 1 instead of pushing a new array element.
4. **How is stock validated?**
   - Both `POST /cart/:productId` and `PATCH /cart/:productId` check if `requestedQuantity > product.stock`. If exceeded, the request is rejected with `400 Bad Request`.
