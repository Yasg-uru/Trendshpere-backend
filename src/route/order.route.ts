import {Router} from "express"
import { authorization, isAuthenticated } from "../middleware/auth.middleware";
import { cancelOrder, createOrder, FilterOrders, returnPolicy, searchOrders, updateOrderStatus, VerifyPayment } from "../controller/order.controller";

const orderRouter=Router();
orderRouter.post("/create",createOrder);
orderRouter.post("/verify",isAuthenticated,VerifyPayment);
orderRouter.post("/cancel",isAuthenticated,cancelOrder);
orderRouter.post("/return",isAuthenticated,returnPolicy);
orderRouter.get("/filter",isAuthenticated,FilterOrders);
orderRouter.get("/search",isAuthenticated,searchOrders);
orderRouter.put("/update",isAuthenticated,updateOrderStatus)


export default orderRouter;