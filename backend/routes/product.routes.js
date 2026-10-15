const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
} = require("../controllers/product.controller");

router.route("/").post(createProduct).get(getProducts);
router.route("/:id").get(getProductById);

module.exports = router;
