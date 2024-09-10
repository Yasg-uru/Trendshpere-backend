import { Router } from "express";
import { authorization, isAuthenticated } from "../middleware/auth.middleware";
import ProductController from "../controller/product.controller";
const productRouter = Router();
productRouter.post(
  "/create",
  isAuthenticated,
  authorization(["admin"]),
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
productRouter.post(
  "/addcart/:productId/:variantId",
  isAuthenticated,
  //   authorization(["user"]),
  ProductController.cart
);
productRouter.delete(
  "/remove/:productId/:variantId",
  isAuthenticated,
  //   authorization(["user"]),
  ProductController.removecart
);

export default productRouter;
