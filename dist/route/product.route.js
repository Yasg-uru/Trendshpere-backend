"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const product_controller_1 = __importDefault(
  require("../controller/product.controller")
);
const multer_middleware_1 = __importDefault(
  require("../middleware/multer.middleware")
);
const productRouter = (0, express_1.Router)();
productRouter.post(
  "/create",
  auth_middleware_1.isAuthenticated,
  // authorization(["admin"]),
  product_controller_1.default.create
);
productRouter.put(
  "/update/:productId",
  auth_middleware_1.isAuthenticated,
  (0, auth_middleware_1.authorization)(["admin"]),
  product_controller_1.default.update
);
productRouter.delete(
  "/delete/:productId",
  auth_middleware_1.isAuthenticated,
  (0, auth_middleware_1.authorization)(["admin"]),
  product_controller_1.default.update
);
productRouter.post(
  "/addcarts",
  auth_middleware_1.isAuthenticated,
  product_controller_1.default.Addcart
);
productRouter.delete(
  "/remove/:productId/:variantId",
  auth_middleware_1.isAuthenticated,
  //   authorization(["user"]),
  product_controller_1.default.removecart
);
productRouter.get("/categories", product_controller_1.default.categories);
productRouter.post(
  "/review/:productId",
  multer_middleware_1.default.array("images"),
  auth_middleware_1.isAuthenticated,
  product_controller_1.default.AddRating
);
productRouter.post(
  "/helpfullcount/:productId/:reviewId",
  auth_middleware_1.isAuthenticated,
  product_controller_1.default.Helpfulcount
);
productRouter.get("/search", product_controller_1.default.searchProduct);
productRouter.get("/filters", product_controller_1.default.Filter);
productRouter.post(
  "/discount/:productId",
  auth_middleware_1.isAuthenticated,
  (0, auth_middleware_1.authorization)(["admin"]),
  product_controller_1.default.createDiscount
);
productRouter.put(
  "/discount/:productId",
  auth_middleware_1.isAuthenticated,
  (0, auth_middleware_1.authorization)(["admin"]),
  product_controller_1.default.updateDiscount
);
productRouter.delete(
  "/discount/:productId",
  auth_middleware_1.isAuthenticated,
  (0, auth_middleware_1.authorization)(["admin"]),
  product_controller_1.default.removeDiscount
);
productRouter.post(
  "/wishlist/:productId",
  auth_middleware_1.isAuthenticated,
  product_controller_1.default.WishList
);
productRouter.get(
  "/wishlist",
  auth_middleware_1.isAuthenticated,
  product_controller_1.default.GetWishLists
);
productRouter.delete(
  "/wishlist/:productId",
  auth_middleware_1.isAuthenticated,
  product_controller_1.default.removeWishListItem
);
productRouter.get(
  "/catgory-unique",
  product_controller_1.default.GetHierarchicalCategories
);
productRouter.put(
  "/update-cart",
  auth_middleware_1.isAuthenticated,
  product_controller_1.default.updateCartQuantity
);
productRouter.get(
  "/single/:productId",
  product_controller_1.default.getSingleProduct
);
productRouter.post(
  "/products",
  auth_middleware_1.isAuthenticated,
  product_controller_1.default.GetProductsByIds
);
exports.default = productRouter;
