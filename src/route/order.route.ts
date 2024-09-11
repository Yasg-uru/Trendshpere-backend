import {Router} from "express"
import { isAuthenticated } from "../middleware/auth.middleware";
import { createOrder } from "../controller/order.controller";

const orderRouter=Router();
orderRouter.post("/create",isAuthenticated,createOrder);

export default orderRouter;
