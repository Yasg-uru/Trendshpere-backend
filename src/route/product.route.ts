import {Router} from "express";
import { authorization, isAuthenticated } from "../middleware/auth.middleware";
import ProductController from "../controller/product.controller";
const productRouter =Router();
productRouter.post("/create",isAuthenticated,authorization(["admin"]),ProductController.create);

export default productRouter;
