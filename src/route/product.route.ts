import { Router } from "express";
import { authorization, isAuthenticated } from "../middleware/auth.middleware";
import ProductController from "../controller/product.controller";
import upload from "../middleware/multer.middleware";
import { ProductReview } from "../model/product.model";
const productRouter = Router();
productRouter.post(
  "/create",
  isAuthenticated,

  // authorization(["admin"]),
  ProductController.create
);
productRouter.put(
  "/update/:productId",
  isAuthenticated,
  authorization(["admin"]),
  ProductController.update
);
productRouter.delete(
  "/delete/:productId",
  isAuthenticated,
  authorization(["admin"]),
  ProductController.update
);
productRouter.post("/addcarts", isAuthenticated, ProductController.Addcart);
productRouter.delete(
  "/remove/:productId/:variantId",
  isAuthenticated,
  //   authorization(["user"]),
  ProductController.removecart
);
productRouter.get("/categories", ProductController.categories);
productRouter.post(
  "/review/:productId",
  upload.array("images"),
  isAuthenticated,
  ProductController.AddRating
);
productRouter.post(
  "/helpfullcount/:productId/:reviewId",
  isAuthenticated,
  ProductController.Helpfulcount
);
productRouter.get("/search", ProductController.searchProduct);
productRouter.get("/filters", ProductController.Filter);
productRouter.post(
  "/discount/:productId",
  isAuthenticated,
  authorization(["admin"]),
  ProductController.createDiscount
);
productRouter.put(
  "/discount/:productId",
  isAuthenticated,
  // authorization(["admin"]),
  ProductController.updateDiscount
);
productRouter.delete(
  "/discount/:productId",
  isAuthenticated,
  authorization(["admin"]),
  ProductController.removeDiscount
);
productRouter.post(
  "/wishlist/:productId",
  isAuthenticated,
  ProductController.WishList
);
productRouter.get("/wishlist", isAuthenticated, ProductController.GetWishLists);
productRouter.delete(
  "/wishlist/:productId",
  isAuthenticated,
  ProductController.removeWishListItem
);
productRouter.get(
  "/catgory-unique",
  ProductController.GetHierarchicalCategories
);
productRouter.put(
  "/update-cart",
  isAuthenticated,
  ProductController.updateCartQuantity
);
productRouter.get("/single/:productId", ProductController.getSingleProduct);
productRouter.post(
  "/products",
  isAuthenticated,
  ProductController.GetProductsByIds
);
productRouter.get("/top-rated", ProductController.TopRatedProducts);
export default productRouter;
