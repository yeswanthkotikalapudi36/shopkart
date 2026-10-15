const express = require("express");
const router = express.Router();
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
} = require("../controllers/wishlist.controller");
const { protect } = require("../middlewares/auth.middleware");

// All wishlist routes are protected by auth middleware
router.use(protect);

router.route("/").get(getWishlist);
router.route("/:productId").post(addToWishlist).delete(removeFromWishlist);
router.route("/:productId/toggle").patch(toggleWishlist);

module.exports = router;
