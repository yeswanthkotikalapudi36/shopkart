const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  updateQuantity,
  removeFromCart,
} = require("../controllers/cart.controller");
const { protect } = require("../middlewares/auth.middleware");

// All cart routes are protected by auth middleware
router.use(protect);

router.route("/").get(getCart);
router
  .route("/:productId")
  .post(addToCart)
  .patch(updateQuantity)
  .delete(removeFromCart);

module.exports = router;
